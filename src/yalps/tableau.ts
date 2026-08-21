import { Coefficients, Model } from "./types.js"

// The tableau representing the problem.
// matrix is a 2D matrix (duh) represented as a 1D array.
// The first row, 0, is the objective row.
// The first column, 0, is the RHS column.
// Positions are numbered starting at the first column and ending at the last row.
// Thus, the position of the variable in the first row is width.
export type Tableau = {
  /** matrix */
  readonly m: Float64Array
  readonly w: number
  readonly h: number
  /** positionOfVariable */
  readonly pos: Int32Array
  /** variableAtPosition */
  readonly vat: Int32Array
}

export const index = (tableau: Tableau, row: number, col: number) => tableau.m[Math.imul(row, tableau.w) + col]

export const update = (tableau: Tableau, row: number, col: number, value: number) => {
  tableau.m[Math.imul(row, tableau.w) + col] = value
}

export type Variables<VarKey = string, ConKey = string> = readonly (readonly [VarKey, Coefficients<ConKey>])[]

// A tableau with some additional context.
export type TableauModel<VariableKey = string, ConstraintKey = string> = {
  readonly tableau: Tableau
  readonly sign: number
  readonly variables: Variables<VariableKey, ConstraintKey>
  readonly integers: readonly number[]
}

const convertToIterable = <K, V>(
  seq: Iterable<readonly [K, V]> | ([K] extends [string] ? Readonly<Partial<Record<K, V>>> : never),
) =>
  Symbol.iterator in seq && typeof seq[Symbol.iterator] === "function"
    ? seq
    : // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      (Object.entries(seq) as Iterable<readonly [K, V]>)

// prettier-ignore
const convertToSet = <T>(set: boolean | Iterable<T> | undefined): true | Set<T> =>
  set === true ? true
  : set === false ? new Set()
  : set instanceof Set ? set
  : new Set(set)

export const tableauModel = <VarKey = string, ConKey = string>(
  model: Model<VarKey, ConKey>,
): TableauModel<VarKey, ConKey> => {
  const { direction, objective, integers, binaries } = model
  const sign = direction === "minimize" ? -1.0 : 1.0

  const constraintsIter = convertToIterable(model.constraints)
  const variablesIter = convertToIterable(model.variables)
  const variables: Variables<VarKey, ConKey> = Array.isArray(variablesIter) ? variablesIter : Array.from(variablesIter)

  const binaryConstraintCol: number[] = []
  const ints: number[] = []
  if (integers != null || binaries != null) {
    const binaryVariables = convertToSet(binaries)
    const integerVariables = binaryVariables === true ? true : convertToSet(integers)
    for (let i = 1; i <= variables.length; i++) {
      const [key] = variables[i - 1]
      if (binaryVariables === true || binaryVariables.has(key)) {
        binaryConstraintCol.push(i)
        ints.push(i)
      } else if (integerVariables === true || integerVariables.has(key)) {
        ints.push(i)
      }
    }
  }

  const constraints = new Map<ConKey, { row: number; lower: number; upper: number }>()
  for (const [key, constraint] of constraintsIter) {
    const bounds = constraints.get(key) ?? { row: NaN, lower: -Infinity, upper: Infinity }
    bounds.lower = Math.max(bounds.lower, constraint.equal ?? constraint.min ?? -Infinity)
    bounds.upper = Math.min(bounds.upper, constraint.equal ?? constraint.max ?? Infinity)
    if (!constraints.has(key)) constraints.set(key, bounds)
  }

  let numConstraints = 1
  for (const constraint of constraints.values()) {
    constraint.row = numConstraints
    numConstraints += (Number.isFinite(constraint.lower) ? 1 : 0) + (Number.isFinite(constraint.upper) ? 1 : 0)
  }
  const w = variables.length + 1
  const h = numConstraints + binaryConstraintCol.length
  const numVars = w + h
  const m = new Float64Array(w * h)
  const pos = new Int32Array(numVars)
  const vat = new Int32Array(numVars)
  const tableau = { m, w, h, pos, vat }

  for (let i = 0; i < numVars; i++) {
    pos[i] = i
    vat[i] = i
  }

  for (let c = 1; c < w; c++) {
    for (const [constraint, coef] of convertToIterable(variables[c - 1][1])) {
      if (constraint === objective) {
        update(tableau, 0, c, sign * coef)
      }
      const bounds = constraints.get(constraint)
      if (bounds != null) {
        if (Number.isFinite(bounds.upper)) {
          update(tableau, bounds.row, c, coef)
          if (Number.isFinite(bounds.lower)) {
            update(tableau, bounds.row + 1, c, -coef)
          }
        } else if (Number.isFinite(bounds.lower)) {
          update(tableau, bounds.row, c, -coef)
        }
      }
    }
  }

  for (const bounds of constraints.values()) {
    if (Number.isFinite(bounds.upper)) {
      update(tableau, bounds.row, 0, bounds.upper)
      if (Number.isFinite(bounds.lower)) {
        update(tableau, bounds.row + 1, 0, -bounds.lower)
      }
    } else if (Number.isFinite(bounds.lower)) {
      update(tableau, bounds.row, 0, -bounds.lower)
    }
  }

  for (let b = 0; b < binaryConstraintCol.length; b++) {
    const row = numConstraints + b
    update(tableau, row, 0, 1.0)
    update(tableau, row, binaryConstraintCol[b], 1.0)
  }

  return { tableau, sign, variables, integers: ints }
}
