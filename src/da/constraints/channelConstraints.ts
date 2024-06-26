import { Context } from "z3-solver";
import { Chip } from "../chip";
import { EncodedChannel, SegmentType } from "../channel";
import { pairwiseUnique, pairwiseUniqueIndexed } from "../utils";
import { channelSegmentsNoCross, minDistanceAsym, minDistanceSym, waypointSegmentDistance } from "../geometry/geometry";

export function encodeChannelConstraints(ctx: Context, channel: EncodedChannel, chip: Chip) {
    const clauses = []

    /* Specify active/inactive segments */
    {
        for (let i = 1; i < channel.maxSegments; i++) {
            clauses.push(
                ctx.Implies(
                    ctx.Not(channel.encoding.segments[i - 1].active),
                    ctx.Not(channel.encoding.segments[i].active)
                )
            )
        }
    }

    /* Inactive segments copy endpoint */
    {
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                ctx.Iff(
                    ctx.Not(channel.encoding.segments[i].active),
                    ctx.And(
                        ctx.Eq(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i + 1].x),
                        ctx.Eq(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i + 1].y)
                    )
                )
            )
        }
    }

    /* Specify waypoint coordinate behavior for segment types */
    {
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                ctx.Implies(
                    channel.encoding.segments[i].active,
                    ctx.And(
                        ctx.Iff(
                            channel.encoding.segments[i].type.eq(ctx, SegmentType.Up),
                            ctx.And(
                                ctx.Eq(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i + 1].x),
                                ctx.LT(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i + 1].y)
                            )
                        ),
                        ctx.Iff(
                            channel.encoding.segments[i].type.eq(ctx, SegmentType.Down),
                            ctx.And(
                                ctx.Eq(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i + 1].x),
                                ctx.GT(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i + 1].y)
                            )
                        ),
                        ctx.Iff(
                            channel.encoding.segments[i].type.eq(ctx, SegmentType.Right),
                            ctx.And(
                                ctx.LT(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i + 1].x),
                                ctx.Eq(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i + 1].y)
                            )
                        ),
                        ctx.Iff(
                            channel.encoding.segments[i].type.eq(ctx, SegmentType.Left),
                            ctx.And(
                                ctx.GT(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i + 1].x),
                                ctx.Eq(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i + 1].y)
                            )
                        )
                    )
                )
            )
        }
    }

    /* Specify segment type alternation */
    {
        for (let i = 1; i < channel.maxSegments; i++) {
            clauses.push(
                ctx.Implies(
                    channel.encoding.segments[i - 1].active,
                    ctx.And(
                        ctx.Implies(
                            channel.encoding.segments[i].type.eq(ctx, SegmentType.Up),
                            ctx.Not(
                                ctx.Or(
                                    channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Up),
                                    channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Down),
                                ),
                            )
                        ),
                        ctx.Implies(
                            channel.encoding.segments[i].type.eq(ctx, SegmentType.Down),
                            ctx.Not(
                                ctx.Or(
                                    channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Up),
                                    channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Down),
                                ),
                            )
                        ),
                        ctx.Implies(
                            channel.encoding.segments[i].type.eq(ctx, SegmentType.Left),
                            ctx.Not(
                                ctx.Or(
                                    channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Left),
                                    channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Right),
                                ),
                            )
                        ),
                        ctx.Implies(
                            channel.encoding.segments[i].type.eq(ctx, SegmentType.Right),
                            ctx.Not(
                                ctx.Or(
                                    channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Left),
                                    channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Right),
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

        channel.encoding.waypoints.forEach(w => {
            clauses.push(
                ctx.And(
                    minDistanceAsym(ctx, chip.originX, w.x, min_boundary_distance),
                    minDistanceAsym(ctx, w.x, chip.originX + chip.width, min_boundary_distance),
                    minDistanceAsym(ctx, chip.originY, w.y, min_boundary_distance),
                    minDistanceAsym(ctx, w.y, chip.originY + chip.height, min_boundary_distance)
                )
            )
        })
    }

    /* Avoid self-crossing segments */
    {
        clauses.push(...pairwiseUnique([...channel.encoding.segments.keys()]).map(([ia, ib]) => {
            return ctx.Implies(
                ctx.And(
                    channel.encoding.segments[ia].active,
                    channel.encoding.segments[ib].active
                ),
                channelSegmentsNoCross(ctx, channel, ia, channel, ib)
            )
        }))
    }

    /* Specify waypoint distance to other waypoints of this channel */
    {
        const min_waypoint_distance = Math.ceil(channel.width + channel.spacing)
        clauses.push(...pairwiseUniqueIndexed(channel.encoding.waypoints).map(([wa, ia, wb, ib]) => {
            const s = Math.max(ia, ib) - 1
            return ctx.Implies(
                channel.encoding.segments[s].active,
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
        for (let i = 0; i <= channel.maxSegments; i++) {
            for (let j = 0; j < channel.maxSegments; j++) {
                clauses.push(
                    ctx.Implies(
                        channel.encoding.segments[j].active,
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
                    ...[...Array(channel.maxSegments).keys()].slice(1).map(i =>
                    ctx.If(
                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Up),
                        ctx.Sub(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i - 1].y),
                        ctx.If(
                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Right),
                            ctx.Sub(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i - 1].x),
                            ctx.If(
                                channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Down),
                                ctx.Sub(channel.encoding.waypoints[i - 1].y, channel.encoding.waypoints[i].y),
                                ctx.Sub(channel.encoding.waypoints[i - 1].x, channel.encoding.waypoints[i].x)
                            )
                        )
                    )
                )),
                channel.encoding.length
            )
        )
    }

    /* Max channel length */
    {
        if(channel.maxLength !== undefined) {
            clauses.push(
                ctx.LE(
                    channel.encoding.length, 
                    channel.maxLength
                )
            )
        }
    }

    /* Exact channel length */
    {
        if(channel.exactLength !== undefined) {
            clauses.push(
                ctx.Eq(
                    channel.encoding.length, 
                    channel.exactLength
                )
            )
        }
    }

    return clauses
}