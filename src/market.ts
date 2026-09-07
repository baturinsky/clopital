import { Agent } from "./agent";
import { Race } from "./races";
import { queen, state } from "./state";
import { addToKey, bestBy, clamp, listSum, numTween, objAdd, objScale, vecTween, worstBy } from "./util";

//import { loop } from "./util";
const loop = <T>(l: number, f: (i: number) => T) => [...new Array(l)].map((v, i) => f(i))

export type GoodNumbers = { [id in string]: number };
export type Transfer = [MarketAgent, string, number]

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
  recipeXName = (r: RecipeX) => `${r.place.id ?? ""}@${JSON.stringify(r.recipe)}`,
  reportRecipeStats = (a: Agent) => {
    console.log(`${a.name} used recipes:\n`);
    console.table(Object.fromEntries(a.recipes.map((r, i) =>
      [JSON.stringify(r.recipe),
      [a.uses[JSON.stringify(r.recipe)], a.utl(a.recipes[i])]
      ])))
  },
  utilities = (a: MarketAgent) =>
    Object.fromEntries(Object.keys(a.stock).map(k => [k, a.mutl(k)]));


export type RecipeX = {
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
  iterations = 0

  /** over how many turns we calculate rolling average */
  ravg = 100

  /** To tell agents apart */
  name!: string

  /** Ways of convert one goods into the others */
  //recipes: GoodNumbers[] = []

  recipes: RecipeX[] = []
  ownRecipes: GoodNumbers[] = []
  places: MarketAgent[] = []

  transfers = [] as RecipeX[]

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
  id: number

  constructor(params: MarketAgentParameters = {}) {
    this.id = params.id ?? ++state.lastId
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
        out[k] = Math.min(out[k] ?? 1, r[k])
      }
    }
    this.out = new Set(Object.keys(out).filter(k => out[k] > 0))
  }

  /**Compile recipes from places. For Agent, automatically pick up the places from cells */
  recomp() {
    this.recipes = [this, this.places[this.iterations % this.places.length]].map(place =>
      place.ownRecipes?.map(recipe => ({ place, recipe } as RecipeX))
    ).flat(1) as RecipeX[]
  }

  /** Marginal utility
   * The perceived utility of the one unit of this good
   * If working in worlplace, use the sum of stock
  */
  mutl(good: string, place?: MarketAgent) {
    let v = marginalUtility(~~(this.common(good, place) / this.size))
    return v
  }

  /** Recipe utility
   * How much the market utility will change when using the recipe without multiplier */
  utl(recipe: RecipeX) {
    return listSum(Object.keys(recipe.recipe), good => {
      //if(recipe.recipe.seaweed>0)        debugger
      let v = this.mutl(good, recipe.place) * recipe.recipe[good]
      return v
    })
  }

  /** Applies the recipe with the given multiplier and proxies */
  use(recipe: RecipeX, times: number) {

    //let rn = recipeXName(recipe);
    let rn = JSON.stringify(recipe.recipe)
    objAdd(this.uses, { [rn]: times })

    if (recipe.place != this) {
      objAdd(recipe.place.uses, { [rn]: times })
    }

    /** Not proxied - give and receive oneself */
    if (recipe.place == this) {
      objAdd(recipe.place.stock, recipe.recipe, times)
      return
    }

    let transfer: RecipeX | undefined;

    Object.keys(recipe.recipe).forEach((k) => {
      let amount = recipe.recipe[k] * times;

      /** Means that the good is given/taken to/from local. Otherwise, proxy.*/
      let local = amount < 0 ? this.stock[k] : recipe.place.out.has(k);

      (local ? this : recipe.place).gain(k, amount)

      if ((amount < 0) == local) {
        transfer = this.transfers.find(t => t.place == recipe.place)
        if (!transfer) {
          transfer = { place: recipe.place, recipe: {} }
          this.transfers.push(transfer);
        }
        addToKey(transfer.recipe, k, amount);
      }
    })

  }



  /** Maximum recipe multiplier which would not reduce the market stock of anything below zero
   * Would only check goods with negative amount in recipe, i.e. would nor prevent increasing the already negative good
   */
  max(recipe: RecipeX) {
    let bb = worstBy(Object.keys(recipe.recipe), good => {
      let have = this.common(good, recipe.place)
      let makes = recipe.recipe[good];
      let v = makes > 0 ? Number.MAX_VALUE : (have ?? 0) / -makes;
      return v
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
    let [good, v] = bestBy([...soldables], k => this.stock[k] > minimalStock ? buyer.mutl(k) / this.mutl(k) : 0);

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
    let theirBreakEvenPrice = their.mutl(myBestSeller) / their.mutl(theirBestSeller);
    let ourBreakEvenPrice = this.mutl(myBestSeller) / this.mutl(theirBestSeller);

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

    addToKey(this.tradeStats, `${myBestSeller} to ${their.name}`, weGive)
    addToKey(this.tradeStats, `${theirBestSeller} from ${their.name}`, theyGive)

    this.give(their, myBestSeller, weGive)
    their.give(this, theirBestSeller, theyGive)

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
    this.recomp()
    this.gainIncome()
    this.useRecipes()
    this.iterations++
  }

  gainIncome(multiplier = 1) {
    for (let good in this.income) {
      let v = this.income[good] * this.size * multiplier
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

  /*_useRecipes() {
    let recipeUsed = 0, limit = 10;
    do {
      this.recipes.forEach((recipe, i) => {
        if (this.utl(recipe) > 0) {
          let maxUses = this.max(recipe);
          if (maxUses < 1)
            return
          this.use(recipe, Math.ceil(maxUses / 8))
          recipeUsed++;
        }
      })
    } while (recipeUsed && --limit)

  }*/

  useRecipes() {
    let limit = 30;
    while (limit--) {
      let [recipe, v] = bestBy(this.recipes, (recipe) =>
        this.utl(recipe) * this.max(recipe)
      )
      if (v > 0)
        this.use(recipe, Math.ceil(this.max(recipe) / 4))
      else
        break
    }
  }


};
