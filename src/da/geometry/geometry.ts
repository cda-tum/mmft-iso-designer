import {Arith, Context} from "z3-solver";
import {StaticRoutingExclusion} from "../routingExclusion";
import {Orientation} from "../orientation";
import {EncodedChannel, SegmentType} from "../channel";
import {Module} from "../module";

// Helper function to calculate asymmetric distance
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

// Helper function to calculate symmetric distance
export function minDistanceSym(ctx: Context, c1: Arith | number, c2: Arith | number, distance: Arith | number) {
    return ctx.Or(
        minDistanceAsym(ctx, c1, c2, distance),
        minDistanceAsym(ctx, c2, c1, distance)
    )
}

// Helper function for the channelSegmentRoutingExclusionDistance function, measuring distance from the vertical/horizontal segments
// and a given box (e.g. exclusion zone)
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

// Helper function for the channelSegmentRoutingExclusionDistance function, ensuring that the minimum distance between a segment
// and a given box (e.g. exclusion zone) is kept for all points of the segment
export function segmentBoxDistanceDiagonal(ctx: Context, segment: {
    x1: Arith,
    y1: Arith,
    x2: Arith,
    y2: Arith
}, box: { c1: Arith | number, c2: Arith | number, c1_span: number, c2_span: number }, min_distance: number) {

    if (typeof box.c1 == 'number') {
        if (typeof box.c2 == 'number') {
            const expandedBox = {
                c1: box.c1 - min_distance,
                c2: box.c2 - min_distance,
                c1_span: box.c1_span + min_distance,
                c2_span: box.c2_span + min_distance,
            }
            return segmentBoxNoCross(ctx, segment, expandedBox)
        } else {
            const expandedBox = {
                c1: box.c1 - min_distance,
                c2: box.c2.sub(min_distance),
                c1_span: box.c1_span + min_distance,
                c2_span: box.c2_span + min_distance
            }
            return segmentBoxNoCross(ctx, segment, expandedBox)
        }
    } else if (typeof box.c2 != 'number') {
        const expandedBox = {
            c1: box.c1.sub(min_distance),
            c2: box.c2.sub(min_distance),
            c1_span: box.c1_span + min_distance,
            c2_span: box.c2_span + min_distance
        }
        return segmentBoxNoCross(ctx, segment, expandedBox)
    } else {
        const expandedBox = {
            c1: box.c1.sub(min_distance),
            c2: box.c2 - min_distance,
            c1_span: box.c1_span + min_distance,
            c2_span: box.c2_span + min_distance
        }
        return segmentBoxNoCross(ctx, segment, expandedBox)
    }
}

// Function to ensure a given minimum distance between a channel segment and an exclusion zone
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
                x1: channel.encoding.waypoints[segment].x,
                x2: channel.encoding.waypoints[segment + 1].x,
                y1: channel.encoding.waypoints[segment].y,
                y2: channel.encoding.waypoints[segment + 1].y,
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
                x1: channel.encoding.waypoints[segment].x,
                x2: channel.encoding.waypoints[segment + 1].x,
                y1: channel.encoding.waypoints[segment + 1].y,
                y2: channel.encoding.waypoints[segment].y,
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
                x1: channel.encoding.waypoints[segment + 1].x,
                x2: channel.encoding.waypoints[segment].x,
                y1: channel.encoding.waypoints[segment].y,
                y2: channel.encoding.waypoints[segment + 1].y,
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
                x1: channel.encoding.waypoints[segment + 1].x,
                x2: channel.encoding.waypoints[segment].x,
                y1: channel.encoding.waypoints[segment + 1].y,
                y2: channel.encoding.waypoints[segment].y,
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            }, min_distance)
        )
    )
}

// Helper function to calculate the length of a vector defined by a deltaX and deltaY
export function vectorLength(ctx: Context, vector: { deltaX: Arith, deltaY: Arith }) {

    let deltaX = ctx.isReal(vector.deltaX) ? vector.deltaX : ctx.ToReal(vector.deltaX)
    let deltaY = ctx.isReal(vector.deltaY) ? vector.deltaY : ctx.ToReal(vector.deltaY)

    let deltaC1Squared = deltaX.mul(deltaX)
    let deltaC2Squared = deltaY.mul(deltaY)

    let distanceSquared = deltaC1Squared.add(deltaC2Squared)
    return ctx.Sqrt(distanceSquared)
}


