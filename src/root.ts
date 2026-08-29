
//const hexPoints = [...new Array(6)].map((_,i)=>[Math.sin(i*Math.PI/3),Math.cos(i*Math.PI/3)])

import { loop, Vec2 } from "./util";


//const hexPoints = [[0, 1], [.9, .5], [.9, -.5], [0, -1], [-.9, -.5], [-.9, -.5]]

export const
  PI = Math.PI,
  TWO_PI = PI * 2,
  /** World width */
  ww = 128,
  /** World height */
  wh = 96,
  /** World cells number */
  ws = ww * wh,
  /** cell neighbors indexes */
  neighborShift = [1 - ww, 1, ww, ww - 1, -1, -ww],
  //neighborsBelow = [ww, ww - 1],
  photoScale = [16, 12] as Vec2,
  inside = (n: number) => n >= 0 && n < ws,
  neighborBy = (at: number, n: number) =>
    at + n + (n % ww > ww + n ? -ww : 0)
  ,
  neighborhood = loop(100, (radius: number) =>
    neighborShift.map((ns, nsi) => loop(radius,
      r => loop(r + 1, x => ns * (r + 1) + neighborShift[(nsi + 2) % 6] * x)
    )).flat(2))

  ;

