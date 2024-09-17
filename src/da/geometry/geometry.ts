import {Arith, Context} from "z3-solver";
import {StaticRoutingExclusion} from "../routingExclusion";
import {Orientation} from "../orientation";
import {EncodedChannel, SegmentType} from "../channel";


const diagonalDirections: SegmentType[] = [
    SegmentType.UpRight,
    SegmentType.UpLeft,
    SegmentType.DownRight,
    SegmentType.DownLeft
];

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

export function segmentBoxDistance(ctx: Context, segment: { c1_lower: Arith, c1_higher: Arith, c2: Arith }, box: {
    c1: Arith | number,
    c2: Arith | number,
    c1_span: number,
    c2_span: number
}, min_distance: number) {
    return ctx.Or(
        minDistanceAsym(ctx, segment.c1_higher, box.c1, min_distance),
        minDistanceAsym(ctx, box.c1, segment.c1_lower, min_distance + box.c1_span),
        minDistanceAsym(ctx, segment.c2, box.c2, min_distance),
        minDistanceAsym(ctx, box.c2, segment.c2, min_distance + box.c2_span)
    )
}

export function segmentBoxDistanceDiagonal(ctx: Context, segment: {
    c1_lower: Arith,
    c1_higher: Arith,
    c2_lower: Arith,
    c2_higher: Arith
}, box: { c1: Arith | number, c2: Arith | number, c1_span: number, c2_span: number }, min_distance: number) {
    // TODO: distance calculation on diagonals
    return ctx.Or()
}

export function channelSegmentRoutingExclusionDistance(ctx: Context, channel: EncodedChannel, segment: number, exclusion: StaticRoutingExclusion, min_distance: number) {
    return ctx.And(
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.Up),
            segmentBoxDistance(ctx, {
                c1_lower: channel.encoding.waypoints[segment].y,
                c1_higher: channel.encoding.waypoints[segment + 1].y,
                c2: channel.encoding.waypoints[segment].x,
            }, {
                c1: exclusion.position.y,
                c2: exclusion.position.x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            }, min_distance)
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.Down),
            segmentBoxDistance(ctx, {
                c1_lower: channel.encoding.waypoints[segment + 1].y,
                c1_higher: channel.encoding.waypoints[segment].y,
                c2: channel.encoding.waypoints[segment].x,
            }, {
                c1: exclusion.position.y,
                c2: exclusion.position.x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            }, min_distance)
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.Right),
            segmentBoxDistance(ctx, {
                c1_lower: channel.encoding.waypoints[segment].x,
                c1_higher: channel.encoding.waypoints[segment + 1].x,
                c2: channel.encoding.waypoints[segment].y,
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            }, min_distance)
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.Left),
            segmentBoxDistance(ctx, {
                c1_lower: channel.encoding.waypoints[segment + 1].x,
                c1_higher: channel.encoding.waypoints[segment].x,
                c2: channel.encoding.waypoints[segment].y,
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            }, min_distance)
        ),

        // Exclusion Zone distance to diagonal channels must be considered with a different distance function, since two coordinates
        // with four values are necessary
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpRight),
            segmentBoxDistanceDiagonal(ctx, {
                c1_lower: channel.encoding.waypoints[segment].x,
                c1_higher: channel.encoding.waypoints[segment + 1].x,
                c2_lower: channel.encoding.waypoints[segment].y,
                c2_higher: channel.encoding.waypoints[segment + 1].y,
            }, {
                c1: exclusion.position.y,
                c2: exclusion.position.x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            }, min_distance)
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownRight),
            segmentBoxDistanceDiagonal(ctx, {
                c1_lower: channel.encoding.waypoints[segment].x,
                c1_higher: channel.encoding.waypoints[segment + 1].x,
                c2_lower: channel.encoding.waypoints[segment + 1].y,
                c2_higher: channel.encoding.waypoints[segment].y,
            }, {
                c1: exclusion.position.y,
                c2: exclusion.position.x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            }, min_distance)
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpLeft),
            segmentBoxDistanceDiagonal(ctx, {
                c1_lower: channel.encoding.waypoints[segment + 1].x,
                c1_higher: channel.encoding.waypoints[segment].x,
                c2_lower: channel.encoding.waypoints[segment].y,
                c2_higher: channel.encoding.waypoints[segment + 1].y,
            }, {
                c1: exclusion.position.y,
                c2: exclusion.position.x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            }, min_distance)
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownLeft),
            segmentBoxDistanceDiagonal(ctx, {
                c1_lower: channel.encoding.waypoints[segment + 1].x,
                c1_higher: channel.encoding.waypoints[segment].x,
                c2_lower: channel.encoding.waypoints[segment + 1].y,
                c2_higher: channel.encoding.waypoints[segment].y,
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            }, min_distance)
        )
    )
}