// TESTED
// Helper function for the pointSegmentDistanceDiagonal function, measuring the distance between two points
// (not necessarily in the integer grid of the chip
export function pointPointDistanceReal(ctx: Context, pointA: { x: Arith, y: Arith }, pointB: { x: Arith, y: Arith }, min_distance: number ) {
    let pointA_x = ctx.isReal(pointA.x) ? pointA.x : ctx.ToReal(pointA.x)
    let pointA_y = ctx.isReal(pointA.y) ? pointA.y : ctx.ToReal(pointA.y)

    let pointB_x = ctx.isReal(pointB.y) ? pointB.y : ctx.ToReal(pointB.y)
    let pointB_y = ctx.isReal(pointB.y) ? pointB.y : ctx.ToReal(pointB.y)

    const minimum_d = ctx.Real.val(0).add(min_distance)

    let distance = vectorLength(ctx, {deltaX: pointB_x.sub(pointA_x), deltaY: pointB_y.sub(pointA_y)})
    return ctx.GE(distance, minimum_d)
}


// Helper function for the waypointRoutingExclusionDistance function, measuring distance between the point and a box
// using minDistanceAsym
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

// Function to ensure a given minimum distance between the waypoint of a channel and an exclusion zone
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

// Helper function for the horizontal/vertical directions of the waypointSegmentDistance function, measuring distance
// between segment and point using minDistanceAsym and Sym
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

// TESTED
// Helper function for the diagonal directions of the waypointSegmentDistance function, measuring distance
// between segment and point using the pointPointDistanceReal helping function (non-integer distance)
export function pointSegmentDistanceDiagonal(ctx: Context, point: { x: Arith, y: Arith }, segment: {
    start: { x: Arith, y: Arith },
    end: { x: Arith, y: Arith }
}, min_distance: number) {
    const pointStartVector = { deltaX: segment.start.x.sub(point.x), deltaY: segment.start.y.sub(point.y) }
    const pointEndVector = { deltaX: segment.end.x.sub(point.x), deltaY: segment.end.y.sub(point.y) }
    const segmentVector = { deltaX: segment.end.x.sub(segment.start.x), deltaY: segment.end.y.sub(segment.start.y) }

    const pointStartVectorLen = vectorLength(ctx, pointStartVector)
    const pointEndVectorLen = vectorLength(ctx, pointEndVector)
    const segmentVectorLen = vectorLength(ctx, segmentVector)

    const distance_s = ctx.Real.val(0.5).mul(ctx.Sum(pointStartVectorLen, pointEndVectorLen, segmentVectorLen))

    // calculating the distance based on the height of a triangle formula for the triangle that is built by the point, start and end
    // Thereby receiving the distance of the point to the segment
    const two_over_b = ctx.Real.val(2).div(segmentVectorLen)
    const s_minus_a = distance_s.sub(pointStartVectorLen)
    const s_minus_b = distance_s.sub(segmentVectorLen)
    const s_minus_c = distance_s.sub(pointEndVectorLen)

    const actualDistance = two_over_b.mul(ctx.Sqrt(distance_s.mul(ctx.Product(s_minus_a, s_minus_b, s_minus_c))))
    return ctx.GE(actualDistance, min_distance)
}

// Function to ensure a given minimum distance between a waypoint of one channel to a segment of another channel
// different helper function for the diagonal directions as the distance calculation is depending on both axes and non-integer
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
            ctx.Or(
                channelSegmentB.type.eq(ctx, SegmentType.UpRight),
                channelSegmentB.type.eq(ctx, SegmentType.DownRight),
                channelSegmentB.type.eq(ctx, SegmentType.DownLeft),
                channelSegmentB.type.eq(ctx, SegmentType.UpLeft),
            ),
            pointSegmentDistanceDiagonal(ctx, {
                x: waypointsA[waypoint_a].x,
                y: waypointsA[waypoint_a].y,
            }, {
                start: { x: waypointsB[segment_b].x, y: waypointsB[segment_b].y },
                end: { x: waypointsB[segment_b + 1].x, y: waypointsB[segment_b + 1].y }
            }, min_distance)
        )
    )
}

// Helper function for the channelSegmentRoutingExclusionNoCross function to check whether a segment crosses a given box (e.g. exclusion zone)
export function segmentBoxNoCross(ctx: Context, segment: {
    x1: Arith,
    y1: Arith,
    x2: Arith,
    y2: Arith
}, box: {
    c1: Arith | number,
    c2: Arith | number,
    c1_span: number,
    c2_span: number
}) {

    return ctx.Or(
        ctx.LE(segment.x2, box.c1),                              // Segment is entirely to the left of the box
        minDistanceAsym(ctx, box.c1, segment.x1, box.c1_span),    // Segment's start point is out of bounds of one of the box's axes (cannot start inside)
        ctx.LE(segment.y2, box.c2),                              // Segment is entirely below the box
        minDistanceAsym(ctx, box.c2, segment.y1, box.c2_span)     // Segment's start point is outside of bounds of the other of the box's axes
    )
}

