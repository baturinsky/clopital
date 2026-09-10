//@ts-ignore
import './imported.css'

import { enableControls } from "./controls";
import { initRenderer, prerenderUniverse, renderLoop } from "./renderer";
import { state, select, selected, updateExpectation as updateExpectation } from "./state";
import { u, Universe } from './universe';
import { initSetting } from './setting';
import { updateTip } from './ui';
import { loop } from './util';
import { saveAll } from './saves';
import { audio_play, audio_create_song, music_data, audio_init } from './sonant';


export const
  atlas = document.createElement("img"),
  generateUniverse = () => {
    new Universe(state.seed)
    prerenderUniverse()
    loop(10, nextTurn)
  };

onload = () => {
  atlas.onload = init;
  atlas.src = 'i.webp';
}

const init = () => {
  initSetting()
  initRenderer()

  generateUniverse()

  enableControls()

  select()

  renderLoop()

}


export const
  nextTurn = () => {
    u.a.forEach(a => a.nextTurn())
    u.c.forEach(c => c.nextTurn())
    updateExpectation();
  },
  nexTurnAndSaveAndShowResults = () => {
    nextTurn()
    select()
    updateTip()
    saveAll()
  }

