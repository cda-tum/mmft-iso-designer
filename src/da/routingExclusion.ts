import { Position } from "./position";
import {Arith} from "z3-solver";

export { RoutingExclusion, StaticRoutingExclusion, DynamicRoutingExclusion }

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

type dynamicRoutingExclusionProperties = {
    position: { x: number | Arith, y: number | Arith }
    width: number
    height: number
}

class DynamicRoutingExclusion extends RoutingExclusion {
    position!: { x: number | Arith, y: number | Arith }
    width!: number | Arith
    height!: number | Arith

    constructor(o: dynamicRoutingExclusionProperties) {
        super()
        this.position = o.position
        this.width = o.width
        this.height = o.height
    }
}