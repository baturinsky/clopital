import { clamp, debounce, floor, len, loop, objMap, repeat, scale, sub, sum, Vec2 } from "./util";
import { neighborhood, photoScale, worldCoord, ww } from "./root";
import { debouncedPrerender, gotoPage, pointedCell, queen, queenCell, select, selected, state, update } from "./state";
import { u } from "./universe";
import { generateUniverse, nextTurn, nexTurnAndSaveAndShowResults } from ".";
import { animate, animations } from "./animation";
import { loadAll, saveAll, savePrefix, saveTitlePrefix } from "./saves";
import { centerOn, resizeCanvas } from "./renderer";
import { CPlayer, sonata } from "./voxby";

declare var C: HTMLCanvasElement, SEED: HTMLInputElement, LAND: HTMLInputElement, Next: HTMLButtonElement;
declare const DEBUG: boolean
declare var TIP: HTMLDivElement, INFO: HTMLDivElement, MID: HTMLDivElement, BTN: HTMLDivElement;


let buttonsDown: number[] = [], pme = [] as any[];

//declare var Build: HTMLDivElement;

export let shift: boolean | undefined, pointerDownPos: Vec2 | undefined, pointerDownTopLeft: Vec2 | undefined;

export const

  /*updateBuildButton = () => {
    let a = selected()
    Build.style.visibility = a && (a.isBuilding() || (a.happy() && !buildingInCell(a.cell))) ? "" : "hidden";
    Build.innerHTML = a?.isBuilding() ? "Remove" : "Build";
  },*/

  enableControls = () => {

    addEventListener("pointerdown", (e: MouseEvent) => {
      if (e.button != 0)
        return

      //playpl()

      let element = e.target as HTMLElement,
        button = element.closest("button") as HTMLButtonElement,
        id = button?.id, data = element.closest("button")?.dataset ?? {};

      let f = ({
        Next: nexTurnAndSaveAndShowResults,
        Queen: () => select(queen()),
        Menu: () => gotoPage(state.page == "game" ? "saves" : "game"),
        New: () => {
          state.seed = SEED.value as any
          state.land = LAND.value as any
          setTimeout(() => {
            generateUniverse()
            select(queen())
            gotoPage("game")
            nextTurn()
            //nextTurn()
            //loop(3, ()=>queen().nextTurn())
            select(queen())
            update({ turn: 1 })
          }, 10)


        },
        X: () => gotoPage("game"),
        //Research: () => menuOn ? hideMenu() : showResearchMenu(),
        /*Build: () => {
          let c = selected()?.cell;

          if (selected().isBuilding())
            selected().remove();
          else
            new Agent(c, c.water() ? "dome" : "village")

          updateBuildButton()
        },*/
      } as { [button: string]: Function })[id]
      f && f()

      if (id?.substring(0, 3) == "tab") {
        state.tab = id.substring(3);
        select()
      }

      if (data.give)
        selected().giftApply(data.give, true)

      if (data.take)
        selected().giftApply(data.take, false)

      if (data.save) {
        saveAll(data.save)
        gotoPage("game")
      }

      if (data.load) {
        loadAll(data.load)
        gotoPage("game")
      }

      if (data.x) {
        delete localStorage[saveTitlePrefix + data.x]
        delete localStorage[savePrefix + data.x]
        gotoPage("saves")
      }

      if (data.recipe) {
        selected().useRecipe({ place: selected(), recipe: JSON.parse(data.recipe.replaceAll("`", `"`)) })
        select()
      }

      if (element.dataset.a) {
        select(u.a[element.dataset.a as any])
      }

      /*if (element.dataset.c) {
        centerOn(u.c[element.dataset.c as any])
      }*/

      if (id == "warp") {
        queen().gain("magic", -100)
        queen().visit(selected().cell)
        queen().steps--
        select(queen())
      }

    })

    addEventListener("resize", () => {
      resizeCanvas()
    })

    let lastMousePos;

    C.onclick = e => {
      update({ clicked: state.cellPointed })
    }

    C.onpointerdown = C.onpointermove = C.onpointerup = C.onpointerleave = e => {

      if (!u)
        return

      //console.log(e.type);

      let canvasMousePos = [e.offsetX, e.offsetY] as Vec2;
      let photoMousePos = sub(scale(canvasMousePos, 1 / state.scale), state.topLeftAt);
      let worldMousePos = [photoMousePos[0] / photoScale[0], photoMousePos[1] / photoScale[1]]
      worldMousePos[0] -= floor(worldMousePos[1]) / 2;

      let tilePointed = floor(worldMousePos[0]) + floor(worldMousePos[1] - .1) * ww + (floor(worldMousePos[0]) < 0 ? ww : 0)

      shift = e.shiftKey
      let mousePos = [e.clientX, e.clientY] as Vec2;

      if (e.type == "pointermove") {
        /*console.log("nn", JSON.stringify(buttonsDown));
        console.log("em", e.movementX, e.movementY);*/
        lastMousePos ??= mousePos;
        if (buttonsDown[0] || buttonsDown[1]) {
          //let delta = sub(mousePos, lastMousePos) as Vec2;
          //delta = [e.movementX, e.movementY]
          //shiftViewBy(delta);
          let delta = sub(mousePos, pointerDownPos as Vec2);
          if (len(delta) > 6) {
            update({
              topLeftAt:
                sum(pointerDownTopLeft as Vec2,
                  delta, 1 / state.scale)
            })
          }
        } else {
          if (u.c[tilePointed]?.seen && !e.shiftKey) {
            let last = state.cellPointed;
            update({ cellPointed: tilePointed })
          }
        }
      }

      lastMousePos = mousePos;

      if (e.type == "pointerdown") {

        buttonsDown[e.button] = 1;

        if (e.button == 0 || e.button == 1) {
          pointerDownPos = mousePos
          pointerDownTopLeft = state.topLeftAt
        }

        if (e.button == 0) {

          let a = pointedCell()?.a

          if (a?.length > 0) {
            let ind = a.indexOf(selected());
            if (!selected() || a.length == 0 || ind == -1) {
              select(a[0])
            } else {
              select(a[(ind + 1) % a.length])
            }
          }
        }

        if (e.button == 2) {
          if (selected() && selected().happy()) {
            selected().dest = pointedCell()
            selected()?.go()
            select()
          }
        }

        if (DEBUG) {
          if (e.button == 2) {
            console.log(pointedCell());
          }
        }

      }

      if (e.type == "pointerup") {
        buttonsDown[e.button] = 0;
        pointerDownPos = undefined
        pointerDownTopLeft = undefined
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
    update({ topLeftAt: sum(state.topLeftAt, delta, 1 / state.scale) })
  }


onkeydown = e => {
  if (e.code == "KeyS" && e.shiftKey && u) {
    u.c.forEach(c => c.seen = true)
    debouncedPrerender()
  }
  if (e.code == "KeyA" && e.shiftKey && u) {
    selected().happiness++;
  }
  if (DEBUG) {
    if (e.code == "KeyI" && e.shiftKey && u) {
      console.log(
        selected().recipes.map((recipe) => [recipe.recipe, selected().util(recipe) * selected().max(recipe)])
      )

      console.log(selected().recipes.map((recipe) =>
        [JSON.stringify(recipe.recipe), selected().util(recipe) * selected().max(recipe)]));

      console.log(objMap(selected().stock, k => selected().mutil(k)));

      selected().iterate()
    }

  }

  let k = Number(e.code.substring(5));
  if (k > 0 && k < 6) {
    state.tab = k - 1;
    select()
  }

  switch (e.code) {
    case "Space":
      nexTurnAndSaveAndShowResults()
      break;
    case "Escape":
      gotoPage(state.page == "game" ? "saves" : "game")
      break
    case "Tab":
      let a = u.a.filter(a => a.happy())
      select(a[(a.indexOf(selected()) + (e.shiftKey ? a.length - 1 : 1)) % a.length])
      break
  }
}

const playVoxby = () => {
  let A = new AudioContext();
  //@ts-ignore
  let cplayer = new CPlayer();
  cplayer.init(sonata);
  let B = cplayer.createAudioBuffer(A)
  let w = A.createBufferSource();
  w.buffer = B;

  let gain = A.createGain();
  gain.gain.value = 1;
  w.connect(gain);
  gain.connect(A.destination);

  w.start();
}

/*
const playpl = () => {
  let A = new AudioContext();
  let synth = pl_synth_init(A)
  let B = synth.song(song)

  let w = A.createBufferSource();
  w.buffer = B;

  let gain = A.createGain();
  gain.gain.value = 1;
  w.connect(gain);
  gain.connect(A.destination);

  w.start();

}*/ 