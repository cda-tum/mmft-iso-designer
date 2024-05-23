import { Bool, Context } from "z3-solver";
import { EncodedChannelInstance } from "../channel";
import { cross } from "../utils";
import { channelSegmentsNoCross, minDistanceSym, waypointSegmentDistance } from "../geometry/geometry";

export function encodeChannelChannelConstraints(ctx: Context, a: EncodedChannelInstance, b: EncodedChannelInstance): Bool[] {
    const clauses = []

    /* Avoid segment crossings */
    {
        clauses.push(...cross([...a.segments.keys()], [...b.segments.keys()]).map(([ia, ib]) => {
            return ctx.Implies(
                ctx.And(
                    a.segments[ia].active,
                    b.segments[ib].active
                ),
                channelSegmentsNoCross(ctx, a, ia, b, ib)
            )
        }))
    }

    /* Specify waypoint distance to waypoints of other channels */
    {
        const minDistance = Math.ceil((a.width + b.width) / 2 + Math.max(a.spacing, b.spacing))
        clauses.push(...cross(a.waypoints, b.waypoints).map(([wa, wb]) => {
            return ctx.Or(
                minDistanceSym(ctx, wa.x, wb.x, minDistance),
                minDistanceSym(ctx, wa.y, wb.y, minDistance)
            )
        }))
    }

    /* Specify waypoint distance to segments of other channels */
    {
        const minDistance = Math.ceil((a.width + b.width) / 2 + Math.max(a.spacing, b.spacing))
        clauses.push(...cross([...a.waypoints.keys()], [...b.segments.keys()]).map(([wa, sb]) => {
            return ctx.Implies(
                b.segments[sb].active,
                waypointSegmentDistance(ctx, a, wa, b, sb, minDistance),
            )
        }))
        clauses.push(...cross([...a.segments.keys()], [...b.waypoints.keys()]).map(([sa, wb]) => {
            return ctx.Implies(
                a.segments[sa].active,
                waypointSegmentDistance(ctx, b, wb, a, sa, minDistance)
            )
        }))
    }

    return clauses
}