// TODO: all distance calculations for diagonals
export function pointBoxDistance(ctx: Context, point: { c1: Arith, c2: Arith }, box: {
    c1: Arith | number,
    c2: Arith | number,
    c1_span: number,
    c2_span: number
}, min_distance: number) {
    return ctx.Or(
        minDistanceAsym(ctx, point.c1, box.c1, min_distance),
        minDistanceAsym(ctx, point.c2, box.c2, min_distance),
        minDistanceAsym(ctx, box.c1, point.c1, min_distance + box.c1_span),
        minDistanceAsym(ctx, box.c2, point.c2, min_distance + box.c2_span)
    )
}

export function waypointRoutingExclusionDistance(ctx: Context, channel: EncodedChannel, waypoint: number, exclusion: StaticRoutingExclusion, min_distance: number) {
    return pointBoxDistance(ctx, {
        c1: channel.encoding.waypoints[waypoint].x,
        c2: channel.encoding.waypoints[waypoint].y
    }, {
        c1: exclusion.position.x,
        c2: exclusion.position.y,
        c1_span: exclusion.width,
        c2_span: exclusion.height
    }, min_distance)
}

export function pointSegmentDistance(ctx: Context, point: { c1: Arith, c2: Arith }, segment: {
    c1_lower: Arith,
    c1_higher: Arith,
    c2: Arith
}, min_distance: number) {
    return ctx.Or(
        minDistanceAsym(ctx, point.c1, segment.c1_lower, 0),
        minDistanceAsym(ctx, segment.c1_higher, point.c1, 0),
        minDistanceSym(ctx, point.c2, segment.c2, min_distance)
    )
}


export function waypointSegmentDistance(ctx: Context, channel_a: EncodedChannel, waypoint_a: number, channel_b: EncodedChannel, segment_b: number, min_distance: number) {

    let channelSegmentB = channel_b.encoding.segments[segment_b]
    let waypointsA = channel_a.encoding.waypoints
    let waypointsB = channel_b.encoding.waypoints

    return ctx.And(
        ctx.Implies(
            channelSegmentB.type.eq(ctx, SegmentType.Up),
            pointSegmentDistance(ctx, {
                c1: waypointsA[waypoint_a].y,
                c2: waypointsA[waypoint_a].x,
            }, {
                c1_lower: waypointsB[segment_b].y,
                c1_higher: waypointsB[segment_b + 1].y,
                c2: waypointsB[segment_b].x
            }, min_distance)
        ),
        ctx.Implies(
            channelSegmentB.type.eq(ctx, SegmentType.Down),
            pointSegmentDistance(ctx, {
                c1: waypointsA[waypoint_a].y,
                c2: waypointsA[waypoint_a].x,
            }, {
                c1_lower: waypointsB[segment_b + 1].y,
                c1_higher: waypointsB[segment_b].y,
                c2: waypointsB[segment_b].x
            }, min_distance)
        ),
        ctx.Implies(
            channelSegmentB.type.eq(ctx, SegmentType.Right),
            pointSegmentDistance(ctx, {
                c1: waypointsA[waypoint_a].x,
                c2: waypointsA[waypoint_a].y,
            }, {
                c1_lower: waypointsB[segment_b].x,
                c1_higher: waypointsB[segment_b + 1].x,
                c2: waypointsB[segment_b].y
            }, min_distance)
        ),
        ctx.Implies(
            channelSegmentB.type.eq(ctx, SegmentType.Left),
            pointSegmentDistance(ctx, {
                c1: waypointsA[waypoint_a].x,
                c2: waypointsA[waypoint_a].y,
            }, {
                c1_lower: waypointsB[segment_b + 1].x,
                c1_higher: waypointsB[segment_b].x,
                c2: waypointsB[segment_b].y
            }, min_distance)
        ),
        ctx.Implies(
            channelSegmentB.type.eq(ctx, SegmentType.UpRight),
            pointSegmentDistance(ctx, {
                c1: waypointsA[waypoint_a].x,
                c2: waypointsA[waypoint_a].y,
            }, {
                c1_lower: waypointsB[segment_b + 1].x,
                c1_higher: waypointsB[segment_b].x,
                c2: waypointsB[segment_b].y
            }, min_distance)
        )
    )
}

