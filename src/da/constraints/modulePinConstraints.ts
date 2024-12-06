import {Bool, Context} from "z3-solver";
import {EncodedPin, Pin} from "../components/pin";
import {EncodedModule} from "../components/module";
import {boxBoxMinDistance} from "../geometry/geometry";
import {Placement} from "../geometry/placement";
import {Constraint, UniqueConstraint} from "../processing/constraint";


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
            const pinExclusionX = pin.encoding.positionX.sub((pin.radius + Pin.pinSpacing()))
            const pinExclusionY = pin.encoding.positionY.sub((pin.radius + Pin.pinSpacing()))
            const pinExclusionSpan = Pin.diameter(pin.radius)

            const moduleX = module.encoding.positionX
            const moduleY = module.encoding.positionY
            const moduleSpanX = module.spanX(ctx)
            const moduleSpanY = module.spanY(ctx)
            const min_distance = module.spacing

            clauses.push(
                {
                    expr: ctx.And(
                        boxBoxMinDistance(ctx, {
                                x: pinExclusionX,
                                y: pinExclusionY,
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