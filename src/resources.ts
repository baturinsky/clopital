import { FIR } from "./biomes";
import { asArray, objMap } from "./util";

export const resources = objMap({
  working: 80,
  workingHard: 81,
  crops: [81, "#0f0"],
  minerals: [83, "#444,,#444"],
  trees: FIR,
  soil: [105, "#000"],
  deepwater: [86, "#048,#fff"],
  lumber: [108, "#a80"],
  sowing: 98,
  berries: [99, "#808,,#fff"],
  axing: 109,
  grass: [90, "#0a0,#0a0"]
}, (raw: any) => {
  raw = asArray(raw);
  return { sprite: raw[0], color: raw[1]?.split(",") }
}) as {
  [key: string]: {
    sprite: number
    color?: string[],
    sc?: HTMLCanvasElement
  }
}

console.log("!", resources);