import {Arith, Context} from "z3-solver";
import {StaticRoutingExclusion} from "../routingExclusion";
import {Orientation} from "../orientation";
import {EncodedChannel, SegmentType} from "../channel";

// declaration of diagonal direction for further use in distance and helper functions
const diagonalDirections: SegmentType[] = [
    SegmentType.UpRight,
    SegmentType.UpLeft,
    SegmentType.DownRight,
    SegmentType.DownLeft
];

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

// Helper function for the channelSegmentRoutingExclusionDistance function, measuring distance from the diagonal segments
// and a given box (e.g. exclusion zone)
export function segmentBoxDistanceDiagonal(ctx: Context, segment: {
    c1_lower: Arith,
    c1_higher: Arith,
    c2_lower: Arith,
    c2_higher: Arith
}, box: { c1: Arith | number, c2: Arith | number, c1_span: number, c2_span: number }, min_distance: number) {
    // TODO: distance calculation on diagonals
    return ctx.Or()
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

// TODO: test if calculations are correct
// Helper function for the pointSegmentDistanceDiagonal function, measuring the distance between two points (one in the integer grid
// of the chip and one in between that lies on a channel segment and is closest to the integer point)
export function pointPointDistanceReal(ctx: Context, pointA: { c1: Arith, c2: Arith }, pointB: { c1: Arith, c2: Arith }, min_distance: number ) {
    const pointA_x = ctx.ToReal(pointA.c1)
    const pointA_y = ctx.ToReal(pointA.c2)

    const pointB_x = pointB.c1
    const pointB_y = pointB.c2

    let deltaC1 = pointB_x.sub(pointA_x)
    let deltaC2 = pointB_y.sub(pointA_y)

    let deltaC1Squared = deltaC1.mul(deltaC1)
    let deltaC2Squared = deltaC2.mul(deltaC2)

    let distanceSquared = deltaC1Squared.add(deltaC2Squared)
    let distance = ctx.Sqrt(distanceSquared)

    return ctx.LE(distance, min_distance)
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

// TODO: make calculations simpler and more efficient
// Helper function for the diagonal directions of the waypointSegmentDistance function, measuring distance
// between segment and point using the pointPointDistanceReal helping function (non-integer distance)
function pointSegmentDistanceDiagonal(ctx: Context, point: { c1: Arith, c2: Arith }, segment: {
    start: { c1: Arith, c2: Arith },
    end: { c1: Arith, c2: Arith }
}, min_distance: number) {
    const segmentVector = { c1: ctx.Sub(segment.end.c1, segment.start.c1), c2: ctx.Sub(segment.end.c2, segment.start.c2) }
    const pointVector = { c1: ctx.Sub(point.c1, segment.start.c1), c2: ctx.Sub(point.c2, segment.start.c2) }

    // Compute projection of the point vector onto the segment vector
    const segmentLengthSquared = ctx.Sum(ctx.Product(segmentVector.c1, segmentVector.c1), ctx.Product(segmentVector.c2, segmentVector.c2))
    const dotProduct = ctx.Sum(ctx.Product(pointVector.c1, segmentVector.c1), ctx.Product(pointVector.c2, segmentVector.c2))
    const projection = ctx.Div(dotProduct, segmentLengthSquared)

    // Making sure that the projection is on the segment and not outside
    const clampedProjection = ctx.If(ctx.LE(projection, 0), 0,
        ctx.If(ctx.GE(projection, 1), 1, projection))

    // Compute the closest point on the segment
    const closestPoint = {
        c1: ctx.ToReal(ctx.Sum(segment.start.c1, ctx.Product(clampedProjection, segmentVector.c1))),
        c2: ctx.ToReal(ctx.Sum(segment.start.c2, ctx.Product(clampedProjection, segmentVector.c2)))
    }

    return pointPointDistanceReal(ctx, point, closestPoint, min_distance)
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
                c1: waypointsA[waypoint_a].x,
                c2: waypointsA[waypoint_a].y,
            }, {
                start: { c1: waypointsB[segment_b].x, c2: waypointsB[segment_b].y },
                end: { c1: waypointsB[segment_b + 1].x, c2: waypointsB[segment_b + 1].y }
            }, min_distance)
        )
    )
}

// TODO: replace this legacy function (in accordance with Philipp)
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

// Helper function for the channelSegmentRoutingExclusionNoCross function to check whether a segment crosses a given box (e.g. exclusion zone)
export function segmentBoxNoCross(ctx: Context, segment: {
    c1_lower: Arith,
    c1_higher: Arith,
    c2_lower: Arith,
    c2_higher: Arith
}, box: {
    c1: Arith | number,
    c2: Arith | number,
    c1_span: number,
    c2_span: number
}) {

    return ctx.Or(
        ctx.LE(segment.c1_higher, box.c1),                              // Segment is entirely to the left of the box
        minDistanceAsym(ctx, box.c1, segment.c1_lower, box.c1_span),    // Segment's start point is out of bounds of one of the box's axes (cannot start inside)
        ctx.LE(segment.c2_higher, box.c2),                              // Segment is entirely below the box
        minDistanceAsym(ctx, box.c2, segment.c2_lower, box.c2_span)     // Segment's start point is outside of bounds of the other of the box's axes
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


// TODO: replace this legacy function (in accordance with Philipp) and adapt testing for the new function below this one
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

// Helper function for the channelSegmentsNoCross function that incorporates octa-linear channel routing
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

// Function to ensure that no segments can cross each other on the chip
// TODO: add differentiation between top and bottom channels as they do not interfere with each other
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