import { replanet } from "./main";
import { altitude, biomeAt, SeaLevel, temperature, wetness } from "./planet";
import { prerenderPlanet, render } from "./renderer";
import { tip } from "./ui";
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
    let at = state.tilePointed;
    tip(`${biomeAt[at]?.name} temp ${fixed(temperature[at])} wet ${fixed(wetness[at])} alt ${fixed(altitude[at]-SeaLevel)}`)
    autoSave()
  },
  save = (slot = "a") => {
    console.log("s");
    localStorage["CLP." + slot] = JSON.stringify(state)
  },
  autoSave = debounce(save),
  load = (slot = "a") => {
    let data = localStorage["CLP." + slot]
    if (data)
      Object.assign(state, JSON.parse(data))
    replanet()
    return true;
  }

onkeydown = e => {
  switch (e.code) {
    case "KeyG":
      replanet(~~(Math.random() * 1e9))
      break
    case "KeyD":
      update({ debug: !state.debug })
      prerenderPlanet()
      render()
      break
  }
}

