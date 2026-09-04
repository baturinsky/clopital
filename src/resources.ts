import { FIR } from "./biomes";

export const resources = {
  working: { sprite: 80 },
  "working hard": { sprite: 81 },
  crops: { sprite: 81, color: ["#0f0"] },
  minerals: { sprite: 83, color: ["#444", , "444"] },
  trees: { sprite: FIR },
  soil: { sprite: 105, color: ["#000"] },
  water: { sprite: 86, color: ["#08f", "#fff"] }
} as {
  [key: string]: {
    sprite: number
    color?: string[],
    sc?:HTMLCanvasElement
  }
}