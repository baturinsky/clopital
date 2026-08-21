import { enableControls } from "./controls";
import { generatePlanet } from "./planet";
import { initRenderer, prerenderPlanet, render } from "./renderer";
import { solvePlanet } from "./solver";
import { state, save, load } from "./state";
import './imported.css'
import { tip } from "./ui";

export const
  atlas = document.createElement("img"),
  replanet = (seed:number) => {
    state.seed = seed
    generatePlanet(seed)
    prerenderPlanet()
    render()
    solvePlanet()
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

}



