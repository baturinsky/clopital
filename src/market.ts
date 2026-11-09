import { Agent } from "./agent";
import { Cell } from "./cell";
import { Race } from "./races";
import { consumerGoods, tradeables } from "./resources";
import { neighborBy } from "./root";
import { iterationsPerTurn } from "./setting";
import { queen, state } from "./state";
import { addToKey, bestBy, clamp, listSum, numTween, objAdd, objFilter, objForEach, objMap, objScale, objScaleI, objScaleIR, repeat, rng, vecTween } from "./util";

export type GoodNumbers = { [id in string]: number };
export type Transfer = [MarketAgent, string, number]

const
  DEFAULT_STOCK_CAP = 1e24

const distanceTax = .005, happinessGainMultiplier = 15, consumerGoodsHappiness = 3

/** Utility of goods: a power law with a discrete marginal step.
 *
 * Total utility is the primary quantity. Marginal utility is defined the way recipes and
 * stocks actually work - one whole unit at a time:
 *
 *     marginalUtility(N) = totalUtility(N + 1) - totalUtility(N)
 *
 * so total utility is exactly the running sum of marginal utilities. (Treating marginal
 * utility as the derivative instead made "having none" and "having one" worth the same.
 * They are not.)
 *
 * The curve between whole units is a pure power law, totalUtility(x) ~ x^(1-EXP):
 *
 *  - Scale robustness. If an agent holds k times as much of everything its preferences
 *    must not change - it is just richer. For a power law the ratio of two marginal
 *    utilities tends to (a/b)^-EXP, independent of k. Any additive offset
 *    ("1000/(100+x)") reintroduces a scale anchor, and that bias is what `sizeFactor` was
 *    once added to paper over. With a discrete step this invariance is exact in the
 *    limit; at one or two units the "+1" is itself a large relative change, which is
 *    intended rather than a flaw.
 *
 *  - No arbitrary offset. The old "+100" silently meant "100 units is a satisfying
 *    amount", i.e. it encoded a guess about scale. There is no such constant now, so a
 *    loner with one apple and a firm moving thousands of units sit on the same curve.
 *
 *  - No cliff at the top. A table capped at 1e5 used to make anything above it worth
 *    exactly zero, so large herds could not trade at all. The closed form above the table
 *    is positive at every finite amount: a billion units is still worth ~4e-3, not 0.
 *
 *  - Finite at zero. The first unit is worth utilityScale, never infinite or NaN, and
 *    negative amounts behave like an empty stock - while the second unit is already worth
 *    less, so an empty stock and a stock of one are valued differently.
 *
 * EXP < 1 keeps it concave (diminishing returns). 0.7 widens the range where two agents
 * can agree on a price, without flattening value so much that abundance stops mattering.
 */
const utilityScale = 1e3, utilityExponent = .7, utilityLinear = 1 - utilityExponent

/** Clamp the amount the curve is evaluated at: nothing below one unit is finer than a
 * unit, and non-finite input is capped rather than turned into NaN or infinity.
 */
const utilityAmount = (amount: number) =>
  !(amount > 1) ? 1 : (amount < Number.MAX_VALUE ? amount : Number.MAX_VALUE)

/** Table of totalUtility for whole amounts, plus a closed form above it.
 *
 * `Math.pow` is the whole cost of the value curve, and `util`/`max` are the hottest
 * functions in the game: a herd holds ~40 goods but has ~120 recipes built from them, so
 * the same stock values are evaluated over and over, thousands of times per turn.
 *
 * This is the table the original code used, kept as the same idea (index by amount,
 * avoid the pow) but fixed in the two ways the old one was broken:
 *
 *  - It ENDS. Above TABLE_SIZE the closed form takes over, so a large stock is no longer
 *    silently worth zero - the old cap made anything over 1e5 untradeable for big herds.
 *  - It is filled LAZILY, so values the game never asks for cost nothing. Filling on
 *    demand also keeps it exact: an entry is either absent (0) or the real value, and
 *    real values are always > 0, so "0" unambiguously means "not computed yet".
 *
 * Measured over a live universe, amounts are integers 99.2% of the time and a table of
 * 2^17 entries covers 100% of distinct values actually queried (~1MB, 3ms to fill).
 * A hashed memo was tried first and was worse: the live working set is ~25k distinct
 * values, so a 4k-entry hash cache ran at a 9% hit rate. An indexed table cannot miss.
 */
