import { biomesByNames } from "./biomes"
import { GoodNumbers } from "./market"
import { Race } from "./races"
import { resources, convertResources, food, tradeables, consumerGoods } from "./resources"
import { objMap, objScale } from "./util"

export const
  iterationsPerTurn = 7,
  cellCapPerIncome = 100,
  consumptionMultiplier = .5,
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
        { trees: -1, workingHard: -1, lumber: 2 },
      ]
    },
    deposits: {
      income: { deposits: 3 },
      ownRecipes: [
        { deposits: -1, digging: -1, thinking: -1, ore: 3 },
        //{ thinking: -1, spelunking: 1 },
        { ore: -1, stone: 1 },
      ]
    },
    deepwater: {
      income: { deepwater: 3 },
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
      { working: -1, travel: 2 },
      { working: -3, electronics: -1, thinking: 20 },
      { working: -10, thinking: -10, engines: -1, energy: -10, workingHard: 50 },

      { workingHard: -1, digging: 1 },

      { workingHard: -1, thinking: -1, crafting: 1 },
      { workingHard: -10, thinking: -10, tools: -1, crafting: 40 },
      { working: -1, thinking: -2, engines: -1, fuel: -3, crafting: 15 },

      { vehicles: -1, fuel: -5, travel: 40 },
      { vehicles: -1, fuel: -5, diving: 30 },
      { engines: -1, fuel: -5, energy: 30 },
      { magic: -1, fertilisers: 1 },

      { crafting: -1, iron: -1, tools: 3 },
      { crafting: -1, lumber: -1, tools: 1 },

      { crafting: -1, food: -1, coal: -1, fertilisers: 3 },
      { crafting: -1, lumber: -1, fuel: 2 },
      { crafting: -1, coal: -1, fuel: 5 },
      { crafting: -1, oil: -1, fuel: 10 },
      { crafting: -1, sugarcane: -3, sugar: 5 },
      { crafting: -1, cotton: -1, fabric: 2 },
      { crafting: -1, fabric: -1, hats: 2 },
      { crafting: -1, rubber: -1, copper: -1, electronics: 2 },
      { crafting: -1, lumber: -1, fabric: -1, beds: 2 },
      { crafting: -1, rubber: -1, engines: -1, iron: -1, vehicles: 5 },
      { crafting: -3, iron: -2, engines: 3 },
      { crafting: -1, iron: -1, horseshoes: 2 },
      { crafting: -1, electronics: -1, iron: -1, engines: 10 },
      { crafting: -1, copper: -1, rubber: -1, electronics: 4 },

      { cooking: -1, sugar: -1, cacao: -1, chocolate: 3 },
      { cooking: -1, sugar: -1, bread: -1, apples: -1, pie: 10 },
      { cooking: -1, sugar: -1, apples: -1, jam: 5 },
      { cooking: -1, energy: -1, wheat: -1, bread: 5 },

      { magic: -1, fun: 5 },
      { electronics: -1, fun: 10 },
      { travel: -2, fun: 1 },

      { hats: -1, comfort: 2 },
      { beds: -1, comfort: 2 },
      { horseshoes: -1, comfort: 2 },
      { pearls: -1, comfort: 2 },

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
        { alicorning: -1, travel: 100 },
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
      income: { gems: -.2 },
      recipes: [
        { unicorning: -1, magic: 1 },
        { unicorning: -3, thinking: 2 },
      ]
    },
    pegasi: {
      job: "pegasing",
      income: { fabric: -.2 },
      //moving: "flying",
      recipes: [
        { pegasing: -1, water: 1 }
      ],
    },
    zebras: {
      job: "zebring",
      income: { jam: -.2 },
      recipes: [
        { zebring: -1, cooking: 3 }
      ],
    },
    deers: {
      job: "deering",
      income: { salt: -.2 },
    },
    goats: {
      job: "goating",
      income: { tools: -.2 },
      recipes: [
        { goating: -1, digging: 3 },
      ],
    },
    seahorses: {
      job: "seahorsing",
      income: { lumber: -.2 },
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
    /*village: {
    },
    dome: {
    }*/
  } as { [id: string]: Race },

  initSetting = () => {
    let icon = 48;
    for (let rn in races) {
      let race = races[rn]
      race.name = rn
      race.biomes = []
      race.income = {
        [race.job]: 10, 
        fertilisers: .3, 
        food: -.3, 
        fun: -.2, 
        comfort: -.1, 
        ...Object.fromEntries([...consumerGoods].map(t => [t, -.05])),
        ...race.income ?? {},
      }

      //race.income = objMap(race.income, k => k > 0 ? k : k)
      //race.moving ??= "walking"
      resources[race.name] = resources[race.job] = convertResources(icon);
      race.sprite = icon++;
    }

    races.alicorn.income = objScale(races.alicorn.income, 70)

    for (let b of Object.values(biomesByNames)) {
      for (let r of b.races) {
        races[r].biomes.push(b.name)
      }
    }

    food.forEach((f, i) => commonRecipes.push({
      [f]: -1,
      food: ~~(i / 3) + 1
    }))

  }


export const placeables = Object.keys(races).slice(8)
console.log(placeables);

