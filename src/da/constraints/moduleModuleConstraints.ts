import { Bool, Context } from "z3-solver";
import { smtsum } from "../utils";
import { minDistanceAsym } from "../geometry/geometry";
import { EncodedModuleInstance } from "../module";

export function encodeModuleModuleConstraints(ctx: Context, a: EncodedModuleInstance, b: EncodedModuleInstance): Bool[] {
    const clauses = []

    /* Minimal inter-module distance */
    {
        const min_distance = Math.max(a.spacing, b.spacing)
        clauses.push(
            ctx.Or(
                minDistanceAsym(ctx, a.position_x, b.position_x, smtsum(ctx, a.size_x(ctx), min_distance)),
                minDistanceAsym(ctx, a.position_y, b.position_y, smtsum(ctx, a.size_y(ctx), min_distance)),
                minDistanceAsym(ctx, b.position_x, a.position_x, smtsum(ctx, b.size_x(ctx), min_distance)),
                minDistanceAsym(ctx, b.position_y, a.position_y, smtsum(ctx, b.size_y(ctx), min_distance)),
            )
        )
    }
    
    return clauses
}