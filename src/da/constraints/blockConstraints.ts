import { Context } from "z3-solver";
import { EncodedBuildingBlockInstance } from "../buildingBlock";
import { Chip } from "../chip";
import { smtsum } from "../utils";
import { minDistanceAsym } from "../geometry/geometry";

export function encodeBlockConstraints(ctx: Context, block: EncodedBuildingBlockInstance, chip: Chip) {
    const clauses = []

    /* Minimal distance to chip boundaries */
    clauses.push(
        minDistanceAsym(ctx, chip.origin_x, block.position_x, block.spacing),
        minDistanceAsym(ctx, chip.origin_y, block.position_y, block.spacing),
        minDistanceAsym(ctx, block.position_x, chip.origin_x + chip.width, smtsum(ctx, block.size_x(ctx), block.spacing)),
        minDistanceAsym(ctx, block.position_y, chip.origin_y + chip.height, smtsum(ctx, block.size_y(ctx), block.spacing))
    )

    return clauses
}