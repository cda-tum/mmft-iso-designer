import {Bool, Context} from "z3-solver";
import {EncodedPin, Pin} from "../components/pin";
import {EncodedModule} from "../components/module";
import {boxBoxMinDistance} from "../geometry/geometry";
import {Placement} from "../geometry/placement";
import {Constraint, UniqueConstraint} from "../processing/constraint";
import {UncertainPosition} from "../geometry/position";


export function encodeModulePinConstraints(ctx: Context, pin: EncodedPin, module: EncodedModule, modules: EncodedModule[]): Constraint[] {
    const clauses: Constraint[] = []

    const pinModule = modules[pin.module]
    const exclusionCondition = (module.placement === Placement.Top && pinModule.placement === Placement.Bottom)
        || (pinModule.placement === Placement.Top && module.placement === Placement.Bottom)
        || (module.placement === undefined && pinModule.placement === Placement.Bottom)
        || (pinModule.placement === undefined && module.placement === Placement.Bottom)

    /* No modules on the other side where pins are located */
    let label = "module-pin-constraints-other-side-module-id-"
    {
        if (exclusionCondition) {
            const exclusionRadius = Pin.pinRadius() + Pin.pinSpacing()
            let exclusionPosition: UncertainPosition
            const exclPosX = typeof pin.encoding.positionX === "number" ? pin.encoding.positionX - (exclusionRadius) : pin.encoding.positionX.sub(exclusionRadius)
            const exclPosY = typeof pin.encoding.positionY === "number" ? pin.encoding.positionY - (exclusionRadius) : pin.encoding.positionY.sub(exclusionRadius)
            exclusionPosition = { x: exclPosX, y: exclPosY }

            const pinExclusionSpan = Pin.diameter(Pin.pinRadius())

            const moduleX = module.encoding.positionX
            const moduleY = module.encoding.positionY
            const moduleSpanX = module.spanX(ctx)
            const moduleSpanY = module.spanY(ctx)
            const min_distance = module.spacing

            clauses.push(
                {
                    expr: ctx.And(
                        boxBoxMinDistance(ctx, {
                                x: exclusionPosition.x,
                                y: exclusionPosition.y,
                                x_span: pinExclusionSpan,
                                y_span: pinExclusionSpan
                            },
                            {x: moduleX, y: moduleY, x_span: moduleSpanX, y_span: moduleSpanY}, min_distance)
                    ),
                    label: label + module.id + "-with-pin-id-" + pin.id + UniqueConstraint.generateRandomString()
                }
            )
        }
    }
    return clauses
}