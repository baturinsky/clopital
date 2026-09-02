import { Cell } from "./cell";
import { MarketAgent } from "./market";
import { Race, races } from "./races";
import { u } from "./universe";
import { cap1, japaneseName, objMap, removeFromList } from "./util";

const craScale = 10000;

type SaveFormat = ReturnType<Character["save"]>
export class Character extends MarketAgent {
  kind!: string
  race!: Race
  cell!: Cell
  dest?: Cell
  size = 1

  constructor(race: string, cell: Cell) {
    super()
    this.race = races[race];
    this.cell = cell
    this.name = cap1(japaneseName())
    u.chars.push(this);
  }

  pos(){
    return this.
  }

  remove() {
    removeFromList(u.chars, this);
  }

  save() {

    return {
      at: this.cell.at,
      dest: this.dest?.at,
      name: this.name,
      size: this.size,
      stock: this.stock,
      cell: this.cell.at,
      race: this.race.name,
      kind: this.kind,
      cra: objMap(this.cra, v => ~~(v * craScale))
    }
  }

  load(v: SaveFormat) {
    Object.assign(this, {
      cell: u.c[v.cell],
      dest: u.c[v.dest as any],
      name: v.name,
      size: v.size,
      stock: v.stock,
      race: races[v.race],
      kind: this.kind,
      cra: objMap(this.cra, v => v / craScale)
    } as Partial<Character>)
  }

  get at() {
    return this.cell.at
  }

  pathfind(maxDist: number, destination?: Cell) {
    return this.cell.pathfind(this.race.moving, maxDist, destination)
  }

}