import { Agent } from "./agent";
import { Cell } from "./cell";
import { Race } from "./races";
import { consumerGoods, tradeables } from "./resources";
import { neighborBy } from "./root";
import { iterationsPerTurn } from "./setting";
import { queen, state } from "./state";
import { addToKey, bestBy, clamp, listSum, numTween, objAdd, objFilter, objForEach, objMap, objScale, objScaleI, objScaleIR, repeat, rng, vecTween, worstBy } from "./util";

export type GoodNumbers = { [id in string]: number };
export type Transfer = [MarketAgent, string, number]

const
  DEFAULT_STOCK_CAP = 1e24

const distanceTax = .005, happinessGainMultiplier = 15, consumerGoodsHappiness = 3

/** Utility of one more unit of the good.
 * Closed form: exact at every amount, no table to overflow and no truncation.
 */
export const
  marginalUtility = (amount: number) =>
    1e3 / (100 + (amount > 0 ? amount : 0)),
  /** Total utility of having *amount* of a good - the integral of marginalUtility */
  totalUtility = (amount: number) =>
    1e3 * Math.log((100 + (amount > 0 ? amount : 0)) / 100),
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
    Object.fromEntries(Object.keys(a.stock).map(k => [k, a.mutil(k)])),
  gains = (r: GoodNumbers) => objFilter(r, v => v > 0),
  losses = (r: GoodNumbers) => objScale(objFilter(r, (v, k) => v < 0), -1);


export type RecipeX = {
  place: Agent | Cell,
  recipe: GoodNumbers
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

  /** Scales the amounts a herd reasons about.
   *
   * Consumption and production are linear in size, so a herd of 1000 really does hold
   * 1000x the goods - some scaling is conceptually justified.
   *
   * But it is deliberately 1 for now, because the cost is not the concept, it is the
   * bookkeeping: every place that values a quantity must apply the same factor, and the
   * ones that forget silently disagree with the rest. `barter` used to price a deal with
   * mutil (scaled) and accept it with totalUtility (unscaled) - two notions of value in
   * one function.
   *
   * The scaling now lives in exactly one place, `valueOf`, and everything goes through it.
   * To switch it on, change ONLY this getter. Then re-check that
   *   - `valueOf` and `mutil` agree (mutil is the derivative of valueOf),
   *   - trades still converge to equal mutil ratios between herds of different size,
   *   - a herd still "perceives" small amounts: with a factor of N, anything below N
   *     units of a good is worth as much as nothing, which is the trap to watch for.
   *
   * `return Math.max(1, this.size)` was measured: it removes the artificial "big herds
   * look rich" bias and lets large herds trade again, but it makes the perceived value of
   * a small pile collapse for big herds, and it changes every balance number.
   */
  get sizeFactor() {
    return 1
  }


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

  /** Utility of having *amount* of one good, in this agent's own terms.
   * This is THE place where herd size is accounted for: everything that values a
   * quantity goes through here (or through mutil), never through totalUtility directly.
   */
  valueOf(amount: number) {
    return totalUtility(amount / this.sizeFactor)
  }

  /** Marginal utility
   * The perceived utility of the one unit of this good
   * If working in worlplace, use the sum of stock
  */
  mutil(good: string, place?: MarketAgent, travelPerUnit = 0) {
    let v = marginalUtility(this.common(good, place) / this.sizeFactor) -
      (travelPerUnit ? marginalUtility((this.stock.travel ?? 0) / this.sizeFactor) * travelPerUnit : 0)
    return v
  }

  /** Recipe utility
   * How much the market utility will change when using the recipe without multiplier */
  util(recipe: RecipeX) {
    return listSum(Object.keys(recipe.recipe), good => {
      //if(recipe.recipe.seaweed>0)        debugger
      let v = this.mutil(good, recipe.place) * recipe.recipe[good]
      return v
    })
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
   */
  max(recipe: RecipeX) {
    let place = recipe.place as MarketAgent;
    let bb = worstBy(Object.keys(recipe.recipe), good => {
      let makes = recipe.recipe[good];
      /** Only the stock of whoever would actually pay for this good limits the recipe */
      return makes > 0 ? Number.MAX_VALUE :
        (this.stockOwner(place, good, makes).stock[good] ?? 0) / -makes
    }
    )[1]
    return bb
  }

  /** Common amount of res between this and place */
  common(good: string, place?: MarketAgent) {
    return (this.stock[good] ?? 0) + (place == this ? 0 : place?.stock[good] ?? 0)
  }


  bestSeller(buyer: MarketAgent, minimalStock = 40) {
    let soldables = this.soldableTo(buyer);
    let [good, v] = bestBy([...soldables], k => this.stock[k] > minimalStock ? buyer.mutil(k) / this.mutil(k) : 0);

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
   * Each side is judged by its own valueOf, so a sizeFactor (if any) cannot make the
   * price and the accept-check disagree.
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
    let theirBreakEvenPrice = their.mutil(myBestSeller) / their.mutil(theirBestSeller);
    let ourBreakEvenPrice = this.mutil(myBestSeller) / this.mutil(theirBestSeller);

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
    let limit = 30;
    /** A recipe is worth using while its total gain (utility per use * uses available) is positive */
    let score = (recipe: RecipeX) => {
      let v = this.util(recipe) * this.max(recipe)
      return v > 0 ? v : 0
    }
    while (limit--) {
      let [recipe, v] = bestBy(this.recipes, score)
      if (!(v > 0))
        break
      this.useRecipe(recipe, this.recipeUseMultiplier(recipe))
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
