import { Arith, Context } from "z3-solver"
import { Output } from "./processing/inputOutput"

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

    if (i === -1) {
        const vs = values as number[]
        return vs.reduce((a, v) => a + v, 0)
    }

    const expr = values[i] as Arith
    const remainder = [...values]
    remainder.splice(i, 1)
    return ctx.Sum(expr, ...remainder)
}

/**
 * Computes the total wire length of all channels of Output.
 * @param result
 * @returns total wire length
 */
export function totalWireLength(result: Output): number {
    let totalLength = 0;

    for (let channel of result.channels) {
        if (channel.results.waypoints.length >= 3) {
            for (let i = 1; i < channel.results.waypoints.length; i++) {
                const back = channel.results.waypoints[i - 1]
                const front = channel.results.waypoints[i]
                const vector = [front.x - back.x, front.y - back.y]
                const length = Math.hypot(vector[0], vector[1])
                totalLength += length
            }
        }
    }

    return totalLength
}

/**
 * Computes the total number of bends in all channels of Output. Ignores (potential) 180 degree bends.
 * @param result
 * @returns number of bends
 */
export function bendCount(result: Output): number {
    let bends = 0;

    for (let channel of result.channels) {
        if (channel.results.waypoints.length >= 3) {
            for (let i = 2; i < channel.results.waypoints.length; i++) {
                const back = channel.results.waypoints[i - 2]
                const mid = channel.results.waypoints[i - 1]
                const front = channel.results.waypoints[i]

                if (front.x !== mid.x || front.y !== mid.y) {
                    const frontVector = [front.x - mid.x, front.y - mid.y]
                    const backVector = [mid.x - back.x, mid.y - back.y]

                    const cross = (frontVector[0] * backVector[1]) - (frontVector[1] * backVector[0])
                    if (cross !== 0.) {
                        bends += 1
                    }
                }
            }
        }
    }

    return bends
}
