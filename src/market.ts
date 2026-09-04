import { Agent } from "./agent";
import { Race } from "./races";
import { addToKey, bestBy, listSum, numTween, objAdd, vecTween, worstBy } from "./util";

//import { loop } from "./util";
const loop = <T>(l: number, f: (i: number) => T) => [...new Array(l)].map((v, i) => f(i))

export type GoodNumbers = { [id in string]: number };

export const tradeable = new Set(["horsing", "unicorning", "food", "housing", "tool"])

const utilityBase = 0.97, utilityBaseLog = Math.log(utilityBase)

const marginalUtilityLookup = loop(100000, n => 1e6 * Math.pow(utilityBase, n))

export const
  marginalUtility = (amount: number) =>
    amount > 100000 ? 0 : marginalUtilityLookup[amount],
  totalUtility = (amount: number) =>
    (utilityBase ** amount - 1) / utilityBaseLog,
  totalStockUtility = (agent: MarketAgent) =>
    listSum(Object.keys(agent.stock).map(k => totalGoodUtility(agent, k))),
  totalGoodUtility = (agent: MarketAgent, good: string) =>
    totalUtility(~~((agent.stock[good] ?? 0) / agent.scale)),
  reportRecipeStats = (a: Agent) => {
    console.log(`${a.name} used recipes:\n`);
    console.table(Object.fromEntries(a.recipes.map((r, i) =>
      [JSON.stringify(r.recipe),
      [r.uses, a.recipeUtility(a.recipes[i])]])))
  }



type RecipeX = {
  place: MarketAgent,
  uses: number,
  recipe: GoodNumbers
}


export class MarketAgent {

  scale = 1

  /** over how many turns  */
  ravg = 100

  /** To tell markets apart */
  name!: string

  /** Ways of convert one goods into the others */
  //recipes: GoodNumbers[] = []

  recipes: RecipeX[] = []

  /** How much of this good market receives (or loses) per turn */
  income: GoodNumbers = {}

  sells?: Set<string>
  buys?: Set<string>

  /** How much of this good market currently has */
  stock: GoodNumbers = {}

  tradeStats = {} as any;

  consumeStats = {} as any;
  potentialConsumeStats = {} as any;

  /** Consume rolling average */
  cra = {} as any

  constructor(init: Partial<MarketAgent> & { sellList?: string[], buyList?: string[] } = {}) {
    Object.assign(this, init)
    if (init.sellList)
      this.sells = new Set(init.sellList);
    if (init.buyList)
      this.buys = new Set(init.buyList);
  }

  /** The perceived utility of the one unit of this good
   * If working in worlplace, use the sum of stock
  */
  marginalUtility(good: string, place?: MarketAgent) {
    return marginalUtility(~~(this.commonStock(good, place) / this.scale))
  }


  /** How much the market utility will change when using the recipe without multiplier */
  recipeUtility(recipe: RecipeX) {
    return listSum(Object.keys(recipe), good => this.marginalUtility(good, recipe.place) * recipe.recipe[good])
  }

  /** Applies the recipe with the given multiplier */
  useRecipe(recipe: RecipeX, times: number) {
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
        if (recipe.place.keeps(k))
          recipe.place.stock[k] += amount;
        else
          this.stock[k] += amount;
      }
    })

  }

  /** Whether proxy agent keeps the product, or transfers it to the worker */
  keeps(good: string) {
    return false
  }


  /** Maximum recipe multiplier which would not reduce the market stock of anything below zero
   * Would only check goods with negative amount in recipe, i.e. would nor prevent increasing the already negative good
   */
  recipeMax(recipe: RecipeX) {
    let bb = worstBy(Object.keys(recipe), good => {
      let amount = this.commonStock(good, recipe.place)
      let v = amount > 0 ? Number.MAX_VALUE : (this.stock[good] ?? 0) / -amount;
      return v
    }
    )[1]
    return bb
  }

  commonStock(good: string, place?: MarketAgent) {
    return (this.stock[good] ?? 0) + (place?.stock[good] ?? 0)
  }

  get utilities() {
    return Object.fromEntries(Object.keys(this.stock).map(k => [k, this.marginalUtility(k)]));
  }


  bestSeller(buyer: MarketAgent, minimalStock = 40) {
    let soldables = this.goodsSoldableTo(buyer);
    let [good, v] = bestBy([...soldables], k => this.stock[k] > minimalStock ? buyer.marginalUtility(k) / this.marginalUtility(k) : 0);

    return v > 0 ? good : undefined;
  }

  goodsSoldableTo(buyer: MarketAgent) {
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
    let theirBreakEvenPrice = their.marginalUtility(myBestSeller) / their.marginalUtility(theirBestSeller);
    let ourBreakEvenPrice = this.marginalUtility(myBestSeller) / this.marginalUtility(theirBestSeller);

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
      let v = this.income[good] * 10
      if (v < 0) {
        let factual = Math.min(-v, this.stock[good] ?? 0)
        addToKey(this.consumeStats, good, factual);
        addToKey(this.potentialConsumeStats, good, -v);
        this.cra[good] = numTween(this.cra[good] ?? 0, factual, 1 / this.ravg);

      }
      this.gain(good, v)
      this.stock[good] = Math.max(0, this.stock[good])
      this.stock["friendship"] = Math.min(100, this.stock["friendship"] ?? 0);
    }
  }

  useRecipes() {
    let recipeUsed = 0;
    do {
      this.recipes.forEach((recipe, i) => {
        if (this.recipeUtility(recipe) > 0) {
          let maxUses = this.recipeMax(recipe);
          if (maxUses < 1)
            return
          this.useRecipe(recipe, Math.ceil(maxUses / 4))
          recipeUsed++;
        }
      })
    } while (recipeUsed)

  }


};
