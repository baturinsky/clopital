import { Biome, biomesByNames } from "./biomes"
import { GoodNumbers, MarketAgentParameters } from "./market"
import { convertResources, resources } from "./resources"
import { commonRecipes, races } from "./setting"

export type Race = {
  name: string
  job: string,
  recipes: GoodNumbers[]
  income: GoodNumbers
  moving: string
  biomes: string[]
  sprite: number
}

export const
  initRaces = () => {
    let icon = 48;
    for (let rn in races) {
      let race = races[rn]
      race.name = rn
      race.biomes = []
      race.moving ??= "walking"
      resources[race.job] = convertResources(icon);
      race.sprite = icon++;
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
    let ownRecipes = [...commonRecipes,
    ...race.recipes ?? [],
    { [race.job]: -1, working: 1 },
    { [race.job]: -1, [race.moving]: race.moving == "swimming" ? 20 : 10 },
    ]

    return {
      ownRecipes,
      income: { [race.job]: 1, food:-1, ...race.income }
    } as MarketAgentParameters
  }

