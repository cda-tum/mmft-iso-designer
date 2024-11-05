import { Position } from "./position";
import {Arith} from "z3-solver";
import {Orientation} from "./orientation";

export { RoutingExclusion, StaticRoutingExclusion, PinRoutingExclusion }

type routingExclusionProperties = {
    position: { x: number | Arith, y: number | Arith }
    width: number
    height: number
}

class RoutingExclusion {
    position!: { x: number | Arith, y: number | Arith }
    width!: number | Arith
    height!: number | Arith

}

class StaticRoutingExclusion extends RoutingExclusion {
    position!: Position
    width!: number
    height!: number

    constructor(obj: Partial<StaticRoutingExclusion>) {
        super()
        Object.assign(this, obj)
    }
}

class PinRoutingExclusion extends RoutingExclusion {
    pin!: number
    position!: { x: number | Arith, y: number | Arith }
    width!: number | Arith
    height!: number | Arith

    constructor(pin: number, o: routingExclusionProperties) {
        super()
        this.position = o.position
        this.width = o.width
        this.height = o.height
        this.pin = pin
    }
}

class DynamicRoutingExclusion extends RoutingExclusion {
    module!: number
    orientation!: Orientation
    position!: { x: number | Arith, y: number | Arith }
    width!: number | Arith
    height!: number | Arith

    constructor(pin: number, o: routingExclusionProperties) {
        super()
        this.position = o.position
        this.width = o.width
        this.height = o.height
        this.module = pin
    }
}