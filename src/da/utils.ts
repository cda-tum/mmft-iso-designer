import { Arith, Context } from "z3-solver"

export function cross<S, T>(array1: S[], array2: T[]): [S, T][] {
    return array1.flatMap(e1 => array2.map(e2 => [e1, e2] as [S, T]))
}

export function pairwiseUnique<T>(array: T[]): [T, T][] {
    return array.reduce((acc, e, i, arr) => [...acc, ...arr.slice(i + 1).map(_e => [e, _e])] as [T, T][], [] as [T, T][])
}

export function pairwiseUniqueIndexed<T>(array: T[]): [T, number, T, number][] {
    return array.reduce((acc, e, i, arr) => [...acc, ...arr.slice(i + 1).map((_e, _i) => [e, i, _e, _i + i + 1])] as [T, number, T, number][], [] as [T, number, T, number][])
}

/**
 * Z3 API Sum requires the first summand to be of Arith or similar. This function reorders values in such a way that this holds.
 * @param ctx Z3 context
 * @param values the summands
 * @returns ctx.Sum or number if no Z3 expressions are present
 */
export function smtSum(ctx: Context, ...values: (Arith | number)[]) {
    const i = values.findIndex(e => typeof e !== 'number')
    
    if(i === -1) {
        const vs = values as number[]
        return vs.reduce((a, v) => a + v, 0)
    }

    const expr = values[i] as Arith
    const remainder = [...values]
    remainder.splice(i, 1)
    return ctx.Sum(expr, ...remainder)
}