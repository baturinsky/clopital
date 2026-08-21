import { Options, SolutionStatus } from "./types.js"
import { index, Tableau, update } from "./tableau.js"
import { roundToPrecision } from "./util.js"

const pivot = (tableau: Tableau, row: number, col: number) => {
  const quotient = index(tableau, row, col)
  const leaving = tableau.vat[tableau.w + row]
  const entering = tableau.vat[col]
  tableau.vat[tableau.w + row] = entering
  tableau.vat[col] = leaving
  tableau.pos[leaving] = col
  tableau.pos[entering] = tableau.w + row

  const nonZeroColumns: number[] = []
  // (1 / quotient) * R_pivot -> R_pivot
  for (let c = 0; c < tableau.w; c++) {
    const value = index(tableau, row, c)
    if (Math.abs(value) > 1e-16) {
      update(tableau, row, c, value / quotient)
      nonZeroColumns.push(c)
    } else {
      update(tableau, row, c, 0.0)
    }
  }
  update(tableau, row, col, 1.0 / quotient)

  // -M[r, col] * R_pivot + R_r -> R_r
  for (let r = 0; r < tableau.h; r++) {
    if (r === row) continue
    const coef = index(tableau, r, col)
    if (Math.abs(coef) > 1e-16) {
      for (let i = 0; i < nonZeroColumns.length; i++) {
        const c = nonZeroColumns[i]
        update(tableau, r, c, index(tableau, r, c) - coef * index(tableau, row, c))
      }
      update(tableau, r, col, -coef / quotient)
    }
  }
}

type PivotHistory = (readonly [row: number, col: number])[]

// Finds the optimal solution given some basic feasible solution.
const phase2 = (tableau: Tableau, options: Required<Options>): [SolutionStatus, number] => {
  const pivotHistory: PivotHistory = []
  const { pr: precision, piv: maxPivots } = options
  for (let iter = 0; iter < maxPivots; iter++) {
    // Find the entering column/variable
    let col = 0
    let value = precision
    for (let c = 1; c < tableau.w; c++) {
      const reducedCost = index(tableau, 0, c)
      if (reducedCost > value) {
        value = reducedCost
        col = c
      }
    }
    if (col === 0) return [SolutionStatus.Optimal, roundToPrecision(index(tableau, 0, 0), precision)]

    // Find the leaving row/variable
    let row = 0
    let minRatio = Infinity
    for (let r = 1; r < tableau.h; r++) {
      const value = index(tableau, r, col)
      if (value <= precision) continue // pivot entry must be positive
      const rhs = index(tableau, r, 0)
      const ratio = rhs / value
      if (ratio < minRatio) {
        row = r
        minRatio = ratio
        if (ratio <= precision) break // ratio is 0, lowest possible
      }
    }
    if (row === 0) return [SolutionStatus.Unbounded, col]

    pivot(tableau, row, col)
  }
  return [SolutionStatus.Cycled, NaN]
}

// Transforms a tableau into a basic feasible solution.
const phase1 = (tableau: Tableau, options: Required<Options>): [SolutionStatus, number] => {
  const pivotHistory: PivotHistory = []
  const { pr: precision, piv: maxPivots } = options
  for (let iter = 0; iter < maxPivots; iter++) {
    // Find the leaving row/variable
    let row = 0
    let rhs = -precision
    for (let r = 1; r < tableau.h; r++) {
      const value = index(tableau, r, 0)
      if (value < rhs) {
        rhs = value
        row = r
      }
    }
    if (row === 0) return phase2(tableau, options)

    // Find the entering column/variable
    let col = 0
    let maxRatio = -Infinity
    for (let c = 1; c < tableau.w; c++) {
      const coefficient = index(tableau, row, c)
      if (coefficient < -precision) {
        const ratio = -index(tableau, 0, c) / coefficient
        if (ratio > maxRatio) {
          maxRatio = ratio
          col = c
        }
      }
    }
    if (col === 0) return [SolutionStatus.Infeasible, NaN]

    pivot(tableau, row, col)
  }
  return [SolutionStatus.Cycled, NaN]
}

export { phase1 as simplex }