// Function to ensure that no segment can cross through a routing exclusion zone (e.g. cut-out piece of the chip)
export function channelSegmentRoutingExclusionNoCross(ctx: Context, channel: EncodedChannel, segment: number, exclusion: StaticRoutingExclusion) {

    let channelSegment = channel.encoding.segments[segment]
    let waypoints = channel.encoding.waypoints

    return ctx.And(
        ctx.Implies(
            channelSegment.type.eq(ctx, SegmentType.Up),
            segmentBoxNoCross(ctx, {
                x1: waypoints[segment].y,
                x2: waypoints[segment + 1].y,
                y1: waypoints[segment].x,
                y2: waypoints[segment + 1].x
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
                x1: waypoints[segment + 1].y,
                x2: waypoints[segment].y,
                y1: waypoints[segment + 1].x,
                y2: waypoints[segment].x
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
                x1: waypoints[segment].x,
                x2: waypoints[segment + 1].x,
                y1: waypoints[segment].y,
                y2: waypoints[segment + 1].y
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
                x1: waypoints[segment + 1].x,
                x2: waypoints[segment].x,
                y1: waypoints[segment + 1].y,
                y2: waypoints[segment].y
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
                x1: waypoints[segment].x,
                x2: waypoints[segment + 1].x,
                y1: waypoints[segment].y,
                y2: waypoints[segment + 1].y
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
                x1: waypoints[segment].x,
                x2: waypoints[segment + 1].x,
                y1: waypoints[segment + 1].y,
                y2: waypoints[segment].y
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
                x1: waypoints[segment].x,
                x2: waypoints[segment + 1].x,
                y1: waypoints[segment + 1].y,
                y2: waypoints[segment].y
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
                x1: waypoints[segment + 1].x,
                x2: waypoints[segment].x,
                y1: waypoints[segment].y,
                y2: waypoints[segment + 1].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
    )
}


// TESTED
// Helper function for the channelSegmentsNoCross function that incorporates octa-linear channel routing
export function segmentSegmentNoCrossNew(ctx: Context, segment_a: {
                                            start_x: Arith,
                                            start_y: Arith,
                                            end_x: Arith,
                                            end_y: Arith
                                        },
                                        segment_b: {
                                            start_x: Arith,
                                            start_y: Arith,
                                            end_x: Arith,
                                            end_y: Arith
                                        }) {

    // Helper function to compute the orientation of three points
    function orientation(point1_x: Arith, point1_y: Arith, point2_x: Arith, point2_y: Arith, point3_x: Arith, point3_y: Arith): Arith {
        return ctx.Sub(
            ctx.Product(ctx.Sub(point2_x, point1_x), ctx.Sub(point3_y, point1_y)),
            ctx.Product(ctx.Sub(point2_y, point1_y), ctx.Sub(point3_x, point1_x))
        );
    }

    const { start_x: ax1, start_y: ay1, end_x: ax2, end_y: ay2 } = segment_a;
    const { start_x: bx1, start_y: by1, end_x: bx2, end_y: by2 } = segment_b;

    // Compute the four orientations
    const orientation1 = orientation(ax1, ay1, ax2, ay2, bx1, by1);
    const orientation2 = orientation(ax1, ay1, ax2, ay2, bx2, by2);
    const orientation3 = orientation(bx1, by1, bx2, by2, ax1, ay1);
    const orientation4 = orientation(bx1, by1, bx2, by2, ax2, ay2);

    // General case: intersection happens if orientations differ
    const noGeneralIntersection = ctx.Or(
        ctx.And(ctx.LE(orientation1, ctx.Int.val(0)), ctx.LE(orientation2, ctx.Int.val(0))),
        ctx.And(ctx.GE(orientation1, ctx.Int.val(0)), ctx.GE(orientation2, ctx.Int.val(0))),
        ctx.And(ctx.LE(orientation3, ctx.Int.val(0)), ctx.LE(orientation4, ctx.Int.val(0))),
        ctx.And(ctx.GE(orientation3, ctx.Int.val(0)), ctx.GE(orientation4, ctx.Int.val(0)))
    );

    // Special case for collinear points: check if the segments overlap directly
    const noCollinearCondition = ctx.Or(
        ctx.Not(ctx.Eq(orientation1, ctx.Int.val(0))), // Not collinear if orientation is non-zero
        ctx.Not(ctx.Eq(orientation2, ctx.Int.val(0))), // Not collinear if orientation is non-zero
        ctx.Or(
            // Vertical case: same x, but no overlap in y
            ctx.And(
                ctx.Eq(ax1, ax2), // Both segments are vertical (x-coordinates equal)
                ctx.Eq(bx1, bx2),
                ctx.Or(
                    ctx.LT(ay2, by1), // segment A ends before segment B starts
                    ctx.LT(by2, ay1)  // segment B ends before segment A starts
                )
            ),
            // Horizontal case: same y, but no overlap in x
            ctx.And(
                ctx.Eq(ay1, ay2), // Both segments are horizontal (y-coordinates equal)
                ctx.Eq(by1, by2),
                ctx.Or(
                    ctx.LT(ax2, bx1), // segment A ends before segment B starts
                    ctx.LT(bx2, ax1)  // segment B ends before segment A starts
                )
            )
        )
    );

    const noPerpendicularCondition = ctx.Or(
        ctx.Not(ctx.Eq(ax1, ax2)), // Segment A is not vertical
        ctx.Not(ctx.Eq(by1, by2)), // Segment B is not horizontal
        ctx.Or(
            ctx.Or(ctx.LT(ax1, bx1), ctx.GT(ax1, bx2)), // The x-coordinate of the vertical line is outside the horizontal segment's x-range
            ctx.Or(ctx.LT(by1, ay1), ctx.GT(by1, ay2))  // The y-coordinate of the horizontal line is outside the vertical segment's y-range
        )
    );

    return ctx.And(
        noGeneralIntersection,
        noCollinearCondition,
        noPerpendicularCondition
    )
}


// TESTED FOR BOTH SIDES
// Function to ensure that no segments can cross each other on the chip
export function channelSegmentsNoCross(ctx: Context, channel_a: EncodedChannel, segment_a: number, channel_b: EncodedChannel, segment_b: number, modules: Module[]) {

    // Check if channels are on different sides of the chip (top or bottom) as they would then not interfere witch each other
    if (modules[channel_a.from.module].placement !== modules[channel_b.from.module].placement) {
        return ctx.Bool.val(true)
    }

    let channelSegment_a = channel_a.encoding.segments[segment_a]
    let channelSegment_b = channel_b.encoding.segments[segment_b]

    let waypoints_a = channel_a.encoding.waypoints
    let waypoints_b = channel_b.encoding.waypoints

    let coordsUpOrUpRightSegmentA = {
        start_x: waypoints_a[segment_a].x,
        start_y: waypoints_a[segment_a].y,
        end_x: waypoints_a[segment_a + 1].x,
        end_y: waypoints_a[segment_a + 1].y
    }

    let coordsUpOrUpRightSegmentB = {
        start_x: waypoints_b[segment_b].x,
        start_y: waypoints_b[segment_b].y,
        end_x: waypoints_b[segment_b + 1].x,
        end_y: waypoints_b[segment_b + 1].y
    }

    let coordsRightOrDownRightSegmentA = {
        start_x: waypoints_a[segment_a].x,
        start_y: waypoints_a[segment_a + 1].y,
        end_x: waypoints_a[segment_a + 1].x,
        end_y: waypoints_a[segment_a].y
    }

    let coordsRightOrDownRightSegmentB = {
        start_x: waypoints_b[segment_b].x,
        start_y: waypoints_b[segment_b + 1].y,
        end_x: waypoints_b[segment_b + 1].x,
        end_y: waypoints_b[segment_b].y
    }

    let coordsDownOrDownLeftSegmentA = {
        start_x: waypoints_a[segment_a + 1].x,
        start_y: waypoints_a[segment_a + 1].y,
        end_x: waypoints_a[segment_a].x,
        end_y: waypoints_a[segment_a].y
    }

    let coordsDownOrDownLeftSegmentB = {
        start_x: waypoints_b[segment_b + 1].x,
        start_y: waypoints_b[segment_b + 1].y,
        end_x: waypoints_b[segment_b].x,
        end_y: waypoints_b[segment_b].y
    }

    let coordsLeftOrUpLeftSegmentA = {
        start_x: waypoints_a[segment_a + 1].x,
        start_y: waypoints_a[segment_a].y,
        end_x: waypoints_a[segment_a].x,
        end_y: waypoints_a[segment_a + 1].y
    }

    let coordsLeftOrUpLeftSegmentB = {
        start_x: waypoints_b[segment_b + 1].x,
        start_y: waypoints_b[segment_b].y,
        end_x: waypoints_b[segment_b].x,
        end_y: waypoints_b[segment_b + 1].y
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
        [SegmentType.DownLeft, SegmentType.DownRight]
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
            segmentSegmentNoCrossNew(ctx, coordsA, coordsB)
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