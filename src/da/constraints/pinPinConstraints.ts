import {EncodedPin, Pin} from "../components/pin";
import {Context} from "z3-solver";
import {minDistanceSym} from "../geometry/geometry";
import {EncodedModule} from "../components/module";
import {Constraint, UniqueConstraint} from "../processing/constraint";

export function encodePinPinConstraints(ctx: Context, a: EncodedPin, b: EncodedPin, modules: EncodedModule[]): Constraint[] {
    const clauses: Constraint[] = []

    const moduleA = modules[a.module]
    const moduleB = modules[b.module]

    /* Minimum distance between pins on the same module to ensure proper fixation of the module */
    let label = "pin-pin-constraints-inter-pin-distance-pinA-id-"
    {
        if (moduleA.id === moduleB.id) {
            const circumference = (2 * moduleA.width) + (2 * moduleA.height)
            let min_distance
            if (moduleA.pinAmount !== undefined && moduleA.pinAmount == 2) {
                min_distance = Math.max(moduleA.width, moduleA.height)
            } else if (moduleA.pinAmount !== undefined && moduleA.pinAmount > 3) {
                min_distance = Pin.pinRadius() + Math.round(circumference / 9)
            } else {
                min_distance = Pin.pinRadius() + Pin.pinRadius() + (Math.round(circumference / 6))
            }
            const half_distance = Math.round(min_distance / 2)
            clauses.push(
                {
                    expr: ctx.Or(
                        minDistanceSym(ctx, a.encoding.positionX, b.encoding.positionX, min_distance),
                        minDistanceSym(ctx, a.encoding.positionY, b.encoding.positionY, min_distance),
                        ctx.And(
                            minDistanceSym(ctx, a.encoding.positionX, b.encoding.positionX, half_distance),
                            minDistanceSym(ctx, a.encoding.positionY, b.encoding.positionY, half_distance)
                        )
                    ),
                    label: label + a.id + "-pinB-id-" + b.id + "-module-id-" + moduleA.id + UniqueConstraint.generateRandomString()
                }
            )
        }
    }
    return clauses
}