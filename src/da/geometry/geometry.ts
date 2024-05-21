import { Arith, Context } from "z3-solver";
import { EncodedChannelInstance, SegmentType } from "../channel";
import { StaticRoutingExclusion } from "../routingExclusion";
import { Rotation } from "../rotation";

export function minDistanceAsym(ctx: Context, c1: Arith | number, c2: Arith | number, distance: Arith | number) {
    if (typeof c1 == 'number') {
        if (typeof c2 == 'number') {
            if (typeof distance == 'number') {
                return ctx.Bool.val(c1 + distance <= c2)
            } else {
                return ctx.LE(
                    ctx.Sum(
                        distance,
                        c1
                    ),
                    c2
                )
            }
        } else {
            if (typeof distance == 'number') {
                return ctx.GE(
                    c2,
                    c1 + distance
                )
            } else {
                return ctx.LE(
                    ctx.Sum(
                        distance,
                        c1
                    ),
                    c2
                )
            }
        }
    } else {
        return ctx.LE(
            ctx.Sum(
                c1,
                distance
            ),
            c2
        )
    }
}

export function minDistanceSym(ctx: Context, c1: Arith | number, c2: Arith | number, distance: Arith | number) {
    return ctx.Or(
        minDistanceAsym(ctx, c1, c2, distance),
        minDistanceAsym(ctx, c2, c1, distance)
    )
}

export function segmentBoxDistance(ctx: Context, segment: { c1_lower: Arith, c1_higher: Arith, c2: Arith }, box: { c1: Arith | number, c2: Arith | number, c1_span: number, c2_span: number }, min_distance: number) {
    return ctx.Or(
        minDistanceAsym(ctx, segment.c1_higher, box.c1, min_distance),
        minDistanceAsym(ctx, box.c1, segment.c1_lower, min_distance + box.c1_span),
        minDistanceAsym(ctx, segment.c2, box.c2, min_distance),
        minDistanceAsym(ctx, box.c2, segment.c2, min_distance + box.c2_span)
    )
}

export function channelSegmentRoutingExclusionDistance(ctx: Context, channel: EncodedChannelInstance, segment: number, exclusion: StaticRoutingExclusion, min_distance: number) {
    return ctx.And(
        ctx.Implies(
            channel.segments[segment].type.eq(ctx, SegmentType.Up),
            segmentBoxDistance(ctx, {
                c1_lower: channel.waypoints[segment].y,
                c1_higher: channel.waypoints[segment + 1].y,
                c2: channel.waypoints[segment].x,
            }, {
                c1: exclusion.position_y,
                c2: exclusion.position_x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            }, min_distance)
        ),
        ctx.Implies(
            channel.segments[segment].type.eq(ctx, SegmentType.Down),
            segmentBoxDistance(ctx, {
                c1_lower: channel.waypoints[segment + 1].y,
                c1_higher: channel.waypoints[segment].y,
                c2: channel.waypoints[segment].x,
            }, {
                c1: exclusion.position_y,
                c2: exclusion.position_x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            }, min_distance)
        ),
        ctx.Implies(
            channel.segments[segment].type.eq(ctx, SegmentType.Right),
            segmentBoxDistance(ctx, {
                c1_lower: channel.waypoints[segment].x,
                c1_higher: channel.waypoints[segment + 1].x,
                c2: channel.waypoints[segment].y,
            }, {
                c1: exclusion.position_x,
                c2: exclusion.position_y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            }, min_distance)
        ),
        ctx.Implies(
            channel.segments[segment].type.eq(ctx, SegmentType.Left),
            segmentBoxDistance(ctx, {
                c1_lower: channel.waypoints[segment + 1].x,
                c1_higher: channel.waypoints[segment].x,
                c2: channel.waypoints[segment].y,
            }, {
                c1: exclusion.position_x,
                c2: exclusion.position_y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            }, min_distance)
        )
    )
}

