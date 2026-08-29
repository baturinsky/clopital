import { addToKey, bestBy, listSum, stween, tween, worstBy } from "./util";

//import { loop } from "./util";
const loop = <T>(l: number, f: (i: number) => T) => [...new Array(l)].map((v, i) => f(i))

export type GoodNumbers = { [id in string]: number };

export const tradeable = new Set(["horsing", "unicorning", "food", "housing", "tool"])

const utilityBase = 0.97, utilityBaseLog = Math.log(utilityBase)

const marginalUtilityLookup =  loop(100000, n => 1e6 * Math.pow(utilityBase, n))

export function marginalUtility(amount: number) {
  return amount > 100000 ? 0 : marginalUtilityLookup[amount]
}

export function totalUtility(amount: number) {
  return (utilityBase ** amount - 1) / utilityBaseLog;
}


export class MarketAgent {

  scale = 1

  /** To tell markets apart */
  name?: string

  /** Ways of convert one goods into the others */
  recipes: GoodNumbers[] = []

  /** How much of this good market currently has */
  stock: GoodNumbers = {}

  /** How much of this good market receives (or loses) per turn */
  income: GoodNumbers = {}

  recipeUsageStats: number[]
  tradeStats = {} as any;
  consumeStats = {} as any;
  potentialConsumeStats = {} as any;

  sells?: Set<string>
  buys?: Set<string>

  constructor(init: Partial<MarketAgent> & { sellList?: string[], buyList?: string[] }) {
    Object.assign(this, init)
    this.recipeUsageStats = new Array(this.recipes.length).fill(0);
    if (init.sellList)
      this.sells = new Set(init.sellList);
    if (init.buyList)
      this.buys = new Set(init.buyList);
  }

  /** The perceived utility of the one unit of this good*/
  marginalUtility(good: string) {
    return marginalUtility(~~((this.stock[good] ?? 0) / this.scale))
  }

  totalUtility(good: string) {
    return totalUtility(~~((this.stock[good] ?? 0) / this.scale))
  }

  /** How much the market utility will change when using the recipe without multiplier */
  recipeUtility(recipe: GoodNumbers) {
    return listSum(Object.keys(recipe), good => this.marginalUtility(good) * recipe[good])
  }

  /** Applies the recipe with the given multiplier */
  useRecipe(recipe: GoodNumbers, times: number) {
    //console.log(`${this.name} uses recipe ${JSON.stringify(recipe)} ${times} times`);
    let ind = this.recipes.indexOf(recipe)
    this.recipeUsageStats[ind] = (this.recipeUsageStats[ind] ?? 0) + times;
    return Object.keys(recipe).forEach((good) => this.stock[good] = (this.stock[good] ?? 0) + recipe[good] * times)
  }

  /** Maximum recipe multiplier which would not reduce the market stock of anything below zero
   * Would only check goods with negative amount in recipe, i.e. would nor prevent increasing the already negative good
   */
  recipeMax(recipe: GoodNumbers) {
    let bb = worstBy(Object.keys(recipe), good => {
      let v = recipe[good] > 0 ? Number.MAX_VALUE : (this.stock[good] ?? 0) / -recipe[good];
      return v
    }
    )[1]
    return bb
  }

  get utilities() {
    return Object.fromEntries(Object.keys(this.stock).map(k => [k, this.marginalUtility(k)]));
  }

  totalStockUtility() {
    return listSum(Object.keys(this.stock).map(k => this.totalUtility(k)))
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

    let finalExchangeRate = stween(ourBreakEvenPrice, theirBreakEvenPrice, .2);

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
    for (let good in this.income) {
      let v = this.income[good] * 10
      if (v < 0) {
        let factual = Math.min(-v, this.stock[good] ?? 0)
        addToKey(this.consumeStats, good, factual);
        addToKey(this.potentialConsumeStats, good, -v);
      }
      this.gain(good, v)
      this.stock[good] = Math.max(0, this.stock[good])
      this.stock["friendship"] = Math.min(100, this.stock["friendship"] ?? 0);
    }

    let recipeUsed = 0;
    this.recipes.forEach((recipe, i) => {
      if (this.recipeUtility(recipe) > 0) {
        let maxUses = this.recipeMax(recipe);
        if (maxUses < 1)
          return
        this.useRecipe(recipe, Math.ceil(maxUses / 4))
        recipeUsed++;
      }
    })
  }