const UTILITY_TABLE_SIZE = 1 << 17
/** One extra slot: marginalUtility(N) reads U(N+1) for the largest table index. */
const utilityTable = new Float64Array(UTILITY_TABLE_SIZE + 2)

/** The closed form: U(x) = C + C*(x^a - 1)/a, linear below one unit. */
const computeUtility = (amount: number) =>
  amount < 1
    ? utilityScale * amount
    : utilityScale + utilityScale * (Math.pow(utilityAmount(amount), utilityLinear) - 1) / utilityLinear

/** totalUtility, table-backed. Identical results; the table is an implementation detail. */
const totalUtilityCached = (amount: number) => {
  /** Zero, negative and NaN are all worth nothing */
  if (!(amount > 0))
    return 0

  /** Whole amounts in range: one array read after the first access */
  if (amount <= UTILITY_TABLE_SIZE && amount === (amount | 0)) {
    let v = utilityTable[amount]
    if (v === 0)
      utilityTable[amount] = v = computeUtility(amount)
    return v
  }

  /** Fractional amounts (rewards, averages) and amounts above the table */
  return computeUtility(amount)
}

export const
  /** Total utility of having *amount* of a good. Exactly the running sum of
   * marginalUtility over whole units. `!(amount > 0)` also catches NaN.
   */
  totalUtility = totalUtilityCached,
  /** Utility of one more unit, by definition U(N+1) - U(N).
   *
   * For whole amounts this is literally that subtraction of two table entries, which is
   * why the table is worth keeping: `bestSeller` alone asks for it twice per tradeable
   * good per trade, and a pow/log/expm1 chain there was the top of the profile.
   */
  marginalUtility = (amount: number) => {
    /** The first unit is worth utilityScale; negative and NaN act like an empty stock */
    if (!(amount > 0))
      return utilityScale
    /** Below one unit the total is linear, so take the difference directly */
    if (amount < 1)
      return totalUtilityCached(amount + 1) - totalUtilityCached(amount)
    /** Whole amounts in table range: two reads, exactly the definition */
    if (amount <= UTILITY_TABLE_SIZE && amount === (amount | 0))
      return totalUtilityCached(amount + 1) - totalUtilityCached(amount)
    /** (x+1)^a - x^a written as x^a * expm1(a*log1p(1/x)) / a, which stays accurate
     * at large x where subtracting the two powers would cancel to noise.
     */
    const x = utilityAmount(amount)
    return utilityScale * Math.pow(x, utilityLinear) *
      Math.expm1(utilityLinear * Math.log1p(1 / x)) / utilityLinear
  },
  totalStockUtility = (agent: MarketAgent) =>
    listSum(Object.keys(agent.stock).map(k => totalGoodUtility(agent, k))),
  totalGoodUtility = (agent: MarketAgent, good: string) =>
    agent.valueOf(agent.stock[good] ?? 0),
  //recipeXName = (r: RecipeX) => `${r.place.id ?? ""}@${JSON.stringify(r.recipe)}`,
  reportRecipeStats = (a: Agent) => {
    console.log(`${a.name} used recipes:\n`);
    console.table(Object.fromEntries(a.recipes.map((r, i) =>
      [JSON.stringify(r.recipe),
      [a.uses[JSON.stringify(r.recipe)], a.util(a.recipes[i])]
      ])))
  },
  utilities = (a: MarketAgent) =>
    Object.fromEntries(Object.keys(a.stock).map(k => [k, a.marginalUtilityOf(k)])),
  gains = (r: GoodNumbers) => objFilter(r, v => v > 0),
  losses = (r: GoodNumbers) => objScale(objFilter(r, (v, k) => v < 0), -1);