// TODO: replace this legacy function (in accordance with Philipp) and adapt testing for the new crucial core function
export function segmentBoxNoCrossOld(ctx: Context, segment: { c1_lower: Arith, c1_higher: Arith, c2: Arith}, box: {
    c1: Arith | number,
    c2: Arith | number,
    c1_span: number,
    c2_span: number
}) {
    return ctx.Or(
        ctx.LE(segment.c1_higher, box.c1),
        minDistanceAsym(ctx, box.c1, segment.c1_lower, box.c1_span),
        ctx.LE(segment.c2, box.c2),
        minDistanceAsym(ctx, box.c2, segment.c2, box.c2_span),
    )
}

export function segmentBoxNoCross(ctx: Context, segment: {
    c1_lower: Arith,
    c1_higher: Arith,
    c2_lower: Arith,
    c2_higher: Arith
}, box: {
    c1: Arith | number,     // Lower-left corner x coordinate (c1)
    c2: Arith | number,     // Lower-left corner y coordinate (c2)
    c1_span: number,        // Width of the box (span in c1 direction)
    c2_span: number         // Height of the box (span in c2 direction)
}) {

    return ctx.Or(
        ctx.LE(segment.c1_higher, box.c1),                              // Segment is entirely to the left of the box
        minDistanceAsym(ctx, box.c1, segment.c1_lower, box.c1_span),    // Segment's start point is out of bounds of one of the box's axes (cannot start inside)
        ctx.LE(segment.c2_higher, box.c2),                              // Segment is entirely below the box
        minDistanceAsym(ctx, box.c2, segment.c2_lower, box.c2_span)     // Segment's start point is outside of bounds of the other of the box's axes
    )
}

