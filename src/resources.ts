import { FIR } from "./biomes";
import { asArray, objMap } from "./util";

export const
  convertResources = (raw: any) => {
    raw = asArray(raw);
    return { sprite: raw[0], color: raw[1]?.split(",") }
  },

  resources = objMap({
    working: 80,
    workingHard: 81,
    crops: [82, "#0f0"],
    minerals: [83, "#444,,#444"],
    trees: FIR,
    soil: [105, "#000"],
    deepwater: [86, "#048,#fff"],
    water: [86, "#08f,#fff"],
    walking: 100,
    swimming: 101,
    lumber: [108, "#a80"],
    sowing: 98,
    berries: [99, "#808,,#fff"],
    axing: 109,
    grass: [90, "#0a0,#0a0"],
    magic: 94,
    food: 97,
    fertilizer: [98, "#a60,#840"],
    thinking: [91, "#fca"],
    spelunking: [91, "#006"],
    digging: 110,
    transport: 100
  }, convertResources) as {
    [key: string]: {
      sprite: number
      color?: string[],
      sc?: HTMLCanvasElement
    }
  }