export type RecipeX = {
  place: Agent | Cell,
  recipe: GoodNumbers
}

/** Recipes already reported as having no input - so one bad recipe logs once, not every
 * iteration. Keyed by the recipe contents, since that is what is actually wrong.
 */
const reportedFreeRecipes = new Set<string>()
const reportFreeRecipe = (recipe: RecipeX) => {
  let key = JSON.stringify(recipe.recipe)
  if (reportedFreeRecipes.has(key))
    return
  reportedFreeRecipes.add(key)
  console.error(
    `Recipe ${key} has no input, so it could be used an unlimited number of times. ` +
    `It is disabled. Give it at least one good with a negative amount.`
  )
}

export type MarketAgentParameters =
  Partial<MarketAgent> & {
    sellList?: string[],
    buyList?: string[]
  }
export class MarketAgent {

  uses: GoodNumbers = {}

  size = 1
  iterations = 0

  /** At what amount of resource it can be consumed */
  get consumeIfAbove() {
    return this.size
  }

  /** over how many turns we calculate rolling average */
  ravg = 100

  /** To tell agents apart */
  name!: string

  /** Ways of convert one goods into the others, and where (locally, or on one of the hexes nearby) */
  recipes: RecipeX[] = []

  ownRecipes: GoodNumbers[] = []
  places: MarketAgent[] = []

  /** History of the  */
  transfers = [] as RecipeX[]

  /** How much of this good market receives (or loses) per day, per size  */
  income: GoodNumbers = {}

  /** Whitelist of what this agent would trade away */
  sells?: Set<string>

  /** Whitelist of what this agent would accept in trade */
  buys?: Set<string>

  /** How much of this good market currently has */
  stock: GoodNumbers = {}

  /** Maximum value of a good in stock */
  cap: GoodNumbers = {}

  //trades = {} as any;

  consumed = {} as any;

  /** Happiness gained */
  happinessGained = {} as any


  constructor(params: MarketAgentParameters = {}) {
  }

  /** Init market parameters */
  initMarket(params: MarketAgentParameters = {}) {
    Object.assign(this, params)
    if (params.sellList)
      this.sells = new Set(params.sellList);
    if (params.buyList)
      this.buys = new Set(params.buyList);
  }

  /**Compile recipes from places. For Agent, automatically pick up the places from cells */
  recomp() {
    let place = this.places[this.iterations % this.places.length] as Cell;
    this.recipes = [this, ...(place.biome.name == "bedrock" ? [] : [place])].map(place =>
      place.ownRecipes?.map(recipe => ({ place, recipe } as RecipeX))
    ).flat(1) as RecipeX[]
  }

  /** Utility of having *amount* of one good.
   *
   * Values are no longer scaled per agent: the curve itself is scale-free, so an agent
   * holding ten times as much of everything simply sits further along the same curve.
   * This indirection is kept so that the valuation of a quantity always goes through the
   * agent, never through totalUtility directly - that is what keeps price and
   * accept-check consistent.
   */
  valueOf(amount: number) {
    return totalUtility(amount)
  }

  /** Marginal utility of one unit of *good*
   * What one more unit would be worth to this agent, given what it already has.
   * If working in a workplace, use the sum of the local stock.
   */
  marginalUtilityOf(good: string, place?: MarketAgent, travelPerUnit = 0) {
    let value = marginalUtility(this.common(good, place)) -
      (travelPerUnit ? marginalUtility(this.stock.travel ?? 0) * travelPerUnit : 0)
    return value
  }

  /** Recipe utility - the exact change in total utility from using the recipe once,
   * i.e. a difference of totalUtility, not a sum of marginal prices.
   *
   * For one-unit amounts this equals the sum of marginal utilities; for larger amounts
   * (a recipe that turns 10 tools into 40 crafting) it is the honest finite difference,
   * which a marginal-price sum only approximates.
   *
   * Written as a plain loop: this is one of the two hottest functions in the game, and
   * Object.keys + a callback per good allocated enough to show up in profiles.
   */
  util(recipe: RecipeX) {
    let r = recipe.recipe, place = recipe.place as MarketAgent, total = 0
    for (let good in r) {
      let common = this.common(good, place)
      total += this.valueOf(common + r[good]) - this.valueOf(common)
    }
    return total
  }

