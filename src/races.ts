import { Biome, biomesByNames } from "./biomes"
import { GoodNumbers, MarketAgentParameters } from "./market"
import { convertResources, food, resources, tradeables } from "./resources"
import { commonRecipes, races } from "./setting"

export const
  flyers = ["alicorn", "pegasi"],
  flyersAndSwimmers = [...flyers, "seahorses"]

export type Race = {
  name: string
  job: string,
  recipes: GoodNumbers[]
  income: GoodNumbers
  //moving: string
  biomes: string[]
  sprite: number
  wm: number
}

export const

  raceHabitabiliy = (race: Race, biome: Biome) => {
    return biome.habitability + (biome.races.indexOf(race.name) < 0 ? 0 : 1);
  },

  raceAgentParameters = (race: Race) => {
    let ownRecipes = [...commonRecipes,
    ...race.recipes ?? [],
    ...race.job ? [
      { [race.job]: -1, working: race.wm ?? 1 },
      { [race.job]: -1, fun: 1 },
      { [race.job]: -1, travel: 1 }] : [],
    ]

    if (!flyersAndSwimmers.includes(race.name)) {
      ownRecipes.push({ [race.job]: -10, horseshoes: -1, travel: 20 })
    }


    return {
      ownRecipes,
      income: race.job ? 
      { [race.job]: 1, 
        food: -1, 
        fun: -.5, 
        comfort: -.5, 
        fertilisers: .1, 
        ...race.income        
      } : {}
    } as MarketAgentParameters
  }

