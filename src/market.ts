//import { loop } from "./util";
const loop = <T>(l: number, f: (i: number) => T) => [...new Array(l)].map((v, i) => f(i))

const market = {
  supply: {
    time: 1,
    hunger: 1,
    stress: 1
  } as { [id: string]: number },
  demand: {
    hunger: 1,
    stress: 1
  } as { [id: string]: number },
  recipes: [
    { time: -1, stress: -3 },
    { food: -1, hunger: -1 },
    { time: -1, food: 1 },
    { time: -1, tool: 1 },
    { time: -1, tool: -1, food: 5 },
  ] as { [id: string]: number }[],
  stock: {} as { [id: string]: number }
}

const recipeUses = [] as number[]

const price = (good: string) => {
  let need = market.demand[good], p: number;
  if (need) {
    p = -(market.stock[good] ?? 0) * need;
  } else {
    p = 1 / (1 + (market.stock[good] ?? 0));
  }
  return p;
}
let cash = 0

console.log(recipeMax(market.recipes[0]));

function recipeMax(recipe: { [id: string]: number }) {
  return Object.keys(recipe).reduce((max, good) => {
    let lim = recipe[good] < 0 && !(good in market.demand) ? -market.stock[good] / recipe[good] : max;
    return Math.min(max, lim)
  }, 1e12)
}

function iterate() {
  for (let good in market.supply) {
    cash += price(good) * market.supply[good];
    market.stock[good] = (market.stock[good] ?? 0) + market.supply[good] / 100
  }
  market.recipes.forEach((recipe, i) => {
    let profit = recipeProfit(recipe);
    if (profit > 0) {

      let uses = recipeMax(recipe) * .2;
      if (!Number.isNaN(uses)) {
        console.log(recipe, uses, profit * uses);
        useRecipe(recipe, uses)
        recipeUses[i] = (recipeUses[i] ?? 0) + uses;
      }
    }
  })
  console.log({ ...market.stock });
}

function recipeProfit(recipe: { [id: string]: number }) {
  return Object.keys(recipe).reduce((sum, good) => sum + price(good) * recipe[good], 0)
}

function useRecipe(recipe: { [id: string]: number }, times: number) {
  Object.keys(recipe).forEach((good) => market.stock[good] = (market.stock[good] ?? 0) + recipe[good] * times)
}


export function testMarket() {
  //console.log("profit", recipeProfit(market.recipes[0]));
  loop(200, iterate)
  console.log(Object.keys(market.stock).map(k => `${k}: $${~~(price(k) / price("time") * 1000)}`));
  console.log(market.recipes.map((v, i) => `${recipeUses[i] ?? 0}*${JSON.stringify(market.recipes[i])}`));
}