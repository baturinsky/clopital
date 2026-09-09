import { GoodNumbers } from "./market"
import { Race } from "./races"

export const
  iterationsPerTurn = 7,
  cellCapPerIncome = 20,
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
        { soil: -1, irrigation: -1, fertilisers: -2, sowing: -1, crops: 4 },
        { crops: -1, grass: 1 }
      ]
    },
    trees: {
      income: { trees: 1 },
      ownRecipes: [
        { trees: -1, axing: -1, lumber: 1 },
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
      { workingHard: -1, sowing: 1 },
      { workingHard: -1, axing: 1 },
      { workingHard: -1, digging: 1 },

      { workingHard: -3, tools: -1, digging: 10 },
      { workingHard: -3, tools: -1, axing: 10 },
      { workingHard: -3, tools: -1, sowing: 10 },

      { workingHard: -1, tools: -1, thinking: -1, construction: 1 },

      { working: -2, workingHard: 1 },
      { working: -1, magic: -5, workingHard: 3 },
      { working: -1, thinking: 1 },

      { working: -1, thinking: -1, },
      { engines: -1, fuel: -3, energy: 10 },

      { working: -3, electronics: -1, thinking: 10 },
      { working: -1, thinking: 1, energy: -1, workingHard: 10 },

      { magic: -1, fertilisers: 1 },

      { workingHard: -1, lumber: -1, fuel: 1 },
      { workingHard: -1, coal: -1, fuel: 3 },

      { manufacturing: -1, sugarcane: -3, sugar: 1 },
      { manufacturing: -1, cotton: -1, fabric: 1 },
      { manufacturing: -1, fabric: -1, clothes: 1 },
      { manufacturing: -1, rubber: -1, copper: -1, electronics: 1 },
      { manufacturing: -1, lumber: -1, fabric: -1, beds: 1 },
      { manufacturing: -1, rubber: -1, engines: -1, iron: -1, cars: 1 },
      { manufacturing: -1, coal: -1, fuel: 10 },
      { manufacturing: -1, oil: -1, fuel: 10 },
      { manufacturing: -1, rubber: -1, engines: -1, iron: -1, cars: 1 },
      { manufacturing: -1, iron: -1, engines: 1 },
      { manufacturing: -1, electronics: -1, iron: -1, engines: 5 },
      { manufacturing: -1, copper: -1, rubber: -1, electronics: 1 },

      { cars: -1, fuel: -3, walking: 10 },
      { walking: -1, travel: 1 },
      { swimming: -1, travel: 1 },
      { flying: -1, travel: 3 },

      { construction: -1, lumber: -1, huts: 1 },
      { construction: -1, stone: -1, fabric: -1, houses: 1 },
      { construction: -1, stone: -1, iron: -1, engines: -1, generators: 1 },

      { cooking: -1, sugar: -1, wheat: -1, apples: -1, pie: 1 },
      { cooking: -1, sugar: -1, apples: -1, jam: 1 },

    ] as GoodNumbers[],

  //@ts-ignore
  races = {
    alicorn: {
      job: "alicorning",
      moving: "flying",
      wm: 10,
      recipes: [
        { alicorning: -1, magic: 100 },
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
    },
    /*farm: {
    },
    mine: {
    },
    forestry: {
    },
    well: {
    },
    manufacture: {
    },*/
    village: {
    },
    dome: {
    }
  } as { [id: string]: Race }

export const placeables = Object.keys(races).slice(8)
console.log(placeables);

