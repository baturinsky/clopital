import { atlas } from "./main";
import { ww, photoScale, wh, TWO_PI, worldCoord, photoShift } from "./root";
import { Biome, biomeMatrix, BiomeName, biomesByNames, HUTS, HUTS2, MESA, WAVES } from "./biomes"
import { pointedCell, queen, queenCell, selected, state, update } from "./state";
import { HAVERIVERS, u } from "./universe";
import { asArray, loop, muls, nof, randomElement, RGBA, rng, round, scale, setSeed, shuffle, sum, vecTween, Vec2, sub, len, dist, cap1, hexToRgb } from "./util";
import { Cell } from "./cell";
import { animate, cancelAnimation, updateAnimations } from "./animation";
import { Agent, resAnimations } from "./agent";
import { GoodNumbers } from "./market";
import { resources } from "./resources";
import { shift } from "./controls";
import { flyers } from "./races";

declare const DEBUG: boolean

export const
  layerThickness = 4,
  mapRevealDuration = 700,
  AtlasSpriteSize = 16,
  BIGCURSOR = 16,
  CURSOR = 18,
  WALK = 100,
  FLY = 101,
  SWIM = 102,
  SAIL = 103,
  AIR = 104,
  QUEEN = 48,
  SHADOW = 65;

let worldPhoto: HTMLCanvasElement,
  previousWorldPhoto: HTMLCanvasElement | undefined,
  /** Main canvas context */
  ctx: CanvasRenderingContext2D,
  /** Currently active context (ctx unless it's prerender)*/
  cx: CanvasRenderingContext2D,
  sprites: HTMLCanvasElement[],
  props: HTMLCanvasElement[], huts: HTMLCanvasElement[],
  outlined: HTMLCanvasElement[],
  letters: HTMLCanvasElement[],
  letterWidth = 6,
  filters = new Set(),
  revealingMap = 0,
  blinkAlpha = 0,
  dt = 1,
  lastT = Date.now();