  /** Who pays for (or receives) this part of the recipe at *place*.
   * Inputs come from our own stock if we have any of it, otherwise from the place.
   * Outputs are ours if the good is tradeable, otherwise they stay at the place.
   */
  stockOwner(place: MarketAgent, good: string, amount: number) {
    return amount < 0
      ? ((this.stock[good] ?? 0) > 0 ? this : place)
      : (tradeables.has(good) ? this : place)
  }

  /** Applies the recipe with the given multiplier and proxies */
  useRecipe(recipe: RecipeX, times?: number) {
    times ??= this.recipeUseMultiplier(recipe)

    /** Never use more than the stock can pay for, and keep the stock integral */
    let feasible = Math.floor(this.max(recipe));
    if (times > feasible)
      times = feasible;

    if (!(times > 0))
      return

    //let rn = recipeXName(recipe);
    let rn = JSON.stringify(recipe.recipe)
    objAdd(this.uses, { [rn]: times })

    let place = recipe.place as MarketAgent;

    /** Not proxied - give and receive oneself */
    if (place == this) {
      Object.keys(recipe.recipe).forEach(k => this.gain(k, recipe.recipe[k] * times))
      return
    }

    objAdd(place.uses, { [rn]: times })

    Object.keys(recipe.recipe).forEach((k) => {
      let amount = recipe.recipe[k] * times;

      /** Means that the good is given/taken to/from local. Otherwise, proxy.*/
      let local = this.stockOwner(place, k, amount) == this;

      (local ? this : place).gain(k, amount)

      if (local)
        this.addTransfer(place, k, amount)
    })
  }

  addTransfer(place: MarketAgent, good: string, amount: number) {
    let transfer = this.transfers.find(t => t.place == place)
    if (!transfer) {
      transfer = { place: place as any, recipe: {} }
      this.transfers.push(transfer);
    }
    addToKey(transfer.recipe, good, amount);
  }



  /** Maximum recipe multiplier which would not reduce the market stock of anything below zero
   * Would only check goods with negative amount in recipe, i.e. would nor prevent increasing the already negative good
   *
   * A recipe with no input at all is not a recipe: nothing limits it, so it could be used an
   * unbounded number of times. Since there is no cap on uses per turn, such a recipe means
   * literally infinite free goods. It is refused (multiplier 0) and reported once.
   */
  max(recipe: RecipeX) {
    let place = recipe.place as MarketAgent, r = recipe.recipe, limit = Infinity, limited = false
    /** Plain loop rather than Object.keys + worstBy: this runs ~120x per herd per pass
     * and the closure/key array was a measurable share of the cost. */
    for (let good in r) {
      let makes = r[good]
      /** Only goods actually consumed limit the recipe; outputs and zeroes never do */
      if (makes >= 0)
        continue
      limited = true
      /** Only the stock of whoever would actually pay for this good limits the recipe */
      let available = (this.stockOwner(place, good, makes).stock[good] ?? 0) / -makes
      if (available < limit)
        limit = available
    }

    if (!limited) {
      reportFreeRecipe(recipe)
      return 0
    }

    return limit
  }

  /** Common amount of res between this and place */
  common(good: string, place?: MarketAgent) {
    return (this.stock[good] ?? 0) + (place == this ? 0 : place?.stock[good] ?? 0)
  }


  bestSeller(buyer: MarketAgent, minimalStock = 40) {
    let soldables = this.soldableTo(buyer);
    let [good, v] = bestBy([...soldables], k => this.stock[k] > minimalStock ? buyer.marginalUtilityOf(k) / this.marginalUtilityOf(k) : 0);

    return v > 0 ? good : undefined;
  }

  soldableTo(buyer: MarketAgent) {
    if (this.sells && buyer.buys) {
      let both = new Set<string>()
      this.sells.forEach(good => buyer.buys!.has(good) && both.add(good))
      return both
    }
    return this.sells ?? buyer.buys ?? tradeables
  }

