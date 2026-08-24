import { Biome, biomeMatrix, BiomeName, biomesByNames } from "./biomes"
import { rng, randomElement, min, Vec2, sum, loop, clamp, setSeed } from "./util"
import { ws, inside, neighborShift, ww, wh, neighborsBelow } from "./root"



export let
  SeaLevel = 5,
  HighlandLevel = 30,
  MountainLevel = 60,
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

  const erect = (at: number, limit: number, base = 1) => {
    while (inside(at) && rng(100)) {
      neighborShift.forEach(d => {
        if (inside(at + d))
          altitude[at + d] += base
      })
      at += randomElement(neighborShift);
      if (limit && !rng(10))
        erect(at, --limit, base)
    }
  }

  loop(30, () => erect(rng(ws), 3, rng(3) + 1))

  SeaLevel = 0, MountainLevel = 0
  while (altitude.filter(v => v < SeaLevel).length < ws * .6)
    SeaLevel++

  while (altitude.filter(v => v < MountainLevel).length < ws * .97)
    MountainLevel++

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

  loop(10000, () => erode(rng(ws)))

  rivers = []

  loop(500, () => {
    let path = erode(rng(ws));
    if (path && path.length > 1) {
      rivers.push(path)
      path.forEach(at => riverAt[at] = 1);
    }
  })

  temperature = altitude.map((alt, at) => 1 - Math.abs(0.5 - at / ws) ** 2 * 5 - alt / 100);

  loop(12, i =>
    altitude.forEach((h, at) => {
      let
        clouds = (h <= SeaLevel ? 10 : riverAt[at] ? 5 : 0) * (Math.cos(at / ws * 12.5) + 1 + rng() / 3),

        d = neighborShift[i] ?? (at < ws * .3 || at > ws * .7 ? 1 : -1);

      while (clouds > 0 && inside(at)) {
        [0, ...neighborShift].forEach(ns => { if (inside(at + ns)) wetness[at + ns] += clouds / 50 })
        at += d;
        if (h > 10 && !rng(2))
          at += randomElement(neighborShift);
        if (altitude[at] <= SeaLevel)
          break
        clouds = clouds * .9 - (h - SeaLevel) / 5;
      }
    })
  )

  altitude.forEach((h, at) => {
    if (h >= HighlandLevel) {
      neighborsBelow.forEach((delta) => {
        if (altitude[delta + at] < SeaLevel) {
          altitude[delta + at] = SeaLevel + .1
        }
      })
    }
  })

  biomeAt = altitude.map((h, at) => {
    let b = biomesByNames[h < SeaLevel - 3 ? "ocean" : h < SeaLevel ? "sea" :
      biomeMatrix
      [clamp(0, ~~(2.1 + temperature[at] / 3 - wetness[at] / 20), 2)]
      [clamp(0, ~~(3 - temperature[at] * 4), 3)]
    ]
    //console.log(clamp(0, ~~(2 + temperature[at] - wetness[at] / 5), 2),      clamp(0, ~~(2 - temperature[at] * 1.5), 3));
    if (!b)
      debugger
    return b
  });
},

  layer = (at: number) =>
    altitude[at] < SeaLevel ? 0 : altitude[at] < HighlandLevel ? 1 : 2,

  hexPos = (at: number, fixedLayer?: number) => {
    let y = ~~(at / ww);
    return [(at % ww + y / 2) % ww,
    y - .4 * (fixedLayer ?? layer(at))
    ] as Vec2
  },
  hexCenter = (at: number) => sum(hexPos(at), [.5, .5])


//for (let i = 0; i < 1; i += .05) {  console.log(i, Math.cos(i * 12.5) + 1)}