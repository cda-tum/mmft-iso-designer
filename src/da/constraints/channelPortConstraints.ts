import {Context} from "z3-solver";
import {EncodedModule} from "../components/module";
import {EncodedChannel} from "../components/channel";
import {Placement} from "../geometry/placement";
import {Constraint, UniqueConstraint} from "../processing/constraint";

export function encodeChannelPortConstraints(ctx: Context, channel: EncodedChannel, fromModule: EncodedModule, toModule: EncodedModule): Constraint[] {
    const clauses: Constraint[] = []

    const channelValid = (fromModule.placement === Placement.Top && toModule.placement === Placement.Top) ||
        (fromModule.placement === Placement.Bottom && toModule.placement === Placement.Bottom) ||
        (fromModule.placement === undefined && toModule.placement === undefined) ||
        (fromModule.placement === undefined && toModule.placement === Placement.Top) ||
        (fromModule.placement === Placement.Top && toModule.placement === undefined)

    if (channelValid) {

        /* Channels start and end ports must be on start and end waypoint */
        const label = "channel-port-constraints-start-end-waypoints-id-"
        {
            const fromPortPosition = fromModule.portPosition(ctx, channel.from.port[0], channel.from.port[1])
            const toPortPosition = toModule.portPosition(ctx, channel.to.port[0], channel.to.port[1])

            clauses.push(
                {expr: ctx.And(
                        ctx.Eq(channel.encoding.waypoints[0].x, fromPortPosition.x),
                        ctx.Eq(channel.encoding.waypoints[0].y, fromPortPosition.y),
                        ctx.Eq(channel.encoding.waypoints[channel.maxSegments].x, toPortPosition.x),
                        ctx.Eq(channel.encoding.waypoints[channel.maxSegments].y, toPortPosition.y)
                    ),
                    label: label + channel.id + UniqueConstraint.generateRandomString()
                }
            )
        }

    } else {
        throw 'From-port and to-Port of one channel cannot be on different sides of the chip.'
    }
    return clauses
}