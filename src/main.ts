//@ts-ignore
import './imported.css'

import { enableControls } from "./controls";
import { initRenderer, prerenderUniverse, render } from "./renderer";
import { state, saveAndUpdateTip, load, select, selected } from "./state";
import { u, Universe } from './universe';
import { initRaces } from './races';
import { updateTip } from './ui';
import { loop } from './util';


export const
  atlas = document.createElement("img"),
  regenerateUniverse = () => {
    new Universe(state.seed)
    state.lastId = u.c.length
    prerenderUniverse()
    loop(30, nextTurn)
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

  //setInterval(render, 32)
  render()
}

//testMarket()


export const
  nextTurn = () => {
    u.a.forEach(a => a.nextTurn())
    u.c.forEach(c => c.nextTurn())
  },
  nexTurnAndShowResults = () => {
    nextTurn()
    select(selected())
    updateTip()
  }
