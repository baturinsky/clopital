
export type Vec2 = [number, number]
export type RGBA = [number, number, number, number]

export let seed = 1;

declare const DEBUG: boolean

export const
  rng = (n = 1e9) => ~~(Math.sin(++seed) ** 2 * 1e9 % n) / (n == 1e9 ? n : 1),
  setSeed = (n: number) => { seed = n },
  randomElement = <T>(a: T[], gen = rng) => a[gen(a.length)],
  clamp = (min: number, v: number, max = 1e30) => v < min ? min : v > max ? max : v,
  minInd = <T>(a: T[], f: (v: T) => number) => {
    let amf = a.map(f)
    let r = amf.indexOf(Math.min(...amf))
    return r;
  },
  min = <T>(a: T[], f: (v: T) => number) => a[minInd(a, f)],
  listSum = <T>(a: T[], f = (a: any) => a) => a.reduce((q, p) => q + f(p), 0),
  sum = (a: Vec2, b: Vec2, m = 1) => [a[0] + b[0] * m, a[1] + b[1] * m] as Vec2,
  sub = (a: Vec2, b: Vec2) => [a[0] - b[0], a[1] - b[1]] as Vec2,
  dist = (a: Vec2, b: Vec2) => a && b && len(sub(a, b)),
  scale = <T extends number[]>(a: T, m: number) => a.map(v => v * m) as T,
  muls = (a: Vec2, b: Vec2) => [a[0] * b[0], a[1] * b[1]] as Vec2,
  vecTween = (a: Vec2, b: Vec2, m: number) => [a[0] * (1 - m) + b[0] * m, a[1] * (1 - m) + b[1] * m] as Vec2,
  numTween = (a: number, b: number, m: number) => a * (1 - m) + b * m,
  round = <T extends number[]>(a: T) => a.map(v => ~~(v + .5)) as T,
  floor = (n: number) => ~~n - (n < 0 ? 1 : 0),
  fixed = (n: number) => ~~(n * 100) / 100,
  len = (a: Vec2) => (a[0] ** 2 + a[1] ** 2) ** .5,
  debounce = (callback: Function, dur = 300) => {
    let timeoutId: any;
    return () => {
      if(!timeoutId){
        callback()
        timeoutId = setTimeout(()=>{}, dur);
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(callback, dur);
      }
    };
  },
  hexToRgb = (h: string) => [1, 2, 3, 4].map(i => (parseInt(h[i] ?? "f", 16)) / 15) as RGBA,
  loop = <T>(l: number, f: (i: number) => T) => [...new Array(l)].map((v, i) => f(i)),
  bestBy = <T, V>(list: T[], evaluator: (v: T) => V = (a: any) => a) =>
    list.reduce((best, k) => {
      let v = evaluator(k);
      return !(v <= best[1]) ? [k, v] as [T, V] : best
    }, [undefined, Number.NEGATIVE_INFINITY] as [T, V]),
  worstBy = <T, V>(list: T[], evaluator: (v: T) => V = (a: any) => a) => {
    let [item, value] = bestBy(list, (v: T) => -evaluator(v))
    return [item, -value] as [T, number]
  },
  addToKey = (o: { [id: string]: number }, k: string, amount: number) => o[k] = (o[k] ?? 0) + amount,
  japaneseName = () => {
    let s = ''
    for (let i = rng(3) + 2; i > 0; i--)
      s += randomElement([..."kstnhmyrw", ''], rng) + randomElement([..."aiueo", ''], rng)
    return cap1(s)
  },
  cap1 = (s: string) => `${s}`.charAt(0).toUpperCase() + `${s}`.substring(1),
  asArray = <T>(s: T): any[] => s == undefined ? [] : Array.isArray(s) ? s as T[] : [s],
  removeFromList = (list: any[], item: any) => {
    let i = list.indexOf(item);
    if (i != -1)
      list.splice(i, 1)
  },
  removeDuplicates = (a: any[]) => [...new Set(a)],
  /** return *slots* elements, of which *filled* is filled with random variants, while the rest us undefined */
  nof = (variants: any[], slots: number, filled: number) =>
    shuffle(loop(slots, i => i < filled ? randomElement(variants) : undefined))
  ,
  shuffle = (a: any[]) => loop(a.length, () => a.splice(rng(a.length), 1)[0]),
  objMap = (a: any, f: (v: any, k: string) => any) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, f(v, k)])),
  objFilter = <T>(a: T, f: (v: any, k: string) => any) =>
    Object.fromEntries(Object.entries(a as any).filter(([k, v]) => f(v, k))) as T,
  objEvery = <T>(a: T, f: (v: any, k: string) => any) =>
    Object.entries(a as any).every(([k, v]) => f(v, k)) as T,
  objAdd = (a: any, b: any = {}, times = 1) => {
    Object.keys(b).forEach((k) => a[k] = (a[k] ?? 0) + b[k] * times)
    return a
  },
  objScale = (a: any, scale: number) => objMap(a, v => v * scale),
  objScaleI = (a: any, scale: number) => objMap(a, v => ~~(v * scale)),
  objStripFalsy = <T>(a: T): T => objFilter(a, v => v),
  rotateList = (a: any[], d: number) => [...a.slice(a.length - d - 2), ...a.slice(0, d)],
  formatNumber = (x: number) => {
    let p = Math.abs(x);
    return (x < 0 ? "-" : "") + 
    (p < 1e4 ? ~~(p * 1e3) / 1e3 : 
    p < 1e7 ? ~~(p / 1e3) + "K" : 
    p < 1e10 ? ~~(p / 1e6) + "M":
    p.toExponential(5)
  )
  }
  ;



//console.log(rotateList([1, 2, 3], 1));