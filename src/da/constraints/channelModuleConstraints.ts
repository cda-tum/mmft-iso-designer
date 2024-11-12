import { Bool, Context } from "z3-solver";
import { EncodedModule } from "../components/module";
import { EncodedChannel } from "../components/channel";

/* Constraints between channels and modules */
export function encodeChannelModuleConstraints(ctx: Context, channel: EncodedChannel, module: EncodedModule): Bool[] {
    return []
}