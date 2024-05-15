import { Bool, Context } from "z3-solver";
import { EncodedChannelInstance, SegmentType } from "../channel";
import { StaticRoutingExclusion } from "../routing-exclusion";
import { channel_segment_routing_exclusion_distance, channel_segment_routing_exclusion_no_cross, waypoint_routing_exclusion_distance } from "../geometry/geometry";


export function encode_static_routing_exclusion(ctx: Context, channel: EncodedChannelInstance, exclusion: StaticRoutingExclusion): Bool[] {
    const clauses = []

    /* Channels segments may not be near routing exclusion zones */
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i < channel.segments_n; i++) {
            clauses.push(
                ctx.Implies(
                    channel.segments[i].active,
                    channel_segment_routing_exclusion_distance(ctx, channel, i, exclusion, min_distance)
                )
            )
        }
    }

    /* Channels waypoints may not be near routing exclusion zones */
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i <= channel.segments_n; i++) {
            clauses.push(
                waypoint_routing_exclusion_distance(ctx, channel, i, exclusion, min_distance)
            )
        }
    }

    /* Channel segments may not cross routing exclusion zones */
    {
        for (let i = 0; i < channel.segments_n; i++) {
            clauses.push(
                ctx.Implies(
                    channel.segments[i].active,
                    channel_segment_routing_exclusion_no_cross(ctx, channel, i, exclusion)
                )
            )
        }
    }

    return clauses
}