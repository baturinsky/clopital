import { type Agent } from "./agent";
import { Cell } from "./cell";
import { regenerateUniverse } from "./main";
import { centerOn } from "./renderer";
import { hexDist, photoScale, wh, ww } from "./root";
import { asList, asTable, tip } from "./ui";
import { u } from "./universe";
import { clamp, debounce, fixed, japaneseName, loop, Vec2 } from "./util";

export let state = {
  scale: 1,
  seed: 1,
  topLeftAt: [0, 0] as Vec2,
  targetTLA: [0, 0] as Vec2,
  cellPointed: 0 as number,
  debug: false,
  selected: 0,
  turn: 0,
  namesLeft: 1e12
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
      tip(`
      ${agentPointed() ? `<h4>${agentPointed().name} ${agentPointed().race.name}</h4>` : ''}
      <h4>${cell.name} ${cell.settlement ? "town" : cell.biome.name}</h4>
      <span data-icon="107"></span>${asList(cell.resources)}</br>
      <span data-icon="106"></span>${asList(cell.neighborhoodResources())}
    `)
    }

    debouncedUpdate()
  },
  saveAndUpdateTip = (slot = "a") => {
    state.namesLeft = namePool.length
    localStorage["CLP." + slot] = JSON.stringify(state)
  },
  debouncedUpdate = debounce(saveAndUpdateTip),
  load = (slot = "a") => {
    let data = localStorage["CLP." + slot]
    if (data) {
      Object.assign(state, JSON.parse(data))
      state.namesLeft && namePool.splice(state.namesLeft)
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
  },
  agentPointed = () => u.a.find(a => a.cell.at == state.cellPointed) as Agent,
  queen = () => u.a.find(a => a.race.name == "alicorn") as Agent,
  queenCell = () => queen()?.cell,
  namePool = [...new Set<string>(loop(1e5, japaneseName))],
  nextName = () => {
    return namePool.pop() as string
  }







