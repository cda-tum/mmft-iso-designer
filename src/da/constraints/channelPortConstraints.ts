import { Context } from "z3-solver";
import { EncodedChannelInstance } from "../channel";
import { EncodedBuildingBlockInstance } from "../buildingBlock";

export function encode_channel_port_constraints(ctx: Context, channel: EncodedChannelInstance, from_block: EncodedBuildingBlockInstance, to_block: EncodedBuildingBlockInstance) {
    const clauses = []

    const from_port_position = from_block.port_position(ctx, channel.from.port[0], channel.from.port[1])
    const to_port_position = to_block.port_position(ctx, channel.to.port[0], channel.to.port[1])

    clauses.push(
        ctx.Eq(channel.waypoints[0].x, from_port_position.x),
        ctx.Eq(channel.waypoints[0].y, from_port_position.y),
        ctx.Eq(channel.waypoints[channel.segments_n].x, to_port_position.x),
        ctx.Eq(channel.waypoints[channel.segments_n].y, to_port_position.y),
    )

    return clauses
}