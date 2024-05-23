import { Context } from "z3-solver";
import { Chip } from "../chip";
import { EncodedChannelInstance, SegmentType } from "../channel";
import { pairwise_unique, pairwise_unique_indexed } from "../utils";
import { channelSegmentsNoCross, minDistanceAsym, minDistanceSym, waypointSegmentDistance } from "../geometry/geometry";

export function encodeChannelConstraints(ctx: Context, channel: EncodedChannelInstance, chip: Chip) {
    const clauses = []

    /* Specify active/inactive segments */
    {
        for (let i = 1; i < channel.segments_n; i++) {
            clauses.push(
                ctx.Implies(
                    ctx.Not(channel.segments[i - 1].active),
                    ctx.Not(channel.segments[i].active)
                )
            )
        }
    }

    /* Inactive segments copy endpoint */
    {
        for (let i = 0; i < channel.segments_n; i++) {
            clauses.push(
                ctx.Iff(
                    ctx.Not(channel.segments[i].active),
                    ctx.And(
                        ctx.Eq(channel.waypoints[i].x, channel.waypoints[i + 1].x),
                        ctx.Eq(channel.waypoints[i].y, channel.waypoints[i + 1].y)
                    )
                )
            )
        }
    }

    /* Specify waypoint coordinate behavior for segment types */
    {
        for (let i = 0; i < channel.segments_n; i++) {
            clauses.push(
                ctx.Implies(
                    channel.segments[i].active,
                    ctx.And(
                        ctx.Iff(
                            channel.segments[i].type.eq(ctx, SegmentType.Up),
                            ctx.And(
                                ctx.Eq(channel.waypoints[i].x, channel.waypoints[i + 1].x),
                                ctx.LT(channel.waypoints[i].y, channel.waypoints[i + 1].y)
                            )
                        ),
                        ctx.Iff(
                            channel.segments[i].type.eq(ctx, SegmentType.Down),
                            ctx.And(
                                ctx.Eq(channel.waypoints[i].x, channel.waypoints[i + 1].x),
                                ctx.GT(channel.waypoints[i].y, channel.waypoints[i + 1].y)
                            )
                        ),
                        ctx.Iff(
                            channel.segments[i].type.eq(ctx, SegmentType.Right),
                            ctx.And(
                                ctx.LT(channel.waypoints[i].x, channel.waypoints[i + 1].x),
                                ctx.Eq(channel.waypoints[i].y, channel.waypoints[i + 1].y)
                            )
                        ),
                        ctx.Iff(
                            channel.segments[i].type.eq(ctx, SegmentType.Left),
                            ctx.And(
                                ctx.GT(channel.waypoints[i].x, channel.waypoints[i + 1].x),
                                ctx.Eq(channel.waypoints[i].y, channel.waypoints[i + 1].y)
                            )
                        )
                    )
                )
            )
        }
    }

    /* Specify segment type alternation */
    {
        for (let i = 1; i < channel.segments_n; i++) {
            clauses.push(
                ctx.Implies(
                    channel.segments[i - 1].active,
                    ctx.And(
                        ctx.Implies(
                            channel.segments[i].type.eq(ctx, SegmentType.Up),
                            ctx.Not(
                                ctx.Or(
                                    channel.segments[i - 1].type.eq(ctx, SegmentType.Up),
                                    channel.segments[i - 1].type.eq(ctx, SegmentType.Down),
                                ),
                            )
                        ),
                        ctx.Implies(
                            channel.segments[i].type.eq(ctx, SegmentType.Down),
                            ctx.Not(
                                ctx.Or(
                                    channel.segments[i - 1].type.eq(ctx, SegmentType.Up),
                                    channel.segments[i - 1].type.eq(ctx, SegmentType.Down),
                                ),
                            )
                        ),
                        ctx.Implies(
                            channel.segments[i].type.eq(ctx, SegmentType.Left),
                            ctx.Not(
                                ctx.Or(
                                    channel.segments[i - 1].type.eq(ctx, SegmentType.Left),
                                    channel.segments[i - 1].type.eq(ctx, SegmentType.Right),
                                ),
                            )
                        ),
                        ctx.Implies(
                            channel.segments[i].type.eq(ctx, SegmentType.Right),
                            ctx.Not(
                                ctx.Or(
                                    channel.segments[i - 1].type.eq(ctx, SegmentType.Left),
                                    channel.segments[i - 1].type.eq(ctx, SegmentType.Right),
                                ),
                            )
                        ),
                    )
                )
            )
        }
    }

    /* Specify waypoint distance to boundaries */
    {
        const min_boundary_distance = Math.ceil((channel.width / 2) + channel.spacing)

        channel.waypoints.forEach(w => {
            clauses.push(
                ctx.And(
                    minDistanceAsym(ctx, chip.origin_x, w.x, min_boundary_distance),
                    minDistanceAsym(ctx, w.x, chip.origin_x + chip.width, min_boundary_distance),
                    minDistanceAsym(ctx, chip.origin_y, w.y, min_boundary_distance),
                    minDistanceAsym(ctx, w.y, chip.origin_y + chip.height, min_boundary_distance)
                )
            )
        })
    }

    /* Avoid self-crossing segments */
    {
        clauses.push(...pairwise_unique([...channel.segments.keys()]).map(([ia, ib]) => {
            return ctx.Implies(
                ctx.And(
                    channel.segments[ia].active,
                    channel.segments[ib].active
                ),
                channelSegmentsNoCross(ctx, channel, ia, channel, ib)
            )
        }))
    }

    /* Specify waypoint distance to other waypoints of this channel */
    {
        const min_waypoint_distance = Math.ceil(channel.width + channel.spacing)
        clauses.push(...pairwise_unique_indexed(channel.waypoints).map(([wa, ia, wb, ib]) => {
            const s = Math.max(ia, ib) - 1
            return ctx.Implies(
                channel.segments[s].active,
                ctx.Or(
                    minDistanceSym(ctx, wa.x, wb.x, min_waypoint_distance),
                    minDistanceSym(ctx, wa.y, wb.y, min_waypoint_distance)
                )
            )
        }))
    }

    /* Specify waypoint distance to segments of this channel */
    {
        const min_distance = Math.ceil(channel.width + channel.spacing)
        for (let i = 0; i <= channel.segments_n; i++) {
            for (let j = 0; j < channel.segments_n; j++) {
                clauses.push(
                    ctx.Implies(
                        channel.segments[j].active,
                        waypointSegmentDistance(ctx, channel, i, channel, j, min_distance)
                    )
                )
            }
        }
    }

    /* Channel length */
    {
        clauses.push(
            ctx.Eq(
                ctx.Sum(
                    ctx.Int.val(0),
                    ...[...Array(channel.segments_n).keys()].slice(1).map(i =>
                    ctx.If(
                        channel.segments[i - 1].type.eq(ctx, SegmentType.Up),
                        ctx.Sub(channel.waypoints[i].y, channel.waypoints[i - 1].y),
                        ctx.If(
                            channel.segments[i - 1].type.eq(ctx, SegmentType.Right),
                            ctx.Sub(channel.waypoints[i].x, channel.waypoints[i - 1].x),
                            ctx.If(
                                channel.segments[i - 1].type.eq(ctx, SegmentType.Down),
                                ctx.Sub(channel.waypoints[i - 1].y, channel.waypoints[i].y),
                                ctx.Sub(channel.waypoints[i - 1].x, channel.waypoints[i].x)
                            )
                        )
                    )
                )),
                channel.length
            )
        )
    }

    /* Max channel length */
    {
        if(channel.fixed_length !== undefined) {
            clauses.push(
                ctx.LE(
                    channel.length, 
                    channel.fixed_length
                )
            )
        }
    }

    return clauses
}