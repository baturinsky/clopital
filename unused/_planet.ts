import { Biome, biomeMatrix, BiomeName, biomesByNames } from "../src/biomes"
import { rng, randomElement, min, Vec2, sum, loop, clamp, setSeed, japaneseName, cap1, scale } from "../src/util"
import { ws, inside, neighborShift, ww, wh, neighborsBelow } from "../src/root"

export type PathPoint = { c: number, d: number, from: number }

export let
  SeaLevel: number,
  HighlandLevel: number,
  PeaksLevel: number,
  altitude: number[],
  tectonic: number[],
  wetness: number[],
  riverAt: number[],
  temperature: number[],
  biomeAt: Biome[],
  hexNames: string[],
  rivers: number[][],
  landTravelCost: number[]

export const

  generatePlanet = (genSeed: number) => {
    setSeed(genSeed)
    altitude = new Array(ws).fill(0)
    tectonic = new Array(ws).fill(0)
    wetness = new Array(ws).fill(0)
    riverAt = new Array(ws).fill(0)
    rivers = undefined as any

    const
      erect = (at: number, limit: number, base = 1) => {
        while (inside(at) && rng(100)) {
          neighborShift.forEach(d => {
            if (inside(at + d))
              altitude[at + d] += base
          })
          at += randomElement(neighborShift);
          if (limit && !rng(10))
            erect(at, --limit, base)
        }
      },
      quantile = (n: number) => {
        let l = -10
        while (altitude.filter(v => v < l).length < ws * n)
          l += .5
        return l
      },
      erode = (at: number, path: number[] = []) => {
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


    loop(30, () => erect(rng(ws), 3, rng(3) + 1))

    SeaLevel = quantile(.6)
    HighlandLevel = quantile(.85)
    PeaksLevel = quantile(.97)

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
      if (h >= PeaksLevel)
        b = biomesByNames.peaks
      //console.log(clamp(0, ~~(2 + temperature[at] - wetness[at] / 5), 2),      clamp(0, ~~(2 - temperature[at] * 1.5), 3));
      if (!b)
        debugger
      return b
    })

    hexNames = loop(ws, i => cap1(japaneseName()))

  },

  /** vertical layer of the hex */
  layer = (at: number) =>
    altitude[at] < SeaLevel ? 0 : altitude[at] < HighlandLevel ? 1 : 2,

  /** visual hex position */
  hexPos = (at: number, fixedLayer?: number) => {
    let y = ~~(at / ww);
    return [(at % ww + y / 2) % ww,
    y - .4 * (fixedLayer ?? layer(at))
    ] as Vec2
  },

  /** visual hex center position */
  hexCenter = (at: number) => sum(hexPos(at), [.5, .5]),

  loopNeighbors = <T>(from: number, f: (at: number) => T) => neighborShift.forEach(n => f(from + n)),

  habitabilityScore = (at: number) => {
    let score = 0, coast = 0;
    loopNeighbors(at, nat => {
      score += biomeAt[at].habitability * 2
      coast += altitude[at] < SeaLevel ? 1 : 0;
    })    
  },

  pathfind = (start: number, maxDist: number) => {
    const visited = new Set<number>();
    const queue: PathPoint[] = [], result: { [at: number]: PathPoint } = {};

    queue.push({ at: start, d: 0, from: start });
    visited.add(start);

    while (queue.length > 0) {
      // Remove the front element from the queue
      const current = queue.shift()!;
      result[current.at] = current;

      for (const ns of neighborShift) {
        let neighbor = current.at + ns;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          let d = current.d + (biomeAt[neighbor].travel ?? 1e9);
          if (d <= maxDist)
            queue.push({ at: neighbor, d, from: current.at });
        }
      }
    }

    return result;
  }


//for (let i = 0; i < 1; i += .05) {  console.log(i, Math.cos(i * 12.5) + 1)}


