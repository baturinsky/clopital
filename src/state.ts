import { regenerateUniverse } from "./main";
import { tip } from "./ui";
import { u } from "./universe";
import { debounce, fixed, Vec2 } from "./util";

export let state = {
  scale: 1,
  seed: 1,
  topLeftAt: [0, 0] as Vec2,
  tilePointed: 0 as number,
  debug: false,
  queenAt: 0
}

export type State = typeof state;

export const
  update = (d: Partial<State>) => {
    Object.assign(state, d);
    let cell = u.c[state.tilePointed];
    tip(`${cell.name} ${cell.biome.name} temp ${fixed(cell.t)} 
    wet ${fixed(cell.hum)} elev ${fixed(cell.elev - u.SeaElev)}
    hab ${fixed(cell.habitability)}
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
  queenCell = ()=>u.c[state.queenAt],
  pointedCell = ()=>u.c[state.tilePointed]

