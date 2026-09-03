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

export const recipes = {
  common: [
    { horsing: -2, "working hard": 3 },
    { pegasing: -1, rain: 1 },
    { unicorning: -1, magic: 1 },

    { $ing: -1, working: 1 },
    { working: -1, "working hard": 1 },
    { working: -1, magic: -5, "working hard": 3 },
    { working: -1, thinking: 1 },
    { thinking: -1, spelunking: 1 },
    { strength: -1, digging: 1 },
    { strength: -3, tools: -1, digging: 10 },
    { magic: -1, fertilizer: 1 },
    { rain: -1, irrigation: 1 }
  ],

  farm: [
    { soil: -1, irrigation: 1 },
    { soil: -1, fertilizer: 1 },
    { soil: -1, irrigation: -1, fertilizer: -1, plant: -1, harvest: 1 },
    { harvest: -1, $fruit: 1 },
  ],

  mine: [
    { digging: -5, spelunking: 1 },
    { spelunking: -1, digging: -1, $mineral: 1 }
  ],

  forester: [
    { trees: -1, wood: 1 }
  ],

  well: []
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
    return biome.habitability + (biome.races.indexOf(race.name) < 0 ? 0 : 1);
  }