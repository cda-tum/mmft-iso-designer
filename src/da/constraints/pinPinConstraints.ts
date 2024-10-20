import {EncodedPin} from "../pin";
import {Bool, Context} from "z3-solver";
import {minDistanceSym} from "../geometry/geometry";
import {EncodedModule} from "../module";

export function encodePinPinConstraints(ctx: Context, a: EncodedPin, b: EncodedPin, modules: EncodedModule[]): Bool[] {
    const clauses = []

    const moduleA = modules[a.module]
    const moduleB = modules[b.module]

    /* Minimum distance between pins to ensure proper fixation of the module */
    {
        if (moduleA.id === moduleB.id) {
            const circumference = (2 * moduleA.width) + (2 * moduleA.height)
            const min_distance = a.radius + b.radius + (Math.round(circumference / 6))
            clauses.push(
                ctx.Or(
                    minDistanceSym(ctx, a.encoding.positionX, b.encoding.positionX, min_distance),
                    minDistanceSym(ctx, a.encoding.positionY, b.encoding.positionY, min_distance)
                )
            )
        }
    }
    return clauses
}