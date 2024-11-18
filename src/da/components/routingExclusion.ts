import {Position} from "../geometry/position";
import {Arith, Context, Model} from "z3-solver";
import {Orientation} from "../geometry/orientation";
import {EnumBitVec, EnumBitVecValue, intVal} from "../z3Helpers";
import Module from "node:module";
import {EncodedModule, ResultModule} from "./module";

export { RoutingExclusion, StaticChipRoutingExclusion, DynamicModuleRoutingExclusion, EncodedDynamicModuleRoutingExclusion, ResultDynamicModuleRoutingExclusion }


/** PARENT CLASS FOR ROUTING EXCLUSIONS **/

class RoutingExclusion {
    // TODO: find better counter or include in updateIds function
    private static idCounter = 0
    id: number

    constructor() {
        this.id = 0
    }
}

/** ROUTING EXCLUSION CLASS FOR STATIC EXCLUSION ZONES ON THE CHIP **/

class StaticChipRoutingExclusion extends RoutingExclusion {
    position!: Position
    width!: number
    height!: number

    constructor(obj: Partial<StaticChipRoutingExclusion>) {
        super()
        Object.assign(this, obj)
    }
}

/** ROUTING EXCLUSION CLASSES FOR DYNAMIC MODULE-BASED EXCLUSION ZONES (NORMAL, ENCODED, RESULT) **/

type dynamicModuleRoutingExclusionProperties = {
    module: number
    position: { x: number, y: number }
    width: number
    height: number
}

class DynamicModuleRoutingExclusion extends RoutingExclusion {
    module!: number
    position!: { x: number, y: number }
    width!: number
    height!: number

    constructor(o: dynamicModuleRoutingExclusionProperties) {
        super()
        this.module = o.module
        this.position = o.position
        this.width = o.width
        this.height = o.height
    }

    encode(ctx: Context, modules: EncodedModule[]): EncodedDynamicModuleRoutingExclusion {
        const encodedModule = modules[this.module]
        const encodedModuleRoutingExclusionProperties = {
            positionX: ctx.Int.const(`ebb_${this.id}_position_x`),
            positionY: ctx.Int.const(`ebb_${this.id}_position_y`),
            moduleInstance: encodedModule,
            clauses: []
        }
        const instance = new EncodedDynamicModuleRoutingExclusion({
            ...this,
            encoding: encodedModuleRoutingExclusionProperties
        })
        return instance
    }
}

type encodedModuleRoutingExclusionProperties = {
    positionX: Arith
    positionY: Arith
    moduleInstance: EncodedModule
}

class EncodedDynamicModuleRoutingExclusion extends DynamicModuleRoutingExclusion {
    encoding: encodedModuleRoutingExclusionProperties

    constructor(o: dynamicModuleRoutingExclusionProperties & { encoding: encodedModuleRoutingExclusionProperties }) {
        super(o)
        this.encoding = o.encoding
    }

    spanX(ctx: Context) {
        const orientation = this.encoding.moduleInstance.encoding.orientation
        if (orientation instanceof EnumBitVecValue) {
            switch (orientation.value) {
                case Orientation.Up:
                    return this.width
                case Orientation.Right:
                    return this.height
                case Orientation.Down:
                    return this.width
                case Orientation.Left:
                    return this.height
                default: throw ''
            }

        } else if (orientation instanceof EnumBitVec) {
            return ctx.If(
                orientation.eq(ctx, Orientation.Up),
                this.width,
                ctx.If(
                    orientation.eq(ctx, Orientation.Right),
                    this.height,
                    ctx.If(
                        orientation.eq(ctx, Orientation.Down),
                        this.width,
                        this.height
                    )
                )
            )
        } else {
            throw ''
        }
    }

    spanY(ctx: Context) {
        const orientation = this.encoding.moduleInstance.encoding.orientation
        if (orientation instanceof EnumBitVecValue) {
            switch (orientation.value) {
                case Orientation.Up:
                    return this.height
                case Orientation.Right:
                    return this.width
                case Orientation.Down:
                    return this.height
                case Orientation.Left:
                    return this.width
                default: throw ''
            }

        } else if (orientation instanceof EnumBitVec) {
            return ctx.If(
                orientation.eq(ctx, Orientation.Up),
                this.height,
                ctx.If(
                    orientation.eq(ctx, Orientation.Right),
                    this.width,
                    ctx.If(
                        orientation.eq(ctx, Orientation.Down),
                        this.height,
                        this.width
                    )
                )
            )
        } else {
            throw ''
        }
    }

    result(m: Model, resultModules: ResultModule[]): ResultDynamicModuleRoutingExclusion {
        const resultModule = resultModules[this.module]
        return new ResultDynamicModuleRoutingExclusion({
            ...this,
            results: {
                positionX: intVal(m, this.encoding.positionX),
                positionY: intVal(m, this.encoding.positionY),
                resultModule: resultModule
            }
        })
    }
}

type resultModuleRoutingExclusionProperties = {
    positionX: number
    positionY: number
    resultModule: ResultModule
}

class ResultDynamicModuleRoutingExclusion extends EncodedDynamicModuleRoutingExclusion {
    results: resultModuleRoutingExclusionProperties

    constructor(o: dynamicModuleRoutingExclusionProperties & { encoding: encodedModuleRoutingExclusionProperties } & { results: resultModuleRoutingExclusionProperties }) {
        super(o)
        this.results = o.results
    }
}