//@ts-ignore
import './imported.css'

import { enableControls } from "./controls";
import { initRenderer, prerenderUniverse, render } from "./renderer";
import { state, save, load } from "./state";
import { tip } from "./ui";
import { Universe } from './universe';
import { initRaces } from './races';
import { testMarket } from './tests';


export const
  atlas = document.createElement("img"),
  regenerateUniverse = () => {
    new Universe(state.seed)
    prerenderUniverse()
    save()
  };

onload = () => {
  atlas.onload = init;
  atlas.src = 'i.webp';
}

const init = () => {
  initRaces()

  initRenderer()

  enableControls()

  load()

  setInterval(render, 16)
}

testMarket()