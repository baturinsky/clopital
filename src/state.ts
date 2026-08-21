import { replanet } from "./main";
import { Vec2 } from "./math";

export let state = {
  scale: 1,
  seed: 1,
  topLeftAt: [0, 0] as Vec2,
  tilePointed: 0 as number,
}

export type State = typeof state;

export function update(d: Partial<State>) {
  Object.assign(state, d);
  save()
}

export const save = (slot = "a") => {
  localStorage["CLP." + slot] = JSON.stringify(state)
}

export const load = (slot = "a") => {
  let data = localStorage["CLP." + slot]
  if (data)
    Object.assign(state, JSON.parse(data))
  replanet(state.seed)
  return true;
}

onkeydown = e => {
  switch(e.code){
    case "KeyG":
      replanet(~~(Math.random()*1e9))
      break
  }
}

