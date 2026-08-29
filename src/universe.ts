import { biomesByNames, biomeMatrix } from "./biomes"
import { Cell } from "./cell"
import { ws, neighborShift, wh, ww, neighborBy } from "./root"
import { rng, loop, randomElement, clamp, setSeed, seed, sum, listSum } from "./util"

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

  constructor(public seed: number) {
    u = this;
    this.generate()
  }

  anyCell() {
    return this.c[rng(ws)]
  }

  erect(at: Cell, by: number, depth: number) {
    while (rng(70)) {
      at.neighbors.forEach(c => c.elev += by)
      at = randomElement(at.neighbors)
      if (depth > 0 && !rng(30)) {
        this.erect(at, by, depth - 1)
      }
    }
  }

  generate() {

    this.c = loop(ws, at => new Cell(this, at))

    setSeed(this.seed)

    this.c.forEach(c => {
      c.neighborsByDir = neighborShift.map(ns => this.c[neighborBy(ns, c.at)]).filter(c => c)
      c.neighbors = c.neighborsByDir.filter(c => c)
    })

    loop(100, () => this.erect(this.anyCell(), rng(3) + 1, 3))

    let averageElev = listSum(this.c, cell => cell.elev) / ws;

    this.c.forEach(cell => cell.elev = Math.log(cell.elev / averageElev))

    //this.c.forEach(cell => { cell.elev += (~~(cell.at / ww) % 2) * 1000 });


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
        cell.elev < this.OceanAlt ? "ocean" :
          cell.water() ? "sea" :
            cell.elev >= this.PeaksElev ? "peaks" :
              biomeMatrix
              [clamp(0, ~~(2 + cell.t / 3 - cell.hum / 20), 2)]
              [clamp(0, ~~(4 - cell.t * 4), 3)]
      ]

      cell.biome = b;
      if (!b)
        debugger
      cell.layer = cell.water() ? 0 : cell.elev < this.HighlandElev ? 1 : 2
    })

    this.c.forEach(cell => {
      let score = 0, coast = 0;

      cell.neighbors.forEach(nb => {
        score += nb.biome.habitability * 2
        coast += nb.water() ? 1 : 0;
      })

      cell.habitability = score * (coast ? 2 : 1);
    })

    this.drawOrder = loop(wh, row => loop(ww, col => row * ww + (col + ww - ~~(row / 2)) % ww)).flat().map(at => this.c[at])

  }

  quantile(n: number) {
    return this.byElev[~~(ws * n)].elev
  }



}