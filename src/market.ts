import { Agent } from "./agent";
import { Race } from "./races";
import { addToKey, bestBy, clamp, listSum, numTween, objAdd, vecTween, worstBy } from "./util";

//import { loop } from "./util";
const loop = <T>(l: number, f: (i: number) => T) => [...new Array(l)].map((v, i) => f(i))

export type GoodNumbers = { [id in string]: number };

export const tradeable = new Set(["horsing", "unicorning", "food", "housing", "tool"])

const utilityBase = 0.97, utilityBaseLog = Math.log(utilityBase), DEFAULT_STOCK_CAP = 1e24

/** Cached marginal utility numbers */
const marginalUtilityLookup = loop(100000, n => 1e6 * Math.pow(utilityBase, n))

export const
  marginalUtility = (amount: number) =>
    amount > 100000 ? 0 : marginalUtilityLookup[amount],
  totalUtility = (amount: number) =>
    (utilityBase ** amount - 1) / utilityBaseLog,
  totalStockUtility = (agent: MarketAgent) =>
    listSum(Object.keys(agent.stock).map(k => totalGoodUtility(agent, k))),
  totalGoodUtility = (agent: MarketAgent, good: string) =>
    totalUtility(~~((agent.stock[good] ?? 0) / agent.size)),
  recipeXName = (r: RecipeX) => `${r.place.name}@${JSON.stringify(r.recipe)}`,
  reportRecipeStats = (a: Agent) => {
    console.log(`${a.name} used recipes:\n`);
    console.table(Object.fromEntries(a.recipes.map((r, i) =>
      [JSON.stringify(r.recipe),
      [a.uses[recipeXName(r)], a.ru(a.recipes[i])]])))
  },
  utilities = (a: MarketAgent) =>
    Object.fromEntries(Object.keys(a.stock).map(k => [k, a.mu(k)]));