export function pointBoxDistance(ctx: Context, point: { c1: Arith, c2: Arith }, box: { c1: Arith | number, c2: Arith | number, c1_span: number, c2_span: number }, min_distance: number) {
    return ctx.Or(
        minDistanceAsym(ctx, point.c1, box.c1, min_distance),
        minDistanceAsym(ctx, point.c2, box.c2, min_distance),
        minDistanceAsym(ctx, box.c1, point.c1, min_distance + box.c1_span),
        minDistanceAsym(ctx, box.c2, point.c2, min_distance + box.c2_span)
    )
}

export function waypointRoutingExclusionDistance(ctx: Context, channel: EncodedChannelInstance, waypoint: number, exclusion: StaticRoutingExclusion, min_distance: number) {
    return pointBoxDistance(ctx, {
        c1: channel.waypoints[waypoint].x,
        c2: channel.waypoints[waypoint].y
    }, {
        c1: exclusion.position_x,
        c2: exclusion.position_y,
        c1_span: exclusion.width,
        c2_span: exclusion.height
    }, min_distance)
}

export function pointSegmentDistance(ctx: Context, point: { c1: Arith, c2: Arith }, segment: { c1_lower: Arith, c1_higher: Arith, c2: Arith }, min_distance: number) {
    return ctx.Or(
        minDistanceAsym(ctx, point.c1, segment.c1_lower, 0),
        minDistanceAsym(ctx, segment.c1_higher, point.c1, 0),
        minDistanceSym(ctx, point.c2, segment.c2, min_distance)
    )
}

