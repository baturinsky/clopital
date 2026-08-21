import { atlas } from "./main";
import { clamp, Vec2, sum, rng, tween, sub, scale, mulv, round } from "./util";
import { altitude, temperature, wetness, hexPos, rivers, biomeAt, hexCenter, riverAt, HighlandLevel, MountainLevel, layer } from "./planet";
import { ww, photoScale, wh, RGBA, loop } from "./root";
import { Biome, biomeMatrix, BiomeName, biomesByNames, MESA, WAVES } from "./biomes"
import { state } from "./state";


export let worldPhoto: HTMLCanvasElement,
  cx: CanvasRenderingContext2D, props: HTMLCanvasElement[],
  filters = new Set();

declare var DEFS: SVGElement, C: HTMLCanvasElement;

export const
  /*hexPoints = [[.5, -.1], [1, .1], [1, 1], [.5, 1.2], [0, 1], [0, .1], [.5, -.1]] as Vec2[],
  hexBasePoints = [[0, 1], [.5, 1.2], [1, 1], [1, 1.2], [.5, 1.4], [0, 1.2]] as Vec2[],
  hexBasePointsRight = [[.5, 1.2], [1, 1], [1, 1.2], [.5, 1.4]] as Vec2[],
  triPoints = [[0, -.5], [.5, .5], [-.5, .5]] as Vec2[],*/

  drawOrder = loop(wh, row => loop(ww, col => row * ww + (col + ww - ~~(row / 2)) % ww)).flat(),

  render = () => {
    cx.imageSmoothingEnabled = false
    cx.clearRect(0, 0, 1e7, 1e7);
    cx.save();
    cx.scale(state.scale, state.scale)
    cx.translate(...state.topLeftAt);
    cx.drawImage(worldPhoto, 0, 0);
    cx.restore()

    cx.save()
    cx.globalAlpha = .5;
    let cursorAt = sum(mulv(hexPos(state.tilePointed), photoScale), state.topLeftAt)
    cx.scale(state.scale, state.scale)
    cx.drawImage(biomesByNames.snow.sprites[0], ...cursorAt);
    cx.restore()
  },
  initRenderer = () => {
    Object.values(biomesByNames).forEach(b => b.sprites = makeBiomeSprites(b))
    props = loop(9, i => cutSpriteFromAtlas(i * 10 - 10, 30, 10, 20))
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
  prerenderPlanet = () => {
    worldPhoto = document.createElement('canvas');
    worldPhoto.width = (ww + .5) * photoScale[0];
    worldPhoto.height = wh * photoScale[1];
    let cx = worldPhoto.getContext("2d") as CanvasRenderingContext2D;

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
        let coords = river.map(at => sum(hexPos(at), [.5, .5]))
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
      if (prop == MESA || prop == WAVES)
        pnum = 3;
      if (prop && !riverAt[at]) {
        loop(pnum, i =>
          cx.drawImage(props[prop], ...round(sum(pixelHexPos(at), [rng(12) - 3, i - 2])))
        )
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
    let sprite = document.createElement("canvas")
    sprite.width = w;
    sprite.height = h
    let sx = sprite.getContext("2d") as CanvasRenderingContext2D;
    sx.imageSmoothingEnabled = false
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
