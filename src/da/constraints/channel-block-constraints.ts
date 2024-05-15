import { Bool, Context } from "z3-solver";
import { EncodedChannelInstance } from "../channel";
import { EncodedBuildingBlockInstance } from "../building_block";

export function encode_channel_block_constraints(ctx: Context, channel: EncodedChannelInstance, block: EncodedBuildingBlockInstance): Bool[] {
    return []
}