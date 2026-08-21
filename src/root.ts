
//const hexPoints = [...new Array(6)].map((_,i)=>[Math.sin(i*Math.PI/3),Math.cos(i*Math.PI/3)])

import { Vec2 } from "./util";

export type RGBA = [number, number, number, number]

//const hexPoints = [[0, 1], [.9, .5], [.9, -.5], [0, -1], [-.9, -.5], [-.9, -.5]]
export const

  /** World width */
  ww = 128,
  /** World height */
  wh = 96,
  /** World cells number */
  ws = ww * wh,
  /** cell neighbors indexes */
  neighborShift = [-1, 1, -ww, ww, ww - 1, 1 - ww],
  neighborsBelow = [ww, ww-1],
  photoScale = [16, 12] as Vec2,
  inside = (n: number) => n >= 0 && n < ws,
  hexToRgb = (h: string) => [1, 2, 3, 4].map(i => (parseInt(h[i] ?? "f", 16)) / 15) as RGBA,
  loop = <T>(l: number, f: (i: number) => T) => [...new Array(l)].map((v, i) => f(i))
  ;

