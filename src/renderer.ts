import { atlas } from "./main";
import { ww, photoScale, wh, TWO_PI } from "./root";
import { Biome, biomeMatrix, BiomeName, biomesByNames, HUTS, HUTS2, MESA, WAVES } from "./biomes"
import { pointedCell, queenCell, state } from "./state";
import { u } from "./universe";
import { asArray, loop, muls, nof, randomElement, RGBA, rng, round, scale, setSeed, shuffle, sum, vecTween, Vec2 } from "./util";
import { Cell } from "./cell";
import { updateAnimations } from "./animation";

export const
  QUEEN = 48,
  SHADOW = 64;

export let worldPhoto: HTMLCanvasElement,
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
    cx.save()
    if (alpha != 1)
      cx.globalAlpha = alpha
    let drawingAt = toScreenPos(pos)
    cx.scale(state.scale, state.scale)
    cx.drawImage(sprite, ...drawingAt);
    cx.restore()
  },

  toScreenPos = (pos: Vec2) => {
    return sum(scale(muls(pos, photoScale), 1), state.topLeftAt)
  },

  drawCentered = (sprite: HTMLCanvasElement, pos: Vec2, alpha = 1) => {
    drawSprite(sprite, sum(pos, [-sprite.width / 2 / photoScale[0], -sprite.height / 2 / photoScale[1]]), alpha)
  },

  wobbleFlight = (p: Vec2, d = 0) => sum(p, [0, Math.sin(Date.now() / 500) / 9 - d]),

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

    //drawText("HELLO", 100, 100);

    cx.restore()

    let queenTopLeft = queenCell().topLeft();

    if (!state.queenAnimation) {
      drawSprite(sprites[SHADOW], queenTopLeft)
      drawSprite(sprites[QUEEN], wobbleFlight(queenTopLeft, .7))
    }

    if (state.tilePointed != state.queenAt)
      drawSprite(sprites[SHADOW], pointedCell().topLeft(), .7)

    for (let herd of u.chars) {
      //drawProps(herd.cell, nof([outlined[herd.race.sprite]], 6, 3), { shadow: true })
      drawSprite(sprites[SHADOW], herd.cell.topLeft())
      drawSprite(sprites[herd.race.sprite], herd.cell.topLeft())
    }

    for (let herd of u.chars) {

      drawText(herd.name, ...toScreenPos(herd.cell.topLeft()))
    }

    updateAnimations(dt)
  },
  initRenderer = () => {
    Object.values(biomesByNames).forEach(b => b.sprites = makeBiomeSprites(b))
    huts = loop(30, i => cutSpriteFromAtlas(16, 64, 16, 16,
      constructFilter([
        [.5 + rng() / 3, rng() / 3, rng() / 3, 1],
        [0, 1, 0, 1],
        [.5 + rng() / 2, .5 + rng() / 2, .5 + rng() / 2, 1]
      ], "hut" + i))),
      sprites = loop(160, i => cutSpriteFromAtlas((i % 16) * 16, 32 + ~~(i / 16) * 16, 16, 16))
    outlined = loop(160, i => cutSpriteFromAtlas((i % 16) * 16, 32 + ~~(i / 16) * 16, 16, 16, "url(#OUTL)"))
    letters = loop(64, i => cutSpriteFromAtlas((i % 16) * letterWidth, 209 + ~~(i / 16) * 12, letterWidth + 1, 12, "url(#OUTL)"))
    C.width = innerWidth;
    C.height = innerHeight;
    ctx = C.getContext("2d") as CanvasRenderingContext2D;
    ctx.imageSmoothingEnabled = false;
  },

  drawPolygon = (cx: CanvasRenderingContext2D, points: Vec2[]) => {
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

  renderPath = (path: Cell[], lw: number, transform: (v: Vec2, i: number) => Vec2 = a => a, halfEnd = 0) => {

    let coords = path.map((cell, i) => transform(sum(cell.topLeft(), [.5, 1]), i));
    if (path.length == 1)
      return

    if (halfEnd)
      coords[path.length - 1] = vecTween(coords[path.length - 2], coords[path.length - 1], .7)

    coords.forEach((at, i) => {
      if (i > 0 && Math.abs(at[0] - coords[i - 1][0]) < 10) {
        cx.beginPath()
        let ends = [coords[i - 1], at] as [Vec2, Vec2]
        cx.lineWidth = lw * (1 + .2 * Math.abs(ends[0][1] - ends[1][1]));
        cx.moveTo(...ends[0])
        cx.lineTo(...ends[1])
        cx.stroke()
      }
    })

  },

  prerenderUniverse = () => {
    [worldPhoto, cx] = canvasElementAndContext((ww + .5) * photoScale[0], wh * photoScale[1])

    loop(3, drawingLayer => {
      u.drawOrder.forEach(cell => {
        let pos = cell.pixelPos()
        if (cell.layer == drawingLayer && !cell.bedrock) {
          cx.drawImage(cell.biome.sprites[cell.at % 3 + (cell.layer == 2 ? 3 : 0)], ...sum(pos, [0, 5]));
        }
      })
    })

    cx.save()
    cx.scale(...photoScale);

    cx.lineCap = "round"
    cx.lineWidth = .05;

    for (let riverLayer of [0, 1]) {
      cx.strokeStyle = ["#4444", "#0093F0"][riverLayer];

      u.rivers.forEach(river => renderPath(
        river,
        .2,
        (v: Vec2, i) => sum(v, ([[0, 0], [0, -.15]] as Vec2[])[riverLayer]),
        1
      ))
    }

    //let grad:CanvasPattern = cx.createPattern(sprites[48], "repeat")    cx.strokeStyle = grad;

    renderRoads()

    cx.restore()

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
        cx.fillRect(...sum(cell.pixelPos(), [5, 10]), 1, -cell.hum);
        cx.fillStyle = "#f00";
        cx.fillRect(...sum(cell.pixelPos(), [6, 10]), 1, -cell.t * 10);
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
              cell.pixelPos(), propSlots[i % 6]), [0, 4]))
          )
        }
        cx.drawImage(
          img,
          ...round(sum(
            cell.pixelPos(), propSlots[i % 6]))
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
      cutSpriteFromAtlas(0, 0, 17, 22, constructFilter([
        scale(biome.rgba, 1.3 - .05 * i - (i > 2 ? .2 : 0)),
        scale(biome.rgba, .5),
        scale(biome.rgba, .3)
      ], i + biome.color)))
  },
  drawText = (s: string, x: number, y: number) => {
    [...s].forEach((c, i) => cx.drawImage(letters[c.toUpperCase().charCodeAt(0) - 32], x + 6 * i, y))
  },
  drawVillageTitlesBuiltinFonts = () => {
    cx.font = "14px Georgia"
    cx.textAlign = "center"
    cx.shadowColor = "#000";
    cx.shadowOffsetX = -1;
    cx.shadowOffsetY = 1;

    u.drawOrder.forEach(cell => {
      if (cell.settlement) {
        cx.fillStyle = "#fff"
        cx.fillText(cell.name, ...muls(sum(cell.center(), [0, -.5]), photoScale))
      }
    })
  },


  drawImageCentered = (image: HTMLCanvasElement, pos: Vec2) => {
    cx.drawImage(image, pos[0] - image.width, pos[1] - image.height)
  },

  renderRoads = () => {
    cx.lineWidth = .05;
    cx.strokeStyle = "#880";

    u.roads.forEach(road => renderPath(road, .17))
    cx.strokeStyle = "#aa0";
    u.roads.forEach(road => renderPath(road, .1))
  }
  ;

//export const testFilter = constructFilter([[1, 0, 1], [1, 1, 0], [1, 0, 1]]);
/*hexPoints = [[.5, -.1], [1, .1], [1, 1], [.5, 1.2], [0, 1], [0, .1], [.5, -.1]] as Vec2[],
hexBasePoints = [[0, 1], [.5, 1.2], [1, 1], [1, 1.2], [.5, 1.4], [0, 1.2]] as Vec2[],
hexBasePointsRight = [[.5, 1.2], [1, 1], [1, 1.2], [.5, 1.4]] as Vec2[],
triPoints = [[0, -.5], [.5, .5], [-.5, .5]] as Vec2[],*/

