import {Arith, Context, Model} from "z3-solver";
import {ModuleID} from "./module";
import {intVal} from "../z3Helpers";
import {Position} from "../geometry/position";

export type pinID = number
type PinProperties = {
    id: pinID
    module: ModuleID
    position?: Position
}


export class Pin {
    id: pinID
    module: ModuleID
    position?: Position

    constructor(o: PinProperties) {
        this.id = o.id
        this.module = o.module
        this.position = o.position
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

        const exclusionRadius = Pin.pinRadius() + Pin.pinSpacing()
        let pinX, pinY, exclusionX, exclusionY

        if (this.position !== undefined) {
            pinX = this.position.x
            pinY = this.position.y
            exclusionX = this.position.x - exclusionRadius
            exclusionY = this.position.y - exclusionRadius
        } else {
            pinX = ctx.Int.const(`epp_${this.id}_pin_position_x`)
            pinY = ctx.Int.const(`epp_${this.id}_pin_position_y`)
            exclusionX = pinX.sub(exclusionRadius)
            exclusionY = pinY.sub(exclusionRadius)
        }

        const encodedPinProperties = {
            positionX: pinX,
            positionY: pinY,
            exclusionPositionX: exclusionX,
            exclusionPositionY: exclusionY,
        }

        const instance = new EncodedPin({
            ...this,
            encoding: encodedPinProperties
        })
        return instance
    }
}

type EncodedPinProperties = {
    positionX: Arith | number
    positionY: Arith | number
    exclusionPositionX: Arith | number
    exclusionPositionY: Arith | number
}

export class EncodedPin extends Pin {
    encoding: EncodedPinProperties

    constructor(o: PinProperties & { encoding: EncodedPinProperties }) {
        super(o)
        this.encoding = o.encoding
    }

    result(m: Model): ResultPin {
        const exclusionRadius = Pin.pinRadius() + Pin.pinSpacing()
        const resultPinX = intVal(m, this.encoding.positionX)
        const resultPinY = intVal(m, this.encoding.positionY)
        return new ResultPin({
            ...this,
            results: {
                positionX: resultPinX,
                positionY: resultPinY,
                exclusionPositionX: resultPinX - exclusionRadius,
                exclusionPositionY: resultPinY - exclusionRadius,
                exclusionSideLength: Pin.diameter(Pin.pinRadius())
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