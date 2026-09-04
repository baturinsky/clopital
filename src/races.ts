import { Biome, biomesByNames } from "./biomes"
import { GoodNumbers, MarketAgentParameters } from "./market"

export type Race = {
  name: string
  job: string,
  recipes: GoodNumbers[]
  income: GoodNumbers
  moving: string
  biomes: string[]
  sprite: number
}

//@ts-ignore
export const races = {
  alicorn: {
    job: "alicorning",
    moving: "flying"
  },
  horses: {
    job: "horsing",
  },
  unicorns: {
    job: "unicorning",
    income: { gems: -1 },
  },
  pegasi: {
    job: "pegasing",
    income: { fabric: -1 },
    moving: "flying",
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
    income: { wood: -1 },
    moving: "swimming"
  }
} as { [id: string]: Race }



export const equineRecipes =
  [
    { horsing: -2, "working hard": 3 },
    { pegasing: -1, rain: 1 },
    { unicorning: -1, magic: 1 },

    {grass: -3, food: 1},
    {seaweed: -3, food: 1},

    { working: -1, "working hard": 1 },
    { working: -1, magic: -5, "working hard": 3 },
    { working: -1, thinking: 1 },
    { thinking: -1, spelunking: 1 },
    { strength: -1, digging: 1 },
    { strength: -3, tools: -1, digging: 10 },
    { magic: -1, fertilizer: 1 },
    { rain: -1, irrigation: 1 }
  ]

export const
  initRaces = () => {
    let sprite = 48;
    for (let rn in races) {
      races[rn].name = rn
      races[rn].biomes = []
      races[rn].sprite = sprite++;
    }

    for (let b of Object.values(biomesByNames)) {
      for (let r of b.races) {
        races[r].biomes.push(b.name)
      }
    }
  },
  raceHabitabiliy = (race: Race, biome: Biome) => {
    return biome.habitability + (biome.races.indexOf(race.name) < 0 ? 0 : 1);
  },
  raceAgentParameters = (race: Race) => {
    let ownRecipes = [...equineRecipes,
    { [race.job]: -1, working: 1 },
    ]

    return {
      ownRecipes,
      income: { ...race.income, [race.job]: 1 }
    } as MarketAgentParameters
  }

