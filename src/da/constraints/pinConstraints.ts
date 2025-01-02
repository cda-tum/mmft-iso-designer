import {Context} from "z3-solver";
import {EncodedPin} from "../components/pin";
import {pinModuleMinMaxDistance} from "../geometry/geometry";
import {EncodedModule} from "../components/module";
import {Constraint, UniqueConstraint} from "../processing/constraint";
import {Clamp} from "../components/clamp";

export function encodePinConstraints(ctx: Context, pin: EncodedPin, modules: EncodedModule[]): Constraint[] {
    const clauses: Constraint[] = []
    let label = "pin-constraints-position-on-clamp-id-"

    /* Position (center of pin) must be on the clamp --> minimal and maximal distance to module */
    {
        const module = modules[pin.module]
        clauses.push(
            {
                expr:
                    ctx.And(
                        pinModuleMinMaxDistance(ctx, {
                            x: pin.encoding.positionX,
                            y: pin.encoding.positionY
                        }, module, Clamp.clampSpacing()),
                    )
                , label: label + module.id + "-pin-id-" + pin.id + UniqueConstraint.generateRandomString()
            }
        )
    }
    return clauses
}