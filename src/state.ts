import { type Agent } from "./agent";
import { Cell } from "./cell";
import { centerOn, prerenderUniverse } from "./renderer";
import { u } from "./universe";
import { cap1, clamp, debounce, fixed, japaneseName, loop, objStripFalsy, Vec2 } from "./util";

declare const DEBUG: boolean

export const tabs = ["actions done", "possible actions", "needs", "trades and land actions", "gifts"];

type PageName = "saves" | "game" | "research";

export let state = {
  scale: 4,
  seed: 1,
  land: 4,
  topLeftAt: [0, 0] as Vec2,
  targetTLA: [0, 0] as Vec2,
  cellPointed: undefined as number | undefined,
  clicked: undefined as number | undefined,
  /**index of the selected actor */
  selected: 0,
  /** current turn */
  turn: 1,
  //locked: { } as GoodNumbers,
  tab: 0 as string | number,
  expectation: 0,
  page: "saves" as PageName
}


export type State = typeof state;


export const
  update = (d: Partial<State> = {}) => {
    Object.assign(state, d);
    let tl = state.topLeftAt;
    state.topLeftAt = tl;
    store.setState(state)
  },
  debouncedPrerender = debounce(() => prerenderUniverse()),
  pointedCell = () => u?.c[state.cellPointed as any],
  selected = () => u?.a[state.selected],
  select = (a: Agent = selected()) => {
    if (!a)
      return;
    delete a._pathfindData
    a.pathfindData()

    update({ selected: u.a.indexOf(a) })
    centerOn(a.cell)

    if (DEBUG) {
      console.log(a);
    }

    //updateBuildButton()

    //reportRecipeStats(a);

    /*INFO.className = a.happy() ? "h" : "u";

    updateDiv(Info, ...agentInfo(a))*/
  },
  //agentPointed = () => pointedCell().a[0],
  queen = () => u?.a.find(a => a.queen()) as Agent,
  queenCell = () => queen()?.cell,
  //namePool = [...new Set<string>(loop(1e5, japaneseName))],
  //nameById = (id: number) => cap1(namePool[id % namePool.length])

  /** Calculate loyal agents */
  updateExpectation = () => {
    update({ expectation: ~~(u.a.filter(a => a.village() || a.happiness > 999).length / 3) })
  },
  gotoPage = (page: PageName) => {
    update({ page })
  }


const listeners = new Set<() => void>();

export const store = {
  getState: () => state,
  setState: (patch: Partial<State>) => {
    state = { ...state, ...patch };    
    //listeners.forEach((l) => l());
    debouncedBroadcast()
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

let debouncedBroadcast = debounce(()=>listeners.forEach((l) => l()), 50)
