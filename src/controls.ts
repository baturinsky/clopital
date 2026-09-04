import { clamp, floor, scale, sub, sum, Vec2 } from "./util";
import { prerenderUniverse, render } from "./renderer";
import { neighborhood, photoScale, worldCoord, ww } from "./root";
import { agentPointed, pointedCell, queen, queenCell, select, selected, state, update } from "./state";
import { regenerateUniverse } from "./main";
import { biomesByNames } from "./biomes";
import { nextTurn, u } from "./universe";
import { animate, cancelAnimation } from "./animation";

declare var C: HTMLCanvasElement;

let buttonsDown: number[] = [];

export const

  enableControls = () => {

    onpointerdown = (e: MouseEvent) => {
      let f = ({ 
        TURN: nextTurn, 
        QUEEN: ()=>select(queen())
       } as {[button:string]:Function})[(e.target as HTMLButtonElement)?.id]
      f && f()
    }

    C.onpointerdown = C.onpointermove = C.onpointerup = C.onpointerleave = e => {
      let canvasMousePos = [e.offsetX, e.offsetY] as Vec2;
      let photoMousePos = sub(scale(canvasMousePos, 1 / state.scale), state.topLeftAt);
      let worldMousePos = [photoMousePos[0] / photoScale[0], photoMousePos[1] / photoScale[1]]
      worldMousePos[0] -= floor(worldMousePos[1]) / 2;
      let tilePointed = floor(worldMousePos[0]) + floor(worldMousePos[1] - .1) * ww + (floor(worldMousePos[0]) < 0 ? ww : 0)

      if (u.c[tilePointed])
        update({ cellPointed: tilePointed })

      if (e.type == "pointermove") {
        if (buttonsDown[1] || buttonsDown[2]) {
          let delta = [e.movementX, e.movementY] as Vec2;
          shiftViewBy(delta);
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
      }

      if (e.type == "pointerup") {
        buttonsDown[e.button] = 0;
      }

      if (e.type == "pointerleave") {
        buttonsDown = []
        update({cellPointed:undefined})
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
    update({ topLeftAt: sum(state.topLeftAt, delta, 1 / state.scale) })
  }


onkeydown = e => {
  switch (e.code) {
    case "KeyG":
      update({ seed: ~~(Math.random() * 1e9) })
      regenerateUniverse()
      break
    case "KeyM":
      //testMarket()
      break
    case "Escape":
      update({selected:undefined})
      break
    case "KeyD":
      update({ debug: !state.debug })
      prerenderUniverse()
      break
  }
}

