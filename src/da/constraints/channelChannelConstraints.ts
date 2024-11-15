import {Context} from "z3-solver";
import {cross} from "../utils";
import {
    channelSegmentsNoCross,
    minDistanceSym,
    waypointSegmentDistance
} from "../geometry/geometry";
import {EncodedChannel} from "../components/channel";
import {EncodedModule} from "../components/module";
import {Placement} from "../geometry/placement";
import {Constraint} from "../processing/constraint";

export function encodeChannelChannelConstraints(ctx: Context, a: EncodedChannel, b: EncodedChannel, modules: EncodedModule[]): Constraint[] {
    const clauses: Constraint[] = []

    const moduleA = modules[a.from.module]
    const moduleB = modules[b.from.module]

    const channelSamePlacement =
        (moduleA.placement === Placement.Top && moduleB.placement === Placement.Top) ||
        (moduleA.placement === Placement.Bottom && moduleB.placement === Placement.Bottom) ||
        (moduleA.placement === undefined && moduleB.placement === undefined) ||
        (moduleA.placement === undefined && moduleB.placement === Placement.Top) ||
        (moduleA.placement === Placement.Top && moduleB.placement === undefined)

    if (channelSamePlacement) {
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
                    label: label + labelA + "-and-" + labelB
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
                    label: label + labelA + "-and-" + labelB
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
                    label: label
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
                    label: label
                }
            )
        }
    }
    return clauses
}