  reportRecipeStats() {
    console.log(`${this.name} used recipes:\n`);
    console.table(Object.fromEntries(this.recipeUsageStats.map((v, i) => [JSON.stringify(this.recipes[i]), [v, this.recipeUtility(this.recipes[i])]])))
  }

};

const horses =
  new MarketAgent({
    name: "horses",
    income: { time: 1, food: -2, rest: -1, housing: -1 },
    sellList: ["horsing", "friendship"],
    buyList: ["food", "housing", "friendship"],
    recipes: [
      { time: -10, rest: 30 },
      { time: -10, horsing: 10 },
    ],
  }),
  unicorns = new MarketAgent({
    name: "unicorns",
    income: { time: 1, food: -1, tools: -1, rest: -1, housing: -1 },
    recipes: [
      { time: -10, rest: 30 },
      { time: -10, unicorning: 10 }
    ],
    sellList: ["unicorning", "friendship"],
    buyList: ["food", "housing", "tools", "friendship"]
  }),
  farm = new MarketAgent({
    name: "farm",
    income: { farmland: 1 },
    buyList: ["farming", "tools", "magic", "friendship"],
    sellList: ["food", "friendship"],
    recipes: [
      { farmland: -1, growspace: 1 },
      { farmland: -1, magic: -1, growspace: 3 },
      { farming: -1, growspace: -3, food: 6 },
    ],
    stock: { friendship: 100 }
  }),
  magistrate = new MarketAgent({
    name: "magistrate",
    scale: 100,
    income: {
      mines: 1,
      housing: 2,
      gold: -1,
      friendship: 1
    },
    recipes: [
      { horsing: -1, working: 1 },
      { unicorning: -1, working: 1 },

      { horsing: -1, strength: 1 },

      { unicorning: -1, magic: 1 },


      { working: -2, strength: 1 },
      { working: -1, potions: -1, magic: 1 },
      { unicorning: -2, food: -2, potions: 1 },

      { strength: -1, farming: 1 },
      { strength: -1, mining: 1 },
      { strength: -3, tools: -1, mining: 10 },
      { strength: -1, smithing: 2 },
      { strength: -10, tools: -1, farming: 30 },
      { working: -1, magic: -1, smithing: 4 },

      { mining: -1, mines: -1, metal: 3 },
      { smithing: -1, metal: -3, tools: 3 },
      { mining: -1, mines: -1, gold: 3 },
    ]
  })


let iteration = 0;

const agentswithoutMagistrate = [horses, unicorns, farm];
const allAgents = [magistrate, ...agentswithoutMagistrate];

export function testMarket() {
  console.time("testMarket")

  //console.log("profit", recipeProfit(market.recipes[0]));
  loop(100000, () => {
    iteration++;
    for (let agent of allAgents) {
      agent.iterate();
    }
    //if (iteration > 500) debugger

    let partners = new Set(agentswithoutMagistrate);

    let limit = 10
    while (partners.size > 0 && limit-- > 0) {
      for (let partner of partners) {
        if (!magistrate.barter(partner))
          partners.delete(partner)
      }
    }

    //console.log([magistrate, horses, unicorns].map(a => `${a.name} ${JSON.stringify(a.stock)}`).join("\n"));
  })

  console.log("magistrate trades:");
  console.table(magistrate.tradeStats);

  allAgents.forEach(agent => {
    agent.reportRecipeStats()
    console.log(agent.name + " stock:");
    console.table(Object.fromEntries(Object.keys(agent.stock).map(k => [k, { stock: agent.stock[k], mu: agent.marginalUtility(k) }])));
    console.log(agent.name + " consumed:");
    console.table(
      Object.fromEntries(
        Object.keys(agent.consumeStats).map(
          k => [k, `${agent.consumeStats[k]}/${agent.potentialConsumeStats[k]}`]
        )
      )
    );
  })


  magistrate.barter(farm)

  console.timeLog("testMarket")

  //console.log(Object.keys(market.stock).map(k => `${k}: $${~~(price(k) / price("time") * 1000)}`));
  //console.log(market.recipes.map((v, i) => `${recipeUses[i] ?? 0}*${JSON.stringify(market.recipes[i])}`));
}

//console.log("wb", worstBy([-10,5,7]));

export function testUtility() {
  let s = 0
  for (let i = -100; i < 100; i++) {
    s += marginalUtility(i);
    console.log(marginalUtility(i), totalUtility(i) - totalUtility(-100), s);
  }
}

