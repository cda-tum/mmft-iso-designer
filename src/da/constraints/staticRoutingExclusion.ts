import { Bool, Context } from "z3-solver";
import { EncodedChannelInstance, SegmentType } from "../channel";
import { StaticRoutingExclusion } from "../routingExclusion";
import { channelSegmentRoutingExclusionDistance, channelSegmentRoutingExclusionNoCross, waypointRoutingExclusionDistance } from "../geometry/geometry";


export function encodeStaticRoutingExclusion(ctx: Context, channel: EncodedChannelInstance, exclusion: StaticRoutingExclusion): Bool[] {
    const clauses = []

    /* Channels segments may not be near routing exclusion zones */
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i < channel.segments_n; i++) {
            clauses.push(
                ctx.Implies(
                    channel.segments[i].active,
                    channelSegmentRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance)
                )
            )
        }
    }

    /* Channels waypoints may not be near routing exclusion zones */
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i <= channel.segments_n; i++) {
            clauses.push(
                waypointRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance)
            )
        }
    }

    /* Channel segments may not cross routing exclusion zones */
    {
        for (let i = 0; i < channel.segments_n; i++) {
            clauses.push(
                ctx.Implies(
                    channel.segments[i].active,
                    channelSegmentRoutingExclusionNoCross(ctx, channel, i, exclusion)
                )
            )
        }
    }

    return clauses
}