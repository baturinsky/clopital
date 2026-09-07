import { FIR } from "./biomes";
import { asArray, objMap } from "./util";

export const
  convertResources = (raw: any) => {
    raw = asArray(raw);
    return { sprite: raw[0], color: raw[1]?.split(",") }
  },

  jobs = ["working","workingHard","sowing"],

  moving = ["walking", "flying", "swimming"],

  food = ["apples", "honey", "coffee", "wheat", "sugarcane", "seaweed", "bread", "jam", "pie"],

  items = ["gems", "tools", "lumber", "cotton", "engine", "wagon", "fabric", "clothes", "iron", "gold", "beds"],

  resources = objMap({
    unknown: 106,
    working: 80,
    workingHard: 81,
    sowing: 98,
    crops: [82, "#0f0"],
    deposits: 8,
    ore: [83, "#00f,,#008"],
    salt: [83, "#fff,,#aaa"],
    trees: FIR,
    soil: [105, "#000"],
    deepwater: [86, "#048,#fff"],
    irrigation: [86, "#00f,#fff"],
    water: [86, "#08f,#fff"],

    tools: [80, "#88a,,#55a"],

    walking: [100, "#fff"],
    flying: [101, "#fff"],
    swimming: [102, "#fff"],

    gems: [85, "#f08,#fff"],
    oil: [93, "#000,,#222"],
    honey: [96, "#f80,#fff,#aaf"],
    coffee: [96, "#000,#fff,#aaf"],
    moss: [105, "#4a4,#aa4"],
    wheat: [113, "#fe0"],
    gas: [93, "#88f,,#fff"],
    cotton: [82, "#fff"],
    apples: [99, "#f00,,#fff"],
    pearls: [114, "#aaa,,#fff"],


    walkingFar: [100, "#f80"],
    flyingFar: [101, "#f80"],
    swimmingFar: [102, "#f80"],

    stone: [83, "#444,,#444"],
    lumber: [112, "#a80"],
    berries: [99, "#808,,#fff"],
    axing: 109,
    grass: [90, "#0a0,#0a0"],
    seaweed: [90, "#f0f,#0aa"],
    magic: 94,
    food: 87,
    fertilisers: [89, "#620,#220"],
    thinking: [91, "#fca"],
    spelunking: [91, "#006"],
    digging: 110
  }, convertResources) as {
    [key: string]: {
      sprite: number
      color?: string[],
      sc?: HTMLCanvasElement
    }
  }


  console.log(jobs,moving,food,items);