  /** Would this swap, including the travel it costs us, make both sides better off?
   * Each side is judged by its own valueOf, so a pricing bug here cannot silently make
   * the accept-check disagree with the price.
   */
  tradeIsGood(their: MarketAgent, myGood: string, weGive: number, theirGood: string, theyGive: number, travelUsed = 0) {
    let
      myTravel = this.stock.travel ?? 0,
      myMine = this.stock[myGood] ?? 0,
      myTheirs = this.stock[theirGood] ?? 0,
      theirMine = their.stock[myGood] ?? 0,
      theirTheirs = their.stock[theirGood] ?? 0;

    let
      before = this.valueOf(myTravel) + this.valueOf(myMine) + this.valueOf(myTheirs),
      after = this.valueOf(myTravel - travelUsed) + this.valueOf(myMine - weGive) + this.valueOf(myTheirs + theyGive);

    if (!(after > before))
      return false

    return their.valueOf(theirMine + weGive) + their.valueOf(theirTheirs - theyGive) >
      their.valueOf(theirMine) + their.valueOf(theirTheirs)
  }

  barter(their: MarketAgent, distance = 0) {

    /** Calculating the best goods to trade */
    let myBestSeller = this.bestSeller(their), theirBestSeller = their.bestSeller(this);

    if (!myBestSeller || !theirBestSeller)
      return false

    let travelPerUnit = distance * distanceTax;

    /** How many of their good they want for one of ours, and how many we want.
     * Any price between the two leaves both sides better off.
     */
    let theirBreakEvenPrice = their.marginalUtilityOf(myBestSeller) / their.marginalUtilityOf(theirBestSeller);
    let ourBreakEvenPrice = this.marginalUtilityOf(myBestSeller) / this.marginalUtilityOf(theirBestSeller);

    /** How much travel we can afford to spend on this deal at all.
     * Keep enough for a full move, so trading does not strand the herd.
     */
    let travelBudget = travelPerUnit
      ? Math.max(0, (this.stock.travel ?? 0) - this.size * 5) / travelPerUnit
      : Infinity;

    /** No overlap - nothing to trade about */
    if (!(ourBreakEvenPrice < theirBreakEvenPrice))
      return false

    /** Meet in the middle of the feasible prices, which is the safest place to be
     * when the utility curve is only approximated by its marginal value.
     */
    let price = numTween(ourBreakEvenPrice, theirBreakEvenPrice, .5)

    /** Never offer more than half of either side's stock */
    let weGive = Math.floor(Math.min(this.stock[myBestSeller] ?? 0, (their.stock[theirBestSeller] ?? 0) / price) / 2)
    weGive = Math.min(weGive, Math.floor(travelBudget / (1 + price)))

    /** Shrink the deal until neither side is worse off */
    while (weGive > 0) {
      let theyGive = Math.round(weGive * price),
        travelUsed = Math.ceil((weGive + theyGive) * travelPerUnit);

      if (theyGive > 0 &&
        (theyGive <= (their.stock[theirBestSeller] ?? 0)) &&
        travelUsed <= (this.stock.travel ?? 0) &&
        this.tradeIsGood(their, myBestSeller, weGive, theirBestSeller, theyGive, travelUsed)
      ) {
        this.addTransfer(their, "travel", -travelUsed)
        this.gain("travel", -travelUsed)
        this.give(their, myBestSeller, weGive)
        their.give(this, theirBestSeller, theyGive)
        return true
      }

      weGive = Math.floor(weGive / 2)
    }

    return false
  }

