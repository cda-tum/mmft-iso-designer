import { Arith, Context, Expr } from "z3-solver"

export function cross<S, T>(array1: S[], array2: T[]): [S, T][] {
    return array1.flatMap(e1 => array2.map(e2 => [e1, e2] as [S, T]))
}

export function pairwise_unique<T>(array: T[]): [T, T][] {
    return array.reduce((acc, e, i, arr) => [...acc, ...arr.slice(i + 1).map(_e => [e, _e])] as [T, T][], [] as [T, T][])
}

export function pairwise_unique_indexed<T>(array: T[]): [T, number, T, number][] {
    return array.reduce((acc, e, i, arr) => [...acc, ...arr.slice(i + 1).map((_e, _i) => [e, i, _e, _i + i + 1])] as [T, number, T, number][], [] as [T, number, T, number][])
}

export function smtsum(ctx: Context, ...values: (Arith | number)[]) {
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