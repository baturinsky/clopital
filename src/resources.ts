import { FIR } from "./biomes";
import { asArray, objMap } from "./util";

export const
  convertResources = (raw: any) => {
    raw = asArray(raw);
    return { sprite: raw[0], color: raw[1]?.split(",") }
  },

  jobs = ["working","workingHard","sowing"],

  moving = ["walking", "flying", "swimming"],

  minerals = ["oil", "gems", "iron", "copper"],
  
  plants = ["cotton", "rubber", "coffee"],

  food = ["grass", "seaweed", "sugarcane", "apples", "wheat", "honey", "jam", "pie"],

  items = ["gems", "tools", "lumber", "engines", "fabric", "clothes", "iron", "gold", "beds", "fertilisers", "fuel"],

  majorNeeds = ["food", "shelter", "comfort", "fun", "travel"],

  tradeables = new Set([...food, ...items]),

  resources = objMap({
    unknown: 106,
    working: 80,
    workingHard: 81,
    sowing: 98,
    crops: [82, "#0f0"],
    deposits: 8,
    ore: [83, "#00f,,#008"],
    coal: [83, "#000"],
    iron: [84, "#aaa,"],
    copper: [84, "#f60,"],
    huts: [84, "#800,"],
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
    rubber: [86, "#840,,#222"],
    honey: [96, "#f80"],
    jam: [96, "#f08"],
    coffee: [96, "#000,#fff,#aaf"],
    moss: [105, "#4af,#888"],
    wheat: [113, "#fe0"],
    fuel: 93,
    cotton: [82, "#fff"],
    apples: [99, "#f00"],
    pearls: [114, "#aaa"],

    cars: 116,
    travel: [116, "#000"],
    beds: 117,
    construction: [56, "#000"],
    houses: 56,

    happiness: 95,

    walkingFar: [100, "#f80"],
    flyingFar: [101, "#f80"],
    swimmingFar: [102, "#f80"],

    manufacturing: [97],

    stone: [83, "#444,,#444"],
    lumber: [112, "#a80"],
    axing: 109,
    grass: [105, "#4a4"],
    sugarcane: [90, "#0a0,#0a0"],
    seaweed: [90, "#f0f,#0aa"],
    magic: 94,
    energy: [94, "#00f,#00f"],
    food: [99, "#000,#000"],
    cooking: [96, "#fff"],
    fertilisers: [89, "#620,#220"],
    sugar: [89, "#fff,#aaa"],
    thinking: [91, "#fca"],
    spelunking: [91, "#006"],
    digging: 110,

    fabric: [91],
    clothes: [91, "#ff0"],

    generators: 92,
    engines: [92, "#444"],
    electronics: [92, "#0a0"],

    tab0: [80, "#008"],
    tab1: [80, "#aaa,,#aaa"],
    tab2: 95,
    tab3: 115,

    huts: 61,

    pie: 84,
  }, convertResources) as {
    [key: string]: {
      sprite: number
      color?: string[],
      sc?: HTMLCanvasElement
    }
  }


  console.log(jobs,moving,food,items,majorNeeds);