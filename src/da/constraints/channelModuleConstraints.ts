import { Bool, Context } from "z3-solver";
import { EncodedModule } from "../module";
import { EncodedChannel } from "../channel";

/* Constraints between channels and modules */
export function encodeChannelModuleConstraints(ctx: Context, channel: EncodedChannel, module: EncodedModule): Bool[] {
    return []
}