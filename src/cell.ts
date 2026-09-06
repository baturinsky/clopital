import { Agent } from "./agent"
import { Biome, biomesByNames, HILLS } from "./biomes"
import { GoodNumbers, MarketAgent, MarketAgentParameters } from "./market"
import { layerSickness } from "./renderer"
import { photoScale, worldCoord, toXY, wh, ws, ww, neighborhood } from "./root"
import { iterationsPerTurn, biomeToAgent, races, cellCapPerIncome, incomePerResource } from "./setting"
import { nameById } from "./state"
import { Universe } from "./universe"
import { cap1, clamp, loop, min, muls, objAdd, objScale, randomElement, rng, round, setSeed, objStripFalsy, sum, Vec2 } from "./util"

export type PathPoint = { c: Cell, d: number, from: Cell }

export const UNPPASSABLE = 1e12, SEALVL = 0, GROUNDLVL = 1, HILLSLVL = 2

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

  layer: number = SEALVL | GROUNDLVL | HILLSLVL

  habitability!: number

  bedrock!: boolean

  /** Neighbor (or undefined) to the six irections in order */
  neighborsByDir!: Cell[]

  /** Non-undefined neighbors */
  neighbors!: Cell[]

  /** neighbors and itself*/
  neighborhood!: Cell[]

  seen?: boolean = true

  settlement?: MarketAgent

  resources!: GoodNumbers

  agent?: MarketAgent

  neighborhoodR(d: number) {
    return neighborhood[d].map(v => this.u.c[v + this.at]).filter(v => v);
  }

  getAgent() {
    if (!this.agent) {
      this.agent = new MarketAgent(cellAgentParameters(this))
    }
    return this.agent
  }

  latitude() {
    return Math.abs(.5 - this.at / ws) * 2;
  }

  water() {
    return this.elev < this.u.SeaElev;
  }

  constructor(public u: Universe, public at: number) {
    setSeed(at)
    this.name = nameById(this.at)
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

  /*neighborhoodResources() {
    return this.neighborhood.map(c => c.resources).reduce(objAdd, {})
  }*/

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

  pathFrom(pf: { [id: string]: PathPoint } = {}) {
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

  nextTurn() {
    if (this.agent)
      () => this.agent?.gainIncome(iterationsPerTurn)
  }

}

export const
  travelCostFunction = (moveMode: string) => {
    return (a: Cell, b: Cell) => {
      switch (moveMode) {
        case "flying":
          return b.bedrock ? UNPPASSABLE : .5;
        case "swimming":
          return b.water() || a.water() || a.rivers || b.rivers ? 1 : UNPPASSABLE;
        default:
          let cost = b.biome.travel ?? 1e9
          if (races[moveMode] && b.biome.races.includes(moveMode)) {
            cost /= 2;
          }
          return cost;
      }
    }
  },
  cellAgentParameters = (c: Cell) => {
    let income = {}, ownRecipes = [] as GoodNumbers[], cap: GoodNumbers;

    for (let k in c.resources) {
      if (c.resources[k]) {
        objAdd(income, biomeToAgent[k].income, c.resources[k])
        ownRecipes = [...ownRecipes, ...biomeToAgent[k].ownRecipes];
      }
    }

    income = objScale(objStripFalsy(income), incomePerResource);
    cap = objScale(income, cellCapPerIncome);

    return {
      id: c.at,
      income,
      ownRecipes,
      cap,
      stock: { ...cap }
    } as MarketAgentParameters
  }

