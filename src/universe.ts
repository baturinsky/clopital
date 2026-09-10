import { biomesByNames, biomeMatrix } from "./biomes"
import { Cell, erode, GROUNDLVL, HILLSLVL, SEALVL } from "./cell"
import { Agent } from "./agent"
import { ws, neighborShift, wh, ww, neighborBy, hexDist, worldCoord, neighborhood } from "./root"
import { queenCell, select, selected } from "./state"
import { rng, loop, randomElement, clamp, setSeed, seed, sum, listSum, dist, objMap } from "./util"

export let u: Universe

export const HAVERIVERS = true;

export const East = 1, West = 4, SE = 3, SW = 4,
  EOcean = 0, ESea = 1, EHighlands = 2, EPeaks = 3
  //buildingInCell = (c: Cell) => c.a.find(a => a.isBuilding())
  ;

export class Universe {
  elev!: number[]

  c!: Cell[]
  drawOrder!: Cell[]
  byElev!: Cell[]

  /** All rivers*/
  rivers!: Cell[][]
  //roads: Cell[][] = []

  a: Agent[] = []

  constructor(public seed: number) {
    u = this;
    this.generate()
  }

  anyCell() {
    return this.c[rng(ws)]
  }

  erect(c: Cell, by: number, depth: number) {
    while (rng(70)) {
      if (c.bedrock)
        return
      c.neighbors.forEach(c => c.elev += by)
      c = randomElement(c.neighbors)
      if (depth > 0 && !rng(30)) {
        this.erect(c, by, depth - 1)
      }
    }
  }

  generate() {

    this.c = loop(ws, at => new Cell(at))

    setSeed(this.seed)

    this.c.forEach(c => {
      c.neighborsByDir = neighborShift.map(ns => this.c[neighborBy(ns, c.at)]).filter(c => c)
      c.neighbors = c.neighborsByDir.filter(c => c)
      c.neighborhood = [c, ...c.neighbors];
    })

    loop(100, () => this.erect(this.anyCell(), rng(3) + 1, 3))

    let averageElev = listSum(this.c, cell => cell.elev) / ws;

    this.c.forEach(cell => cell.elev = Math.log((cell.elev + 3) / averageElev))

    this.byElev = [...this.c].sort((a, b) => a.elev - b.elev)

    this.elev = [.4, .5, .82, .97].map(h => this.quantile(h))

    if (HAVERIVERS) {

      loop(10000, () => erode(this.anyCell()))

      this.rivers = []

      loop(500, () => {
        let path = erode(this.anyCell());
        if (path && path.length > 1) {
          this.rivers.push(path)
          path.forEach(cell => cell.rivers++);
        }
      })
    }

    this.c.forEach(c => {
      let latitude = Math.abs(.5 - c.at / ws) * 2
      c.t = 1.6 - latitude - (c.elev - this.elev[ESea]) / 2
    })

    loop(12, i =>
      this.c.forEach(cell => {
        let clouds =
          (cell.elev <= this.elev[ESea] ? 10 : cell.rivers ? 5 : 0) *
          (Math.cos(cell.at / ws * 12.5) + 1 + rng() / 3);

        while (clouds > 0) {
          [cell, ...cell.neighbors].forEach(nb => nb.hum += clouds / 25)

          cell = cell.neighbors[i] ?? cell.neighbors[cell.at < ws * .3 || cell.at > ws * .7 ? East : West];

          if (cell.elev > this.elev[EHighlands] && !rng(2))
            cell = randomElement(cell.neighbors);

          if (cell.elev <= this.elev[ESea])
            break

          clouds = clouds * .9 - (cell.elev - this.elev[ESea]) / 5;
        }
      })
    )

    this.c.forEach(cell => {

      if (cell.elev >= this.elev[EHighlands]) {
        [cell.neighborsByDir[SE], cell.neighborsByDir[SW]].forEach((nb) => {
          if (nb?.elev < this.elev[ESea])
            nb.elev = this.elev[ESea]
        })
      }

      let b = biomesByNames[
        cell.bedrock ? "bedrock" :
          cell.elev < this.elev[EOcean] ? "ocean" :
            cell.water() ? "sea" :
              cell.elev >= this.elev[EPeaks] ? "peaks" :
                biomeMatrix
                [clamp(0, ~~(1.85 + cell.t / 3 - cell.hum / 30), 2)]
                [clamp(0, ~~(3.8 - cell.t * 3), 3)]
      ]


      cell.biome = b;
      cell.layer = cell.water() ? SEALVL : cell.elev < this.elev[EHighlands] ? GROUNDLVL : HILLSLVL
    })

    this.c.forEach(cell => {

      objMap(cell.biome.special || {}, (chance, name) => {
        if (rng(1000) < chance * 10)
          cell.special = name;
      })


      cell.resources = {
        soil: cell.biome.soil ?? 0,
        trees: cell.biome.trees ?? 0,
        deepwater: (cell.biome.deepwater ?? 0) + (cell.rivers ? 1 : 0),
        deposits: (cell.biome.deposits ?? 0) + (cell.layer == HILLSLVL ? 2 : 1)
      }
      //console.log(cellAgentParameters(cell));

    })

    this.c.forEach(cell => {
      let isCoast = !cell.water() && cell.neighbors.find(c => c.water());
      if (!rng(isCoast || cell.rivers ? 60 : cell.water() ? 200 : 150)) {
        let race = randomElement(cell.biome.races);
        if (!cell.water() && !rng(6))
          race = "unicorns"
        if (race) {
          new Agent(cell, race, rng(1000) + 100);
        }
      }
      cell.initMarket()
    })


    let queen = new Agent(u.c[ws / 2 + ww / 2], "alicorn");
    queen.name = "Vasilisa"
    select(queen)

    queen.see();


    //addRoads()

  }

  quantile(n: number) {
    return this.byElev[~~(ws * n)].elev
  }

}



