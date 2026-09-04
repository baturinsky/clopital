import { marginalUtility, MarketAgent, totalUtility } from "./market";
import { loop } from "./util";

export function testMarket() {
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
    console.table(Object.fromEntries(Object.keys(agent.stock).map(k => [k, { stock: agent.stock[k], mu: agent.mu(k) }])));
    console.log(agent.name + " consumed:");
    console.table(
      Object.fromEntries(
        Object.keys(agent.consumeStats).map(
          k => [k, `${agent.consumeStats[k]}/${agent.potentialConsumeStats[k]} ${agent.cra[k]}`]
        )
      )
    );
  })


  magistrate.barter(farm)

  console.timeLog("testMarket")

  //console.log(Object.keys(market.stock).map(k => `${k}: $${~~(price(k) / price("time") * 1000)}`));
  //console.log(market.recipes.map((v, i) => `${recipeUses[i] ?? 0}*${JSON.stringify(market.recipes[i])}`));


  //console.log("wb", worstBy([-10,5,7]));
}

export function testUtility() {
  let s = 0
  for (let i = -100; i < 100; i++) {
    s += marginalUtility(i);
    console.log(marginalUtility(i), totalUtility(i) - totalUtility(-100), s);
  }
}

