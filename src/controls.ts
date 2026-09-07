import { clamp, debounce, floor, objMap, scale, sub, sum, Vec2 } from "./util";
import { neighborhood, photoScale, worldCoord, ww } from "./root";
import { agentPointed, pointedCell, queen, queenCell, saveAndUpdateTip, select, selected, state, update } from "./state";
import { u } from "./universe";
import { nextTurn, nexTurnAndShowResults } from "./main";
import { hideMenu, menuOn, showResearchMenu, showSavesMenu, tabs, updateTip } from "./ui";
import { animate, animations } from "./animation";
import { layerSickness as layerThickness } from "./renderer";
import { playSound } from "./sound";

declare var C: HTMLCanvasElement;

let buttonsDown: number[] = [], pme = [] as any[];

export const

  enableControls = () => {

    onpointerdown = (e: MouseEvent) => {
      let f = ({
        TURN: nexTurnAndShowResults,
        QUEEN: () => select(queen()),
        SAVES: () => menuOn ? hideMenu() : showSavesMenu(),
        RS: () => menuOn ? hideMenu() : showResearchMenu(),
        X: hideMenu
      } as { [button: string]: Function })[(e.target as HTMLButtonElement)?.id]
      f && f()

      let element = e.target as HTMLElement;

      if (tabs.includes(element.id)) {
        state.tab = element.id;
        select()
      }

      if (element.dataset.give)
        selected().queenTradeApply(element.dataset.give, true)

      if (element.dataset.take)
        selected().queenTradeApply(element.dataset.take, false)

      if (element.dataset.save) {
        saveAndUpdateTip(element.dataset.save)
        showSavesMenu()
      }

      if (element.dataset.load) {
        saveAndUpdateTip(element.dataset.load)
        showSavesMenu()
      }

    }

    C.onpointerdown = C.onpointermove = C.onpointerup = C.onpointerleave = e => {
      let canvasMousePos = [e.offsetX, e.offsetY] as Vec2;
      let photoMousePos = sub(scale(canvasMousePos, 1 / state.scale), state.topLeftAt);
      let worldMousePos = [photoMousePos[0] / photoScale[0], photoMousePos[1] / photoScale[1]]
      worldMousePos[0] -= floor(worldMousePos[1]) / 2;

      let tilePointed = floor(worldMousePos[0]) + floor(worldMousePos[1] - .1) * ww + (floor(worldMousePos[0]) < 0 ? ww : 0)


      if (e.type == "pointermove") {
        if (buttonsDown[1] || buttonsDown[2]) {
          let delta = [e.movementX, e.movementY] as Vec2;
          shiftViewBy(delta);
        } else {
          if (u.c[tilePointed]?.seen) {
            let last = state.cellPointed;
            update({ cellPointed: tilePointed })
            if (last != state.cellPointed)
              updateTip()
          }
        }
      }

      if (e.type == "pointerdown") {

        buttonsDown[e.button] = 1;
        if (e.button == 0) {

          let a = agentPointed()
          if (a) {
            select(a)
          } else if (selected()) {
            selected().dest = pointedCell()
            selected()?.go()
          }
        }

        if (e.button == 2) {
          console.log(pointedCell());
        }

      }

      if (e.type == "pointerup") {
        buttonsDown[e.button] = 0;
      }

      if (e.type == "pointerleave") {
        buttonsDown = []
        update({ cellPointed: undefined })
      }
    }

    C.onwheel = e => {
      let screenPos = [e.offsetX, e.offsetY] as Vec2;
      let delta = e.deltaY;
      if (delta) {
        reScale(clamp(.25, state.scale * (delta < 0 ? 2 : 1 / 2), 4), scaleScreenToWorld(screenPos))
      }
    }
  },

  scaleScreenToWorld = (screenPos: Vec2) => {
    return scale(screenPos, 1 / state.scale) as Vec2;
  },

  reScale = (newScale: number, scaledScreenPos: Vec2) => {
    update({ topLeftAt: sum(state.topLeftAt, scaledScreenPos, state.scale / newScale - 1), scale: newScale });
  },

  shiftViewBy = (delta: Vec2) => {
    animations.length = 0
    update({ topLeftAt: sum(state.topLeftAt, delta, 1 / state.scale) })
  }


onkeydown = e => {
  switch (e.code) {
    case "Space":
      nexTurnAndShowResults()
      break;
    case "Escape":
      update({ selected: undefined })
      break
    case "KeyI":
      console.log(selected().recipes.map((recipe) =>
        [JSON.stringify(recipe.recipe), selected().utl(recipe) * selected().max(recipe)]));
      console.log(objMap(selected().stock, k => selected().mutl(k)));
      selected().iterate()
      break
  }
}

