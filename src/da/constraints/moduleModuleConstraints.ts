import {Bool, Context} from "z3-solver";
import {minDistanceAsym} from "../geometry/geometry";
import {EncodedModule} from "../components/module";
import {smtSum} from "../utils";
import {Placement} from "../geometry/placement";
import {Constraint} from "../processing/constraint";

export function encodeModuleModuleConstraints(ctx: Context, a: EncodedModule, b: EncodedModule): Constraint[] {
    const clauses: Constraint[] = []

    /* Minimal inter-module distance */
    let label = "module-module-constraints-inter-module-distance-id-"
    {
        const sameSideCondition = ((a.placement === Placement.Top || a.placement === undefined) && (b.placement === Placement.Top || b.placement === undefined))
        const min_distance = Math.max(a.spacing + 1000, b.spacing + 1000)
        if (sameSideCondition) {
            clauses.push(
                {
                    expr: ctx.Or(
                        minDistanceAsym(ctx, a.encoding.positionX, b.encoding.positionX, smtSum(ctx, a.spanX(ctx), min_distance)),
                        minDistanceAsym(ctx, a.encoding.positionY, b.encoding.positionY, smtSum(ctx, a.spanY(ctx), min_distance)),
                        minDistanceAsym(ctx, b.encoding.positionX, a.encoding.positionX, smtSum(ctx, b.spanX(ctx), min_distance)),
                        minDistanceAsym(ctx, b.encoding.positionY, a.encoding.positionY, smtSum(ctx, b.spanY(ctx), min_distance)),
                    ),
                    label: label + a.id + "-and-id-" + b.id
                }
            )
        }
    }
    return clauses
}