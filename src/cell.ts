import { Biome, biomesByNames } from "./biomes"
import { MarketAgent } from "./market"
import { races } from "./races"
import { layerSickness } from "./renderer"
import { photoScale, worldCoord, toXY, wh, ws, ww } from "./root"
import { Universe } from "./universe"
import { cap1, clamp, japaneseName, loop, min, muls, randomElement, rng, round, setSeed, sum, Vec2 } from "./util"

export type PathPoint = { c: Cell, d: number, from: Cell }
const UNPPASSABLE = 1e12
export class Cell {
  /** Elevation */
  elev = 0
  /** Humidity */
  hum = 0
  rivers = 0
  roads = 0
  /** Temperature */
  t = 0

  biome: Biome = biomesByNames.bedrock
  name: string
  layer: number = 0
  habitability!: number

  bedrock!: boolean

  /** Neighbor (or undefined) to the six irections in order */
  neighborsByDir!: Cell[]

  /** Non-undefined neighbors */
  neighbors!: Cell[]

  landTravelCost = 1

  settlement?: MarketAgent

  latitude() {
    return Math.abs(.5 - this.at / ws) * 2;
  }

  water() {
    return this.elev < this.u.SeaElev;
  }

  constructor(public u: Universe, public at: number) {
    setSeed(at)
    this.name = cap1(japaneseName())
    let coord = worldCoord(at)
    this.bedrock = coord[0] < 1 || coord[0] > ww - 2 || coord[1] < 1 || coord[1] > wh - 2;
  }


  erode(path: Cell[] = []): Cell[] | undefined {
    if (this.bedrock)
      return

    path.push(this);
    if (this.elev < this.u.SeaElev)
      return path;

    let flowTo = min(this.neighbors, c => c.elev)

    if (!flowTo)
      return

    let d = this.elev - flowTo.elev;

    if (!(d > 0))
      return;

    if (!this.u.rivers) {
      this.elev -= d / 2;
      flowTo.elev += d / 3;
    }

    return flowTo.erode(path)
  }

  /** todo: traverse queue in correct order */
  pathfind(moveMode: string, maxDist: number, destination?: Cell) {
    const visited = new Set<Cell>();
    const queue: PathPoint[] = [], result: { [at: number]: PathPoint } = {};

    const costFunction = travelCostFunction(moveMode);
    queue.push({ c: this, d: 0, from: this });
    visited.add(this);

    while (queue.length > 0) {
      // Remove the front element from the queue
      const current = queue.shift()!;
      result[current.c.at] = current;
      if (current.c == destination)
        return result

      current.c.neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          let d = current.d + costFunction(current.c, neighbor);
          if (d <= maxDist) {
            let i;
            for (i = queue.length - 1; i >= 0 && queue[i].d > d; i--) { }
            queue.splice(i + 1, 0, { c: neighbor, d, from: current.c });
          }
        }
      })
    }

    return result;
  }

  pathFrom(pf: { [id: string]: PathPoint }) {
    let path: Cell[] = [this], point = pf[this.at];
    if (!point)
      return undefined;
    do {
      point = pf[point.from.at]
      path.push(point.c)
    } while (point.c != point.from)
    return path.reverse()
  }

  /** visual hex position in photo coords */
  topLeft(shift: Vec2 = [0, 0], fixedLayer?: number) {
    let p = worldCoord(this.at);
    p = sum(muls(p, photoScale), shift);
    p[1] -= layerSickness * (fixedLayer ?? this.layer ?? 0)
    return p
  }

  center(shift: Vec2 = [0, 0], fixedLayer?: number) {
    return this.topLeft(sum(shift, photoScale, .5), fixedLayer)
  }

}

function travelCostFunction(moveMode: string) {
  return (a: Cell, b: Cell) => {
    switch (moveMode) {
      case "flying":
        return b.bedrock ? UNPPASSABLE : .5;
      case "swimming":
        return b.water() || a.water() ? 1 : UNPPASSABLE;
      default:
        let cost = ((b.roads ? .1 : b.biome.travel) ?? 1e9)
        if (races[moveMode] && b.biome.races.includes(moveMode)) {
          cost /= 2;
        }
        return cost;
    }
  }
}