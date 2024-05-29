import { Position } from "./position";

export { StaticRoutingExclusion }

class StaticRoutingExclusion {
    position!: Position
    width!: number
    height!: number

    constructor(obj: Partial<StaticRoutingExclusion>){
        Object.assign(this, obj)
    }
}