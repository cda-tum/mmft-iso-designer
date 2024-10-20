import {Bool, Context} from "z3-solver";
import {EncodedPin} from "../pin";
import {EncodedModule} from "../module";
import {boxBoxMinDistance} from "../geometry/geometry";
import {Placement} from "../placement";


export function encodeModulePinConstraints(ctx: Context, pin: EncodedPin, module: EncodedModule, modules: EncodedModule[]): Bool[] {
    const clauses = []

    const pinModule = modules[pin.module]
    const exclusionCondition = (module.placement !== pinModule.placement)
        || (module.placement === undefined && pinModule.placement === Placement.Bottom)
        || (pinModule.placement === undefined && module.placement === Placement.Bottom)

    /* No modules on the other side where pins are located */
    {
        if (exclusionCondition) {
            const pinExclusionX = pin.encoding.positionX.sub(pin.radius)
            const pinExclusionY = pin.encoding.positionY.sub(pin.radius)
            const pinExclusionSpan = pin.radius * 2

            const moduleX = module.encoding.positionX
            const moduleY = module.encoding.positionY
            const moduleSpanX = module.spanX(ctx)
            const moduleSpanY = module.spanY(ctx)

            const min_distance = 1000

            clauses.push(
                boxBoxMinDistance(ctx, {
                        x: pinExclusionX,
                        y: pinExclusionY,
                        x_span: pinExclusionSpan,
                        y_span: pinExclusionSpan
                    },
                    {x: moduleX, y: moduleY, x_span: moduleSpanX, y_span: moduleSpanY}, min_distance)
            )
        }
    }
    return clauses
}