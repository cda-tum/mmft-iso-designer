import { Bool, Context } from "z3-solver";
import { EncodedChannelInstance } from "../channel";
import { cross } from "../utils";
import { channel_segments_no_cross, min_distance_sym, waypoint_segment_distance } from "../geometry/geometry";

export function encode_channel_channel_constraints(ctx: Context, a: EncodedChannelInstance, b: EncodedChannelInstance): Bool[] {
    const clauses = []

    /* Avoid segment crossings */
    {
        clauses.push(...cross([...a.segments.keys()], [...b.segments.keys()]).map(([ia, ib]) => {
            return ctx.Implies(
                ctx.And(
                    a.segments[ia].active,
                    b.segments[ib].active
                ),
                channel_segments_no_cross(ctx, a, ia, b, ib)
            )
        }))
    }

    /* Specify waypoint distance to waypoints of other channels */
    {
        const min_distance = Math.ceil((a.width + b.width) / 2 + Math.max(a.spacing, b.spacing))
        clauses.push(...cross(a.waypoints, b.waypoints).map(([wa, wb]) => {
            return ctx.Or(
                min_distance_sym(ctx, wa.x, wb.x, min_distance),
                min_distance_sym(ctx, wa.y, wb.y, min_distance)
            )
        }))
    }

    /* Specify waypoint distance to segments of other channels */
    {
        const min_distance = Math.ceil((a.width + b.width) / 2 + Math.max(a.spacing, b.spacing))
        clauses.push(...cross([...a.waypoints.keys()], [...b.segments.keys()]).map(([wa, sb]) => {
            return ctx.Implies(
                b.segments[sb].active,
                waypoint_segment_distance(ctx, a, wa, b, sb, min_distance),
            )
        }))
        clauses.push(...cross([...a.segments.keys()], [...b.waypoints.keys()]).map(([sa, wb]) => {
            return ctx.Implies(
                a.segments[sa].active,
                waypoint_segment_distance(ctx, b, wb, a, sa, min_distance)
            )
        }))
    }

    return clauses
}