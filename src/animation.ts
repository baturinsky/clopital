import { cx, drawCentered, drawSprite, wobbleFlight as verticalWobble } from "./renderer";
import { removeFromList, vecTween, Vec2 } from "./util";

let animations: MovementAnimation[] = [];

export type MovementAnimation = {
  /** Sprite */
  i: HTMLCanvasElement,
  /** Progress time */
  t: number,
  /** Waypoints */
  wp: Vec2[],
  /** speed, ms per waypoint */
  s?: number
  /** Callback on completion */
  f?: Function
  pc?: (p:Vec2)=>Vec2
}

export const animate = (sprite: HTMLCanvasElement, waypoints: Vec2[]) => {
  let a = { i: sprite, wp: waypoints, t: 0 };
  animations.push(a)
  return a;
}, cancelAnimation = (a?: MovementAnimation) => {
  removeFromList(animations, a)
}, updateAnimations = (dt: number) => {
  animations = animations.filter(a => {
    a.t += dt / (a.s ?? 150);
    let t = ~~(a.t);
    if (!a.wp[t + 1]) {
      a.f && a.f();
      return false;
    }
    //let p = verticalWobble(vecTween(a.wp[t], a.wp[t + 1], a.t - t))
    let p = vecTween(a.wp[t], a.wp[t + 1], a.t - t)
    drawCentered(a.i, p)
    return true;
  })
}