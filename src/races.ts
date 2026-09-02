import { Biome, biomesByNames } from "./biomes"
import { GoodNumbers } from "./market"

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
  alicorns: {
    job: "alicorning"
  },
  horses: {
    job: "horsing",
    recipes: [
      { "horsing": -1, "working hard": 1 }
    ]
  },
  unicorns: {
    job: "unicorning",
    income: { gems: -1 },
    recipes: [
      { unicorning: -1, magic: 1 }
    ]
  },
  pegasi: {
    job: "pegasing",
    income: {},
    moving: "flying",
    recipes: [
      { pegasing: -1, rain: 1 }
    ]
  },
  zebras: {
    job: "zebring",
    income: {},
  },
  deers: {
    job: "deering",
    income: {},
  },
  goats: {
    job: "goating",
    income: {},
  },
  seahorses: {
    job: "seahorsing",
    income: {},
    moving: "swimming",
    recipes: [
    ]
  }
} as { [id: string]: Race }

export const
  recipes = [
    { $ing: -1, working: 1 },
    { working: -1, "working hard": 1 },
    { working: -1, thinking: 1 },
    { thinking: -1, spelunking: 1 },
    { strength: -1, digging: 1 },
    { strength: -3, tools: -1, digging: 10 },
    { magic: -1, fertilizer: 1 },
    { rain: -1, irrigation: 1 }
  ],

  farm = {
    recipes: [
      { soil: -1, irrigation: 1 },
      { soil: -1, fertilizer: 1 },
      { soil: -1, irrigation: -1, fertilizer: -1, plant: -1, harvest: 1 },
      { harvest: -1, $fruit: 1 },
    ]
  },

  mine = {
    recipes: [
      { spelunking: -1, digging: -1, $ore: 1 }
    ]
  },

  lumbermill = {

  },

  well = {

  }

export const initRaces = () => {
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

  console.log(races);
},
  raceHabitabiliy = (race: Race, biome: Biome) => {
    return biome.habitability + (biome.races.find(race.name) ? 1 : 0);
  }