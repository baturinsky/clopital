import { atlas } from "./main";
import { ww, photoScale, wh, TWO_PI } from "./root";
import { Biome, biomeMatrix, BiomeName, biomesByNames, HUTS, HUTS2, MESA, WAVES } from "./biomes"
import { pointedCell, queenCell, state } from "./state";
import { u } from "./universe";
import { asArray, loop, muls, randomElement, RGBA, rng, round, scale, setSeed, sum, tween, Vec2 } from "./util";
import { Cell } from "./cell";


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
  letterWidth = 6;

declare var DEFS: SVGElement, C: HTMLCanvasElement;

export const
  propSlots =
    ([
      ...loop(6, i => [Math.sin(i / 6 * TWO_PI) / 3 + .2, Math.cos(i / 6 * TWO_PI) / 3 + .2])
    ] as Vec2[]).
      map(p => muls(p, photoScale)).
      sort((a, b) => a[1] - b[1]) as Vec2[],
  /*hexPoints = [[.5, -.1], [1, .1], [1, 1], [.5, 1.2], [0, 1], [0, .1], [.5, -.1]] as Vec2[],
  hexBasePoints = [[0, 1], [.5, 1.2], [1, 1], [1, 1.2], [.5, 1.4], [0, 1.2]] as Vec2[],
  hexBasePointsRight = [[.5, 1.2], [1, 1], [1, 1.2], [.5, 1.4]] as Vec2[],
  triPoints = [[0, -.5], [.5, .5], [-.5, .5]] as Vec2[],*/


  drawSprite = (sprite: HTMLCanvasElement, pos: Vec2, alpha = 1) => {
    cx.save()
    if (alpha != 1)
      cx.globalAlpha = alpha
    let drawingAt = sum(muls(pos, photoScale), state.topLeftAt)
    cx.scale(state.scale, state.scale)
    cx.drawImage(sprite, ...drawingAt);
    cx.restore()
  },

  render = () => {
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

    drawSprite(sprites[64], queenTopLeft)
    drawSprite(outlined[48], sum(queenTopLeft, [0, Math.sin(Date.now() / 500) / 9 - .7]))

    if (state.tilePointed != state.queenAt)
      drawSprite(sprites[64], pointedCell().topLeft(), .7)

  },
  initRenderer = () => {
    Object.values(biomesByNames).forEach(b => b.sprites = makeBiomeSprites(b))
    //props = loop(64, i => cutSpriteFromAtlas(i % 16 * 16, 16 + ~~(i/16), 16, 16))
    huts = loop(30, i => cutSpriteFromAtlas(16, 64, 16, 16,
      constructFilter([
        [.5 + rng() / 3, rng() / 3, rng() / 3, 1],
        [0, 1, 0, 1],
        [.5 + rng() / 2, .5 + rng() / 2, .5 + rng() / 2, 1]
      ], "hut" + i))),
      sprites = loop(96, i => cutSpriteFromAtlas((i % 16) * 16, 32 + ~~(i / 16) * 16, 16, 16))
    outlined = loop(96, i => cutSpriteFromAtlas((i % 16) * 16, 32 + ~~(i / 16) * 16, 16, 16, "url(#OUTL)"))
    letters = loop(64, i => cutSpriteFromAtlas((i % 16) * letterWidth, 209 + ~~(i / 16) * 12, letterWidth + 1, 12, "url(#OUTL)"))
    //let treeSprite =
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
      coords[path.length - 1] = tween(coords[path.length - 2], coords[path.length - 1], .7)

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


    cx.lineWidth = .05;
    cx.strokeStyle = "#880";


    u.roads.forEach(road => renderPath(road, .17))
    cx.strokeStyle = "#aa0";
    u.roads.forEach(road => renderPath(road, .1))

    cx.restore()

    u.drawOrder.forEach(cell => {

      setSeed(cell.at)
      let pnum = 6,
        props = asArray(cell.biome.prop) as number[],
        guaranteed = rng(pnum)


      //let prop = altitude[at] >= PeaksLevel ? MESA : biomeAt[at].prop;
      //if (prop == MESA || prop == WAVES)        pnum = 3;

      if (props) {

        loop(pnum, i =>
        //cx.drawImage(props[prop], ...round(sum(pixelHexPos(at), [rng(12) - 3, i - 2])))
        {
          if (cell.rivers ? i == guaranteed : rng(3) || i % 2)
            cx.drawImage(
              cell.settlement ? huts[rng(10)] :
                sprites[randomElement(props)],
              ...round(sum(sum(
                cell.pixelPos(), propSlots[i % 6]),
                [- 4, -1]
              ))
            )
        })
      }
      if (state.debug) {
        cx.fillStyle = "#00f";
        cx.fillRect(...sum(cell.pixelPos(), [5, 10]), 1, -cell.hum);
        cx.fillStyle = "#f00";
        cx.fillRect(...sum(cell.pixelPos(), [6, 10]), 1, -cell.t * 10);
      }

    })

    drawVillageTitles()
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
  drawText = (s: String, x: number, y: number) => {
    [...s].forEach((c, i) => cx.drawImage(letters[c.charCodeAt(0) - 32], x + 6 * i, y))
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

  drawVillageTitles = () => {
    u.drawOrder.forEach(cell => {
      if (cell.settlement) {
        drawText(cell.name.toUpperCase(), ...muls(sum(cell.center(), [.7, -.2]), photoScale))
      }
    })

  }


  ;

//export const testFilter = constructFilter([[1, 0, 1], [1, 1, 0], [1, 0, 1]]);