type RecipeX = {
  place: MarketAgent,
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

  /** over how many turns we calculate rolling average */
  ravg = 100

  /** To tell agents apart */
  name!: string

  /** Ways of convert one goods into the others */
  //recipes: GoodNumbers[] = []

  recipes: RecipeX[] = []
  ownRecipes: GoodNumbers[] = []
  places: MarketAgent[] = []

  /** How much of this good market receives (or loses) per turn */
  income: GoodNumbers = {}

  sells?: Set<string>
  buys?: Set<string>

  /** How much of this good market currently has */
  stock: GoodNumbers = {}
  cap: GoodNumbers = {}

  tradeStats = {} as any;

  consumeStats = {} as any;
  potentialConsumeStats = {} as any;

  /** Resources which agent does not use themselves, 
   * so they will be given to worker if this agent is proxied */
  out!: Set<string>

  /** Consume rolling average */
  cra = {} as any

  constructor(params: MarketAgentParameters = {}) {
    this.minit(params)
  }

  minit(params: MarketAgentParameters = {}) {
    Object.assign(this, params)
    if (params.sellList)
      this.sells = new Set(params.sellList);
    if (params.buyList)
      this.buys = new Set(params.buyList);

    let out: GoodNumbers = {}
    for (let r of this.ownRecipes) {
      for (let k in r) {
        out[k] = Math.min(out[k] ?? 0, r[k])
      }
    }
    this.out = new Set(Object.keys(out).filter(k => out[k] > 0))
  }

  /**Compile recipes from places. For Agent, automatically pick up the places from cells */
  recomp() {
    this.recipes = [this, ...this.places].map(place =>
      place.ownRecipes?.map(recipe => ({ place, recipe } as RecipeX))
    ).flat(1) as RecipeX[]
  }

  /** Marginal utility
   * The perceived utility of the one unit of this good
   * If working in worlplace, use the sum of stock
  */
  mu(good: string, place?: MarketAgent) {
    return marginalUtility(~~(this.weHave(good, place) / this.size))
  }


  /** Recipe utility
   * How much the market utility will change when using the recipe without multiplier */
  ru(recipe: RecipeX) {
    return listSum(Object.keys(recipe), good => this.mu(good, recipe.place) * recipe.recipe[good])
  }

  /** Applies the recipe with the given multiplier and proxies */
  use(recipe: RecipeX, times: number) {

    let rn = recipeXName(recipe);
    objAdd(this.uses, { [rn]: times })

    /** Not proxied - give and receive oneself */
    if (recipe.place == this) {
      objAdd(recipe.place.stock, recipe.recipe, times)
      return
    }

    Object.keys(recipe.recipe).forEach((k) => {
      let amount = recipe.recipe[k] * times;
      if (amount < 0) {
        if (recipe.place.stock[k])
          recipe.place.stock[k] += amount;
        else
          this.stock[k] += amount;
      } else {
        if (recipe.place.out.has(k))
          this.stock[k] += amount;
        else
          recipe.place.stock[k] += amount;
      }
    })

  }



  /** Maximum recipe multiplier which would not reduce the market stock of anything below zero
   * Would only check goods with negative amount in recipe, i.e. would nor prevent increasing the already negative good
   */
  max(recipe: RecipeX) {
    let bb = worstBy(Object.keys(recipe), good => {
      let amount = this.weHave(good, recipe.place)
      let v = amount > 0 ? Number.MAX_VALUE : (this.stock[good] ?? 0) / -amount;
      return v
    }
    )[1]
    return bb
  }


  weHave(good: string, place?: MarketAgent) {
    return (this.stock[good] ?? 0) + (place?.stock[good] ?? 0)
  }


  bestSeller(buyer: MarketAgent, minimalStock = 40) {
    let soldables = this.soldableTo(buyer);
    let [good, v] = bestBy([...soldables], k => this.stock[k] > minimalStock ? buyer.mu(k) / this.mu(k) : 0);

    return v > 0 ? good : undefined;
  }

  soldableTo(buyer: MarketAgent) {
    if (this.sells && buyer.buys)
      return this.sells.intersection(buyer.buys)
    return this.sells ?? buyer.buys ?? tradeable
  }

  barter(their: MarketAgent) {
    /** Calculating the best goods to trade */
    let myBestSeller = this.bestSeller(their), theirBestSeller = their.bestSeller(this);

    //if (myBestSeller && theirBestSeller == undefined)       this.give(their, myBestSeller, Math.min(1, this.stock[myBestSeller]))


    if (!myBestSeller || !theirBestSeller)
      return false

    /*if (iteration > 10000 && their == unicorns) {
      console.log("rrrr", [...tradeable].map(k => [k,
        "we", this.stock[k], this.marginalUtility(k),
        "them", their.stock[k], their.marginalUtility(k),
        their.marginalUtility(k) / this.marginalUtility(k)]));
      debugger
      this.bestSeller(their)
    }*/

    /** Calculating the exchange rate - how many of their good for one our good */
    let theirBreakEvenPrice = their.mu(myBestSeller) / their.mu(theirBestSeller);
    let ourBreakEvenPrice = this.mu(myBestSeller) / this.mu(theirBestSeller);

    if (Math.abs(theirBreakEvenPrice - ourBreakEvenPrice) < .2)
      return false;

    /** Meet at the middle to find how many of their good for one our good */

    let finalExchangeRate = numTween(ourBreakEvenPrice, theirBreakEvenPrice, .2);

    //let finalExchangeRate = ourBreakEvenPrice;

    finalExchangeRate = finalExchangeRate * 100;
    if (finalExchangeRate == 0)
      debugger

    let maxAmountOfMyGood = Math.min(this.stock[myBestSeller], their.stock[theirBestSeller] * finalExchangeRate);

    let weGive = Math.ceil(maxAmountOfMyGood / 4);
    let theyGive = Math.min(their.stock[theirBestSeller] / 4, weGive * finalExchangeRate);

    theyGive = Math.ceil(theyGive);

    if (!(weGive > 0))
      return false;

    //console.log(`${this.name} trades ${weGive} of ${myBestSeller} for ${theyGive} of ${theirBestSeller} with ${their.name}`);

    addToKey(this.tradeStats, `${myBestSeller} to ${their.name}`, weGive)
    addToKey(this.tradeStats, `${theirBestSeller} from ${their.name}`, theyGive)

    //console.log("tv0", this.totalValue(), their.totalValue());
    //console.log("tts0 them us", their.totalStockUtility(), this.totalStockUtility());

    this.give(their, myBestSeller, weGive)
    their.give(this, theirBestSeller, theyGive)


    //console.log("tts1", their.totalStockUtility(), this.totalStockUtility(), this.utilities);
    //console.log("tv1", this.totalValue(), their.totalValue());
    //console.log(this.stock, their.stock);
    return true
  }

  give(receiver: MarketAgent, good: string, amount: number) {
    if (amount > this.stock[good])
      debugger

    receiver.gain(good, amount);
    this.gain(good, -amount);
  }

  gain(good: string, amount: number) {
    this.stock[good] = (this.stock[good] ?? 0) + amount;
  }

  iterate() {
    this.gainIncome()

    this.useRecipes()
  }

  gainIncome() {
    for (let good in this.income) {
      let v = this.income[good] * this.size
      if (v < 0) {
        let factual = Math.min(-v, this.stock[good] ?? 0)
        addToKey(this.consumeStats, good, factual);
        addToKey(this.potentialConsumeStats, good, -v);
        this.cra[good] = numTween(this.cra[good] ?? 0, factual, 1 / this.ravg);

      }
      this.gain(good, v)
      this.stock[good] = clamp(0, this.stock[good], this.cap[good] ?? DEFAULT_STOCK_CAP)

    }
  }

  useRecipes() {
    let recipeUsed = 0;
    do {
      this.recipes.forEach((recipe, i) => {
        if (this.ru(recipe) > 0) {
          let maxUses = this.max(recipe);
          if (maxUses < 1)
            return
          this.use(recipe, Math.ceil(maxUses / 4))
          recipeUsed++;
        }
      })
    } while (recipeUsed)

  }


};
