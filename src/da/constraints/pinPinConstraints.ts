import {EncodedPin, Pin} from "../components/pin";
import {Bool, Context} from "z3-solver";
import {minDistanceSym} from "../geometry/geometry";
import {EncodedModule} from "../components/module";

export function encodePinPinConstraints(ctx: Context, a: EncodedPin, b: EncodedPin, modules: EncodedModule[]): Bool[] {
    const clauses = []

    const moduleA = modules[a.module]
    const moduleB = modules[b.module]

    /* Minimum distance between pins on the same module to ensure proper fixation of the module */
    {
        if (moduleA.id === moduleB.id) {
            const circumference = (2 * moduleA.width) + (2 * moduleA.height)
            let min_distance
            if (moduleA.pinAmount !== undefined && moduleA.pinAmount == 2) {
                min_distance = Math.max(moduleA.width, moduleA.height)
            } else if (moduleA.pinAmount !== undefined && moduleA.pinAmount > 3) {
                min_distance = Math.round(circumference / 9)
            } else {
                min_distance = a.radius + b.radius + (Math.round(circumference / 6))
            }
            const half_distance = Math.round(min_distance / 2)
            clauses.push(
                ctx.Or(
                    minDistanceSym(ctx, a.encoding.positionX, b.encoding.positionX, min_distance),
                    minDistanceSym(ctx, a.encoding.positionY, b.encoding.positionY, min_distance),
                    ctx.And(minDistanceSym(ctx, a.encoding.positionX, b.encoding.positionX, half_distance), minDistanceSym(ctx, a.encoding.positionY, b.encoding.positionY, half_distance))
                )
            )
        }
    }

    /* Minimum distance between pins on different modules */
    // {
    //     const min_distance = a.radius + b.radius + (Pin.pinSpacing() * 2)
    //     clauses.push(
    //         ctx.Or(
    //             minDistanceSym(ctx, a.encoding.positionX, b.encoding.positionX, min_distance),
    //             minDistanceSym(ctx, a.encoding.positionY, b.encoding.positionY, min_distance)
    //         )
    //     )
    // }

    return clauses
}