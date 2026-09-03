import { type Agent } from "./agents";
import { MovementAnimation } from "./animation";
import { regenerateUniverse } from "./main";
import { hexDist } from "./root";
import { tip } from "./ui";
import { u } from "./universe";
import { debounce, fixed, Vec2 } from "./util";

export let state = {
  scale: 1,
  seed: 1,
  topLeftAt: [0, 0] as Vec2,
  cellPointed: 0 as number,
  debug: false,
  queenAt: 0,
  selected: 0,
  queenAnimation: undefined as MovementAnimation | undefined
}

export type State = typeof state;

export const
  update = (d: Partial<State> = {}) => {
    Object.assign(state, d);
    let cell = u.c[state.cellPointed];
    tip(`${cell.name} ${cell.settlement ? "town" : cell.biome.name}<br/>
    temp ${fixed(cell.t)}  wet ${fixed(cell.hum)}<br/>
    elev ${fixed(cell.elev - u.SeaElev)}  hab ${fixed(cell.habitability)}<br/>
    dist ${hexDist(state.queenAt, state.cellPointed)}
    `)
    autoSave()
  },
  save = (slot = "a") => {
    localStorage["CLP." + slot] = JSON.stringify(state)
  },
  autoSave = debounce(save),
  load = (slot = "a") => {
    let data = localStorage["CLP." + slot]
    if (data)
      Object.assign(state, JSON.parse(data))
    regenerateUniverse()
    return true;
  },
  queenCell = () => u.c[state.queenAt],
  pointedCell = () => u.c[state.cellPointed],
  selected = () => u.a[state.selected],
  select = (a: Agent) => update({ selected: u.a.indexOf(a) })