  /** Transfer goods from one agent to another.
   * A negative amount means "take that much from the receiver" (used by the gift UI).
   * Never creates goods: only what actually left the giver is handed over.
   */
  give(receiver: MarketAgent, good: string, amount: number) {
    if (!amount)
      return

    let giver = amount > 0 ? this : receiver,
      taker = amount > 0 ? receiver : this;

    /** Never give what the giver does not have */
    let available = Math.min(Math.abs(Math.trunc(amount)), giver.stock[good] ?? 0);

    if (!(available > 0))
      return

    /** The receiver's cap may refuse some of it - give first, see what landed, take exactly that */
    let before = taker.stock[good] ?? 0;
    taker.gain(good, available)
    let moved = (taker.stock[good] ?? 0) - before

    if (!(moved > 0))
      return

    giver.gain(good, -moved)
    giver.addTransfer(taker, good, -moved)
    taker.addTransfer(giver, good, moved)
  }

  /** Gain or lose goods */
  gain(good: string, amount: number) {
    this.stock[good] = clamp(0, (this.stock[good] ?? 0) + Math.trunc(amount),
      this.cap[good] ?? DEFAULT_STOCK_CAP);
  }

  iterate() {
    this.recomp()
    this.useRecipes()
    this.trade()
    this.gainIterationIncome()
    this.iterations++
  }

  trade() { }

  gainIterationIncome() {
    objForEach(this.totTurnInc(), (perTurn: number, good: string) => {
      let v = Math.ceil(perTurn / iterationsPerTurn)
      if (v == 0)
        return
      if (v < 0) {
        if ((this.stock[good] ?? 0) < this.consumeIfAbove - v)
          return
        addToKey(this.consumed, good, -v);
      }
      this.gain(good, v)
    })
  }

  happinessGain() {
    let queenMultiplier = (queen() == this as any) ? .01 : 1;
    let total = this.totTurnInc(-1);
    let res = objMap(this.consumed,
      (v, good) => {
        let r = (v / (total[good]) * queenMultiplier * happinessGainMultiplier * (consumerGoods.has(good) ? consumerGoodsHappiness : 1) * (this.income[good] ?? 0))
        if (!total[good])
          r = 0;
        return r
      }
    )
    return res
  }

  useRecipes() {
    let recipes = this.recipes, n = recipes.length
    if (!n)
      return

    /** A recipe is worth using while its total gain (utility per use * uses available) is positive */
    let evaluate = (recipe: RecipeX) => {
      let v = this.util(recipe) * this.max(recipe)
      return v > 0 ? v : 0
    }

    /** Which recipes mention each good. Applying a recipe changes the stocks of exactly
     * its own goods, so only recipes sharing a good can change their score - everything
     * else is recomputed identically. Since a pass scores all 120 recipes up to 30 times,
     * but only applies ~12, this removes most of the work.
     */
    let byGood = new Map<string, number[]>()
    for (let i = 0; i < n; i++)
      for (let good in recipes[i].recipe) {
        let list = byGood.get(good)
        if (!list)
          byGood.set(good, list = [])
        list.push(i)
      }

    /** Scores are cached; -1 means "must be recomputed" (a real score is never negative) */
    let scores = new Float64Array(n)
    for (let i = 0; i < n; i++)
      scores[i] = evaluate(recipes[i])

    let limit = 30
    while (limit--) {
      let best = -1, bestScore = 0
      for (let i = 0; i < n; i++) {
        let v = scores[i]
        if (v < 0)
          v = scores[i] = evaluate(recipes[i])
        /** Strict > keeps the first of equal scores, exactly like bestBy */
        if (v > bestScore) {
          bestScore = v
          best = i
        }
      }

      if (!(bestScore > 0))
        break

      let recipe = recipes[best]
      this.useRecipe(recipe, this.recipeUseMultiplier(recipe))

      for (let good in recipe.recipe) {
        let list = byGood.get(good)
        if (list)
          for (let i of list)
            scores[i] = -1
      }
    }
  }

  recipeUseMultiplier(recipe: RecipeX) {
    return Math.ceil(Math.min(this.max(recipe), DEFAULT_STOCK_CAP) / 8)
  }

  /** Total income/expense per turn, considering size
   * with argument, onlythose who have that sign (+1 - income, -1 - consume)
   */
  totTurnInc(sign = 0) {
    let inc = objScale(this.income, this.size)
    if (sign)
      inc = objFilter(inc, v => sign * v > 0)
    return inc
  }


};
