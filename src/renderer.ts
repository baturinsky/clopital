import { atlas } from "./main";
import { ww, photoScale, wh, TWO_PI, worldCoord, photoShift } from "./root";
import { Biome, biomeMatrix, BiomeName, biomesByNames, HUTS, HUTS2, MESA, WAVES } from "./biomes"
import { pointedCell, queenCell, selected, state, update } from "./state";
import { u } from "./universe";
import { asArray, loop, muls, nof, randomElement, RGBA, rng, round, scale, setSeed, shuffle, sum, vecTween, Vec2 } from "./util";
import { Cell } from "./cell";
import { animate, cancelAnimation, updateAnimations } from "./animation";

export const
  layerSickness = 4,
  AtlasSpriteSize = 16,
  CURSOR = 16,
  QUEEN = 48,
  SHADOW = 64;

let worldPhoto: HTMLCanvasElement,
  /** Main canvas context */
  ctx: CanvasRenderingContext2D,
  /** Currently active context (ctx unless it's prerender)*/
  cx: CanvasRenderingContext2D,
  props: HTMLCanvasElement[], huts: HTMLCanvasElement[],
  sprites: HTMLCanvasElement[],
  outlined: HTMLCanvasElement[],
  letters: HTMLCanvasElement[],
  filters = new Set(),
  letterWidth = 6,
  lastT = Date.now();

declare var DEFS: SVGElement, C: HTMLCanvasElement;

