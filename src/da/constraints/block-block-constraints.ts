import { Bool, Context } from "z3-solver";
import { EncodedBuildingBlockInstance } from "../building_block";
import { min_distance_asym } from "../geometry/geometry";
import { smtsum } from "../utils";

export function encode_block_block_constraints(ctx: Context, a: EncodedBuildingBlockInstance, b: EncodedBuildingBlockInstance): Bool[] {
    const clauses = []

    /* Minimal inter-block distance */
    {
        const min_distance = Math.max(a.spacing, b.spacing)
        clauses.push(
            ctx.Or(
                min_distance_asym(ctx, a.position_x, b.position_x, smtsum(ctx, a.size_x(ctx), min_distance)),
                min_distance_asym(ctx, a.position_y, b.position_y, smtsum(ctx, a.size_y(ctx), min_distance)),
                min_distance_asym(ctx, b.position_x, a.position_x, smtsum(ctx, b.size_x(ctx), min_distance)),
                min_distance_asym(ctx, b.position_y, a.position_y, smtsum(ctx, b.size_y(ctx), min_distance)),
            )
        )
    }
    
    return clauses
}