import { clamp, debounce, floor, objMap, scale, sub, sum, Vec2 } from "./util";
import { neighborhood, photoScale, worldCoord, ww } from "./root";
import { pointedCell, queen, queenCell, select, selected, state, update } from "./state";
import { buildingInCell, u } from "./universe";
import { nextTurn, nexTurnAndSaveAndShowResults } from "./main";
import { hideMenu, menuOn, showResearchMenu, showSavesMenu, tabs, updateTip } from "./ui";
import { animate, animations } from "./animation";
import { loadAll, saveAll } from "./saves";
import { races } from "./setting";
import { Agent } from "./agent";
import { Cell } from "./cell";

declare var C: HTMLCanvasElement;

let buttonsDown: number[] = [], pme = [] as any[];

declare var Build: HTMLDivElement;

export const

  updateBuildButton = () => {
    let a = selected()
    Build.style.visibility = a && (a.isBuilding() || (a.happy() && !buildingInCell(a.cell))) ? "" : "hidden";
    Build.innerHTML = a?.isBuilding() ? "Remove" : "Build";
  },

  enableControls = () => {

    onpointerdown = (e: MouseEvent) => {
      if(e.button!=0)
        return

      let id = (e.target as HTMLElement).closest("button")?.id as string;

      let f = ({
        Next: nexTurnAndSaveAndShowResults,
        Queen: () => select(queen()),
        Saves: () => menuOn ? hideMenu() : showSavesMenu(),
        //Research: () => menuOn ? hideMenu() : showResearchMenu(),
        Build: () => {
          let c = selected()?.cell;

          if (selected().isBuilding())
            selected().remove();
          else
            new Agent(c, c.water() ? "dome" : "village")

          updateBuildButton()
        },
        X: hideMenu,
      } as { [button: string]: Function })[id]
      f && f()

      if (id?.substring(0,3)=="tab") {
        state.tab = id.substring(3);
        select()
      }

      let element = e.target as HTMLElement;

      if (element.dataset.give)
        selected().queenTradeApply(element.dataset.give, true)

      if (element.dataset.take)
        selected().queenTradeApply(element.dataset.take, false)

      if (element.dataset.save) {
        saveAll(element.dataset.save)
        showSavesMenu()
      }

      if (element.dataset.load) {
        loadAll(element.dataset.load)
        hideMenu()
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

          let a = pointedCell()?.a

          if (a?.length > 0) {
            let ind = a.indexOf(selected());
            if (!selected() || a.length == 0 || ind == -1) {
              select(a[0])
            } else {
              select(a[(ind + 1) % a.length])
            }
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
      nexTurnAndSaveAndShowResults()
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

