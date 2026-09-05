import { biomesByNames, biomeMatrix } from "./biomes"
import { Cell, GROUNDLVL, HILLSLVL, SEALVL } from "./cell"
import { Agent } from "./agent"
import { ws, neighborShift, wh, ww, neighborBy, hexDist, worldCoord, neighborhood } from "./root"
import { queenCell, select } from "./state"
import { rng, loop, randomElement, clamp, setSeed, seed, sum, listSum, dist } from "./util"

export let u: Universe

const East = 1, West = 4, SE = 3, SW = 4;

export class Universe {
  OceanAlt = 0
  SeaElev = 0
  HighlandElev = 0
  PeaksElev = 0

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

    this.c = loop(ws, at => new Cell(this, at))

    setSeed(this.seed)

    this.c.forEach(c => {
      c.neighborsByDir = neighborShift.map(ns => this.c[neighborBy(ns, c.at)]).filter(c => c)
      c.neighbors = c.neighborsByDir.filter(c => c)
      c.neighborhood = [c, ...c.neighbors];
    })

    loop(100, () => this.erect(this.anyCell(), rng(3) + 1, 3))

    let averageElev = listSum(this.c, cell => cell.elev) / ws;

    this.c.forEach(cell => cell.elev = Math.log(cell.elev / averageElev))

    this.byElev = [...this.c].sort((a, b) => a.elev - b.elev)

    this.OceanAlt = this.quantile(.4)
    this.SeaElev = this.quantile(.55)
    this.HighlandElev = this.quantile(.82)
    this.PeaksElev = this.quantile(.97)

    loop(10000, () => this.anyCell().erode())


    this.rivers = []

    loop(500, () => {
      let path = this.anyCell().erode();
      if (path && path.length > 1) {
        this.rivers.push(path)
        path.forEach(cell => cell.rivers++);
      }
    })

    this.c.forEach(c => {
      c.t = 1.6 - c.latitude() * 1.2 - (c.elev - this.SeaElev) / 2
    })

    loop(12, i =>
      this.c.forEach(cell => {
        let clouds =
          (cell.elev <= this.SeaElev ? 10 : cell.rivers ? 5 : 0) *
          (Math.cos(cell.at / ws * 12.5) + 1 + rng() / 3);

        while (clouds > 0) {
          [cell, ...cell.neighbors].forEach(nb => nb.hum += clouds / 50)

          cell = cell.neighbors[i] ?? cell.neighbors[cell.at < ws * .3 || cell.at > ws * .7 ? East : West];

          if (cell.elev > this.HighlandElev && !rng(2))
            cell = randomElement(cell.neighbors);

          if (cell.elev <= this.SeaElev)
            break

          clouds = clouds * .9 - (cell.elev - this.SeaElev) / 5;
        }
      })
    )

    this.c.forEach(cell => {

      if (cell.elev >= this.HighlandElev) {
        [cell.neighborsByDir[SE], cell.neighborsByDir[SW]].forEach((nb) => {
          if (nb?.elev < this.SeaElev)
            nb.elev = this.SeaElev
        })
      }

      let b = biomesByNames[
        cell.bedrock ? "bedrock" :
          cell.elev < this.OceanAlt ? "ocean" :
            cell.water() ? "sea" :
              cell.elev >= this.PeaksElev ? "peaks" :
                biomeMatrix
                [clamp(0, ~~(1.8 + cell.t / 3 - cell.hum / 30), 2)]
                [clamp(0, ~~(3.8 - cell.t * 3), 3)]
      ]


      cell.biome = b;
      cell.layer = cell.water() ? SEALVL : cell.elev < this.HighlandElev ? GROUNDLVL : HILLSLVL
    })

    this.c.forEach(cell => {
      let score = 0, coast = 0;

      cell.neighbors.forEach(nb => {
        score += nb.biome.habitability * 2
        coast += nb.water() ? 1 : 0;
      })

      score += cell.rivers ? 10 : 0;

      cell.habitability = score * (coast ? 2 : 1);

      let isCoast = !cell.water() && cell.neighbors.find(c => c.water());

      cell.resources = {
        soil: cell.biome.soil ?? 0,
        trees: cell.biome.trees ?? 0,
        deepwater: (cell.biome.deepwater ?? 0) + (cell.rivers ? 1 : 0),
        minerals: (cell.biome.minerals ?? 0) + (cell.layer == HILLSLVL ? 2 : 1)
      }

      if (!rng(isCoast || cell.rivers ? 60 : cell.water() ? 200 : 150)) {
        let race = randomElement(cell.biome.races);
        if (race) {
          new Agent(cell, race, rng(1000) + 100);
        }
      }

      //console.log(cellAgentParameters(cell));

    })

    let randomHorse = randomElement(this.a.filter(a => a.race?.name == "horses"))
    randomHorse.remove()
    let queen = new Agent(randomHorse.cell, "alicorn");
    queen.name = "Vasilisa";
    select(queen)

    queen.see();

    //addRoads()



  }

  quantile(n: number) {
    return this.byElev[~~(ws * n)].elev
  }

}

export function nextTurn() {
  for (let a of u.a) {
    a.nextTurn()
  }
}


function addRoads() {
  for (let a of u.a) {
    let aroads = 0;
    for (let b of u.a) {
      if (hexDist(a.at, b.at) < 15 && (!rng(aroads + 1))) {
        let pf = a.pathfind(15, b.cell)
        let path = b.cell.pathFrom(pf);
        if (path) {
          path.forEach(c => c.roads++)
          u.roads.push(path)
          aroads++;
        }
      }
    }
  }

}

