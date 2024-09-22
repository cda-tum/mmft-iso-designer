import { Bool, Context } from "z3-solver";
import { minDistanceAsym } from "../geometry/geometry";
import { EncodedModule } from "../module";
import { smtSum } from "../utils";

export function encodeModuleModuleConstraints(ctx: Context, a: EncodedModule, b: EncodedModule): Bool[] {
    const clauses = []

    /* Minimal inter-module distance */
    {
        const min_distance = Math.max(a.spacing, b.spacing)
            if (a.placement == b.placement) {
                clauses.push(
                    ctx.Or(
                        minDistanceAsym(ctx, a.encoding.positionX, b.encoding.positionX, smtSum(ctx, a.spanX(ctx), min_distance)),
                        minDistanceAsym(ctx, a.encoding.positionY, b.encoding.positionY, smtSum(ctx, a.spanY(ctx), min_distance)),
                        minDistanceAsym(ctx, b.encoding.positionX, a.encoding.positionX, smtSum(ctx, b.spanX(ctx), min_distance)),
                        minDistanceAsym(ctx, b.encoding.positionY, a.encoding.positionY, smtSum(ctx, b.spanY(ctx), min_distance)),
                    )
                )
            }
            else {
                clauses.push(ctx.Bool.val(true))
            }
    }
    return clauses
}