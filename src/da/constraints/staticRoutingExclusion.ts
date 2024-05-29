import { Bool, Context } from "z3-solver";
import { StaticRoutingExclusion } from "../routingExclusion";
import { channelSegmentRoutingExclusionDistance, channelSegmentRoutingExclusionNoCross, waypointRoutingExclusionDistance } from "../geometry/geometry";
import { EncodedChannel } from "../channel";


export function encodeStaticRoutingExclusion(ctx: Context, channel: EncodedChannel, exclusion: StaticRoutingExclusion): Bool[] {
    const clauses = []

    /* Channels segments may not be near routing exclusion zones */
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                ctx.Implies(
                    channel.encoding.segments[i].active,
                    channelSegmentRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance)
                )
            )
        }
    }

    /* Channels waypoints may not be near routing exclusion zones */
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i <= channel.maxSegments; i++) {
            clauses.push(
                waypointRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance)
            )
        }
    }

    /* Channel segments may not cross routing exclusion zones */
    {
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                ctx.Implies(
                    channel.encoding.segments[i].active,
                    channelSegmentRoutingExclusionNoCross(ctx, channel, i, exclusion)
                )
            )
        }
    }

    return clauses
}