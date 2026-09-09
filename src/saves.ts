import { Agent, craScale } from "./agent"
import { type Cell } from "./cell"
import { generateUniverse } from "./main"
import { races } from "./setting"
import { state, select, queen } from "./state"
import { updateTip } from "./ui"
import { u } from "./universe"
import { debounce, objMap } from "./util"
import { GoodNumbers } from "./market"

type AgentSaveFormat = {
  name: string,
  size: number,
  steps: number,
  cell: number,
  dest: number,
  race: string
  stock: GoodNumbers
  seen: boolean
}

type AllSaveFormat = typeof state & { c: { [at: number]: AgentSaveFormat }, a: AgentSaveFormat[] }

export const
  savePrefix = "CLP:",
  saveTitlePrefix = "CLP!",

  saveAll = (slot: string | number = 0) => {
    //state.namesLeft = namePool.length
    updateTip()
    let data = {
      ...state,
      c: Object.fromEntries(u.c.map((cell, i) => [i, cell.woke ? undefined : save(cell)])),
      a: u.a.map(agent => save(agent))
    }
    console.log(data);
    localStorage[savePrefix + slot] = JSON.stringify(data)
    localStorage[saveTitlePrefix + slot] = new Date().toISOString()
  },
  loadAll = (slot: string | number = 0) => {
    debugger
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
        agent.minit();
        agent.recomp()
        agent.visit(agent.cell)
      }

      return true;
    }
    return false

  },
  save = (v: Agent | Cell) => {
    return {

      stock: v.stock,
      cra: objMap(v.cra, v => ~~(v * craScale)),

      ...v instanceof Agent ? {
        name: v.name,
        size: v.size,
        steps: v.steps,
        dest: v.dest?.at,
        cell: v.cell.at,
        race: v.race.name
      }
        : {
          seen: v.seen
        }
    }
  },

  load = (a: Agent | Cell, v: AgentSaveFormat) => {
    v && Object.assign(a, {

      cra: objMap(a.cra, v => v / craScale),
      stock: v.stock,

      ...a instanceof Agent ? {
        name: v.name,
        size: v.size,
        steps: v.steps,
        cell: u.c[v.cell as number],
        dest: u.c[v.dest as any],
        race: races[v.race as string],
      } : {
        seen: v.seen
      }
    } as Partial<Agent>)
  }
