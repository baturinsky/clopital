//@ts-ignore
import './imported.css'

import { enableControls } from "./controls";
import { initRenderer, prerenderUniverse, renderLoop } from "./renderer";
import { state, select, selected, updateExpectation as updateExpectation } from "./state";
import { u, Universe } from './universe';
import { initSetting } from './setting';
import { hideMenu, showButtons, showSavesMenu, updateTip } from './ui';
import { loop, setSeed } from './util';
import { saveAll } from './saves';
import { audio_play, audio_create_song, music_data, audio_init } from './sonant';
import { testTcx } from './test.tsx';


declare var C: HTMLCanvasElement, SEED: HTMLInputElement, LAND: HTMLInputElement, Next: HTMLButtonElement;

export const
  atlas = document.createElement("img"),
  generateUniverse = () => {
    new Universe(state.seed, state.land)
    prerenderUniverse()
    showButtons()
  };

onload = () => {
  atlas.onload = init;
  atlas.src = 'i.webp';
}

const init = () => {
  initSetting()
  initRenderer()

  //generateUniverse()

  enableControls()

  //select()

  renderLoop()

  showSavesMenu()
}


export const
  nextTurn = () => {
    setSeed(state.seed*1e4 + state.turn)
    u.a.forEach(a => a.nextTurn())
    u.c.forEach(c => c.nextTurn())
    updateExpectation();
    state.turn ++;
    hideMenu()
  },
  nexTurnAndSaveAndShowResults = () => {
    nextTurn()
    select()
    updateTip()
    saveAll()
  }




console.log(testTcx());