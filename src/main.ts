//@ts-ignore
import './imported.css'

import { enableControls } from "./controls";
import { generatePlanet } from "./planet";
import { initRenderer, prerenderPlanet, render } from "./renderer";
import { solvePlanet } from "./solver";
import { state, save, load } from "./state";
import { tip } from "./ui";
import { testMarket } from "./market";


export const
  atlas = document.createElement("img"),
  replanet = (seed:number = state.seed) => {
    state.seed = seed
    generatePlanet(seed)
    prerenderPlanet()
    //solvePlanet()
    save()
    setInterval(render, 50);
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

}




testMarket()