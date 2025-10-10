import {Context} from "z3-solver";
import {EncodedModule} from "../components/module";
import {EncodedChannel} from "../components/channel";
import {Placement} from "../geometry/placement";
import {Constraint, UniqueConstraint} from "../processing/constraint";

export function encodeChannelPortConstraints(ctx: Context, channel: EncodedChannel, fromModule: EncodedModule, toModule: EncodedModule): Constraint[] {
    const clauses: Constraint[] = []

    /* Channels start and end ports must be on start and end waypoint */
    const label = "channel-port-constraints-start-end-waypoints-id-"
    {
        const fromPortPosition = fromModule.portPosition(ctx, channel.from.port[0], channel.from.port[1])
        const toPortPosition = toModule.portPosition(ctx, channel.to.port[0], channel.to.port[1])

        clauses.push(
            {
                expr: ctx.And(
                    ctx.Eq(channel.encoding.waypoints[0].x, fromPortPosition.x),
                    ctx.Eq(channel.encoding.waypoints[0].y, fromPortPosition.y),
                    ctx.Eq(channel.encoding.waypoints[channel.maxSegments].x, toPortPosition.x),
                    ctx.Eq(channel.encoding.waypoints[channel.maxSegments].y, toPortPosition.y)
                ),
                label: label + channel.id + UniqueConstraint.generateRandomString()
            }
        )
    }
    return clauses
}