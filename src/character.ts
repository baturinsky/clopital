import { Cell } from "./cell";
import { MarketAgent } from "./market";
import { Race, races } from "./races";
import { u } from "./universe";
import { cap1, japaneseName, objMap } from "./util";

const craScale = 10000;

export class Character extends MarketAgent {
  kind!: string
  race!: Race
  cell!: Cell
  size = 1
  at = 0

  constructor(init: Partial<Character>) {
    super(init)
    Object.assign(this, init)
    this.name = cap1(japaneseName())
  }

  save() {

    return {
      at: this.at,
      name: this.name,
      size: this.size,
      stock: this.stock,
      cell: this.cell.at,
      race: this.race.name,
      kind: this.kind,
      cra: objMap(this.cra, v => ~~(v * craScale))
    }
  }

  load(v: any) {
    Object.assign(this, {
      at: v.at,
      name: v.name,
      size: v.size,
      stock: v.stock,
      cell: u.c[v.cell],
      race: races[v.race],
      kind: this.kind,
      cra: objMap(this.cra, v => v / craScale)
    })
  }

}