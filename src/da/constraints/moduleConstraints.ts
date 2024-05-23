import { Context } from "z3-solver";
import { Chip } from "../chip";
import { smtsum } from "../utils";
import { minDistanceAsym } from "../geometry/geometry";
import { EncodedModuleInstance } from "../module";

export function encodeModuleConstraints(ctx: Context, module: EncodedModuleInstance, chip: Chip) {
    const clauses = []

    /* Minimal distance to chip boundaries */
    clauses.push(
        minDistanceAsym(ctx, chip.origin_x, module.position_x, module.spacing),
        minDistanceAsym(ctx, chip.origin_y, module.position_y, module.spacing),
        minDistanceAsym(ctx, module.position_x, chip.origin_x + chip.width, smtsum(ctx, module.size_x(ctx), module.spacing)),
        minDistanceAsym(ctx, module.position_y, chip.origin_y + chip.height, smtsum(ctx, module.size_y(ctx), module.spacing))
    )

    return clauses
}