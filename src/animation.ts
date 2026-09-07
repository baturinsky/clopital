import { drawCentered, drawSprite, wobbleFlight as verticalWobble } from "./renderer";
import { removeFromList, vecTween, Vec2 } from "./util";

export let animations: MovementAnimation[] = [];

export type MovementAnimation = {
  /** Sprite */
  i: HTMLCanvasElement,
  /** Progress time */
  t: number,
  /** Waypoints */
  wp: Vec2[],
  /** speed, ms per waypoint */
  s: number
  /** Callback on completion */
  f?: Function
  pc?: (p:Vec2)=>Vec2
}

export const animate = (sprite: HTMLCanvasElement, waypoints: Vec2[], s=200) => {
  let a = { i: sprite, wp: waypoints, t: 0, s };
  animations.push(a)
  return a as MovementAnimation;
}, cancelAnimation = (a?: MovementAnimation) => {
  removeFromList(animations, a)
}, updateAnimations = (dt: number) => {
  animations = animations.filter(a => {
    a.t += dt / a.s;
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