export function waypointSegmentDistance(ctx: Context, channel_a: EncodedChannelInstance, waypoint_a: number, channel_b: EncodedChannelInstance, segment_b: number, min_distance: number) {
    return ctx.And(
        ctx.Implies(
            channel_b.segments[segment_b].type.eq(ctx, SegmentType.Up),
            pointSegmentDistance(ctx, {
                c1: channel_a.waypoints[waypoint_a].y,
                c2: channel_a.waypoints[waypoint_a].x,
            }, {
                c1_lower: channel_b.waypoints[segment_b].y,
                c1_higher: channel_b.waypoints[segment_b + 1].y,
                c2: channel_b.waypoints[segment_b].x
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.segments[segment_b].type.eq(ctx, SegmentType.Down),
            pointSegmentDistance(ctx, {
                c1: channel_a.waypoints[waypoint_a].y,
                c2: channel_a.waypoints[waypoint_a].x,
            }, {
                c1_lower: channel_b.waypoints[segment_b + 1].y,
                c1_higher: channel_b.waypoints[segment_b].y,
                c2: channel_b.waypoints[segment_b].x
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.segments[segment_b].type.eq(ctx, SegmentType.Right),
            pointSegmentDistance(ctx, {
                c1: channel_a.waypoints[waypoint_a].x,
                c2: channel_a.waypoints[waypoint_a].y,
            }, {
                c1_lower: channel_b.waypoints[segment_b].x,
                c1_higher: channel_b.waypoints[segment_b + 1].x,
                c2: channel_b.waypoints[segment_b].y
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.segments[segment_b].type.eq(ctx, SegmentType.Left),
            pointSegmentDistance(ctx, {
                c1: channel_a.waypoints[waypoint_a].x,
                c2: channel_a.waypoints[waypoint_a].y,
            }, {
                c1_lower: channel_b.waypoints[segment_b + 1].x,
                c1_higher: channel_b.waypoints[segment_b].x,
                c2: channel_b.waypoints[segment_b].y
            }, min_distance)
        )
    )
}

export function segmentBoxNoCross(ctx: Context, segment: { c1_lower: Arith, c1_higher: Arith, c2: Arith }, box: { c1: Arith | number, c2: Arith | number, c1_span: number, c2_span: number }) {
    return ctx.Or(
        ctx.LE(segment.c1_higher, box.c1),
        minDistanceAsym(ctx, box.c1, segment.c1_lower, box.c1_span),
        ctx.LE(segment.c2, box.c2),
        minDistanceAsym(ctx, box.c2, segment.c2, box.c2_span),
    )
}

export function channelSegmentRoutingExclusionNoCross(ctx: Context, channel: EncodedChannelInstance, segment: number, exclusion: StaticRoutingExclusion) {
    return ctx.And(
        ctx.Implies(
            channel.segments[segment].type.eq(ctx, SegmentType.Up),
            segmentBoxNoCross(ctx, {
                c1_lower: channel.waypoints[segment].y,
                c1_higher: channel.waypoints[segment + 1].y,
                c2: channel.waypoints[segment].x
            }, {
                c1: exclusion.position_y,
                c2: exclusion.position_x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            })
        ),
        ctx.Implies(
            channel.segments[segment].type.eq(ctx, SegmentType.Down),
            segmentBoxNoCross(ctx, {
                c1_lower: channel.waypoints[segment + 1].y,
                c1_higher: channel.waypoints[segment].y,
                c2: channel.waypoints[segment].x
            }, {
                c1: exclusion.position_y,
                c2: exclusion.position_x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            })
        ),
        ctx.Implies(
            channel.segments[segment].type.eq(ctx, SegmentType.Right),
            segmentBoxNoCross(ctx, {
                c1_lower: channel.waypoints[segment].x,
                c1_higher: channel.waypoints[segment + 1].x,
                c2: channel.waypoints[segment].y
            }, {
                c1: exclusion.position_x,
                c2: exclusion.position_y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
        ctx.Implies(
            channel.segments[segment].type.eq(ctx, SegmentType.Left),
            segmentBoxNoCross(ctx, {
                c1_lower: channel.waypoints[segment + 1].x,
                c1_higher: channel.waypoints[segment].x,
                c2: channel.waypoints[segment].y
            }, {
                c1: exclusion.position_x,
                c2: exclusion.position_y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
    )
}

export function segmentSegmentNoCross(ctx: Context, segment_a: { c1_lower: Arith, c1_higher: Arith, c2: Arith }, segment_b: { c1: Arith, c2_lower: Arith, c2_higher: Arith }) {
    return ctx.Or(
        ctx.LE(segment_a.c1_higher, segment_b.c1),
        ctx.GE(segment_a.c1_lower, segment_b.c1),
        ctx.LE(segment_b.c2_higher, segment_a.c2),
        ctx.GE(segment_b.c2_lower, segment_a.c2),
    )
}


export function channelSegmentsNoCross(ctx: Context, channel_a: EncodedChannelInstance, segment_a: number, channel_b: EncodedChannelInstance, segment_b: number) {
    return ctx.And(
        ctx.Implies(
            ctx.And(
                channel_a.segments[segment_a].type.eq(ctx, SegmentType.Up),
                channel_b.segments[segment_b].type.eq(ctx, SegmentType.Right)
            ),
            segmentSegmentNoCross(ctx, {
                c1_lower: channel_a.waypoints[segment_a].y,
                c1_higher: channel_a.waypoints[segment_a + 1].y,
                c2: channel_a.waypoints[segment_a].x
            }, {
                c1: channel_b.waypoints[segment_b].y,
                c2_lower: channel_b.waypoints[segment_b].x,
                c2_higher: channel_b.waypoints[segment_b + 1].x,
            })
        ),
        ctx.Implies(
            ctx.And(
                channel_a.segments[segment_a].type.eq(ctx, SegmentType.Up),
                channel_b.segments[segment_b].type.eq(ctx, SegmentType.Left)
            ),
            segmentSegmentNoCross(ctx, {
                c1_lower: channel_a.waypoints[segment_a].y,
                c1_higher: channel_a.waypoints[segment_a + 1].y,
                c2: channel_a.waypoints[segment_a].x
            }, {
                c1: channel_b.waypoints[segment_b].y,
                c2_lower: channel_b.waypoints[segment_b + 1].x,
                c2_higher: channel_b.waypoints[segment_b].x,
            })
        ),
        ctx.Implies(
            ctx.And(
                channel_a.segments[segment_a].type.eq(ctx, SegmentType.Down),
                channel_b.segments[segment_b].type.eq(ctx, SegmentType.Right)
            ),
            segmentSegmentNoCross(ctx, {
                c1_lower: channel_a.waypoints[segment_a + 1].y,
                c1_higher: channel_a.waypoints[segment_a].y,
                c2: channel_a.waypoints[segment_a].x
            }, {
                c1: channel_b.waypoints[segment_b].y,
                c2_lower: channel_b.waypoints[segment_b].x,
                c2_higher: channel_b.waypoints[segment_b + 1].x,
            })
        ),
        ctx.Implies(
            ctx.And(
                channel_a.segments[segment_a].type.eq(ctx, SegmentType.Down),
                channel_b.segments[segment_b].type.eq(ctx, SegmentType.Left)
            ),
            segmentSegmentNoCross(ctx, {
                c1_lower: channel_a.waypoints[segment_a + 1].y,
                c1_higher: channel_a.waypoints[segment_a].y,
                c2: channel_a.waypoints[segment_a].x
            }, {
                c1: channel_b.waypoints[segment_b].y,
                c2_lower: channel_b.waypoints[segment_b + 1].x,
                c2_higher: channel_b.waypoints[segment_b].x,
            })
        ),
        ctx.Implies(
            ctx.And(
                channel_a.segments[segment_a].type.eq(ctx, SegmentType.Right),
                channel_b.segments[segment_b].type.eq(ctx, SegmentType.Up)
            ),
            segmentSegmentNoCross(ctx, {
                c1_lower: channel_a.waypoints[segment_a].x,
                c1_higher: channel_a.waypoints[segment_a + 1].x,
                c2: channel_a.waypoints[segment_a].y
            }, {
                c1: channel_b.waypoints[segment_b].x,
                c2_lower: channel_b.waypoints[segment_b].y,
                c2_higher: channel_b.waypoints[segment_b + 1].y,
            })
        ),
        ctx.Implies(
            ctx.And(
                channel_a.segments[segment_a].type.eq(ctx, SegmentType.Right),
                channel_b.segments[segment_b].type.eq(ctx, SegmentType.Down)
            ),
            segmentSegmentNoCross(ctx, {
                c1_lower: channel_a.waypoints[segment_a].x,
                c1_higher: channel_a.waypoints[segment_a + 1].x,
                c2: channel_a.waypoints[segment_a].y
            }, {
                c1: channel_b.waypoints[segment_b].x,
                c2_lower: channel_b.waypoints[segment_b + 1].y,
                c2_higher: channel_b.waypoints[segment_b].y,
            })
        ),
        ctx.Implies(
            ctx.And(
                channel_a.segments[segment_a].type.eq(ctx, SegmentType.Left),
                channel_b.segments[segment_b].type.eq(ctx, SegmentType.Up)
            ),
            segmentSegmentNoCross(ctx, {
                c1_lower: channel_a.waypoints[segment_a + 1].x,
                c1_higher: channel_a.waypoints[segment_a].x,
                c2: channel_a.waypoints[segment_a].y
            }, {
                c1: channel_b.waypoints[segment_b].x,
                c2_lower: channel_b.waypoints[segment_b].y,
                c2_higher: channel_b.waypoints[segment_b + 1].y,
            })
        ),
        ctx.Implies(
            ctx.And(
                channel_a.segments[segment_a].type.eq(ctx, SegmentType.Left),
                channel_b.segments[segment_b].type.eq(ctx, SegmentType.Down)
            ),
            segmentSegmentNoCross(ctx, {
                c1_lower: channel_a.waypoints[segment_a + 1].x,
                c1_higher: channel_a.waypoints[segment_a].x,
                c2: channel_a.waypoints[segment_a].y
            }, {
                c1: channel_b.waypoints[segment_b].x,
                c2_lower: channel_b.waypoints[segment_b + 1].y,
                c2_higher: channel_b.waypoints[segment_b].y,
            })
        )
    )
}

function negate(ctx: Context, value: Arith | number) {
    return typeof value == 'number' ? -value : ctx.Neg(value)
}

function rotateOffset(ctx: Context, offset: { x: Arith | number, y: Arith | number }, target_rotation: Rotation) {
    switch (target_rotation) {
        case Rotation.Up:
            return offset
        case Rotation.Right:
            return {
                x: offset.y,
                y: negate(ctx, offset.x)
            }
        case Rotation.Down:
            return {
                x: negate(ctx, offset.x),
                y: negate(ctx, offset.y)
            }
        case Rotation.Left:
            return {
                x: negate(ctx, offset.y),
                y: offset.x
            }
    }
}