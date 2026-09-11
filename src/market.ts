import { Agent } from "./agent";
import { Cell } from "./cell";
import { Race } from "./races";
import { tradeables } from "./resources";
import { neighborBy } from "./root";
import { iterationsPerTurn } from "./setting";
import { queen, state } from "./state";
import { addToKey, bestBy, clamp, listSum, numTween, objAdd, objFilter, objMap, objScale, objScaleI, vecTween, worstBy } from "./util";

const FASTRECIPEPICK = true;

//import { loop } from "./util";
const loop = <T>(l: number, f: (i: number) => T) => [...new Array(l)].map((v, i) => f(i))

export type GoodNumbers = { [id in string]: number };
export type Transfer = [MarketAgent, string, number]

const utilityBase = 0.97, utilityBaseLog = Math.log(utilityBase), DEFAULT_STOCK_CAP = 1e24

/** Cached marginal utility numbers */
const marginalUtilityLookup = loop(100000, n => 1e6 * Math.pow(utilityBase, n))

const distanceTax = .01, happinessGainMultiplier = 20

export const
  marginalUtility = (amount: number) =>
    amount > 100000 ? 0 : marginalUtilityLookup[~~amount],
  totalUtility = (amount: number) =>
    (utilityBase ** amount - 1) / utilityBaseLog,
  totalStockUtility = (agent: MarketAgent) =>
    listSum(Object.keys(agent.stock).map(k => totalGoodUtility(agent, k))),
  totalGoodUtility = (agent: MarketAgent, good: string) =>
    totalUtility(~~((agent.stock[good] ?? 0) / agent.size)),
  //recipeXName = (r: RecipeX) => `${r.place.id ?? ""}@${JSON.stringify(r.recipe)}`,
  reportRecipeStats = (a: Agent) => {
    console.log(`${a.name} used recipes:\n`);
    console.table(Object.fromEntries(a.recipes.map((r, i) =>
      [JSON.stringify(r.recipe),
      [a.uses[JSON.stringify(r.recipe)], a.util(a.recipes[i])]
      ])))
  },
  utilities = (a: MarketAgent) =>
    Object.fromEntries(Object.keys(a.stock).map(k => [k, a.mutil(k)]));


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

  /** How much of this good market receives (or loses) per day, per size  */
  income: GoodNumbers = {}

  sells?: Set<string>
  buys?: Set<string>

  /** How much of this good market currently has */
  stock: GoodNumbers = {}
  cap: GoodNumbers = {}

  //trades = {} as any;

  consumed = {} as any;
  /** Happiness gained */
  happinessG = {} as any
  //potentialConsumeStats = {} as any;

  /** Resources which agent does not use themselves, 
   * so they will be given to worker if this agent is proxied */
  //out!: Set<string>

  /** Consume rolling average */
  //cra = {} as any
  //id: number

  constructor(params: MarketAgentParameters = {}) {
    //this.id = params.id ?? ++state.lastId
    //this.minit(params)
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
    this.recipes = [this, this.places[this.iterations % this.places.length]].map(place =>
      place.ownRecipes?.map(recipe => ({ place, recipe } as RecipeX))
    ).flat(1) as RecipeX[]
  }

  /** Marginal utility
   * The perceived utility of the one unit of this good
   * If working in worlplace, use the sum of stock
  */
  mutil(good: string, place?: MarketAgent, travelPerUnit = 0) {
    let v = marginalUtility(this.common(good, place) / this.size) -
      (travelPerUnit ? marginalUtility((this.stock.travel ?? 0) / this.size) * travelPerUnit : 0)
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

  /** Applies the recipe with the given multiplier and proxies */
  useRecipe(recipe: RecipeX, times: number) {

    //let rn = recipeXName(recipe);
    let rn = JSON.stringify(recipe.recipe)
    objAdd(this.uses, { [rn]: times })

    /** Not proxied - give and receive oneself */
    if (recipe.place == this) {
      objAdd(recipe.place.stock, recipe.recipe, times)
      return
    } else {
      objAdd(recipe.place.uses, { [rn]: times })

      Object.keys(recipe.recipe).forEach((k) => {

        //if(k=="grass" || this.name == "Vasilisa")          debugger

        let amount = recipe.recipe[k] * times;

        /** Means that the good is given/taken to/from local. Otherwise, proxy.*/
        let local = amount < 0 ? k in this.stock : tradeables.has(k);

        (local ? this : recipe.place).gain(k, amount)

        if (local) {
          //console.log(local, recipe.place.name, k, amount);
          //if(k=="ore")          debugger
          this.addTransfer(recipe.place, k, amount)
        }

      })

    }


  }

  addTransfer(place: MarketAgent, good: string, amount: number) {
    let transfer = this.transfers.find(t => t.place == place)
    if (!transfer) {
      transfer = { place: place, recipe: {} }
      this.transfers.push(transfer);
    }
    addToKey(transfer.recipe, good, amount);
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
    let [good, v] = bestBy([...soldables], k => this.stock[k] > minimalStock ? buyer.mutil(k) / this.mutil(k) : 0);

    return v > 0 ? good : undefined;
  }

  soldableTo(buyer: MarketAgent) {
    if (this.sells && buyer.buys)
      return this.sells.intersection(buyer.buys)
    return this.sells ?? buyer.buys ?? tradeables
  }

  barter(their: MarketAgent, distance = 0) {

    /** Calculating the best goods to trade */
    let myBestSeller = this.bestSeller(their), theirBestSeller = their.bestSeller(this);

    //if (myBestSeller && theirBestSeller == undefined)       this.give(their, myBestSeller, Math.min(1, this.stock[myBestSeller]))

    if (!myBestSeller || !theirBestSeller)
      return false

    let travelPerUnit = distance * distanceTax;

    /** Calculating the exchange rate - how many of their good for one our good */
    let theirBreakEvenPrice = their.mutil(myBestSeller) / their.mutil(theirBestSeller);
    let ourBreakEvenPrice = this.mutil(myBestSeller, undefined, travelPerUnit) / this.mutil(theirBestSeller, undefined, travelPerUnit);

    if (Math.abs(theirBreakEvenPrice - ourBreakEvenPrice) < .2)
      return false;

    /** Meet at the middle to find how many of their good for one our good */

    let finalExchangeRate = numTween(ourBreakEvenPrice, theirBreakEvenPrice, .2);

    //let finalExchangeRate = ourBreakEvenPrice;

    finalExchangeRate = finalExchangeRate * 100;
    //if (finalExchangeRate == 0)      debugger

    let maxAmountOfMyGood = Math.min(this.stock[myBestSeller], their.stock[theirBestSeller] * finalExchangeRate, (this.stock.travel ?? 0) / travelPerUnit / (1 + finalExchangeRate));

    let weGive = Math.ceil(maxAmountOfMyGood / 4);
    let theyGive = Math.min(their.stock[theirBestSeller] / 4, weGive * finalExchangeRate);

    theyGive = Math.ceil(theyGive);

    if (!(weGive > 0))
      return false;

    //addToKey(this.trades, `${myBestSeller}>${their.name}`, weGive)
    //addToKey(this.trades, `${theirBestSeller}>${their.name}`, -theyGive)

    let travelUsed = ~~((weGive + theyGive) * travelPerUnit);

    this.addTransfer(their, "travel", -travelUsed)
    this.gain("travel", -travelUsed)
    this.give(their, myBestSeller, weGive)
    their.give(this, theirBestSeller, theyGive)

    return true
  }

  /** Transfer goods from one agent to another */
  give(receiver: MarketAgent, good: string, amount: number) {
    if (amount > this.stock[good])
      debugger

    this.addTransfer(receiver, good, -amount)
    receiver.addTransfer(this, good, amount)

    receiver.gain(good, amount);
    this.gain(good, -amount);
  }

  /** Gain or lose goods */
  gain(good: string, amount: number) {
    this.stock[good] = Math.max(0, (this.stock[good] ?? 0) + ~~amount);
  }

  iterate() {
    this.recomp()
    this.useRecipes()
    this.trade()
    this.gainIncome()
    this.iterations++
  }

  trade() {

  }

  gainIncome() {
    this.consumed = {}
    let total = this.totTurnInc();
    for (let good in total) {
      let v = total[good]
      if (v < 0) {
        let factual = Math.min(-v, this.stock[good] ?? 0)
        addToKey(this.consumed, good, factual);
        //this.happinessG[good] = ~~(factual / v * this.income[good] * iterationsPerTurn)
      }
      this.gain(good, v)
      this.stock[good] = clamp(0, this.stock[good], this.cap[good] ?? DEFAULT_STOCK_CAP)
    }
  }

  happinessGain() {
    let total = this.prodTurn(-1);
    let res = objMap(this.consumed,
      (v, good) => {
        let r = - (v / (total[good]) * happinessGainMultiplier * (this.income[good] ?? 0))
        if (!total[good])
          r = 0;
        return r
      }
    )
    return res
  }

  useRecipes() {
    if (FASTRECIPEPICK) {
      let recipeUsed = 0, limit = 10;
      do {
        this.recipes.forEach((recipe, i) => {
          if (this.util(recipe) > 0) {
            let maxUses = this.max(recipe);
            if (maxUses < 1)
              return
            this.useRecipe(recipe, Math.ceil(maxUses / 8))
            recipeUsed++;
          }
        })
      } while (recipeUsed && --limit)
    } else {
      let limit = 30;
      while (limit--) {
        let [recipe, v] = bestBy(this.recipes, (recipe) =>
          this.util(recipe) * this.max(recipe)
        )
        if (v > 0)
          this.useRecipe(recipe, Math.ceil(this.max(recipe) / 4))
        else
          break
      }

    }
  }

  /** Production with 1, needs with -1 */
  prodTurn(need: number = 1) {
    return objScaleI(objFilter(this.totTurnInc(), v => need * v > 0), need)
  }

  /** Total income/expense per week, considering size */
  totTurnInc() {
    return objScaleI(this.income, this.size * iterationsPerTurn)
  }


};
