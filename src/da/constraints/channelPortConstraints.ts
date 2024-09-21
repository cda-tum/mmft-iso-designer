import { Context } from "z3-solver";
import { EncodedModule } from "../module";
import { EncodedChannel } from "../channel";

export function encodeChannelPortConstraints(ctx: Context, channel: EncodedChannel, fromModule: EncodedModule, toModule: EncodedModule) {
    const clauses = []

    if (toModule.placement == fromModule.placement) {
        const fromPortPosition = fromModule.portPosition(ctx, channel.from.port[0], channel.from.port[1])
        const toPortPosition = toModule.portPosition(ctx, channel.to.port[0], channel.to.port[1])

        clauses.push(
            ctx.Eq(channel.encoding.waypoints[0].x, fromPortPosition.x),
            ctx.Eq(channel.encoding.waypoints[0].y, fromPortPosition.y),
            ctx.Eq(channel.encoding.waypoints[channel.maxSegments].x, toPortPosition.x),
            ctx.Eq(channel.encoding.waypoints[channel.maxSegments].y, toPortPosition.y),
        )
    } else {
        throw 'From-port and to-Port of one channel cannot be on different sides of the chip.'
    }
    return clauses
}