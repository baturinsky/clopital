import { atlas } from "./main";
import { clamp, Vec2, sum, RGBA, loop, rng, tween, sub, scale, mulv, round } from "./util";
import { altitude, temperature, wetness, hexPos, rivers, biomeAt, hexCenter, riverAt, HighlandLevel, MountainLevel, layer } from "./planet";
import { ww, photoScale, wh, TWO_PI } from "./root";
import { Biome, biomeMatrix, BiomeName, biomesByNames, MESA, WAVES } from "./biomes"
import { state } from "./state";


export let worldPhoto: HTMLCanvasElement,
  cx: CanvasRenderingContext2D, props: HTMLCanvasElement[],
  sprites: HTMLCanvasElement[],
  outlined: HTMLCanvasElement[],
  filters = new Set();

declare var DEFS: SVGElement, C: HTMLCanvasElement;

export const
  propSlots =
    ([
      ...loop(6, i => [Math.sin(i / 6 * TWO_PI) / 3 + .2, Math.cos(i / 6 * TWO_PI) / 3 + .2])
    ] as Vec2[]).
      map(p => mulv(p, photoScale)).
      sort((a, b) => a[1] - b[1]) as Vec2[],
  /*hexPoints = [[.5, -.1], [1, .1], [1, 1], [.5, 1.2], [0, 1], [0, .1], [.5, -.1]] as Vec2[],
  hexBasePoints = [[0, 1], [.5, 1.2], [1, 1], [1, 1.2], [.5, 1.4], [0, 1.2]] as Vec2[],
  hexBasePointsRight = [[.5, 1.2], [1, 1], [1, 1.2], [.5, 1.4]] as Vec2[],
  triPoints = [[0, -.5], [.5, .5], [-.5, .5]] as Vec2[],*/

  drawOrder = loop(wh, row => loop(ww, col => row * ww + (col + ww - ~~(row / 2)) % ww)).flat(),

  drawSprite = (sprite: HTMLCanvasElement, pos: Vec2, alpha = 1) => {
    cx.save()
    if (alpha != 1)
      cx.globalAlpha = alpha
    let drawingAt = sum(mulv(pos, photoScale), state.topLeftAt)
    cx.scale(state.scale, state.scale)
    cx.drawImage(sprite, ...drawingAt);
    cx.restore()
  },

  render = () => {
    cx.imageSmoothingEnabled = false
    cx.clearRect(0, 0, 1e7, 1e7);
    cx.save();
    cx.scale(state.scale, state.scale)
    cx.translate(...state.topLeftAt);
    cx.drawImage(worldPhoto, 0, 0);
    cx.restore()

    drawSprite(sprites[2], hexPos(state.queenAt))
    drawSprite(outlined[1], sum(hexPos(state.queenAt), [0, Math.sin(Date.now() / 500) / 9 - .5]))

    if (state.tilePointed != state.queenAt)
      drawSprite(outlined[1], hexPos(state.tilePointed), .7)
  },
  initRenderer = () => {
    Object.values(biomesByNames).forEach(b => b.sprites = makeBiomeSprites(b))
    props = loop(9, i => cutSpriteFromAtlas((i - 1) * 10, 30, 10, 18))
    sprites = loop(8, i => cutSpriteFromAtlas((i - 1) * 16, 48, 16, 24))
    outlined = loop(8, i => cutSpriteFromAtlas((i - 1) * 16, 48, 16, 24, "url(#OUTL)"))
    //let treeSprite =
    C.width = innerWidth;
    C.height = innerHeight;
    cx = C.getContext("2d") as CanvasRenderingContext2D;
    cx.imageSmoothingEnabled = false;
  },
  drawPolygon = (cx: CanvasRenderingContext2D, points: Vec2[]) => {
    cx.beginPath();
    points.forEach((p: Vec2) => {
      cx.lineTo(...p)
    })
  },
  pixelHexPos = (at: number) =>
    round(mulv(hexPos(at), photoScale))
  ,
  canvasElementAndContext = (w: number, h: number) => {
    let c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    let cx = c.getContext("2d") as CanvasRenderingContext2D;
    cx.imageSmoothingEnabled = false
    return [c, cx] as [HTMLCanvasElement, CanvasRenderingContext2D]
  },
  prerenderPlanet = () => {
    let cx: CanvasRenderingContext2D;
    [worldPhoto, cx] = canvasElementAndContext((ww + .5) * photoScale[0], wh * photoScale[1])

    loop(3, drawingLayer => {
      drawOrder.forEach((at) => {
        let biome = biomeAt[at];
        let pos = pixelHexPos(at)
        if (layer(at) == drawingLayer) {
          cx.drawImage(biome.sprites[at % 3 + (layer(at) == 2 ? 3 : 0)], ...sum(pos, [0, 5]));
        }
      })
    })

    cx.save()
    cx.scale(...photoScale);

    cx.lineCap = "round"

    for (let riverLayer of [0, 1]) {
      cx.strokeStyle = ["#a44", "#0080D3"][riverLayer];
      rivers.forEach(river => {
        //let coords = river.map(at => sum(hexPos(at), [.4+ rng()*.2, .4+ rng()*.2]))
        let coords = river.map(at => sum(hexPos(at), [.5, 1]))
        if (river.length == 1)
          return
        coords[river.length - 1] = tween(coords[river.length - 2], coords[river.length - 1], .5 + riverLayer * .2)
        coords.forEach((at, i) => {
          if (i > 0 && Math.abs(at[0] - coords[i - 1][0]) < 10) {
            cx.beginPath()
            let ends = [sum(coords[i - 1], [0, riverLayer / 6]), sum(at, [0, (i == river.length - 1) ? 0 : riverLayer / 8])] as [Vec2, Vec2]
            cx.lineWidth = .25 + .05 * Math.abs(ends[0][1] - ends[1][1]);
            cx.lineTo(...ends[0])
            cx.lineTo(...ends[1])
            cx.stroke()
          }
        })
      })
    }
    cx.restore()

    drawOrder.forEach((at) => {
      let pnum = 6
      let prop = altitude[at] >= MountainLevel ? MESA : biomeAt[at].prop;
      //if (prop == MESA || prop == WAVES)        pnum = 3;
      let guaranteed = rng(pnum)
      if (prop) {
        loop(pnum, i =>
        //cx.drawImage(props[prop], ...round(sum(pixelHexPos(at), [rng(12) - 3, i - 2])))
        {
          if (riverAt[at] ? i==guaranteed : rng(3) || i % 2)
            cx.drawImage(
              props[prop],
              ...round(sum(sum(
                pixelHexPos(at), propSlots[i % 6]),
                [rng(3) - 1, rng(3) - 1]
              ))
            )
        })
      }
      if (state.debug) {
        cx.fillStyle = "#00f";
        cx.fillRect(...sum(pixelHexPos(at), [5, 10]), 1, -wetness[at]);
        cx.fillStyle = "#f00";
        cx.fillRect(...sum(pixelHexPos(at), [6, 10]), 1, -temperature[at] * 10);
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
  };

//export const testFilter = constructFilter([[1, 0, 1], [1, 1, 0], [1, 0, 1]]);
