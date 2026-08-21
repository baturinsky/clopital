import { solveFloat } from "./yalps/YALPS";

export function solvePlanet() {
  const model = {
    objective: "happy",
    constraints: {
      horse: { min: -100 },
      hunger: { min: -100 },
      meadow: { min: -200 },
      field: { min: -70 },
      work: { min: 0 },
      food: { min: 0 }
    },
    variables: {
      horseWork: { horse: -1, work: 1.5 },
      horseRest: { horse: -1, happy: 0.1 },
      grazing: { work: -1, meadow: -1, food: 0.5 },
      farming: { work: -1, field: -1, food: 1 },
      eat: { food: -1, hunger: -1, happy: 1 }
    }
  }

  const solution = solveFloat(model)

  console.log(solution);
}