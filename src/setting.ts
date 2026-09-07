import { GoodNumbers } from "./market"
import { Race } from "./races"

export const
  iterationsPerTurn = 7,
  cellCapPerIncome = 100,
  incomePerResource = 100,

  /** How biome resources translate to cell agent income */
  biomeToAgent = {
    soil: {
      income: {
        soil: 1,
        irrigation: .2,
        fertilisers: .2
      },
      ownRecipes: [
        { soil: -1, irrigation: -1, fertilisers: -1, sowing: -1, crops: 4 },
        { crops: -1, grass: 1 }
      ]
    },
    trees: {
      income: { trees: 1 },
      ownRecipes: [
        { trees: -1, axing: -1, lumber: 1 },
        { trees: -3, sowing: -1, berries: 1 }
      ]
    },
    deposits: {
      income: { deposits: 1 },
      ownRecipes: [
        { deposits: -1, digging: -1, spelunking: -1, ore: 1 },
        { digging: -4, spelunking: 1 },
        //{ thinking: -1, spelunking: 1 },
        { ore: -1, stone: 1 },
      ]
    },
    deepwater: {
      income: { deepwater: 1 },
      ownRecipes: [
        { deepwater: -1, swimming: -1, seaweed: 1 },
        { deepwater: -1, swimming: -1, water: 2 },
        { deepwater: -1, walking: -1, water: 1 }
      ]
    }
  } as {
    [id: string]: {
      income: GoodNumbers,
      ownRecipes: GoodNumbers[]
    }
  },

  commonRecipes =
    [
      { grass: -1, food: 1 },
      { seaweed: -1, food: 1 },

      { workingHard: -1, sowing: 1 },
      { workingHard: -1, axing: 1 },
      { workingHard: -1, digging: 1 },

      { working: -2, workingHard: 1 },
      { working: -1, magic: -5, workingHard: 3 },
      { working: -1, thinking: 1 },
      { workingHard: -1, digging: 1 },
      { workingHard: -3, tools: -1, digging: 10 },
      { magic: -1, fertilisers: 1 }
    ],

  //@ts-ignore
  races = {
    alicorn: {
      job: "alicorning",
      moving: "flying",
      recipes: [
        { alicorning: -1, magic: 100 },
        { alicorning: -1, working: 10 },
        { alicorning: -1, thinking: 100 },
      ]
    },
    horses: {
      job: "horsing",
      recipes: [
        { horsing: -1, workingHard: 1 }
      ]
    },
    unicorns: {
      job: "unicorning",
      income: { gems: -1 },
      recipes: [
        { unicorning: -1, magic: 1 },
        { unicorning: -3, thinking: 2 },
      ]
    },
    pegasi: {
      job: "pegasing",
      income: { fabric: -1 },
      moving: "flying",
      recipes: [
        { pegasing: -1, rain: 1 }
      ],
    },
    zebras: {
      job: "zebring",
      income: { jam: -1 },
    },
    deers: {
      job: "deering",
      income: { salt: -1 },
    },
    goats: {
      job: "goating",
      income: { tools: -1 },
    },
    seahorses: {
      job: "seahorsing",
      income: { lumber: -1 },
      moving: "swimming"
    }
  } as { [id: string]: Race }

