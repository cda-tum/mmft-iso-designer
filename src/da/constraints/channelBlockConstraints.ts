import { Bool, Context } from "z3-solver";
import { EncodedChannelInstance } from "../channel";
import { EncodedBuildingBlockInstance } from "../buildingBlock";

export function encodeChannelBlockConstraints(ctx: Context, channel: EncodedChannelInstance, block: EncodedBuildingBlockInstance): Bool[] {
    return []
}