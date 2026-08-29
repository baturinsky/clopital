//@ts-ignore
import './imported.css'

import { enableControls } from "./controls";
import { initRenderer, prerenderUniverse, render } from "./renderer";
import { state, save, load } from "./state";
import { tip } from "./ui";
import { testMarket } from "./market";
import { Universe } from './universe';


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
  tip("Hi")
}

const init = () => {

  initRenderer()

  enableControls()

  load()

  setInterval(render, 50)
}







//testMarket()