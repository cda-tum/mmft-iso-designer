import {Arith, Bool, Context, Model} from "z3-solver";
import {ModuleID} from "./module";
import {intVal} from "../z3Helpers";

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

    /******************* ADJUST PIN SPACING HERE ********************/
    static pinSpacing() {
        return 500
    }

    /****************** ADJUST PIN RADIUS HERE **********************/
    static pinRadius() {
        return 1000
    }

    /*************** ADJUST DEFAULT AMOUNT OF PINS HERE *************/
    static defaultPins() {
        return 3
    }

    static diameter(radius: number) {
        return (radius + Pin.pinSpacing()) * 2
    }

    encode(ctx: Context): EncodedPin {

        const pinPosX = ctx.Int.const(`epp_${this.id}_pin_position_x`)
        const pinPosY = ctx.Int.const(`epp_${this.id}_pin_position_y`)
        const exclusionRadius = this.radius - Pin.pinSpacing()

        const encodedPinProperties = {
            positionX: pinPosX,
            positionY: pinPosY,
            exclusionPositionX: pinPosX.sub(exclusionRadius),
            exclusionPositionY: pinPosY.sub(exclusionRadius),
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
    exclusionPositionX: Arith
    exclusionPositionY: Arith
    clauses: Bool[]
}

export class EncodedPin extends Pin {
    encoding: EncodedPinProperties

    constructor(o: PinProperties & { encoding: EncodedPinProperties }) {
        super(o)
        this.encoding = o.encoding
    }

    result(m: Model): ResultPin {
        const exclusionRadius = this.radius + Pin.pinSpacing()
        const resultPinX = intVal(m, this.encoding.positionX)
        const resultPinY = intVal(m, this.encoding.positionY)
        return new ResultPin({
            ...this,
            results: {
                positionX: resultPinX,
                positionY: resultPinY,
                exclusionPositionX: resultPinX - exclusionRadius,
                exclusionPositionY: resultPinY - exclusionRadius,
                exclusionSideLength: Pin.diameter(this.radius)
            }
        })
    }
}

type ResultPinProperties = {
    positionX: number
    positionY: number
    exclusionPositionX: number
    exclusionPositionY: number
    exclusionSideLength: number
}

export class ResultPin extends EncodedPin {
    results: ResultPinProperties

    constructor(o: PinProperties & { encoding: EncodedPinProperties } & { results: ResultPinProperties }) {
        super(o)
        this.results = o.results
    }
}