import { FIR } from "./biomes";
import { asArray, objMap } from "./util";

export const
  convertResources = (raw: any) => {
    raw = asArray(raw);
    return { s: raw[0], c: raw[1]?.split(",") }
  },

  jobs = ["working","workingHard","digging"],

  //moving = ["walking", "flying", "swimming"],

  minerals = ["oil", "gems", "iron", "copper", "stone", "coal"],
  
  plants = ["cotton", "rubber"],

  food = ["grass", "seaweed", "wheat", "sugarcane", "apples", "honey", "bread", "jam", "cacao", "chocolate","pie"],

  items = ["fertilisers", "gems", "tools", "lumber", "engines", "fabric", "hats", "iron", "beds", "fuel"],

  consumerGoods = ["apples", "wheat", "honey", "jam", "pie", "cacao", "chocolate", "gems", "tools", "lumber", "engines", "fabric", "hats", "iron", "beds", "fuel"],

  //majorNeeds = ["food", "comfort", "fun"],

  tradeables = new Set([...food, ...items, ...minerals]),

  resources = objMap({
    unknown: 106,
    working: 80,
    workingHard: 81,
    //sowing: 98,
    crops: [82, "#f00,#00f"],
    deposits: 9,
    ore: [83, "#00f,,#008"],
    coal: [83, "#000"],
    iron: [84, "#888,"],
    copper: [84, "#f60,"],
    //huts: [84, "#800,"],
    salt: [83, "#fff,,#aaa"],
    trees: FIR,
    soil: [105, "#000"],
    deepwater: [86, "#048,#fff"],
    irrigation: [86, "#00f,#fff"],
    water: [86, "#08f,#fff"],

    tools: [80, "#88a,,#55a"],

    travel: [100, "#00f"],
    walk: [100, "#fff"],
    horseshoes: [100, "#666"],
    diving: [100, "#048"],

    /*flying: [101, "#fff"],
    swimming: [102, "#fff"],*/

    gems: [85, "#f08,#fff"],
    oil: [93, "#000,,#222"],
    rubber: [86, "#840,,#222"],
    honey: [96, "#f80"],
    jam: [96, "#f08"],
    cacao: [82, "#a40"],
    moss: [105, "#4af,#888"],
    wheat: [113, "#fe0"],
    fuel: [93, ",,#0f0"],
    cotton: [82, "#fff"],
    apples: [99, "#f00"],
    pearls: [114, "#aaa"],

    vehicles: 116,
    beds: [117, "#a40,,#fff"],
    //construction: [56, "#000"],
    //houses: 56,
    //shelter: [56, "#0f0"],
    fun: [94, "#0f0"],
    comfort: 117,

    happiness: 95,

    walkFar: [100, "#f80"],
    /*flyingFar: [101, "#f80"],
    swimmingFar: [102, "#f80"],*/

    crafting: [97],

    stone: [83, "#444,,#444"],
    lumber: [112, "#fa6"],
    chocolate: [112, "#820"],
    axing: 109,
    grass: [105, "#4a4"],
    sugarcane: [90, "#0a0,#0a0"],
    seaweed: [90, "#f0f,#0aa"],
    magic: 94,
    warp: 94,
    energy: [94, "#00f,#00f"],
    food: [99, "#0f0,#000"],
    cooking: [96, "#fff"],
    fertilisers: [89, "#620,#220"],
    sugar: [89, "#fff,#aaa"],
    thinking: [91, "#fca"],
    //spelunking: [91, "#006"],
    digging: 110,

    fabric: [91, "#f0f"],
    hats: [98, "#fff"],

    engines: [92, "#444"],
    electronics: [92, "#0a0"],

    tab0: [80, "#008"],
    tab1: [80, "#aaa,,#aaa"],
    tab2: 95,
    tab3: 115,
    tab4: [115, "#aaa,,#aaa"],

    pie: 84,
    bread: [84, "#822"],

  }, convertResources) as {
    [key: string]: {
      /**sprite */
      s: number
      /** color */
      c?: string[],
      sc?: HTMLCanvasElement
    }
  }


  //console.log(jobs,food,items,majorNeeds);