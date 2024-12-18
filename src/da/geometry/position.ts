import {Arith} from "z3-solver";

export type { Position, UncertainPosition }

type Position = {
    x: number
    y: number
}

type UncertainPosition = {
    x: number | Arith
    y: number | Arith
}