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
        { soil: -1, irrigation: -1, fertilisers: -2, digging: -1, crops: 4 },
        { crops: -1, grass: 1 }
      ]
    },
    trees: {
      income: { trees: 1 },
      ownRecipes: [
        { trees: -1, workingHard: -1, lumber: 1 },
      ]
    },
    deposits: {
      income: { deposits: 1 },
      ownRecipes: [
        { deposits: -1, digging: -1, thinking: -1, ore: 1 },
        //{ thinking: -1, spelunking: 1 },
        { ore: -1, stone: 1 },
      ]
    },
    deepwater: {
      income: { deepwater: 1 },
      ownRecipes: [
        { deepwater: -1, seahorsing: -1, seaweed: 3 },
        { deepwater: -1, seahorsing: -1, water: 3 },
        { deepwater: -1, travel: -1, water: 1 },
        { deepwater: -1, travel: -1, seaweed: 1 }
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
      { working: -2, workingHard: 1 },
      { working: -1, magic: -5, workingHard: 3 },
      { working: -1, thinking: 1 },
      { working: -1, cooking: 1 },
      { working: -1, travel: 1 },
      { working: -3, electronics: -1, thinking: 10 },
      { working: -1, thinking: -1, energy: -2, workingHard: 10 },

      { workingHard: -1, digging: 1 },

      { workingHard: -1, thinking: -1, crafting: 1 },
      { workingHard: -1, thinking: -1, tools: -1, crafting: 3 },
      { working: -1, thinking: -2, engines: -1, fuel: -3, crafting: 15 },

      { cars: -1, fuel: -3, travel: 10 },
      { cars: -1, fuel: -3, diving: 10 },
      { engines: -1, fuel: -3, energy: 10 },
      { magic: -1, fertilisers: 1 },

      { crafting: -1, iron: -1, tools: 2 },
      { crafting: -1, lumber: -1, tools: 1 },

      { crafting: -1, food: -1, coal: -1, fertilisers: 3 },
      { crafting: -1, lumber: -1, fuel: 1 },
      { crafting: -1, coal: -1, fuel: 3 },
      { crafting: -1, oil: -1, fuel: 10 },
      { crafting: -1, sugarcane: -3, sugar: 1 },
      { crafting: -1, cotton: -1, fabric: 1 },
      { crafting: -1, fabric: -1, clothes: 1 },
      { crafting: -1, rubber: -1, copper: -1, electronics: 1 },
      { crafting: -1, lumber: -1, fabric: -1, beds: 1 },
      { crafting: -1, rubber: -1, engines: -1, iron: -1, cars: 1 },
      { crafting: -1, iron: -1, engines: 1 },
      { crafting: -1, electronics: -1, iron: -1, engines: 5 },
      { crafting: -1, copper: -1, rubber: -1, electronics: 1 },

      { cooking: -1, sugar: -1, cacao: -1, chocolate: 1 },
      { cooking: -1, sugar: -1, wheat: -1, apples: -1, pie: 1 },
      { cooking: -1, sugar: -1, apples: -1, jam: 1 },

      { magic: -1, fun: 5 },
      { electronics: -1, fun: 10 },
      { travel: -2, fun: 1 },

      { clothes: -1, comfort: 1 },
      { beds: -1, comfort: 1 },

    ] as GoodNumbers[],

  //@ts-ignore
  races = {
    alicorn: {
      job: "alicorning",
      //moving: "flying",
      wm: 10,
      recipes: [
        { alicorning: -1, magic: 100 },
        { alicorning: -1, thinking: 100 },
      ]
    },
    horses: {
      job: "horsing",
      recipes: [
        { horsing: -1, workingHard: 1 },
        { horsing: -10, tools: -1, workingHard: 20 },
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
      //moving: "flying",
      recipes: [
        { pegasing: -1, water: 1 }
      ],
    },
    zebras: {
      job: "zebring",
      income: { jam: -1 },
      recipes: [
        { zebring: -1, cooking: 3 }
      ],
    },
    deers: {
      job: "deering",
      income: { salt: -1 },
    },
    goats: {
      job: "goating",
      income: { tools: -1 },
      recipes: [
        { goating: -1, digging: 3 },
      ],
    },
    seahorses: {
      job: "seahorsing",
      income: { lumber: -1 },
      recipes: [
        { seahorsing: -1, diving: 2 },
      ],
      //moving: "swimming"
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

