import { addToKey, bestBy, listSum, stween, tween, worstBy } from "./util";

//import { loop } from "./util";
const loop = <T>(l: number, f: (i: number) => T) => [...new Array(l)].map((v, i) => f(i))

export type GoodNumbers = { [id in string]: number };

export const tradeable = new Set(["horsing", "unicorning", "food", "housing", "tools"])


export class MarketAgent {
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

  constructor(init: Partial<MarketAgent>) {
    Object.assign(this, init)
    this.recipeUsageStats = new Array(this.recipes.length).fill(0);
  }

  /** The perceived value of the one unit of this good*/
  value(good: string) {
    return 1.2 ** -(this.stock[good] ?? 0)
  }

  /** How much the market value will change when using the recipe without multiplier */
  recipeValue(recipe: GoodNumbers) {
    return listSum(Object.keys(recipe), good => this.value(good) * recipe[good])
  }

  /** Applies the recipe with the given multiplier */
  useRecipe(recipe: GoodNumbers, times: number) {
    //console.log(`${this.name} using recipe ${JSON.stringify(recipe)} ${times} times`);
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
    //if(recipe.magic)      debugger
    return bb
  }

  values() {
    return Object.fromEntries(Object.keys(this.stock).map(k => [k, this.value(k)]));
  }

  totalValue() {
    return listSum(Object.keys(this.stock).map(k => this.value(k)))
  }

  bestSeller(buyer: MarketAgent, minimalStock = 0) {
    //console.log("rrrr", [...tradeable].map(k => [k, this.value(k), buyer.value(k), buyer.value(k) / this.value(k)]));

    let [good, v] = bestBy([...tradeable], k => this.stock[k] > minimalStock ? buyer.value(k) / this.value(k) : 0);

    //console.log(this, good);
    //debugger
    return v > 0 ? good : undefined;
  }

  barter(their: MarketAgent) {
    //if (iteration > 500)      debugger
    //console.log("tv", this.values(), their.values());
    /** Calculating the best goods to trade */
    let myBestSeller = this.bestSeller(their), theirBestSeller = their.bestSeller(this);
    //debugger

    if (!myBestSeller || !theirBestSeller)
      return

    /** Calculating the exchange rate - how many our goods for one of their good */
    let theirBreakEvenPrice = their.value(theirBestSeller) / their.value(myBestSeller);
    let ourBreakEvenPrice = this.value(theirBestSeller) / this.value(myBestSeller);


    /** Meet at the middle to find how many our goods for one of their good */
    let finalExchangeRate = stween(theirBreakEvenPrice, ourBreakEvenPrice, .5);

    let maxAmountOfMyGood = Math.min(this.stock[myBestSeller], their.stock[theirBestSeller] / finalExchangeRate);

    if (Number.isNaN(maxAmountOfMyGood))
      return;

    let amountOfMyGoodBartered = maxAmountOfMyGood / 4;

    //console.log(`${this.name} trades ${amountOfMyGoodBartered} of ${myBestSeller} for ${amountOfMyGoodBartered * finalExchangeRate} of ${theirBestSeller} with ${their.name}`);

    addToKey(this.tradeStats, `${myBestSeller} to ${their.name}`, amountOfMyGoodBartered)
    addToKey(this.tradeStats, `${theirBestSeller} from ${their.name}`, amountOfMyGoodBartered * finalExchangeRate)

    //console.log("tv0", this.totalValue(), their.totalValue());
    this.give(their, myBestSeller, amountOfMyGoodBartered)
    their.give(this, theirBestSeller, amountOfMyGoodBartered * finalExchangeRate)
    //console.log("tv1", this.totalValue(), their.totalValue());
    //console.log(this.stock, their.stock);
  }

  give(receiver: MarketAgent, good: string, amount: number) {
    if (!(amount > 0))
      debugger
    this.tradeStats
    receiver.gain(good, amount);
    this.gain(good, -amount);
  }

  gain(good: string, amount: number) {
    this.stock[good] = (this.stock[good] ?? 0) + amount;
  }

  iterate() {
    for (let good in this.income) {
      this.gain(good, this.income[good] / 10)
      this.stock[good] *= 0.99;
    }

    this.recipes.forEach((recipe, i) => {
      let profit = this.recipeValue(recipe);
      if (profit > 0) {
        let uses = this.recipeMax(recipe) * .2;
        if (uses > 0) {
          this.useRecipe(recipe, uses)
        }
      }
    })
  }

  reportRecipeStats() {
    console.log(`${this.name} used recipes:\n`, this.recipeUsageStats.map((v, i) => `${JSON.stringify(this.recipes[i])} used ${v} times`).join("\n"))
  }

};

const horses =
  new MarketAgent({
    name: "horses",
    income: { time: 1, food: -1.5, rest: -1, housing: -1 },
    recipes: [
      { time: -1, rest: 5 },
      { time: -1, horsing: 1 }
    ]
  }),
  unicorns = new MarketAgent({
    name: "unicorns",
    income: { time: 1, food: -1, tools: -1, rest: -1, housing: -1 },
    recipes: [
      { time: -1, rest: 5 },
      { time: -1, unicorning: 1 }
    ]
  }),
  magistrate = new MarketAgent({
    name: "magistrate",
    income: {
      farmland: 5,
      mine: 5,
      housing: 2
    },
    recipes: [
      { horsing: -1, working: 1 },
      { unicorning: -1, working: 1 },

      { horsing: -1, strength: 1 },

      { unicorning: -1, casting: 1 },

      { working: -1, strength: .5 },
      { working: -1, potion: -1, magic: 1 },
      { unicorning: -1, food: -1, potion: .5 },

      { strength: -1, farming: 1 },
      { strength: -1, mining: 1 },
      { strength: -1, tool: -.3, mining: 3 },
      { strength: -1, smithing: 1 },
      { strength: -1, tool: -.1, farming: 3 },
      { working: -1, casting: -1, smithing: 4 },

      { farmland: -1, growspace: 1 },
      { farmland: -1, magic: -1, growspace: 3 },

      { farming: -1, growspace: -3, food: 3 },

      { mining: -1, mine: -1, metal: 3 },
      { smithing: -1, metal: -3, tool: 3 },
    ]
  })


let iteration = 0;

export function testMarket() {
  //console.log("profit", recipeProfit(market.recipes[0]));
  loop(1000, () => {
    iteration++;
    for (let agent of [horses, unicorns, magistrate]) {
      agent.iterate();
    }
    //if (iteration > 500) debugger

    loop(5, () => {
      for (let agent of [horses, unicorns]) {
        magistrate.barter(agent)
      }
    })
    //console.log([magistrate, horses, unicorns].map(a => `${a.name} ${JSON.stringify(a.stock)}`).join("\n"));
  })

  magistrate.reportRecipeStats()
  horses.reportRecipeStats()
  unicorns.reportRecipeStats()

  console.log("magistrate trades:");
  console.log(magistrate.tradeStats);

  console.log(magistrate.stock);
  console.log(unicorns.stock);
  //console.log(Object.keys(market.stock).map(k => `${k}: $${~~(price(k) / price("time") * 1000)}`));
  //console.log(market.recipes.map((v, i) => `${recipeUses[i] ?? 0}*${JSON.stringify(market.recipes[i])}`));
}

//console.log("wb", worstBy([-10,5,7]));