export const
  calculatePropSlots =
    ([
      ...loop(6, i => [Math.sin(i / 6 * TWO_PI) / 3 + .2, Math.cos(i / 6 * TWO_PI) / 3 + .2])
    ] as Vec2[]).
      map(p => muls(p, photoScale)).
      sort((a, b) => a[1] - b[1]) as Vec2[],

  propSlots = [[-1, -2], [-3, 0], [4, 0], [3, 3], [-4, 4], [-1, 7]] as Vec2[],


  drawSprite = (sprite: HTMLCanvasElement, pos: Vec2, alpha = 1) => {
    if (alpha != 1) {
      cx.save()
      cx.globalAlpha = alpha
    }
    cx.drawImage(sprite, ...pos);
    if (alpha != 1)
      cx.restore()
  },

  drawOnCell = (cell: Cell, sprite: HTMLCanvasElement, pos: Vec2 = [0, 0], alpha = 1) => {
    let p = photoShift(sum(cell.center(), pos))
    drawSprite(sprite, p, alpha);
  },

  toScreenPos = (pos: Vec2) => {
    return sum(scale(muls(pos, photoScale), 1), state.topLeftAt)
  },

  drawCentered = (sprite: HTMLCanvasElement, pos: Vec2, alpha = 1) => {
    drawSprite(sprite, sum(pos, [-sprite.width / 2 / photoScale[0], -sprite.height / 2 / photoScale[1]]), alpha)
  },

  wobbleFlight = (p: Vec2, amplitude = 6) => sum(p, [0, amplitude * (1 + Math.sin(Date.now() / 500)) / 2]),

  render = () => {
    let dt = Date.now() - lastT;
    lastT += dt;
    cx = ctx;
    cx.imageSmoothingEnabled = false
    cx.clearRect(0, 0, 1e7, 1e7);
    cx.save();
    cx.scale(state.scale, state.scale)
    cx.translate(...state.topLeftAt);
    cx.drawImage(worldPhoto, 0, 0);

    /** Rendering with the current zoom and image position.  */

    if (state.cellPointed != state.queenAt) {
      drawOnCell(pointedCell(), sprites[CURSOR], [0, layerSickness + 1])
    }

    for (let agent of u.a) {
      if (selected() == agent) {
        cx.globalAlpha = (2 + Math.sin(Date.now() / 100)) / 3;
      }
      drawOnCell(agent.cell, sprites[SHADOW], [0, 2])
      drawOnCell(agent.cell, sprites[agent.race.sprite])
      cx.globalAlpha = 1;
    }

    if (selected()) {
      let pf = selected().pathfind(15, u.c[state.cellPointed]);
      let p = u.c[state.cellPointed].pathFrom(pf);

      if (p) {
        cx.strokeStyle = "#4444";
        drawPath(p, 1)
      }
    }


    updateAnimations(dt)

    cx.restore()

  },
  atlasSprite = (id: number, filter?: string) =>
    cutSpriteFromAtlas((id % AtlasSpriteSize) * AtlasSpriteSize, ~~(id / AtlasSpriteSize) * AtlasSpriteSize, AtlasSpriteSize, AtlasSpriteSize, filter)
  ,
  initRenderer = () => {
    Object.values(biomesByNames).forEach(b => b.sprites = makeBiomeSprites(b))
    sprites = loop(160, i => atlasSprite(i))
    outlined = loop(160, i => atlasSprite(i, "url(#OUTL)"))
    C.width = innerWidth;
    C.height = innerHeight;
    ctx = C.getContext("2d") as CanvasRenderingContext2D;
    ctx.imageSmoothingEnabled = false;
  },

  drawCurve = (points: Vec2[]) => {
    cx.beginPath();
    points.forEach((p: Vec2) => {
      cx.lineTo(...p)
    })
  },

  canvasElementAndContext = (w: number, h: number) => {
    let c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    let cx = c.getContext("2d") as CanvasRenderingContext2D;
    cx.imageSmoothingEnabled = false
    return [c, cx] as [HTMLCanvasElement, CanvasRenderingContext2D]
  },

  drawPath = (path: Cell[], lw: number, transform: (v: Vec2, i: number) => Vec2 = a => a, riverEnd = 0) => {

    let coords = path.map((cell, i) => transform(sum(cell.center(), [0, layerSickness + 2]), i));

    if (path.length == 1)
      return

    if (riverEnd) {
      coords[path.length - 1] = vecTween(coords[path.length - 2], coords[path.length - 1], .7)
      coords[path.length - 1][1] -= 3;
    }

    cx.lineWidth = lw;
    drawCurve(coords);
    cx.stroke()

  },

  smoothLine = (line: Vec2[]) => {
    let line1 = line.map((v, i) => [v, vecTween(v, line[i + 1] ?? v, .5)]).flat(1);
    let line2 = line1.map((v, i) => vecTween(v, vecTween(line[i - 1] ?? v, line[i + 1] ?? v, .5), .5))
    return line2;
  },

  prerenderUniverse = () => {
    [worldPhoto, cx] = canvasElementAndContext((ww + .5) * photoScale[0], wh * photoScale[1])

    loop(3, drawingLayer => {
      u.drawOrder.forEach(cell => {
        let pos = cell.topLeft()
        if (cell.layer == drawingLayer && !cell.bedrock) {
          cx.drawImage(cell.biome.sprites[cell.at % 3 + (cell.layer == 2 ? 3 : 0)], ...sum(pos, [0, 5]));
        }
      })
    })

    cx.lineCap = "round"

    for (let riverLayer of [0, 1]) {
      cx.strokeStyle = ["#4444", "#0093F0"][riverLayer];
      u.rivers.forEach(river => drawPath(
        river,
        4,
        (v: Vec2, i) => sum(v, [0,
          (i == river.length - 1 && riverLayer == 0 ? 1 : 0) +
          [1, 2][riverLayer]
        ] as Vec2
        ),
        1
      ))
    }

    u.drawOrder.forEach(cell => {

      setSeed(cell.at)
      let pnum = cell.rivers ? 3 : 3 + rng(3),
        props = asArray(cell.biome.prop) as number[]

      if (props?.length > 0) {
        let i1 = nof(props.map(p => sprites[p]), 6, pnum);
        drawProps(cell, i1)
      }

      if (state.debug) {
        cx.fillStyle = "#00f";
        cx.fillRect(...sum(cell.topLeft(), [5, 10]), 1, -cell.hum);
        cx.fillStyle = "#f00";
        cx.fillRect(...sum(cell.topLeft(), [6, 10]), 1, -cell.t * 10);
      }

    })

  },
  drawProps = (cell: Cell, images: HTMLCanvasElement[], options?: { shadow?: boolean }) => {
    images.forEach((img, i) => {
      if (img) {
        if (options?.shadow) {
          cx.drawImage(
            sprites[SHADOW],
            ...round(sum(sum(
              cell.topLeft(), propSlots[i % 6]), [0, 4]))
          )
        }
        cx.drawImage(
          img,
          ...round(sum(
            cell.topLeft(), propSlots[i % 6]))
        )
      }
    })
  },
  constructFilter = (rgbReplace: RGBA[], name: string) => {
    if (!filters.has(name)) {
      let f = `<filter id="f${name}"><feColorMatrix type=matrix 
      values="${[0, 1, 2, 3].map(i =>
        `${rgbReplace[0][i]} ${rgbReplace[1][i]} ${rgbReplace[2][i]} ${i == 3 ? 1 : 0} 0`).join(' ')}" /></filter>`
      DEFS.innerHTML += f;
    }
    return `url(#f${name})`
  },
  cutSpriteFromAtlas = (x: number, y: number, w: number, h: number, filter?: string) => {
    let [sprite, sx] = canvasElementAndContext(w, h)
    sx.filter = filter ?? "";
    sx.drawImage(atlas, x, y, w, h, 0, 0, w, h)
    return sprite
  },
  makeBiomeSprites = (biome: Biome) => {
    return [...new Array(6)].map((v, i) =>
      cutSpriteFromAtlas(0, 235, 17, 22, constructFilter([
        scale(biome.rgba, 1.3 - .05 * i - (i > 2 ? .2 : 0)),
        scale(biome.rgba, .5),
        scale(biome.rgba, .3)
      ], i + biome.color)))
  },
  moveWithAnimation = () => {
    let pf = queenCell().pathfind("flying", 100, u.c[state.cellPointed]);
    let p = u.c[state.cellPointed].pathFrom(pf);

    if (p) {
      cancelAnimation(state.queenAnimation);
      state.queenAnimation = animate(sprites[QUEEN], p.map(c => c.topLeft()))
      state.queenAnimation.f = () => delete state.queenAnimation
      update({ queenAt: state.cellPointed });
    }

  },


  drawImageCentered = (image: HTMLCanvasElement, pos: Vec2) => {
    cx.drawImage(image, pos[0] - image.width, pos[1] - image.height)
  };


