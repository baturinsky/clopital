import { Biome, biomeMatrix, BiomeName, biomesByNames } from "./biomes"
import { rng, randomElement, min, Vec2, sum, clamp, setSeed } from "./math"
import { ws, inside, neighborShift, SeaLevel, ww, HillLevel } from "./root"

export let
  altitude: number[],
  tectonic: number[],
  wetness: number[],
  riverAt: number[],
  temperature: number[],
  biomeAt: Biome[],
  rivers: number[][]

export const generatePlanet = (genSeed: number) => {
  setSeed(genSeed)
  altitude = new Array(ws).fill(0)
  tectonic = new Array(ws).fill(0)
  wetness = new Array(ws).fill(0)
  riverAt = new Array(ws).fill(0)
  rivers = undefined as any

  const erect = (at: number, limit: number, altitude: number[]) => {
    while (inside(at) && rng(100)) {
      neighborShift.forEach(d => {
        if (inside(at + d))
          altitude[at + d]++
      })
      at += randomElement(neighborShift);
      if (limit && !rng(10))
        erect(at, --limit, altitude)
    }
  }

  for (let i = 0; i < 40; i++)  erect(rng(ws), 3, altitude)

  const erode = (at: number, path: number[] = []) => {
    path.push(at);
    if (altitude[at] < SeaLevel)
      return path;
    let lowest = at + min(neighborShift, shift => altitude[at + shift] ?? 100)
    let d = altitude[at] - altitude[lowest];
    if (!(d > 0))
      return;
    if (!rivers) {
      altitude[at] -= d / 2;
      altitude[lowest] += d / 3;
    }
    return erode(lowest, path)
  }

  for (let i = 0; i < 10000; i++)
    erode(rng(ws))

  rivers = []

  for (let i = 0; i < 500; i++) {
    let path = erode(rng(ws));
    if (path && path.length > 1) {
      rivers.push(path)
      path.forEach(at => riverAt[at] = 1);
    }
  }

  temperature = altitude.map((alt, at) => 1 - Math.abs(0.5 - at / ws) ** 2 * 5 - alt / 100);

  for (let i = 0; i < 10; i++)
    altitude.forEach((h, at) => {
      let
        clouds = h <= SeaLevel ? 20 * (Math.cos(at / ws * 12.5) + 1) : riverAt[at] / 2,
        d = at < ws * .3 || at > ws * .7 ? 1 : -1;
      while (clouds > 0 && inside(at)) {
        [0, ...neighborShift].forEach(ns => inside(at + ns) && (wetness[at + ns] += .1))
        clouds = clouds * .9 - h / 20;
        at += d;
        if (h > 10 && !rng(2))
          at += randomElement(neighborShift);
        if (altitude[at] <= SeaLevel)
          break
      }
    })

  biomeAt = altitude.map((h, at) => {
    let b = biomesByNames[h < SeaLevel - 3 ? "ocean" : h < SeaLevel ? "sea" :
      biomeMatrix
      [clamp(0, ~~(2 + temperature[at] / 2 - wetness[at] / 6), 2)]
      [clamp(0, ~~(3 - temperature[at] * 4), 3)]
    ]
    //console.log(clamp(0, ~~(2 + temperature[at] - wetness[at] / 5), 2),      clamp(0, ~~(2 - temperature[at] * 1.5), 3));
    if (!b)
      debugger
    return b
  });
}

export const hexPos = (at: number, seaLevel = false) => {
  let y = ~~(at / ww);
  return [(at % ww + y / 2) % ww,
  y - (seaLevel ? 0 : (altitude[at] < SeaLevel ? -.4 : altitude[at] < HillLevel ? 0 : .4))
  ] as Vec2
},
  hexCenter = (at: number) => sum(hexPos(at), [.5, .5])


//for (let i = 0; i < 1; i += .05) {  console.log(i, Math.cos(i * 12.5) + 1)}