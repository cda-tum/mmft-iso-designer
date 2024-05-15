import { Context } from "z3-solver";
import { EncodedBuildingBlockInstance } from "../building_block";
import { Chip } from "../chip";
import { min_distance_asym } from "../geometry/geometry";
import { smtsum } from "../utils";

export function encode_block_constraints(ctx: Context, block: EncodedBuildingBlockInstance, chip: Chip) {
    const clauses = []

    /* Minimal distance to chip boundaries */
    clauses.push(
        min_distance_asym(ctx, chip.origin_x, block.position_x, block.spacing),
        min_distance_asym(ctx, chip.origin_y, block.position_y, block.spacing),
        min_distance_asym(ctx, block.position_x, chip.origin_x + chip.width, smtsum(ctx, block.size_x(ctx), block.spacing)),
        min_distance_asym(ctx, block.position_y, chip.origin_y + chip.height, smtsum(ctx, block.size_y(ctx), block.spacing))
    )

    return clauses
}