// TODO: replace this legacy function (in accordance with Philipp) and adapt testing for the new crucial core function
export function channelSegmentRoutingExclusionNoCross(ctx: Context, channel: EncodedChannel, segment: number, exclusion: StaticRoutingExclusion) {

    let channelSegment = channel.encoding.segments[segment]
    let waypoints = channel.encoding.waypoints

    return ctx.And(
        ctx.Implies(
            channelSegment.type.eq(ctx, SegmentType.Up),
            segmentBoxNoCross(ctx, {
                c1_lower: waypoints[segment].y,
                c1_higher: waypoints[segment + 1].y,
                c2_lower: waypoints[segment].x,
                c2_higher: waypoints[segment + 1].x
            }, {
                c1: exclusion.position.y,
                c2: exclusion.position.x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            })
        ),
        ctx.Implies(
            channelSegment.type.eq(ctx, SegmentType.Down),
            segmentBoxNoCross(ctx, {
                c1_lower: waypoints[segment + 1].y,
                c1_higher: waypoints[segment].y,
                c2_lower: waypoints[segment + 1].x,
                c2_higher: waypoints[segment].x
            }, {
                c1: exclusion.position.y,
                c2: exclusion.position.x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            })
        ),
        ctx.Implies(
            channelSegment.type.eq(ctx, SegmentType.Right),
            segmentBoxNoCross(ctx, {
                c1_lower: waypoints[segment].x,
                c1_higher: waypoints[segment + 1].x,
                c2_lower: waypoints[segment].y,
                c2_higher: waypoints[segment + 1].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
        ctx.Implies(
            channelSegment.type.eq(ctx, SegmentType.Left),
            segmentBoxNoCross(ctx, {
                c1_lower: waypoints[segment + 1].x,
                c1_higher: waypoints[segment].x,
                c2_lower: waypoints[segment + 1].y,
                c2_higher: waypoints[segment].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
        ctx.Implies(
            channelSegment.type.eq(ctx, SegmentType.UpRight),
            segmentBoxNoCross(ctx, {
                c1_lower: waypoints[segment].x,
                c1_higher: waypoints[segment + 1].x,
                c2_lower: waypoints[segment].y,
                c2_higher: waypoints[segment + 1].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
        ctx.Implies(
            channelSegment.type.eq(ctx, SegmentType.DownRight),
            segmentBoxNoCross(ctx, {
                c1_lower: waypoints[segment].x,
                c1_higher: waypoints[segment + 1].x,
                c2_lower: waypoints[segment + 1].y,
                c2_higher: waypoints[segment].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
        ctx.Implies(
            channelSegment.type.eq(ctx, SegmentType.DownLeft),
            segmentBoxNoCross(ctx, {
                c1_lower: waypoints[segment].x,
                c1_higher: waypoints[segment + 1].x,
                c2_lower: waypoints[segment + 1].y,
                c2_higher: waypoints[segment].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
        ctx.Implies(
            channelSegment.type.eq(ctx, SegmentType.UpLeft),
            segmentBoxNoCross(ctx, {
                c1_lower: waypoints[segment + 1].x,
                c1_higher: waypoints[segment].x,
                c2_lower: waypoints[segment].y,
                c2_higher: waypoints[segment + 1].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
    )
}


// TODO: replace this legacy function (in accordance with Philipp) and adapt testing for the new crucial core function
export function segmentSegmentNoCross(ctx: Context, segment_a: {
    c1_lower: Arith,
    c1_higher: Arith,
    c2: Arith
}, segment_b: { c1: Arith, c2_lower: Arith, c2_higher: Arith }) {
    return ctx.Or(
        ctx.LE(segment_a.c1_higher, segment_b.c1),
        ctx.GE(segment_a.c1_lower, segment_b.c1),
        ctx.LE(segment_b.c2_higher, segment_a.c2),
        ctx.GE(segment_b.c2_lower, segment_a.c2),
    )
}

// New cross function that incorporates octa-linear channel routing
export function segmentSegmentNoCrossNew(ctx: Context, segment_a: {
                                             c1_lower: Arith,
                                             c1_higher: Arith,
                                             c2_lower: Arith,
                                             c2_higher: Arith
                                         },
                                         isDiagonalA: boolean,
                                         segment_b: {
                                             c1_lower: Arith,
                                             c1_higher: Arith,
                                             c2_lower: Arith,
                                             c2_higher: Arith,
                                         },
                                         isDiagonalB: boolean) {
    if (!isDiagonalA && !isDiagonalB) {
        // Original constraints for horizontal and vertical segments
        return ctx.Or(
            ctx.LE(segment_a.c1_higher, segment_b.c1_lower),
            ctx.GE(segment_a.c1_lower, segment_b.c1_higher),
            ctx.LE(segment_a.c2_higher, segment_b.c2_lower),
            ctx.GE(segment_a.c2_lower, segment_b.c2_higher)
        );
    } else {
        // Handle diagonal segments
        return ctx.Or(
            ctx.LE(segment_a.c1_higher, segment_b.c1_lower),
            ctx.GE(segment_a.c1_lower, segment_b.c1_higher),
            ctx.LE(segment_a.c2_higher, segment_b.c2_lower),
            ctx.GE(segment_a.c2_lower, segment_b.c2_higher),
            // Additional checks for diagonal intersections
            ctx.And(
                ctx.LE(segment_a.c1_higher, segment_b.c1_higher),
                ctx.GE(segment_a.c1_lower, segment_b.c1_lower),
                ctx.LE(segment_a.c2_higher, segment_b.c2_higher),
                ctx.GE(segment_a.c2_lower, segment_b.c2_lower)
            )
        );
    }
}


export function channelSegmentsNoCross(ctx: Context, channel_a: EncodedChannel, segment_a: number, channel_b: EncodedChannel, segment_b: number) {

    let channelSegment_a = channel_a.encoding.segments[segment_a]
    let channelSegment_b = channel_b.encoding.segments[segment_b]

    let waypoints_a = channel_a.encoding.waypoints
    let waypoints_b = channel_b.encoding.waypoints

    let coordsUpOrUpRightSegmentA = {
        c1_lower: waypoints_a[segment_a].x,
        c1_higher: waypoints_a[segment_a + 1].x,
        c2_lower: waypoints_a[segment_a].y,
        c2_higher: waypoints_a[segment_a + 1].y
    }

    let coordsUpOrUpRightSegmentB = {
        c1_lower: waypoints_b[segment_b].x,
        c1_higher: waypoints_b[segment_b + 1].x,
        c2_lower: waypoints_b[segment_b].y,
        c2_higher: waypoints_b[segment_b + 1].y
    }

    let coordsRightOrDownRightSegmentA = {
        c1_lower: waypoints_a[segment_a].x,
        c1_higher: waypoints_a[segment_a + 1].x,
        c2_lower: waypoints_a[segment_a + 1].y,
        c2_higher: waypoints_a[segment_a].y
    }

    let coordsRightOrDownRightSegmentB = {
        c1_lower: waypoints_b[segment_b].x,
        c1_higher: waypoints_b[segment_b + 1].x,
        c2_lower: waypoints_b[segment_b + 1].y,
        c2_higher: waypoints_b[segment_b].y
    }

    let coordsDownOrDownLeftSegmentA = {
        c1_lower: waypoints_a[segment_a + 1].x,
        c1_higher: waypoints_a[segment_a].x,
        c2_lower: waypoints_a[segment_a + 1].y,
        c2_higher: waypoints_a[segment_a].y
    }

    let coordsDownOrDownLeftSegmentB = {
        c1_lower: waypoints_b[segment_b + 1].x,
        c1_higher: waypoints_b[segment_b].x,
        c2_lower: waypoints_b[segment_b + 1].y,
        c2_higher: waypoints_b[segment_b].y
    }

    let coordsLeftOrUpLeftSegmentA = {
        c1_lower: waypoints_a[segment_a + 1].x,
        c1_higher: waypoints_a[segment_a].x,
        c2_lower: waypoints_a[segment_a].y,
        c2_higher: waypoints_a[segment_a + 1].y
    }

    let coordsLeftOrUpLeftSegmentB = {
        c1_lower: waypoints_b[segment_b + 1].x,
        c1_higher: waypoints_b[segment_b].x,
        c2_lower: waypoints_b[segment_b].y,
        c2_higher: waypoints_b[segment_b + 1].y
    }


    const crossingPairs: [SegmentType, SegmentType][] = [
        [SegmentType.Up, SegmentType.Right],
        [SegmentType.Up, SegmentType.Left],
        [SegmentType.Up, SegmentType.UpRight],
        [SegmentType.Up, SegmentType.UpLeft],
        [SegmentType.Up, SegmentType.Down],
        [SegmentType.Up, SegmentType.DownRight],
        [SegmentType.Up, SegmentType.DownLeft],

        [SegmentType.Right, SegmentType.Up],
        [SegmentType.Right, SegmentType.Left],
        [SegmentType.Right, SegmentType.UpRight],
        [SegmentType.Right, SegmentType.UpLeft],
        [SegmentType.Right, SegmentType.Down],
        [SegmentType.Right, SegmentType.DownRight],
        [SegmentType.Right, SegmentType.DownLeft],

        [SegmentType.Down, SegmentType.Up],
        [SegmentType.Down, SegmentType.Right],
        [SegmentType.Down, SegmentType.Left],
        [SegmentType.Down, SegmentType.UpRight],
        [SegmentType.Down, SegmentType.UpLeft],
        [SegmentType.Down, SegmentType.DownRight],
        [SegmentType.Down, SegmentType.DownLeft],

        [SegmentType.Left, SegmentType.Up],
        [SegmentType.Left, SegmentType.Right],
        [SegmentType.Left, SegmentType.UpRight],
        [SegmentType.Left, SegmentType.UpLeft],
        [SegmentType.Left, SegmentType.Down],
        [SegmentType.Left, SegmentType.DownRight],
        [SegmentType.Left, SegmentType.DownLeft],

        [SegmentType.UpRight, SegmentType.Up],
        [SegmentType.UpRight, SegmentType.Right],
        [SegmentType.UpRight, SegmentType.Left],
        [SegmentType.UpRight, SegmentType.UpLeft],
        [SegmentType.UpRight, SegmentType.Down],
        [SegmentType.UpRight, SegmentType.DownRight],
        [SegmentType.UpRight, SegmentType.DownLeft],

        [SegmentType.UpLeft, SegmentType.Up],
        [SegmentType.UpLeft, SegmentType.Right],
        [SegmentType.UpLeft, SegmentType.Left],
        [SegmentType.UpLeft, SegmentType.UpRight],
        [SegmentType.UpLeft, SegmentType.Down],
        [SegmentType.UpLeft, SegmentType.DownRight],
        [SegmentType.UpLeft, SegmentType.DownLeft],

        [SegmentType.DownRight, SegmentType.Up],
        [SegmentType.DownRight, SegmentType.Right],
        [SegmentType.DownRight, SegmentType.Left],
        [SegmentType.DownRight, SegmentType.UpRight],
        [SegmentType.DownRight, SegmentType.UpLeft],
        [SegmentType.DownRight, SegmentType.Down],
        [SegmentType.DownRight, SegmentType.DownLeft],

        [SegmentType.DownLeft, SegmentType.Up],
        [SegmentType.DownLeft, SegmentType.Right],
        [SegmentType.DownLeft, SegmentType.Left],
        [SegmentType.DownLeft, SegmentType.UpRight],
        [SegmentType.DownLeft, SegmentType.UpLeft],
        [SegmentType.DownLeft, SegmentType.Down],
        [SegmentType.DownLeft, SegmentType.DownRight],
    ]

    const segmentCoordinatesA = {
        [SegmentType.Up]: coordsUpOrUpRightSegmentA,
        [SegmentType.Down]: coordsDownOrDownLeftSegmentA,
        [SegmentType.Right]: coordsRightOrDownRightSegmentA,
        [SegmentType.Left]: coordsLeftOrUpLeftSegmentA,
        [SegmentType.UpRight]: coordsUpOrUpRightSegmentA,
        [SegmentType.UpLeft]: coordsLeftOrUpLeftSegmentA,
        [SegmentType.DownRight]: coordsRightOrDownRightSegmentA,
        [SegmentType.DownLeft]: coordsDownOrDownLeftSegmentA,
    };

    const segmentCoordinatesB = {
        [SegmentType.Up]: coordsUpOrUpRightSegmentB,
        [SegmentType.Down]: coordsDownOrDownLeftSegmentB,
        [SegmentType.Right]: coordsRightOrDownRightSegmentB,
        [SegmentType.Left]: coordsLeftOrUpLeftSegmentB,
        [SegmentType.UpRight]: coordsUpOrUpRightSegmentB,
        [SegmentType.UpLeft]: coordsLeftOrUpLeftSegmentB,
        [SegmentType.DownRight]: coordsRightOrDownRightSegmentB,
        [SegmentType.DownLeft]: coordsDownOrDownLeftSegmentB,
    };

    // Iterate through all possible crossings
    const constraints = crossingPairs.map(([segA, segB]) => {
        const coordsA = segmentCoordinatesA[segA];
        const coordsB = segmentCoordinatesB[segB];

        return ctx.Implies(
            ctx.And(
                channelSegment_a.type.eq(ctx, segA),
                channelSegment_b.type.eq(ctx, segB)
            ),
            segmentSegmentNoCrossNew(ctx, coordsA, diagonalDirections.includes(segA), coordsB, diagonalDirections.includes(segB))
        );
    });

    return ctx.And(...constraints);
}

function negate(ctx: Context, value: Arith | number) {
    return typeof value == 'number' ? -value : ctx.Neg(value)
}

function rotateOffset(ctx: Context, offset: { x: Arith | number, y: Arith | number }, target_rotation: Orientation) {
    switch (target_rotation) {
        case Orientation.Up:
            return offset
        case Orientation.Right:
            return {
                x: offset.y,
                y: negate(ctx, offset.x)
            }
        case Orientation.Down:
            return {
                x: negate(ctx, offset.x),
                y: negate(ctx, offset.y)
            }
        case Orientation.Left:
            return {
                x: negate(ctx, offset.y),
                y: offset.x
            }
    }
}