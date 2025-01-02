import {Context} from "z3-solver";
import {cross} from "../utils";
import {
    channelSegmentsNoCross,
    minDistanceSym,
    waypointSegmentDistance
} from "../geometry/geometry";
import {EncodedChannel} from "../components/channel";
import {Constraint, UniqueConstraint} from "../processing/constraint";
import {Layer} from "../geometry/layer";

export function encodeChannelChannelConstraints(ctx: Context, a: EncodedChannel, b: EncodedChannel): Constraint[] {
    const clauses: Constraint[] = []

    const channelsInSameLayer =
        (a.channelLayer === Layer.One && b.channelLayer === Layer.One) ||
        (a.channelLayer === Layer.Two && b.channelLayer === Layer.Two) ||
        (a.channelLayer === undefined && b.channelLayer === undefined) ||
        (a.channelLayer === undefined && b.channelLayer === Layer.One) ||
        (a.channelLayer === Layer.One && b.channelLayer === undefined)

    if (channelsInSameLayer) {
        /* Avoid segment crossings */
        let label = "channel-channel-constraints-segment-crossing-"
        const labelA = "id-" + a.id
        const labelB = "id-" + b.id
        {
            clauses.push(
                {
                    expr: ctx.And(
                        ...cross([...a.encoding.segments.keys()], [...b.encoding.segments.keys()]).map(([ia, ib]) => {
                            return ctx.Implies(
                                ctx.And(
                                    a.encoding.segments[ia].active,
                                    b.encoding.segments[ib].active
                                ),
                                channelSegmentsNoCross(ctx, a, ia, b, ib)
                            )
                        })
                    ),
                    label: label + labelA + "-and-" + labelB + UniqueConstraint.generateRandomString(5)
                }
            )
        }

        /* Specify waypoint distance to waypoints of other channels */
        label = "channel-channel-constraints-waypoint-other-channel-waypoint-distance-"
        {
            const minDistance = Math.ceil((a.width + b.width) / 2 + Math.max(a.spacing, b.spacing))
            clauses.push(
                {
                    expr: ctx.And(
                        ...cross(a.encoding.waypoints, b.encoding.waypoints).map(([wa, wb]) => {
                            return ctx.Or(
                                minDistanceSym(ctx, wa.x, wb.x, minDistance),
                                minDistanceSym(ctx, wa.y, wb.y, minDistance)
                            )
                        })
                    ),
                    label: label + labelA + "-and-" + labelB + UniqueConstraint.generateRandomString(5)
                }
            )
        }

        /* Specify waypoint distance to segments of other channels */

        {
            const minDistance = Math.ceil((a.width + b.width) / 2 + Math.max(a.spacing, b.spacing))
            label = "channel-channel-constraints-waypoint-" + labelA + "-to-other-segment-" + labelB + "-distance"
            clauses.push(
                {
                    expr: ctx.And(
                        ...cross([...a.encoding.waypoints.keys()], [...b.encoding.segments.keys()]).map(([wa, sb]) => {
                            return ctx.Implies(
                                b.encoding.segments[sb].active,
                                waypointSegmentDistance(ctx, a, wa, b, sb, minDistance),
                            )
                        })
                    ),
                    label: label + UniqueConstraint.generateRandomString(5)
                }
            )
            label = "channel-channel-constraints-waypoint-" + labelB + "-to-other-segment-" + labelA + "-distance"
            clauses.push(
                {
                    expr: ctx.And(
                        ...cross([...a.encoding.segments.keys()], [...b.encoding.waypoints.keys()]).map(([sa, wb]) => {
                            return ctx.Implies(
                                a.encoding.segments[sa].active,
                                waypointSegmentDistance(ctx, b, wb, a, sa, minDistance)
                            )
                        })
                    ),
                    label: label + UniqueConstraint.generateRandomString(5)
                }
            )
        }
    }
    return clauses
}