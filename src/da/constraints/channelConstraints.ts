import {Context} from "z3-solver";
import {Chip} from "../components/chip";
import {EncodedChannel, SegmentType} from "../components/channel";
import {pairwiseUnique, pairwiseUniqueIndexed} from "../utils";
import {
    channelSegmentsNoCross,
    minDistanceAsym, minDistanceSym, waypointSegmentDistance,
} from "../geometry/geometry";
import {Constraint, UniqueConstraint} from "../processing/constraint";


export function encodeChannelConstraints(ctx: Context, channel: EncodedChannel, chip: Chip, softCorners?: boolean): Constraint[] {
    const clauses: Constraint[] = []
    if (softCorners === undefined) {
        softCorners = false
    }


    /* Specify active/inactive segments */
    let label = "channel-constraints-active-inactive-segments-id-"
    {
        for (let i = 1; i < channel.maxSegments; i++) {
            clauses.push(
                {
                    expr: ctx.Implies(
                        ctx.Not(channel.encoding.segments[i - 1].active),
                        ctx.Not(channel.encoding.segments[i].active)
                    ),
                    label: label + channel.id + UniqueConstraint.generateRandomString(5)
                }
            )
        }
    }

    /* Inactive segments copy endpoint */
    label = "channel-constraints-inactive-segments-endpoint-copy-id-"
    {
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                {
                    expr: ctx.Iff(
                        ctx.Not(channel.encoding.segments[i].active),
                        ctx.And(
                            ctx.Eq(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i + 1].x),
                            ctx.Eq(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i + 1].y)
                        )
                    ),
                    label: label + channel.id + UniqueConstraint.generateRandomString(5)
                }
            )
        }
    }

    /* Specify waypoint coordinate behavior for segment types */
    label = "channel-constraints-waypoint-behavior-id-"
    {
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                {
                    expr:
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
                                ),
                                ctx.Iff(
                                    channel.encoding.segments[i].type.eq(ctx, SegmentType.UpRight),
                                    ctx.And(
                                        ctx.LT(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i + 1].x),
                                        ctx.LT(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i + 1].y),
                                        ctx.Eq(
                                            ctx.Sub(channel.encoding.waypoints[i + 1].x, channel.encoding.waypoints[i].x),
                                            ctx.Sub(channel.encoding.waypoints[i + 1].y, channel.encoding.waypoints[i].y)
                                        )
                                    )
                                ),
                                ctx.Iff(
                                    channel.encoding.segments[i].type.eq(ctx, SegmentType.DownRight),
                                    ctx.And(
                                        ctx.LT(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i + 1].x),
                                        ctx.GT(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i + 1].y),
                                        ctx.Eq(
                                            ctx.Sub(channel.encoding.waypoints[i + 1].x, channel.encoding.waypoints[i].x),
                                            ctx.Sub(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i + 1].y)
                                        )
                                    )
                                ),
                                ctx.Iff(
                                    channel.encoding.segments[i].type.eq(ctx, SegmentType.UpLeft),
                                    ctx.And(
                                        ctx.GT(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i + 1].x),
                                        ctx.LT(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i + 1].y),
                                        ctx.Eq(
                                            ctx.Sub(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i + 1].x),
                                            ctx.Sub(channel.encoding.waypoints[i + 1].y, channel.encoding.waypoints[i].y)
                                        )
                                    )
                                ),
                                ctx.Iff(
                                    channel.encoding.segments[i].type.eq(ctx, SegmentType.DownLeft),
                                    ctx.And(
                                        ctx.GT(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i + 1].x),
                                        ctx.GT(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i + 1].y),
                                        ctx.Eq(
                                            ctx.Sub(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i + 1].x),
                                            ctx.Sub(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i + 1].y)
                                        )
                                    )
                                )
                            )
                        ),
                    label: label + channel.id + UniqueConstraint.generateRandomString(5)
                }
            )
        }
    }

    /* Specify segment type alternation with octilinear routing, avoiding sharp turns smaller than 90 degrees */
    label = "channel-constraints-octilinear-segment-alternation-id-"
    {
        for (let i = 1; i < channel.maxSegments; i++) {
            clauses.push(
                {
                    expr: ctx.Implies(
                        channel.encoding.segments[i - 1].active,
                        ctx.And(
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.Up),
                                ctx.Not(
                                    ctx.Or(
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Up),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Down),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownRight),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownLeft)
                                    ),
                                )
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.Down),
                                ctx.Not(
                                    ctx.Or(
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Up),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Down),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpRight),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpLeft)
                                    ),
                                )
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.Left),
                                ctx.Not(
                                    ctx.Or(
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Left),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Right),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownRight),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpRight)
                                    ),
                                )
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.Right),
                                ctx.Not(
                                    ctx.Or(
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Left),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Right),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownLeft),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpLeft)
                                    ),
                                )
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.UpRight),
                                ctx.Not(
                                    ctx.Or(
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpRight),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownLeft),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Left),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Down)
                                    ),
                                )
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.DownRight),
                                ctx.Not(
                                    ctx.Or(
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownRight),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpLeft),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Up),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Left)
                                    ),
                                )
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.UpLeft),
                                ctx.Not(
                                    ctx.Or(
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpLeft),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownRight),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Right),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Down)
                                    ),
                                )
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.DownLeft),
                                ctx.Not(
                                    ctx.Or(
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownLeft),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpRight),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Right),
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Up)
                                    ),
                                )
                            )
                        )
                    ),
                    label: label + channel.id + UniqueConstraint.generateRandomString(5)
                }
            )
        }
        label = "channel-constraints-octilinear-soft-corners-segment-alternation-id-"
        if (softCorners) {
            for (let i = 1; i < channel.maxSegments; i++) {
                clauses.push(
                    {
                        expr: ctx.Implies(
                            channel.encoding.segments[i - 1].active,
                            ctx.And(
                                ctx.Implies(
                                    channel.encoding.segments[i].type.eq(ctx, SegmentType.Up),
                                    ctx.Not(
                                        ctx.Or(
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Left),
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Right)
                                        )
                                    )
                                ),
                                ctx.Implies(
                                    channel.encoding.segments[i].type.eq(ctx, SegmentType.Down),
                                    ctx.Not(
                                        ctx.Or(
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Left),
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Right)
                                        )
                                    )
                                ),
                                ctx.Implies(
                                    channel.encoding.segments[i].type.eq(ctx, SegmentType.Left),
                                    ctx.Not(
                                        ctx.Or(
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Up),
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Down)
                                        )
                                    )
                                ),
                                ctx.Implies(
                                    channel.encoding.segments[i].type.eq(ctx, SegmentType.Right),
                                    ctx.Not(
                                        ctx.Or(
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Up),
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Down)
                                        )
                                    )
                                ),
                                ctx.Implies(
                                    channel.encoding.segments[i].type.eq(ctx, SegmentType.UpRight),
                                    ctx.Not(
                                        ctx.Or(
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpLeft),
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownRight)
                                        )
                                    )
                                ),
                                ctx.Implies(
                                    channel.encoding.segments[i].type.eq(ctx, SegmentType.DownRight),
                                    ctx.Not(
                                        ctx.Or(
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownLeft),
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpRight)
                                        )
                                    )
                                ),
                                ctx.Implies(
                                    channel.encoding.segments[i].type.eq(ctx, SegmentType.UpLeft),
                                    ctx.Not(
                                        ctx.Or(
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownLeft),
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpRight)
                                        )
                                    )
                                ),
                                ctx.Implies(
                                    channel.encoding.segments[i].type.eq(ctx, SegmentType.DownLeft),
                                    ctx.Not(
                                        ctx.Or(
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpLeft),
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownRight)
                                        )
                                    )
                                )
                            )
                        ),
                        label: label + channel.id + UniqueConstraint.generateRandomString(5)
                    }
                )
            }
        }
    }

    /* Specify waypoint distance to boundaries */
    label = "channel-constraints-waypoint-boundary-distance-id-"
    {
        const min_boundary_distance = Math.ceil((channel.width / 2) + channel.spacing)
        channel.encoding.waypoints.forEach(w => {
            clauses.push(
                {
                    expr: ctx.And(
                        minDistanceAsym(ctx, chip.originX, w.x, min_boundary_distance),
                        minDistanceAsym(ctx, w.x, chip.originX + chip.width, min_boundary_distance),
                        minDistanceAsym(ctx, chip.originY, w.y, min_boundary_distance),
                        minDistanceAsym(ctx, w.y, chip.originY + chip.height, min_boundary_distance)
                    ),
                    label: label + channel.id + UniqueConstraint.generateRandomString(5)
                }
            )
        })
    }

    /* Avoid self-crossing segments */
    label = "channel-constraints-self-crossing-id-"
    {
        clauses.push(
            {
                expr:
                    ctx.And(
                        ...pairwiseUnique([...channel.encoding.segments.keys()]).map(([ia, ib]) => {
                            return ctx.Implies(
                                ctx.And(
                                    channel.encoding.segments[ia].active,
                                    channel.encoding.segments[ib].active
                                ),
                                channelSegmentsNoCross(ctx, channel, ia, channel, ib)
                            )
                        })
                    ),
                label: label + channel.id + UniqueConstraint.generateRandomString(5)
            }
        )
    }

    /* Specify waypoint distance to other waypoints of this channel */
    label = "channel-constraints-waypoint-waypoint-distance-id-"
    {
        const min_waypoint_distance = Math.ceil(channel.width + channel.spacing)
        clauses.push(
            {
                expr: ctx.And(
                    ...pairwiseUniqueIndexed(channel.encoding.waypoints).map(([wa, ia, wb, ib]) => {
                        const s = Math.max(ia, ib) - 1
                        return ctx.Implies(
                            channel.encoding.segments[s].active,
                            ctx.Or(
                                minDistanceSym(ctx, wa.x, wb.x, min_waypoint_distance),
                                minDistanceSym(ctx, wa.y, wb.y, min_waypoint_distance)
                            )
                        )
                    })
                ),
                label: label + channel.id + UniqueConstraint.generateRandomString(5)
            }
        )
    }

    /* Specify waypoint distance to segments of this channel */
    label = "channel-constraints-waypoint-segments-distance-id-"
    {
        const min_distance = Math.ceil(channel.width + channel.spacing)
        for (let i = 0; i <= channel.maxSegments; i++) {
            for (let j = 0; j < channel.maxSegments; j++) {
                clauses.push(
                    {
                        expr: ctx.Implies(
                            channel.encoding.segments[j].active,
                            waypointSegmentDistance(ctx, channel, i, channel, j, min_distance)
                        ),
                        label: label + channel.id + UniqueConstraint.generateRandomString(5)
                    }
                )
            }
        }
    }

    /* Channel length */
    label = "channel-constraints-channel-length-id-"
    {
        clauses.push(
            {
                expr: ctx.Eq(
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
                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Left),
                                        ctx.Sub(channel.encoding.waypoints[i - 1].x, channel.encoding.waypoints[i].x),
                                        ctx.If(
                                            channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.Down),
                                            ctx.Sub(channel.encoding.waypoints[i - 1].y, channel.encoding.waypoints[i].y),
                                            ctx.If(
                                                // Manhattan distance for diagonal segments (only the positive differences -> delta_x and delta_y is the same in absolute terms)
                                                channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpRight),
                                                ctx.Sum(ctx.Sub(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i - 1].x), ctx.Sub(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i - 1].y)),
                                                ctx.If(
                                                    channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.UpLeft),
                                                    ctx.Sum(ctx.Sub(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i - 1].y), ctx.Sub(channel.encoding.waypoints[i].y, channel.encoding.waypoints[i - 1].y)),
                                                    ctx.If(
                                                        channel.encoding.segments[i - 1].type.eq(ctx, SegmentType.DownRight),
                                                        ctx.Sum(ctx.Sub(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i - 1].x), ctx.Sub(channel.encoding.waypoints[i].x, channel.encoding.waypoints[i - 1].x)),
                                                        ctx.Sum(ctx.Sub(channel.encoding.waypoints[i - 1].y, channel.encoding.waypoints[i].y), ctx.Sub(channel.encoding.waypoints[i - 1].y, channel.encoding.waypoints[i].y))
                                                    ))
                                            )
                                        )
                                    )
                                )
                            )
                        )),
                    channel.encoding.length
                ),
                label: label + channel.id + UniqueConstraint.generateRandomString(5)
            }
        )
    }

    /* Max channel length */
    label = "channel-constraints-max-channel-length-id-"
    {
        if (channel.maxLength !== undefined) {
            clauses.push(
                {
                    expr: ctx.LE(
                        channel.encoding.length,
                        channel.maxLength
                    ),
                    label: label + channel.id + UniqueConstraint.generateRandomString(5)
                }
            )
        }
    }

    /* Exact channel length */
    label = "channel-constraints-exact-channel-length-id-"
    {
        if (channel.exactLength !== undefined) {
            clauses.push(
                {
                    expr: ctx.Eq(
                        channel.encoding.length,
                        channel.exactLength
                    ),
                    label: label + channel.id + UniqueConstraint.generateRandomString(5)
                }
            )
        }
    }

    return clauses
}

