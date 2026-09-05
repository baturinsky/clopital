import { type Agent } from "./agent";
import { Cell } from "./cell";
import { regenerateUniverse } from "./main";
import { centerOn, prerenderUniverse } from "./renderer";
import { hexDist, photoScale, wh, ww } from "./root";
import { agentInfo, asList, asTable, info, tip } from "./ui";
import { u } from "./universe";
import { cap1, clamp, debounce, fixed, japaneseName, loop, Vec2 } from "./util";

export let state = {
  scale: 1,
  seed: 1,
  topLeftAt: [0, 0] as Vec2,
  targetTLA: [0, 0] as Vec2,
  cellPointed: 0 as number,
  selected: 0,
  turn: 0,
  namesLeft: 1e12,
  lastId: 0
}

export type State = typeof state;

let lastCell: Cell | undefined;

export const
  update = (d: Partial<State> = {}) => {
    Object.assign(state, d);
    let tl = state.topLeftAt;
    tl[0] = clamp(-ww * .5 * photoScale[0] * state.scale, tl[0], ww * 1.8 * photoScale[0] * state.scale);
    tl[1] = clamp(-wh * .5 * photoScale[1] * state.scale, tl[1], wh * 1.8 * photoScale[1] * state.scale);
    state.topLeftAt = tl;

    let cell = u.c[state.cellPointed];

    if (cell && cell != lastCell) {
      lastCell = cell;
      console.log(cell);
      tip(
        agentPointed() && `${agentPointed().name} ${agentPointed().race.name}`,
        `${cell.name} ${cell.settlement ? "town" : cell.biome.name}`,
        asList(cell.resources)
      )
    }

    debouncedUpdate()
  },
  saveAndUpdateTip = (slot = "a") => {
    state.namesLeft = namePool.length
    localStorage["CLP." + slot] = JSON.stringify(state)
  },
  debouncedUpdate = debounce(saveAndUpdateTip),
  debouncedPrerender = debounce(() => prerenderUniverse()),
  load = (slot = "a") => {
    let data = localStorage["CLP." + slot]
    if (data) {
      Object.assign(state, JSON.parse(data))
    }
    regenerateUniverse()

    setTimeout(() => select(queen()), 100);

    return true;
  },
  pointedCell = () => u.c[state.cellPointed],
  selected = () => u.a[state.selected],
  select = (a: Agent) => {
    update({ selected: u.a.indexOf(a) })
    centerOn(a.cell)
    console.log(a);
    info(...agentInfo(a))
  },
  agentPointed = () => u.a.find(a => a.cell.at == state.cellPointed) as Agent,
  queen = () => u.a.find(a => a.race.name == "alicorn") as Agent,
  queenCell = () => queen()?.cell,
  namePool = [...new Set<string>(loop(1e5, japaneseName))],
  nameById = (id: number) => cap1(namePool[id % namePool.length])
