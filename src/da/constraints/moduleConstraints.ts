import { Context } from "z3-solver";
import { Chip } from "../components/chip";
import { minDistanceAsym } from "../geometry/geometry";
import { EncodedModule } from "../components/module";
import { smtSum } from "../utils";

export function encodeModuleConstraints(ctx: Context, module: EncodedModule, chip: Chip) {
    const clauses = []

    /* Minimal distance to chip boundaries */
    clauses.push(
        minDistanceAsym(ctx, chip.originX, module.encoding.positionX, module.spacing),
        minDistanceAsym(ctx, chip.originY, module.encoding.positionY, module.spacing),
        minDistanceAsym(ctx, module.encoding.positionX, chip.originX + chip.width, smtSum(ctx, module.spanX(ctx), module.spacing)),
        minDistanceAsym(ctx, module.encoding.positionY, chip.originY + chip.height, smtSum(ctx, module.spanY(ctx), module.spacing))
    )

    return clauses
}