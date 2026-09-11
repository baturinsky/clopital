import { type Agent } from "./agent";
import { Cell } from "./cell";
import { centerOn, prerenderUniverse } from "./renderer";
import { agentInfo, asList, Info, Tip, updateDiv, updateTip } from "./ui";
import { u } from "./universe";
import { cap1, clamp, debounce, fixed, japaneseName, loop, objStripFalsy, Vec2 } from "./util";

declare const DEBUG: boolean
declare var TIP: HTMLDivElement, INFO: HTMLDivElement, MID: HTMLDivElement, BTN: HTMLDivElement;

export const  tabs = ["jobs done", "possible jobs", "needs", "present", "trades and local jobs"];


export let state = {
  scale: 4,
  seed: 1,
  topLeftAt: [0, 0] as Vec2,
  targetTLA: [0, 0] as Vec2,
  cellPointed: undefined as number | undefined,
  /**index of the selected actor */
  selected: 0,
  /** current turn */
  turn: 0,
  //locked: { } as GoodNumbers,
  tab: 0 as string|number,
  expectation: 0
}


export type State = typeof state;

let lastCell: Cell | undefined;

export const
  update = (d: Partial<State> = {}) => {
    Object.assign(state, d);
    let tl = state.topLeftAt;
    //tl[0] = clamp(-ww * .5 * photoScale[0] * state.scale, tl[0], ww * 1.8 * photoScale[0] * state.scale);
    //  tl[1] = clamp(-wh * .5 * photoScale[1] * state.scale, tl[1], wh * 1.8 * photoScale[1] * state.scale);
    state.topLeftAt = tl;
  },
  debouncedPrerender = debounce(() => prerenderUniverse()),
  pointedCell = () => u.c[state.cellPointed as any],
  selected = () => u.a[state.selected],
  select = (a: Agent = selected()) => {
    if (!a)
      return;
    update({ selected: u.a.indexOf(a) })
    centerOn(a.cell)

    if (DEBUG) {
      console.log(a);
    }

    //updateBuildButton()

    //reportRecipeStats(a);

    INFO.className = a.happy()?"h":"u";

    updateDiv(Info, ...agentInfo(a))
  },
  //agentPointed = () => pointedCell().a[0],
  queen = () => u?.a.find(a => a.queen()) as Agent,
  queenCell = () => queen()?.cell,
  //namePool = [...new Set<string>(loop(1e5, japaneseName))],
  //nameById = (id: number) => cap1(namePool[id % namePool.length])

  /** Calculate loyal agents */
  updateExpectation = () => {
    update({ expectation: 5 + ~~(u.a.filter(a => a.village() || a.happiness > 999).length/3) })
  }
