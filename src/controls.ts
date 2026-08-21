import { clamp, floor, scale, sub, sum, Vec2 } from "./util";
import { render } from "./renderer";
import { photoScale, ww } from "./root";
import { state, update } from "./state";

declare var C: HTMLCanvasElement;

let buttonsDown: number[] = []; 

export const

  enableControls = () => {
    C.onpointerdown = C.onpointermove = C.onpointerup = C.onpointerleave = e => {
      let canvasMousePos = [e.offsetX, e.offsetY] as Vec2;
      let photoMousePos = sub(scale(canvasMousePos, 1 / state.scale), state.topLeftAt);
      let worldMousePos = [photoMousePos[0] / photoScale[0], photoMousePos[1] / photoScale[1]]
      worldMousePos[0] -= floor(worldMousePos[1]) / 2;
      update({ tilePointed: floor(worldMousePos[0]) + floor(worldMousePos[1]-.1) * ww + (floor(worldMousePos[0]) < 0 ? ww : 0) })

      if (e.type == "pointermove") {
        if (buttonsDown[0] || buttonsDown[1]) {
          let delta = [e.movementX, e.movementY] as Vec2;
          shiftViewBy(delta);
        }
      }

      if (e.type == "pointerdown") {
        buttonsDown[e.button] = 1;
      }

      if (e.type == "pointerup") {
        buttonsDown[e.button] = 0;
      }

      if (e.type == "pointerleave") {
        buttonsDown = []
      }

      render()
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
