import {Arith, Bool, Context, Model} from "z3-solver";
import {ModuleID} from "./module";
import {intVal} from "./z3Helpers";

export type pinID = number
type PinProperties = {
    id: pinID
    module: ModuleID
    radius: number
}

export class Pin {
    id: pinID
    module: ModuleID
    radius: number

    constructor(o: PinProperties) {
        this.id = o.id
        this.module = o.module
        this.radius = o.radius
    }

    encode(ctx: Context): EncodedPin {

        const encodedPinProperties = {
            positionX: ctx.Int.const(`epp_${this.id}_position_x`),
            positionY: ctx.Int.const(`epp_${this.id}_position_y`),
            clauses: []
        }

        const instance = new EncodedPin({
            ...this,
            encoding: encodedPinProperties
        })
        return instance
    }
}

type EncodedPinProperties = {
    positionX: Arith
    positionY: Arith
    clauses: Bool[]
}

export class EncodedPin extends Pin {
    encoding: EncodedPinProperties

    constructor(o: PinProperties & { encoding: EncodedPinProperties }) {
        super(o)
        this.encoding = o.encoding
    }

    result(m: Model): ResultPin {
        return new ResultPin({
            ...this,
            results: {
                positionX: intVal(m, this.encoding.positionX),
                positionY: intVal(m, this.encoding.positionY)
            }
        })
    }
}

type ResultPinProperties = {
    positionX: number
    positionY: number
}

export class ResultPin extends EncodedPin {
    results: ResultPinProperties

    constructor(o: PinProperties & { encoding: EncodedPinProperties } & { results: ResultPinProperties }) {
        super(o)
        this.results = o.results
    }
}