//@ts-ignore
import './imported.css'

import { enableControls } from "./controls";
import { initRenderer, prerenderUniverse, render } from "./renderer";
import { state, saveAndUpdateTip, load } from "./state";
import { Universe } from './universe';
import { initRaces } from './races';


export const
  atlas = document.createElement("img"),
  regenerateUniverse = () => {
    new Universe(state.seed)
    prerenderUniverse()
    saveAndUpdateTip()
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

//testMarket()
