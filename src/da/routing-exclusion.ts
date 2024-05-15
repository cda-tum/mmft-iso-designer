import { Context } from "vm";

export { StaticRoutingExclusion }

class StaticRoutingExclusion {
    position_x!: number
    position_y!: number
    width!: number
    height!: number

    constructor(obj: Partial<StaticRoutingExclusion>){
        Object.assign(this, obj)
    }
}