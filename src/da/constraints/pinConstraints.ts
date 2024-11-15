import {Context} from "z3-solver";
import {EncodedPin} from "../components/pin";
import {pinModuleMinMaxDistance} from "../geometry/geometry";
import {EncodedModule} from "../components/module";
import {Constraint} from "../processing/constraint";

export function encodePinConstraints(ctx: Context, pin: EncodedPin, modules: EncodedModule[]): Constraint[] {
    const clauses: Constraint[] = []
    const label = "pin-constraints-position-on-clamp-id-"

    /* Position (center of pin) must be on the clamp --> minimal and maximal distance to module */
    {
        const module = modules[pin.module]
        clauses.push(
            {
                expr:
                    ctx.And(
                        pinModuleMinMaxDistance(ctx, {
                            x1: pin.encoding.positionX,
                            y1: pin.encoding.positionY
                        }, module, 1000),
                    )
                , label: label + pin.id
            }
        )
    }
    return clauses
}