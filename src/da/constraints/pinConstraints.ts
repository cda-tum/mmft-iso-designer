import {Context} from "z3-solver";
import {Chip} from "../components/chip";
import {EncodedPin, Pin} from "../components/pin";
import {pinModuleMinMaxDistance} from "../geometry/geometry";
import {EncodedModule} from "../components/module";

export function encodePinConstraints(ctx: Context, pin: EncodedPin, modules: EncodedModule[], chip: Chip) {
    const clauses = []

    /* Position (center of pin) must be on the clamp --> minimal and maximal distance to module */
    {
        const module = modules[pin.module]
        clauses.push(
            ctx.And(
                pinModuleMinMaxDistance(ctx, { x1: pin.encoding.positionX, y1: pin.encoding.positionY }, module, 1000),
            )
        )
    }

    return clauses
}