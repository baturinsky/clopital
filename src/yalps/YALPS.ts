import { Model, Options, SolutionStatus, Solution } from "./types.js"
import { index, tableauModel, TableauModel } from "./tableau.js"
import { roundToPrecision } from "./util.js"
import { simplex } from "./simplex.js"

// Creates a solution object representing the optimal solution (if any).
const solution = <VarKey, ConKey>(
  { tableau, sign, variables: vars }: TableauModel<VarKey, ConKey>,
  status: SolutionStatus,
  result: number,
  { pr, izv }: Required<Options>,
): Solution<VarKey> => {
  if (status === SolutionStatus.Optimal || (status === SolutionStatus.Timedout && !Number.isNaN(result))) {
    const variables: [VarKey, number][] = []
    for (let i = 0; i < vars.length; i++) {
      const [variable] = vars[i]
      const row = tableau.pos[i + 1] - tableau.w
      const value = row >= 0 ? index(tableau, row, 0) : 0.0
      if (value > pr) {
        variables.push([variable, roundToPrecision(value, pr)])
      } else if (izv) {
        variables.push([variable, 0.0])
      }
    }
    return {
      status,
      result: -sign * result,
      variables,
    }
  } else if (status === SolutionStatus.Unbounded) {
    const variable = tableau.vat[result] - 1
    return {
      status: SolutionStatus.Unbounded,
      result: sign * Infinity,
      // prettier-ignore
      variables:
        (0 <= variable && variable < vars.length)
          ? [[vars[variable][0], Infinity]]
          : [],
    }
  } else {
    // infeasible | cycled | (timedout and result is NaN)
    return {
      status,
      result: NaN,
      variables: [],
    }
  }
}

/**
 * The default options used by the solver.
 */
export const defaultOptions = {
  pr: 1e-8,
  piv: 8192,
  tlr: 0,
  tm: Infinity,
  its: 32768,
} as Options;

/**
 * Runs the solver on the given model and using the given options (if any).
 * @see {@link Model} on how to specify/create the model.
 * @see {@link Options} for the kinds of options available.
 * @see {@link Solution} for more detailed information on what is returned.
 */
export const solveFloat = <VarKey = string, ConKey = string>(
  model: Model<VarKey, ConKey>,
  options?: Options,
): Solution<VarKey> => {
  const tabmod = tableauModel(model)
  const opt = { ...defaultOptions, ...options } as Required<Options>;
  const [status, result] = simplex(tabmod.tableau, opt)
  return solution(tabmod, status, result, opt)
}
