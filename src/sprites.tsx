import { Agent } from "./agent";
import { Biome } from "./biomes";
import { atlas } from "./main";
import { canvasElementAndContext } from "./renderer";
import { resources } from "./resources";
import { el } from "./ui";
import { RGBA, scale, hexToRgb, loop, clamp } from "./util";

declare const DEBUG: boolean

type CanvasFilter = (c: HTMLCanvasElement) => HTMLCanvasElement;

export let
  filters: { [id: string]: CanvasFilter } = {},
  sprites: HTMLCanvasElement[]
  ;

export const
  AtlasSpriteSize = 16;

declare var DEFS: SVGElement, C: HTMLCanvasElement, Next: HTMLButtonElement;

export const iconDataUrls: { [id: string]: string } = {},
  atlasSprite = (id: number, filter?: CanvasFilter) =>
    cutSpriteFromAtlas((id % AtlasSpriteSize) * AtlasSpriteSize, ~~(id / AtlasSpriteSize) * AtlasSpriteSize, AtlasSpriteSize, AtlasSpriteSize, filter)
  ,
  _constructFilter = (rgbReplace: RGBA[]) => {
    let name = JSON.stringify(rgbReplace)
    if (!filters[name]) {
      let f = `<filter id="f${name}"><feColorMatrix type=matrix 
      values="${[0, 1, 2, 3].map(i =>
        `${rgbReplace[0][i]} ${rgbReplace[1][i]} ${rgbReplace[2][i]} ${i == 3 ? 1 : 0} 0`).join(' ')}" /></filter>`
      DEFS.innerHTML += f;
      //filters[name] = "yes"
    }
    return `url(#f${name})`
  },

  initSprites = () => {
    sprites = loop(160, i => atlasSprite(i))
  },

  cutSpriteFromAtlas = (x: number, y: number, w: number, h: number, filter?: CanvasFilter) => {
    let [sprite, sx] = canvasElementAndContext(w, h)
    sx.drawImage(atlas, x, y, w, h, 0, 0, w, h)
    if (filter)
      sprite = filter(sprite)
    return sprite
  },

  makeBiomeSprites = (biome: Biome) => {
    return [...new Array(6)].map((v, i) =>
      cutSpriteFromAtlas(240, 0, 16, 22, constructFilter([
        biome.rgba,
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ])))
  },

  resourceIconDataUrl = (name: string) => {
    if (!iconDataUrls[name])
      iconDataUrls[name] = resourceIcon(name).toDataURL()
    return iconDataUrls[name]
  },

  constructHexFilter = (...color: string[]) => constructFilter(
    [hexToRgb(color[0] ?? "#f00"),
    hexToRgb(color[1] ?? "#0f0"),
    hexToRgb(color[2] ?? "#00f")]),

  spriteOf = (a: Agent) => sprites[a.race?.sprite],

  safariRecolor = (rgbReplace: RGBA[]) => {
    let name = JSON.stringify(rgbReplace)
    if (!filters[name]) {
      console.log(rgbReplace);
      filters[name] = (c: HTMLCanvasElement) => {
        let cx = c.getContext("2d") as CanvasRenderingContext2D,
          imageData = cx.getImageData(0, 0, c.width, c.height),
          buffer = new Uint8Array(imageData.data.buffer);
        //console.log(buffer);
        for (let i = 0; i < buffer.length; i += 4) {
          let colors = [0, 0, 0, 0], slice = buffer.slice(i, i + 4);
          slice.forEach(
            (s, channel) => (rgbReplace[channel] ?? [0, 0, 0, 1]).
              forEach((v, j) => colors[j] += clamp(0, v * s, 255))
          )
          colors[3] = slice[3];
          buffer.set(colors, i)
        }
        let [newCanvas, newContext] = canvasElementAndContext(c.width, c.height);
        newContext.putImageData(imageData, 0, 0);
        return newCanvas;
      }
    }
    return filters[name]
  },

  constructFilter = (rgbReplace: RGBA[]): CanvasFilter => {
    return safariRecolor(rgbReplace);
    let name = JSON.stringify(rgbReplace)
    if (!filters[name]) {
      let f =
        <svg xmlns="http://www.w3.org/2000/svg">
          <filter id="f" color-interpolation-filters="sRGB"><feColorMatrix type="matrix"
            values={[0, 1, 2, 3].map(i =>
              `${rgbReplace[0][i]} ${rgbReplace[1][i]} ${rgbReplace[2][i]} ${i == 3 ? 1 : 0} 0`).join(' ')} /></filter>
        </svg>

      f = <svg xmlns="http://www.w3.org/2000/svg">${f}</svg>
      let url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(f as string)}`;
      url = `url(${url}#f)`

      filters[name] = (c: HTMLCanvasElement) => {
        let [newCanvas, newContext] = canvasElementAndContext(c.width, c.height);
        newContext.filter = url
        newContext.drawImage(c, 0, 0);
        return newCanvas;
      }
    }
    return filters[name]
  },

  spriteCache = (ind: number, filter?: CanvasFilter) => {
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
  }





const spriteCacheData: { [id: string]: HTMLCanvasElement } = {}