declare var DEFS: SVGElement, C: HTMLCanvasElement, Next: HTMLButtonElement;

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

  drawOnCell = (cell: Cell, sprite?: HTMLCanvasElement | number, pos: Vec2 = [0, 0], alpha = 1) => {
    if (!cell || !sprite)
      return
    if (sprite as number >= 0)
      sprite = sprites[sprite as number]
    let p = photoShift(sum(cell.center(), pos))
    drawSprite(sprite as HTMLCanvasElement, p, alpha);
  },

  toScreenPos = (pos: Vec2) => {
    return sum(scale(muls(pos, photoScale), 1), state.topLeftAt)
  },

  drawCentered = (sprite: HTMLCanvasElement, pos: Vec2, alpha = 1) => {
    drawSprite(sprite, sum(pos, [-sprite.width / 2 / photoScale[0], -sprite.height / 2 / photoScale[1] + 5]), alpha)
  },

  wobbleFlight = (p: Vec2, amplitude = 6) => sum(p, [0, amplitude * (1 + Math.sin(Date.now() / 500)) / 2]),

  renderLoop = () => {
    if(!u)
      return requestAnimationFrame(renderLoop)

    let t = Date.now();
    dt = t - lastT;
    lastT += dt;

    blinkAlpha = (2 + Math.sin(t / 100)) / 3;

    if(document.Next)
      Next.style.transform = `scale(${queen().steps == 0 ? 1 + blinkAlpha / 10 : 1})`

    if (state.targetTLA) {
      //console.log(state.topLeftAt, state.targetTLA, dt);
      state.topLeftAt = vecTween(state.topLeftAt, state.targetTLA, Math.min(.3, dt / 100));
      if (dist(state.topLeftAt, state.targetTLA) < 3) {
        update({ targetTLA: undefined })
      }
    }

    cx = ctx;
    cx.clearRect(0, 0, 1e7, 1e7);
    cx.save();
    cx.scale(state.scale, state.scale)
    cx.translate(...state.topLeftAt);

    if (previousWorldPhoto) {
      cx.drawImage(previousWorldPhoto, 0, 0);
      cx.globalAlpha = 1 - revealingMap / mapRevealDuration;
      cx.drawImage(worldPhoto, 0, /*revealingMap / mapRevealDuration*20*/0);
      cx.globalAlpha = 1
      revealingMap -= dt;
      if (revealingMap <= 0)
        previousWorldPhoto = undefined;
    } else {
      cx.drawImage(worldPhoto, 0, 0);
    }

    /** Rendering with the current zoom and image position.  */

    updateAnimations(dt)

    for (let agent of u.a) {
      if (agent.anim || !agent.cell.seen)
        continue
      drawOnCell(agent.cell, agent.happy() ? SHADOW + 1 : SHADOW)
      if (selected() == agent && t % 800 < 400) {
        drawOnCell(agent.cell, BIGCURSOR)
      }
      drawOnCell(agent.cell, agent.race?.sprite,
        [0, flyers.includes(agent.race.name) ? -5 - (Math.sin(Date.now() / 500) * 2) : 0])

      let animationProbability =
        100 *
        agent.transfers?.length /
        (10 + dist(agent.cell.center(), pointedCell()?.center())) /
        (resAnimations + 100)

      if (animationProbability > rng(100)) {
        let transfer = randomElement(agent.transfers);
        agent.animateTransfer(transfer);
      }
    }

    if (selected() && !selected().anim/* && !selected().isBuilding()*/) {
      let a = selected()

      if (shift || pointedCell()?.a.length == 0) {
        cx.globalAlpha = .7
        drawStepsTo(a, pointedCell())
        cx.globalAlpha = 1
      }
      drawStepsTo(a, a.dest)
    }

    drawOnCell(pointedCell(), CURSOR, [0, layerThickness * (pointedCell()?.layer - 1)])

    drawOnCell(pointedCell(), CURSOR, undefined, .5)

    cx.restore()

    requestAnimationFrame(renderLoop)
  },

  drawStepsTo = (a: Agent, target?: Cell) => {
    if (!target || !a.happy())
      return;
    let p = a.pathTo(target);
    if (p) {
      p.forEach((step, i) => {
        i > 0 && drawOnCell(
          step,
          //resourceIcon(a.race.moving + (i > a.steps ? "Far" : "")))
          resourceIcon("walk" + (i > a.maxSteps() ? "Far" : "")))
      })
    }
  },
  centerOn = (cell: Cell) => {
    let targetTLA = sum(scale(cell.center(), -1), [innerWidth, innerHeight], .5 / state.scale)
    if (dist(targetTLA, state.topLeftAt) > 50)
      update({ targetTLA })
  },
  atlasSprite = (id: number, filter?: string) =>
    cutSpriteFromAtlas((id % AtlasSpriteSize) * AtlasSpriteSize, ~~(id / AtlasSpriteSize) * AtlasSpriteSize, AtlasSpriteSize, AtlasSpriteSize, filter)
  ,
  initRenderer = () => {
    Object.values(biomesByNames).forEach(b => b.sprites = makeBiomeSprites(b))
    sprites = loop(160, i => atlasSprite(i))
    outlined = loop(160, i => atlasSprite(i, "url(#OUTL)"))
    ctx = canvasElementAndContext(innerWidth, innerHeight, C)[1]
  },

  drawCurve = (points: Vec2[]) => {
    cx.beginPath();
    points.forEach((p: Vec2) => {
      cx.lineTo(...p)
    })
  },

  canvasElementAndContext = (w: number, h: number, c?: HTMLCanvasElement) => {
    c ??= document.createElement('canvas');
    c.width = w;
    c.height = h;
    let cx = c.getContext("2d") as CanvasRenderingContext2D;
    cx.imageSmoothingEnabled = false
    return [c, cx] as [HTMLCanvasElement, CanvasRenderingContext2D]
  },

  drawLine = (path: Cell[], lw: number, transform: (v: Vec2, i: number) => Vec2 = a => a, riverEnd = 0) => {

    let coords = path.map((cell, i) => transform(sum(cell.center(), [0, layerThickness + 2]), i));

    if (path.length == 1)
      return

    if (riverEnd) {
      coords[path.length - 1] = vecTween(coords[path.length - 2], coords[path.length - 1], .7)
      coords[path.length - 1][1] -= 3;
    }

    cx.lineWidth = lw;

    coords.slice(1).forEach((v, i) => {
      if (path[i].seen || path[i + 1].seen) {
        stroke(coords[i], v);
      }
    })

  },

  stroke = (a: Vec2, b: Vec2) => {
    cx.beginPath()
    cx.moveTo(...a)
    cx.lineTo(...b)
    cx.stroke()
  },

  smoothLine = (line: Vec2[]) => {
    let line1 = line.map((v, i) => [v, vecTween(v, line[i + 1] ?? v, .5)]).flat(1);
    let line2 = line1.map((v, i) => vecTween(v, vecTween(line[i - 1] ?? v, line[i + 1] ?? v, .5), .5))
    return line2;
  },

  drawRadials = ()=>{
    let wps = [worldPhoto.width, worldPhoto.height] as Vec2;
    cx.save()
    cx.strokeStyle = "#fff4";
    cx.translate(...scale(wps, .5))
    loop(63, i => {
      let v = [Math.sin(i * .1), -Math.cos(i * .1)] as Vec2;
      stroke(scale(v, 70), scale(v, 1000))
      cx.beginPath()
      cx.arc(0, 0, i * 70, 0, 7);
      cx.stroke();
    })
    cx.restore()
  },

  prerenderUniverse = () => {
    previousWorldPhoto = worldPhoto;
    revealingMap = mapRevealDuration;

    [worldPhoto, cx] = canvasElementAndContext((ww + .5) * photoScale[0], wh * photoScale[1])


    //drawRadials()

    u.drawOrder = loop(wh, row => loop(ww, col => row * ww + (col + ww - ~~(row / 2)) % ww)).flat().map(at => u.c[at]).filter(c => c.seen)

    loop(3, drawingLayer => {
      u.drawOrder.forEach(cell => {
        let pos = cell.topLeft()
        if (cell.layer == drawingLayer && !cell.bedrock) {
          cx.drawImage(cell.biome.sprites[cell.at % 3 + (cell.layer == 2 ? 3 : 0)], ...sum(pos, [0, 5]));
        }
      })
    })

    if (HAVERIVERS) {
      cx.lineCap = "round"

      for (let riverLayer of [0, 1]) {
        cx.strokeStyle = ["#4444", "#0093F0"][riverLayer];
        u.rivers.forEach(river => drawLine(
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
    }

    u.drawOrder.forEach(cell => {

      setSeed(cell.at)
      let pnum = cell.rivers ? 3 : 3 + rng(3),
        prop = cell.biome.prop

      if (prop) {
        let i1 = nof([sprites[prop]], 6, pnum);
        drawProps(cell, i1)
      }

      cell.special && drawOnCell(cell, resourceIcon(cell.special))

    })

  },
  drawProps = (cell: Cell, images: HTMLCanvasElement[]) => {
    images.forEach((img, i) => {
      if (img) {
        cx.drawImage(
          img,
          ...round(sum(
            cell.topLeft(), propSlots[i % 6]))
        )
      }
    })
  },
  constructFilter = (rgbReplace: RGBA[]) => {
    let name = JSON.stringify(rgbReplace)
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
      cutSpriteFromAtlas(240, 0, 16, 22, constructFilter([
        scale(biome.rgba, 1.3/* - .05 * i - (i > 2 ? .2 : 0)*/),
        scale(biome.rgba, .5),
        scale(biome.rgba, .3)
      ])))
  },


  drawImageCentered = (image: HTMLCanvasElement, pos: Vec2) => {
    cx.drawImage(image, pos[0] - image.width, pos[1] - image.height)
  },

  spriteCache = (ind: number, filter?: string) => {
    //console.log(ind, filter);
    let n = `${ind}@${filter}`;
    spriteCacheData[n] ??= atlasSprite(ind, filter);
    return spriteCacheData[n];
  },

  spriteCopy = (a: HTMLCanvasElement) => {
    let [sprite, sc] = canvasElementAndContext(a.width, a.height)
    sc.drawImage(a, 0, 0);
    return sprite
  },

  /** If name is resource name, returns resource icon. 
   * If it is number, returns numbered sprite
   * If it is number @ text, returns filtered sprite */
  resourceIcon = (name: string): HTMLCanvasElement => {

    let sprite: HTMLCanvasElement, split = name.split("@") as [number, string];

    if (split[0] * 0 == 0) {
      sprite = spriteCopy(spriteCache(...split))
    } else {
      if (DEBUG) {
        if (!resources[name])
          console.log("!" + name);
      }
      let r = resources[name] ?? resources["unknown"];
      r.sc ??= spriteCache(
        r.s,
        r.c && constructHexFilter(...r.c))

      sprite = spriteCopy(r.sc)
    }
    //sprite.style.transform = `scale(${devicePixelRatio * 2})`
    return sprite
  },

  iconDataUrls: { [id: string]: string } = {},

  resourceIconDataUrl = (name: string) => {
    if (!iconDataUrls[name])
      iconDataUrls[name] = resourceIcon(name).toDataURL()
    return iconDataUrls[name]
  },

  constructHexFilter = (...color: string[]) => constructFilter(
    [hexToRgb(color[0] ?? "#f00"),
    hexToRgb(color[1] ?? "#0f0"),
    hexToRgb(color[2] ?? "#00f")]),

  spriteOf = (a: Agent) => sprites[a.race?.sprite]


const spriteCacheData: { [id: string]: HTMLCanvasElement } = {}