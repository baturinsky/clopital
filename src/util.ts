export type Vec2 = [number, number]
export type RGBA = [number, number, number, number]

export let seed = 1;

export const rng = (n = 1e9) => ~~(Math.sin(++seed) ** 2 * 1e9 % n) / (n == 1e9 ? n : 1),
  setSeed = (n: number) => { seed = n },
  randomElement = <T>(a: T[], gen=rng) => a[gen(a.length)],
  clamp = (min: number, v: number, max: number) => v < min ? min : v > max ? max : v,
  minInd = <T>(a: T[], f: (v: T) => number) => {
    let amf = a.map(f)
    let r = amf.indexOf(Math.min(...amf))
    return r;
  },
  min = <T>(a: T[], f: (v: T) => number) => a[minInd(a, f)],
  listSum = <T>(a: T[], f = (a: any) => a) => a.reduce((q, p) => q + f(p), 0),
  sum = (a: Vec2, b: Vec2, m = 1) => [a[0] + b[0] * m, a[1] + b[1] * m] as Vec2,
  sub = (a: Vec2, b: Vec2) => [a[0] - b[0], a[1] - b[1]] as Vec2,
  scale = <T extends number[]>(a: T, m: number) => a.map(v => v * m) as T,
  mulv = (a: Vec2, b: Vec2) => [a[0] * b[0], a[1] * b[1]] as Vec2,
  tween = (a: Vec2, b: Vec2, m: number) => [a[0] * (1 - m) + b[0] * m, a[1] * (1 - m) + b[1] * m] as Vec2,
  stween = (a: number, b: number, m: number) => a * (1 - m) + b * m,
  round = <T extends number[]>(a: T) => a.map(v => ~~(v + .5)) as T,
  floor = (n: number) => ~~n - (n < 0 ? 1 : 0),
  fixed = (n: number) => ~~(n * 100) / 100,
  debounce = (callback: Function) => {
    let timeoutId: any;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(callback, 300);
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
  japaneseName = (gen = rng) => {
    let s = ''
    for (let i = 0; i < gen(3) + 2; i++)
      s += randomElement([..."kstnhmyrw", ''], gen) + randomElement([..."aiueo", ''], gen)
    return s
  }

  ;


//console.log(bestBy(["foo", "barr", "bazz", "qu"], s => s.charCodeAt(0)));