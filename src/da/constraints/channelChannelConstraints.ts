import {Bool, Context} from "z3-solver";
import {cross} from "../utils";
import {
    channelSegmentsNoCross,
    minDistanceSym,
    waypointSegmentDistance
} from "../geometry/geometry";
import {EncodedChannel} from "../components/channel";
import {EncodedModule} from "../components/module";
import {Placement} from "../geometry/placement";

export function encodeChannelChannelConstraints(ctx: Context, a: EncodedChannel, b: EncodedChannel, modules: EncodedModule[]): Bool[] {
    const clauses = []

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
        {
            clauses.push(...cross([...a.encoding.segments.keys()], [...b.encoding.segments.keys()]).map(([ia, ib]) => {
                return ctx.Implies(
                    ctx.And(
                        a.encoding.segments[ia].active,
                        b.encoding.segments[ib].active
                    ),
                    channelSegmentsNoCross(ctx, a, ia, b, ib)
                )
            }))
        }

        /* Specify waypoint distance to waypoints of other channels */
        {
            const minDistance = Math.ceil((a.width + b.width) / 2 + Math.max(a.spacing, b.spacing))
            clauses.push(...cross(a.encoding.waypoints, b.encoding.waypoints).map(([wa, wb]) => {
                return ctx.Or(
                    minDistanceSym(ctx, wa.x, wb.x, minDistance),
                    minDistanceSym(ctx, wa.y, wb.y, minDistance)
                )
            }))
        }

        /* Specify waypoint distance to segments of other channels */
        {
            const minDistance = Math.ceil((a.width + b.width) / 2 + Math.max(a.spacing, b.spacing))
            clauses.push(...cross([...a.encoding.waypoints.keys()], [...b.encoding.segments.keys()]).map(([wa, sb]) => {
                return ctx.Implies(
                    b.encoding.segments[sb].active,
                    waypointSegmentDistance(ctx, a, wa, b, sb, minDistance),
                )
            }))
            clauses.push(...cross([...a.encoding.segments.keys()], [...b.encoding.waypoints.keys()]).map(([sa, wb]) => {
                return ctx.Implies(
                    a.encoding.segments[sa].active,
                    waypointSegmentDistance(ctx, b, wb, a, sa, minDistance)
                )
            }))
        }
    }
    return clauses
}