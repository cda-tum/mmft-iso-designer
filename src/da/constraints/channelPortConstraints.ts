import { Context } from "z3-solver";
import { EncodedChannelInstance } from "../channel";
import { EncodedModuleInstance } from "../module";

export function encodeChannelPortConstraints(ctx: Context, channel: EncodedChannelInstance, from_module: EncodedModuleInstance, to_module: EncodedModuleInstance) {
    const clauses = []

    const from_port_position = from_module.port_position(ctx, channel.from.port[0], channel.from.port[1])
    const to_port_position = to_module.port_position(ctx, channel.to.port[0], channel.to.port[1])

    clauses.push(
        ctx.Eq(channel.waypoints[0].x, from_port_position.x),
        ctx.Eq(channel.waypoints[0].y, from_port_position.y),
        ctx.Eq(channel.waypoints[channel.segments_n].x, to_port_position.x),
        ctx.Eq(channel.waypoints[channel.segments_n].y, to_port_position.y),
    )

    return clauses
}