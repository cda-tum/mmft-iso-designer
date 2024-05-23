import { Bool, Context } from "z3-solver";
import { EncodedChannelInstance } from "../channel";
import { EncodedModuleInstance } from "../module";

/* Constraints between channels and modules */
export function encodeChannelModuleConstraints(ctx: Context, channel: EncodedChannelInstance, module: EncodedModuleInstance): Bool[] {
    return []
}