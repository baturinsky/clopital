import { clamp, floor, scale, sub, sum, Vec2 } from "./util";
import { prerenderUniverse, render } from "./renderer";
import { neighborhood, photoScale, ww } from "./root";
import { queenCell, state, update } from "./state";
import { regenerateUniverse } from "./main";
import { testMarket } from "./market";
import { biomesByNames } from "./biomes";
import { u } from "./universe";

declare var C: HTMLCanvasElement;

let buttonsDown: number[] = [];

export const

  enableControls = () => {
    C.onpointerdown = C.onpointermove = C.onpointerup = C.onpointerleave = e => {
      let canvasMousePos = [e.offsetX, e.offsetY] as Vec2;
      let photoMousePos = sub(scale(canvasMousePos, 1 / state.scale), state.topLeftAt);
      let worldMousePos = [photoMousePos[0] / photoScale[0], photoMousePos[1] / photoScale[1]]
      worldMousePos[0] -= floor(worldMousePos[1]) / 2;
      let tilePointed = floor(worldMousePos[0]) + floor(worldMousePos[1] - .1) * ww + (floor(worldMousePos[0]) < 0 ? ww : 0)

      if(u.c[tilePointed])
        update({ tilePointed  })

      if (e.type == "pointermove") {
        if (buttonsDown[1] || buttonsDown[2]) {
          let delta = [e.movementX, e.movementY] as Vec2;
          shiftViewBy(delta);
        }
      }

      if (e.type == "pointerdown") {
        buttonsDown[e.button] = 1;
        if (e.button == 0) {
          state.queenAt = state.tilePointed;
          let r = queenCell().pathfind(15);
          console.log(r)
          for (let n of neighborhood[4]) {
            u.c[state.tilePointed + n].biome = biomesByNames.snowfield;
          }
          prerenderUniverse()
          render()
        }
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


onkeydown = e => {
  switch (e.code) {
    case "KeyG":
      update({ seed: ~~(Math.random() * 1e9) })
      regenerateUniverse()
      break
    case "KeyM":
      testMarket()
      break
    case "KeyD":
      update({ debug: !state.debug })
      prerenderUniverse()
      render()
      break
  }
}

