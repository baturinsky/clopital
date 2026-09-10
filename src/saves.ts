import { Agent, craScale } from "./agent"
import { type Cell } from "./cell"
import { generateUniverse } from "./main"
import { races } from "./setting"
import { state, select, queen } from "./state"
import { updateTip } from "./ui"
import { u } from "./universe"
import { GoodNumbers } from "./market"
import { objFilter, objMap } from "./util"

declare const DEBUG: boolean


type AgentSaveFormat = {
  name: string,
  size: number,
  steps: number,
  cell: number,
  dest: number,
  happiness: number,
  consumed: any,
  //happinessG: any,
  race: string
  stock: GoodNumbers
  seen: boolean
}

type AllSaveFormat = typeof state & { c: { [at: number]: AgentSaveFormat }, a: AgentSaveFormat[], s:number[] }

export const
  savePrefix = "CLP:",
  saveTitlePrefix = "CLP!",

  saveAll = (slot: string | number = 0) => {
    //state.namesLeft = namePool.length
    updateTip()
    let data = {
      ...state,
      c: objMap(objFilter(u.c, c => c.woke), (c:Cell) => save(c)),
      a: u.a.map(agent => save(agent)),
      s: u.c.map(c=>c.seen?1:0)
    }

    

    if (DEBUG) {
      console.log(data, JSON.stringify(data).length);
    }
    
    localStorage[savePrefix + slot] = JSON.stringify(data)
    localStorage[saveTitlePrefix + slot] = new Date().toISOString()
  },
  loadAll = (slot: string | number = 0) => {
    let sdata = localStorage[savePrefix + slot]
    if (sdata) {
      generateUniverse()
      let data = JSON.parse(sdata) as AllSaveFormat;
      Object.assign(state, data);
      delete (state as any).c
      delete (state as any).s
      u.c.forEach((cell, at) => {
        load(cell, data.c[at]);
        cell.a = []
      })

      u.a = []
      for (let d of data.a) {
        let agent = new Agent(u.c[d.cell as number])
        load(agent, d)
        agent.initMarket();
        agent.visit(agent.cell)
        agent.recomp()
      }

      data.s.forEach((v,i)=>u.c[i].seen = !!v)

      return true;
    }
    return false

  },

  saveAsIs = (v: any) => Object.fromEntries([
    "name",
    "turns",
    "size",
    "steps",
    "happiness",
    "consumed"
  ].map(k => [k, (v as any)[k]])),

  save = (v: Agent | Cell) => {
    return {

      stock: v.stock,
      //cra: objMap(v.cra, v => ~~(v * craScale)),

      ...v instanceof Agent ? {
        ...saveAsIs(v),
        dest: v.dest?.at,
        cell: v.cell.at,
        race: v.race.name
      }
        : {}
    }
  },

  load = (a: Agent | Cell, v: AgentSaveFormat) => {
    v && Object.assign(a, {

      //cra: objMap(a.cra, v => v / craScale),
      stock: v.stock,

      ...a instanceof Agent ? {
        ...saveAsIs(v),
        cell: u.c[v.cell as number],
        dest: u.c[v.dest as any],
        race: races[v.race as string],
      } : {}
    } as Partial<Agent>)
  }
