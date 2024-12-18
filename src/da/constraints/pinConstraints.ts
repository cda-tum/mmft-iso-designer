import {Context} from "z3-solver";
import {EncodedPin, Pin} from "../components/pin";
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

    /* Position of the exclusion zone around the pin is dependent on the pin radius and spacing */
    // {
    //     const exclusionRadius = Pin.pinRadius() + Pin.pinSpacing()
    //     const exclusionX = typeof pin.encoding.positionX === "number" ? pin.encoding.positionX - exclusionRadius : pin.encoding.positionX.sub(exclusionRadius)
    //     const exclusionY = typeof pin.encoding.positionY === "number" ? pin.encoding.positionY - exclusionRadius : pin.encoding.positionY.sub(exclusionRadius)
    //     label = "pin-constraints-exclusion-zone-positions-pin-id-"
    //     clauses.push(
    //         {
    //             expr:
    //                 ctx.And(
    //                     ctx.Eq(pin.encoding.exclusionPositionX, exclusionX),
    //                     ctx.Eq(pin.encoding.exclusionPositionY, exclusionY)
    //                 )
    //             , label: label + pin.id + "-module-id-" + pin.module + UniqueConstraint.generateRandomString()
    //         }
    //     )
    // }
    return clauses
}