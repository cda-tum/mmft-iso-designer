import {Arith, Context} from "z3-solver";
import {StaticRoutingExclusion} from "../routingExclusion";
import {Orientation} from "../orientation";
import {EncodedChannel, SegmentType} from "../channel";
import {Simulate} from "react-dom/test-utils";
import load = Simulate.load;


/** MINIMUM COORDINATE-COORDINATE DISTANCE CALCULATION METHODS */

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


/** MINIMUM POINT-SEGMENT DISTANCE CALCULATION METHODS */

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

export function pointSegmentDistanceDiagonal(ctx: Context, point: { c1: Arith, c2: Arith }, segment: {
    c1_lower: Arith,
    c2_lower: Arith,
    c1_higher: Arith,
    c2_higher: Arith
}, min_distance: number) {
    const lowerLeft_x = point.c1.sub(min_distance)
    const lowerLeft_y = point.c2.sub(min_distance)
    const squareSpan = min_distance * 2

    const pointBox = {
        c1: lowerLeft_x,
        c2: lowerLeft_y,
        c1_span: squareSpan,
        c2_span: squareSpan
    }
    return segmentBoxNoCrossSlopePos(ctx, segment, pointBox)
}

export function waypointSegmentDistance(ctx: Context, channel_a: EncodedChannel, waypoint_a: number, channel_b: EncodedChannel, segment_b: number, min_distance: number) {
    return ctx.And(
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up),
            pointSegmentDistance(ctx, {
                c1: channel_a.encoding.waypoints[waypoint_a].y,
                c2: channel_a.encoding.waypoints[waypoint_a].x,
            }, {
                c1_lower: channel_b.encoding.waypoints[segment_b].y,
                c1_higher: channel_b.encoding.waypoints[segment_b + 1].y,
                c2: channel_b.encoding.waypoints[segment_b].x
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down),
            pointSegmentDistance(ctx, {
                c1: channel_a.encoding.waypoints[waypoint_a].y,
                c2: channel_a.encoding.waypoints[waypoint_a].x,
            }, {
                c1_lower: channel_b.encoding.waypoints[segment_b + 1].y,
                c1_higher: channel_b.encoding.waypoints[segment_b].y,
                c2: channel_b.encoding.waypoints[segment_b].x
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right),
            pointSegmentDistance(ctx, {
                c1: channel_a.encoding.waypoints[waypoint_a].x,
                c2: channel_a.encoding.waypoints[waypoint_a].y,
            }, {
                c1_lower: channel_b.encoding.waypoints[segment_b].x,
                c1_higher: channel_b.encoding.waypoints[segment_b + 1].x,
                c2: channel_b.encoding.waypoints[segment_b].y
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left),
            pointSegmentDistance(ctx, {
                c1: channel_a.encoding.waypoints[waypoint_a].x,
                c2: channel_a.encoding.waypoints[waypoint_a].y,
            }, {
                c1_lower: channel_b.encoding.waypoints[segment_b + 1].x,
                c1_higher: channel_b.encoding.waypoints[segment_b].x,
                c2: channel_b.encoding.waypoints[segment_b].y
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight),
            pointSegmentDistanceDiagonal(ctx, {
                c1: channel_a.encoding.waypoints[waypoint_a].x,
                c2: channel_a.encoding.waypoints[waypoint_a].y,
            }, {
                c1_lower: channel_b.encoding.waypoints[segment_b].x,
                c2_lower: channel_b.encoding.waypoints[segment_b].y,
                c1_higher: channel_b.encoding.waypoints[segment_b + 1].x,
                c2_higher: channel_b.encoding.waypoints[segment_b + 1].y,
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight),
            pointSegmentDistanceDiagonal(ctx, {
                c1: channel_a.encoding.waypoints[waypoint_a].x,
                c2: channel_a.encoding.waypoints[waypoint_a].y,
            }, {
                c1_lower: channel_b.encoding.waypoints[segment_b].x,
                c2_lower: channel_b.encoding.waypoints[segment_b + 1].y,
                c1_higher: channel_b.encoding.waypoints[segment_b + 1].x,
                c2_higher: channel_b.encoding.waypoints[segment_b].y,
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft),
            pointSegmentDistanceDiagonal(ctx, {
                c1: channel_a.encoding.waypoints[waypoint_a].x,
                c2: channel_a.encoding.waypoints[waypoint_a].y,
            }, {
                c1_lower: channel_b.encoding.waypoints[segment_b + 1].x,
                c2_lower: channel_b.encoding.waypoints[segment_b + 1].y,
                c1_higher: channel_b.encoding.waypoints[segment_b].x,
                c2_higher: channel_b.encoding.waypoints[segment_b].y,
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft),
            pointSegmentDistanceDiagonal(ctx, {
                c1: channel_a.encoding.waypoints[waypoint_a].x,
                c2: channel_a.encoding.waypoints[waypoint_a].y,
            }, {
                c1_lower: channel_b.encoding.waypoints[segment_b + 1].x,
                c2_lower: channel_b.encoding.waypoints[segment_b].y,
                c1_higher: channel_b.encoding.waypoints[segment_b].x,
                c2_higher: channel_b.encoding.waypoints[segment_b + 1].y,
            }, min_distance)
        )
    )
}


/** ROUTING EXCLUSION ZONE METHODS AND HELPER METHODS */

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
        )
    )
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


// Helper function for several functions to check whether an UpRight/DownLeft segment crosses a given box (e.g. exclusion zone)
export function segmentBoxNoCrossSlopePos(ctx: Context, segment: {
    c1_lower: Arith,
    c2_lower: Arith,
    c1_higher: Arith,
    c2_higher: Arith
}, box: {
    c1: Arith | number,
    c2: Arith | number,
    c1_span: number,
    c2_span: number
}) {
    if (typeof box.c1 === 'number') {
        if (typeof box.c2 === 'number') {
            const boxTopSide_y = box.c2 + box.c2_span                   // y-value of the upper side of the box
            const boxUpperSideOverlap = segment.c1_higher.sub(box.c1)   // overlap of the segment above the box
            const minimumY = boxUpperSideOverlap.add(boxTopSide_y)      // minimum upper y-value that the segment must have not to cut the box in the upper right corner

            const boxRightSide_x = box.c1 + box.c1_span                 // x-value of the right side of the box
            const boxRightSideOverlap = segment.c2_higher.sub(box.c2)   // overlap of the segment on the right of the box
            const minimumX = boxRightSideOverlap.add(boxRightSide_x)    // minimum upper x-value that the segment must have not to cut the box in the lower right corner
            return ctx.Or(
                ctx.GT(segment.c2_higher, minimumY),
                ctx.GT(segment.c1_higher, minimumX)
            )
        } else {
            const boxTopSide_y = box.c2.add(box.c2_span)                // y-value of the upper side of the box
            const boxUpperSideOverlap = segment.c1_higher.sub(box.c1)   // overlap of the segment above the box
            const minimumY = boxUpperSideOverlap.add(boxTopSide_y)      // minimum upper y-value that the segment must have not to cut the box in the upper right corner

            const boxRightSide_x = box.c1 + box.c1_span                 // x-value of the right side of the box
            const boxRightSideOverlap = segment.c2_higher.sub(box.c2)   // overlap of the segment on the right of the box
            const minimumX = boxRightSideOverlap.add(boxRightSide_x)    // minimum upper x-value that the segment must have not to cut the box in the lower right corner
            return ctx.Or(
                ctx.GT(segment.c2_higher, minimumY),
                ctx.GT(segment.c1_higher, minimumX)
            )
        }
    } else if (typeof box.c2 === 'number') {
        const boxTopSide_y = box.c2 + box.c2_span                   // y-value of the upper side of the box
        const boxUpperSideOverlap = segment.c1_higher.sub(box.c1)   // overlap of the segment above the box
        const minimumY = boxUpperSideOverlap.add(boxTopSide_y)      // minimum upper y-value that the segment must have not to cut the box in the upper right corner

        const boxRightSide_x = box.c1.add(box.c1_span)              // x-value of the right side of the box
        const boxRightSideOverlap = segment.c2_higher.sub(box.c2)   // overlap of the segment on the right of the box
        const minimumX = boxRightSideOverlap.add(boxRightSide_x)    // minimum upper x-value that the segment must have not to cut the box in the lower right corner
        return ctx.Or(
            ctx.GT(segment.c2_higher, minimumY),
            ctx.GT(segment.c1_higher, minimumX)
        )
    } else {
        const boxTopSide_y = box.c2.add(box.c2_span)                   // y-value of the upper side of the box
        const boxUpperSideOverlap = segment.c1_higher.sub(box.c1)   // overlap of the segment above the box
        const minimumY = boxUpperSideOverlap.add(boxTopSide_y)      // minimum upper y-value that the segment must have not to cut the box in the upper right corner

        const boxRightSide_x = box.c1.add(box.c1_span)              // x-value of the right side of the box
        const boxRightSideOverlap = segment.c2_higher.sub(box.c2)   // overlap of the segment on the right of the box
        const minimumX = boxRightSideOverlap.add(boxRightSide_x)    // minimum upper x-value that the segment must have not to cut the box in the lower right corner
        return ctx.Or(
            ctx.GT(segment.c2_higher, minimumY),
            ctx.GT(segment.c1_higher, minimumX)
        )
    }
}

// Helper function for several functions to check whether an UpRight/DownLeft segment crosses a given box (e.g. exclusion zone)
export function segmentBoxNoCrossSlopeNeg(ctx: Context, segment: {
    c1_lower: Arith,
    c2_lower: Arith,
    c1_higher: Arith,
    c2_higher: Arith
}, box: {
    c1: Arith | number,
    c2: Arith | number,
    c1_span: number,
    c2_span: number
}) {
    if (typeof box.c1 === 'number') {
        if (typeof box.c2 === 'number') {
            const boxTopSide_y = box.c2 + box.c2_span                                       // y-value of the upper side of the box
            const boxLeftSideOverlap = segment.c2_higher.sub(box.c2)                        // overlap of the segment on the left of the box
            const maximumX = ctx.Int.val(box.c1).sub(boxLeftSideOverlap)                    // minimum upper y-value that the segment must have not to cut the box in the upper right corner

            const boxRightSide_x = box.c1 + box.c1_span                                     // x-value of the right side of the box
            const boxRightSideOverlap = ctx.Int.val(boxTopSide_y).sub(segment.c2_lower)     // overlap of the segment on the right of the box
            const minimumX = ctx.Int.val(boxRightSide_x).add(boxRightSideOverlap)           // minimum upper x-value that the segment must have not to cut the box in the lower right corner
            return ctx.Or(
                ctx.LT(segment.c1_lower, maximumX),
                ctx.GT(segment.c1_higher, minimumX)
            )
        } else {
            const boxTopSide_y = box.c2.add(box.c2_span)                                    // y-value of the upper side of the box
            const boxLeftSideOverlap = segment.c2_higher.sub(box.c2)                        // overlap of the segment on the left of the box
            const maximumX = ctx.Int.val(box.c1).sub(boxLeftSideOverlap)                    // minimum upper y-value that the segment must have not to cut the box in the upper right corner

            const boxRightSide_x = box.c1 + box.c1_span                                     // x-value of the right side of the box
            const boxRightSideOverlap = boxTopSide_y.sub(segment.c2_lower)                  // overlap of the segment on the right of the box
            const minimumX = ctx.Int.val(boxRightSide_x).add(boxRightSideOverlap)           // minimum upper x-value that the segment must have not to cut the box in the lower right corner
            return ctx.Or(
                ctx.LT(segment.c1_lower, maximumX),
                ctx.GT(segment.c1_higher, minimumX)
            )
        }
    } else if (typeof box.c2 === 'number') {
        const boxTopSide_y = box.c2 + box.c2_span                                       // y-value of the upper side of the box
        const boxLeftSideOverlap = segment.c2_higher.sub(box.c2)                        // overlap of the segment on the left of the box
        const maximumX = box.c1.sub(boxLeftSideOverlap)                                 // minimum upper y-value that the segment must have not to cut the box in the upper right corner

        const boxRightSide_x = box.c1.add(box.c1_span)                                  // x-value of the right side of the box
        const boxRightSideOverlap = ctx.Int.val(boxTopSide_y).sub(segment.c2_lower)     // overlap of the segment on the right of the box
        const minimumX = boxRightSide_x.add(boxRightSideOverlap)                        // minimum upper x-value that the segment must have not to cut the box in the lower right corner
        return ctx.Or(
            ctx.LT(segment.c1_lower, maximumX),
            ctx.GT(segment.c1_higher, minimumX)
        )
    } else {
        const boxTopSide_y = box.c2.add(box.c2_span)                       // y-value of the upper side of the box
        const boxLeftSideOverlap = segment.c2_higher.sub(box.c2)           // overlap of the segment on the left of the box
        const maximumX = box.c1.sub(boxLeftSideOverlap)                    // minimum upper y-value that the segment must have not to cut the box in the upper right corner

        const boxRightSide_x = box.c1.add(box.c1_span)                     // x-value of the right side of the box
        const boxRightSideOverlap = boxTopSide_y.sub(segment.c2_lower)     // overlap of the segment on the right of the box
        const minimumX = boxRightSide_x.add(boxRightSideOverlap)           // minimum upper x-value that the segment must have not to cut the box in the lower right corner
        return ctx.Or(
            ctx.LT(segment.c1_lower, maximumX),
            ctx.GT(segment.c1_higher, minimumX)
        )
    }
}

// Helper function for the channelSegmentRoutingExclusionDistance function, ensuring that the minimum distance between a segment
// and a given box (e.g. exclusion zone) is kept for all points of the segment
export function segmentBoxDistanceDiagonal(ctx: Context, segment: {
                                               c1_lower: Arith,
                                               c2_lower: Arith,
                                               c1_higher: Arith,
                                               c2_higher: Arith
                                           }, isSlopePositive: boolean,
                                           box: {
                                               c1: Arith | number,
                                               c2: Arith | number,
                                               c1_span: number,
                                               c2_span: number
                                           }, min_distance: number) {

    if (typeof box.c1 == 'number') {
        if (typeof box.c2 == 'number') {
            const expandedBox = {
                c1: box.c1 - min_distance,
                c2: box.c2 - min_distance,
                c1_span: box.c1_span + min_distance,
                c2_span: box.c2_span + min_distance,
            }
            return isSlopePositive ? segmentBoxNoCrossSlopePos(ctx, segment, expandedBox) : segmentBoxNoCrossSlopeNeg(ctx, segment, expandedBox)
        } else {
            const expandedBox = {
                c1: box.c1 - min_distance,
                c2: box.c2.sub(min_distance),
                c1_span: box.c1_span + min_distance,
                c2_span: box.c2_span + min_distance
            }
            return isSlopePositive ? segmentBoxNoCrossSlopePos(ctx, segment, expandedBox) : segmentBoxNoCrossSlopeNeg(ctx, segment, expandedBox)
        }
    } else if (typeof box.c2 != 'number') {
        const expandedBox = {
            c1: box.c1.sub(min_distance),
            c2: box.c2.sub(min_distance),
            c1_span: box.c1_span + min_distance,
            c2_span: box.c2_span + min_distance
        }
        return isSlopePositive ? segmentBoxNoCrossSlopePos(ctx, segment, expandedBox) : segmentBoxNoCrossSlopeNeg(ctx, segment, expandedBox)
    } else {
        const expandedBox = {
            c1: box.c1.sub(min_distance),
            c2: box.c2 - min_distance,
            c1_span: box.c1_span + min_distance,
            c2_span: box.c2_span + min_distance
        }
        return isSlopePositive ? segmentBoxNoCrossSlopePos(ctx, segment, expandedBox) : segmentBoxNoCrossSlopeNeg(ctx, segment, expandedBox)
    }
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

export function segmentBoxNoCross(ctx: Context, segment: { c1_lower: Arith, c1_higher: Arith, c2: Arith }, box: {
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

export function channelSegmentRoutingExclusionNoCross(ctx: Context, channel: EncodedChannel, segment: number, exclusion: StaticRoutingExclusion) {
    return ctx.And(
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.Up),
            segmentBoxNoCross(ctx, {
                c1_lower: channel.encoding.waypoints[segment].y,
                c1_higher: channel.encoding.waypoints[segment + 1].y,
                c2: channel.encoding.waypoints[segment].x
            }, {
                c1: exclusion.position.y,
                c2: exclusion.position.x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            })
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.Down),
            segmentBoxNoCross(ctx, {
                c1_lower: channel.encoding.waypoints[segment + 1].y,
                c1_higher: channel.encoding.waypoints[segment].y,
                c2: channel.encoding.waypoints[segment].x
            }, {
                c1: exclusion.position.y,
                c2: exclusion.position.x,
                c1_span: exclusion.height,
                c2_span: exclusion.width
            })
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.Right),
            segmentBoxNoCross(ctx, {
                c1_lower: channel.encoding.waypoints[segment].x,
                c1_higher: channel.encoding.waypoints[segment + 1].x,
                c2: channel.encoding.waypoints[segment].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.Left),
            segmentBoxNoCross(ctx, {
                c1_lower: channel.encoding.waypoints[segment + 1].x,
                c1_higher: channel.encoding.waypoints[segment].x,
                c2: channel.encoding.waypoints[segment].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpRight),
            segmentBoxNoCrossSlopePos(ctx, {
                c1_lower: channel.encoding.waypoints[segment].x,
                c2_lower: channel.encoding.waypoints[segment].y,
                c1_higher: channel.encoding.waypoints[segment + 1].x,
                c2_higher: channel.encoding.waypoints[segment + 1].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownRight),
            segmentBoxNoCrossSlopeNeg(ctx, {
                c1_lower: channel.encoding.waypoints[segment].x,
                c2_lower: channel.encoding.waypoints[segment + 1].y,
                c1_higher: channel.encoding.waypoints[segment + 1].x,
                c2_higher: channel.encoding.waypoints[segment].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownLeft),
            segmentBoxNoCrossSlopePos(ctx, {
                c1_lower: channel.encoding.waypoints[segment + 1].x,
                c2_lower: channel.encoding.waypoints[segment + 1].y,
                c1_higher: channel.encoding.waypoints[segment].x,
                c2_higher: channel.encoding.waypoints[segment].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpLeft),
            segmentBoxNoCrossSlopeNeg(ctx, {
                c1_lower: channel.encoding.waypoints[segment + 1].x,
                c2_lower: channel.encoding.waypoints[segment].y,
                c1_higher: channel.encoding.waypoints[segment].x,
                c2_higher: channel.encoding.waypoints[segment + 1].y
            }, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            })
        )
    )
}


/** CHANNEL INTERSECTION HELPER METHODS */

// TESTED
export function verticalHorizontalNoCross(ctx: Context, segment_a: {
    c1: Arith,
    c2_lower: Arith,
    c2_higher: Arith
}, segment_b: { c1_lower: Arith, c1_higher: Arith, c2: Arith }) {
    return ctx.Or(
        ctx.LE(segment_b.c2, segment_a.c2_lower), // B entirely below A
        ctx.LE(segment_b.c1_higher, segment_a.c1), // B entirely left of A
        ctx.GE(segment_b.c2, segment_a.c2_higher), // B entirely above A
        ctx.GE(segment_b.c1_lower, segment_a.c1) // B entirely right of A
    )
}

// TESTED
export function horizontalVerticalNoCross(ctx: Context, segment_a: {
    c1_lower: Arith,
    c1_higher: Arith,
    c2: Arith
}, segment_b: { c1: Arith, c2_lower: Arith, c2_higher: Arith }) {

    return ctx.Or(
        ctx.LE(segment_b.c2_higher, segment_a.c2), // B entirely below A
        ctx.LE(segment_b.c1, segment_a.c1_lower), // B entirely left of A
        ctx.GE(segment_b.c2_lower, segment_a.c2), // B entirely above A
        ctx.GE(segment_b.c1, segment_a.c1_higher) // B entirely right of A
    )
}

// TESTED
export function verticalDiagonalNoCross(ctx: Context,
                                        segA: { c1: Arith, c2_lower: Arith, c2_higher: Arith },
                                        segB: {
                                            c1_lower: Arith,
                                            c2_lower: Arith,
                                            c1_higher: Arith,
                                            c2_higher: Arith
                                        }) {
    return ctx.Or(
        // General constraints
        ctx.LE(segB.c2_higher, segA.c2_lower), // B entirely below A
        ctx.LE(segB.c1_higher, segA.c1), // B entirely left of A
        ctx.GE(segB.c2_lower, segA.c2_higher), // B entirely above A
        ctx.GE(segB.c1_lower, segA.c1), // B entirely right of A

        // Extra constraints
        //ctx.GT(segB.c1_higher, (segB.c2_higher.sub(segA.c2_lower)).add(segA.c1)), // A and B can barely touch (one is spiked by the other)
        //ctx.LT(segB.c1_lower, (segA.c2_higher.sub(segB.c2_lower)).sub(segA.c1)) // A and B can barely touch (one is spiked by the other)
    )
}

// TESTED
export function horizontalDiagonalNoCross(ctx: Context,
                                          segA: { c1_lower: Arith, c1_higher: Arith, c2: Arith },
                                          segB: {
                                              c1_lower: Arith,
                                              c2_lower: Arith,
                                              c1_higher: Arith,
                                              c2_higher: Arith
                                          }) {
    return ctx.Or(
        // General constraints
        ctx.LE(segB.c2_higher, segA.c2), // B entirely below A
        ctx.LE(segB.c1_higher, segA.c1_lower), // B entirely left of A
        ctx.GE(segB.c2_lower, segA.c2), // B entirely above A
        ctx.GE(segB.c1_lower, segA.c1_higher), // B entirely right of A

        // Extra constraints
        //ctx.GT(segB.c2_higher, (segB.c1_higher.sub(segA.c1_lower)).add(segA.c2)), // A and B can barely touch (one is spiked by the other)
        //ctx.LT(segB.c2_lower, (segA.c1_higher.sub(segB.c1_lower)).sub(segA.c2)) // A and B can barely touch (one is spiked by the other)
    )
}

// TESTED
export function diagonalVerticalNoCross(ctx: Context,
                                        segA: {
                                            c1_lower: Arith,
                                            c1_higher: Arith,
                                            c2_lower: Arith,
                                            c2_higher: Arith
                                        },
                                        segB: { c1: Arith, c2_lower: Arith, c2_higher: Arith }) {
    return ctx.Or(
        // General constraints
        ctx.LE(segB.c2_higher, segA.c2_lower), // B entirely below A
        ctx.LE(segB.c1, segA.c1_lower), // B entirely left of A
        ctx.GE(segB.c2_lower, segA.c2_higher), // B entirely above A
        ctx.GE(segB.c1, segA.c1_higher), // B entirely right of A
    )
}

// TESTED
export function diagonalHorizontalNoCross(ctx: Context,
                                          segA: {
                                              c1_lower: Arith,
                                              c1_higher: Arith,
                                              c2_lower: Arith,
                                              c2_higher: Arith
                                          },
                                          segB: { c1_lower: Arith, c1_higher: Arith, c2: Arith }) {
    return ctx.Or(
        // General constraints
        ctx.LE(segB.c2, segA.c2_lower), // B entirely below A
        ctx.LE(segB.c1_higher, segA.c1_lower), // B entirely left of A
        ctx.GE(segB.c2, segA.c2_higher), // B entirely above A
        ctx.GE(segB.c1_lower, segA.c1_higher), // B entirely right of A
    )
}

// TESTED
export function diagonalDiagonalNoCross(ctx: Context,
                                        segA: {
                                            c1_lower: Arith,
                                            c1_higher: Arith,
                                            c2_lower: Arith,
                                            c2_higher: Arith
                                        },
                                        segB: {
                                            c1_lower: Arith,
                                            c1_higher: Arith,
                                            c2_lower: Arith,
                                            c2_higher: Arith
                                        }) {
    return ctx.Or(
        // General constraints
        ctx.LE(segB.c2_higher, segA.c2_lower), // B entirely below A
        ctx.LE(segB.c1_higher, segA.c1_lower), // B entirely left of A
        ctx.GE(segB.c2_lower, segA.c2_higher), // B entirely above A
        ctx.GE(segB.c1_lower, segA.c1_higher), // B entirely right of A
    )
}

// EXTRA CONSTRAINTS STILL TO BE ADAPTED FOR LESS STRICTNESS AND MORE ACCURACY
export function UpRiDoLeVerticalNoCrossExtra(ctx: Context,
                                             segA: {
                                                 c1_lower: Arith,
                                                 c1_higher: Arith,
                                                 c2_lower: Arith,
                                                 c2_higher: Arith
                                             },
                                             segB: { c1: Arith, c2_lower: Arith, c2_higher: Arith }) {
    return ctx.Or(
        // Extra constraints
        ctx.LT(segB.c2_higher, (segB.c1.sub(segA.c1_lower)).add(segA.c2_lower)), // A and B can barely touch (one is spiked by the other)
        ctx.GT(segB.c2_lower, (segA.c1_higher.sub(segB.c1)).sub(segA.c2_higher)) // A and B can barely touch (one is spiked by the other)
    )
}

export function UpLeDoRiVerticalNoCrossExtra(ctx: Context,
                                             segA: {
                                                 c1_lower: Arith,
                                                 c1_higher: Arith,
                                                 c2_lower: Arith,
                                                 c2_higher: Arith
                                             },
                                             segB: { c1: Arith, c2_lower: Arith, c2_higher: Arith }) {

    return ctx.Or(
        // Extra constraints
        ctx.LT(segB.c2_higher, (segA.c1_lower.sub(segB.c1)).add(segA.c2_lower)), // A and B can barely touch (one is spiked by the other)
        ctx.GT(segB.c2_lower, (segA.c1_higher.sub(segB.c1)).sub(segA.c2_higher)) // A and B can barely touch (one is spiked by the other)
    )
}

export function UpRiDoLeHorizontalNoCrossExtra(ctx: Context,
                                               segA: {
                                                   c1_lower: Arith,
                                                   c1_higher: Arith,
                                                   c2_lower: Arith,
                                                   c2_higher: Arith
                                               },
                                               segB: { c1_lower: Arith, c1_higher: Arith, c2: Arith }) {
    // Extra constraints
    return ctx.Or(
        ctx.LT(segB.c1_higher, (segA.c2_lower.sub(segB.c2)).add(segA.c1_lower)), // A and B can barely touch (one is spiked by the other)
        ctx.GT(segB.c1_lower, (segA.c1_higher).sub((segA.c2_higher.sub(segB.c2)))) // A and B can barely touch (one is spiked by the other)
    )
}

export function UpLeDoRiHorizontalNoCrossExtra(ctx: Context,
                                               segA: {
                                                   c1_lower: Arith,
                                                   c1_higher: Arith,
                                                   c2_lower: Arith,
                                                   c2_higher: Arith
                                               },
                                               segB: { c1_lower: Arith, c1_higher: Arith, c2: Arith }) {
    // Extra constraints
    return ctx.Or(
        ctx.LT(segB.c1_higher, (segA.c2_higher.sub(segB.c2)).add(segA.c1_lower)), // A and B can barely touch (one is spiked by the other)
        ctx.GT(segB.c1_lower, (segA.c1_higher).sub((segA.c2_lower.sub(segB.c2)))) // A and B can barely touch (one is spiked by the other)
    )
}


/** CHANNEL INTERSECTION METHOD **/
// adds constraints for all possible segment crossings (6x8 = 48 possible intersections)

export function channelSegmentsNoCross(ctx: Context, channel_a: EncodedChannel, segment_a: number, channel_b: EncodedChannel, segment_b: number) {

    console.log(channel_a.encoding.segments[segment_a].type)
    console.log(channel_b.encoding.segments[segment_b].type)

    // Defining segments A and B for further use and saving of duplicated code lines

    // SEGMENTS A //

    const upSegmentA = {
        c1: channel_a.encoding.waypoints[segment_a].x,
        c2_lower: channel_a.encoding.waypoints[segment_a].y,
        c2_higher: channel_a.encoding.waypoints[segment_a + 1].y
    }

    const downSegmentA = {
        c1: channel_a.encoding.waypoints[segment_a].x,
        c2_lower: channel_a.encoding.waypoints[segment_a + 1].y,
        c2_higher: channel_a.encoding.waypoints[segment_a].y
    }

    const rightSegmentA = {
        c1_lower: channel_a.encoding.waypoints[segment_a].x,
        c1_higher: channel_a.encoding.waypoints[segment_a + 1].x,
        c2: channel_a.encoding.waypoints[segment_a].y,
    }

    const leftSegmentA = {
        c1_lower: channel_a.encoding.waypoints[segment_a + 1].x,
        c1_higher: channel_a.encoding.waypoints[segment_a].x,
        c2: channel_a.encoding.waypoints[segment_a].y,
    }

    const upRightSegmentA = {
        c1_lower: channel_a.encoding.waypoints[segment_a].x,
        c2_lower: channel_a.encoding.waypoints[segment_a].y,
        c1_higher: channel_a.encoding.waypoints[segment_a + 1].x,
        c2_higher: channel_a.encoding.waypoints[segment_a + 1].y
    }

    const downRightSegmentA = {
        c1_lower: channel_a.encoding.waypoints[segment_a].x,
        c2_lower: channel_a.encoding.waypoints[segment_a + 1].y,
        c1_higher: channel_a.encoding.waypoints[segment_a + 1].x,
        c2_higher: channel_a.encoding.waypoints[segment_a].y
    }

    const downLeftSegmentA = {
        c1_lower: channel_a.encoding.waypoints[segment_a + 1].x,
        c2_lower: channel_a.encoding.waypoints[segment_a + 1].y,
        c1_higher: channel_a.encoding.waypoints[segment_a].x,
        c2_higher: channel_a.encoding.waypoints[segment_a].y
    }

    const upLeftSegmentA = {
        c1_lower: channel_a.encoding.waypoints[segment_a + 1].x,
        c2_lower: channel_a.encoding.waypoints[segment_a].y,
        c1_higher: channel_a.encoding.waypoints[segment_a].x,
        c2_higher: channel_a.encoding.waypoints[segment_a + 1].y
    }


    // SEGMENTS B //

    const upSegmentB = {
        c1: channel_b.encoding.waypoints[segment_b].x,
        c2_lower: channel_b.encoding.waypoints[segment_b].y,
        c2_higher: channel_b.encoding.waypoints[segment_b + 1].y
    }

    const downSegmentB = {
        c1: channel_b.encoding.waypoints[segment_b].x,
        c2_lower: channel_b.encoding.waypoints[segment_b + 1].y,
        c2_higher: channel_b.encoding.waypoints[segment_b].y
    }

    const rightSegmentB = {
        c1_lower: channel_b.encoding.waypoints[segment_b].x,
        c1_higher: channel_b.encoding.waypoints[segment_b + 1].x,
        c2: channel_b.encoding.waypoints[segment_b].y,
    }

    const leftSegmentB = {
        c1_lower: channel_b.encoding.waypoints[segment_b + 1].x,
        c1_higher: channel_b.encoding.waypoints[segment_b].x,
        c2: channel_b.encoding.waypoints[segment_b].y,
    }

    const upRightSegmentB = {
        c1_lower: channel_b.encoding.waypoints[segment_b].x,
        c2_lower: channel_b.encoding.waypoints[segment_b].y,
        c1_higher: channel_b.encoding.waypoints[segment_b + 1].x,
        c2_higher: channel_b.encoding.waypoints[segment_b + 1].y
    }

    const downRightSegmentB = {
        c1_lower: channel_b.encoding.waypoints[segment_b].x,
        c2_lower: channel_b.encoding.waypoints[segment_b + 1].y,
        c1_higher: channel_b.encoding.waypoints[segment_b + 1].x,
        c2_higher: channel_b.encoding.waypoints[segment_b].y
    }

    const downLeftSegmentB = {
        c1_lower: channel_b.encoding.waypoints[segment_b + 1].x,
        c2_lower: channel_b.encoding.waypoints[segment_b + 1].y,
        c1_higher: channel_b.encoding.waypoints[segment_b].x,
        c2_higher: channel_b.encoding.waypoints[segment_b].y
    }

    const upLeftSegmentB = {
        c1_lower: channel_b.encoding.waypoints[segment_b + 1].x,
        c2_lower: channel_b.encoding.waypoints[segment_b].y,
        c1_higher: channel_b.encoding.waypoints[segment_b].x,
        c2_higher: channel_b.encoding.waypoints[segment_b + 1].y
    }


    return ctx.And(
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Up),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right)
            ),
            verticalHorizontalNoCross(ctx, upSegmentA, rightSegmentB)
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Up),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left)
            ),
            verticalHorizontalNoCross(ctx, upSegmentA, leftSegmentB)
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Down),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right)
            ),
            verticalHorizontalNoCross(ctx, downSegmentA, rightSegmentB)
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Down),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left)
            ),
            verticalHorizontalNoCross(ctx, downSegmentA, leftSegmentB)
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Right),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up)
            ),
            horizontalVerticalNoCross(ctx, rightSegmentA, upSegmentB)
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Right),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down)
            ),
            horizontalVerticalNoCross(ctx, rightSegmentA, downSegmentB)
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Left),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up)
            ),
            horizontalVerticalNoCross(ctx, leftSegmentA, upSegmentB)
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Left),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down)
            ),
            horizontalVerticalNoCross(ctx, leftSegmentA, downSegmentB)
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Up),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight)
            ),
            verticalDiagonalNoCross(ctx, upSegmentA, upRightSegmentB)
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Up),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft)
            ),
            ctx.Or(
                verticalDiagonalNoCross(ctx, upSegmentA, downLeftSegmentB))
        )
    ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Down),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight)
            ),
            ctx.Or(
                verticalDiagonalNoCross(ctx, downSegmentA, upRightSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Down),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft)
            ),
            ctx.Or(
                verticalDiagonalNoCross(ctx, downSegmentA, downLeftSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Up),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight)
            ),
            ctx.Or(
                verticalDiagonalNoCross(ctx, upSegmentA, downRightSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Up),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft)
            ),
            ctx.Or(
                verticalDiagonalNoCross(ctx, upSegmentA, upLeftSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Down),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft)
            ),
            ctx.Or(
                verticalDiagonalNoCross(ctx, downSegmentA, upLeftSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Down),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight)
            ),
            ctx.Or(
                verticalDiagonalNoCross(ctx, downSegmentA, downRightSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Right),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight),
            ),
            ctx.Or(
                horizontalDiagonalNoCross(ctx, rightSegmentA, upRightSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Right),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft),
            ),
            ctx.Or(
                horizontalDiagonalNoCross(ctx, rightSegmentA, downLeftSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Left),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight),
            ),
            ctx.Or(
                horizontalDiagonalNoCross(ctx, leftSegmentA, upRightSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Left),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft),
            ),
            ctx.Or(
                horizontalDiagonalNoCross(ctx, leftSegmentA, downLeftSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Right),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft),
            ),
            ctx.Or(
                horizontalDiagonalNoCross(ctx, rightSegmentA, upLeftSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Right),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight),
            ),
            ctx.Or(
                horizontalDiagonalNoCross(ctx, rightSegmentA, downRightSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Left),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft),
            ),
            ctx.Or(
                horizontalDiagonalNoCross(ctx, leftSegmentA, upLeftSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Left),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight),
            ),
            ctx.Or(
                horizontalDiagonalNoCross(ctx, leftSegmentA, downRightSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up),
            ),
            ctx.Or(
                diagonalVerticalNoCross(ctx, upRightSegmentA, upSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down),
            ),
            ctx.Or(
                diagonalVerticalNoCross(ctx, upRightSegmentA, downSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up),
            ),
            ctx.Or(
                diagonalVerticalNoCross(ctx, downLeftSegmentA, upSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down),
            ),
            ctx.Or(
                diagonalVerticalNoCross(ctx, downLeftSegmentA, downSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up),
            ),
            ctx.Or(
                diagonalVerticalNoCross(ctx, upLeftSegmentA, upSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down),
            ),
            ctx.Or(
                diagonalVerticalNoCross(ctx, upLeftSegmentA, downSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up),
            ),
            ctx.Or(
                diagonalVerticalNoCross(ctx, downRightSegmentA, upSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down),
            ),
            ctx.Or(
                diagonalVerticalNoCross(ctx, downRightSegmentA, downSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right),
            ),
            ctx.Or(
                diagonalHorizontalNoCross(ctx, upRightSegmentA, rightSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left),
            ),
            ctx.Or(
                diagonalHorizontalNoCross(ctx, upRightSegmentA, leftSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right),
            ),
            ctx.Or(
                diagonalHorizontalNoCross(ctx, downLeftSegmentA, rightSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left),
            ),
            ctx.Or(
                diagonalHorizontalNoCross(ctx, downLeftSegmentA, leftSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right),
            ),
            ctx.Or(
                diagonalHorizontalNoCross(ctx, upLeftSegmentA, rightSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left),
            ),
            ctx.Or(
                diagonalHorizontalNoCross(ctx, upLeftSegmentA, leftSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right),
            ),
            ctx.Or(
                diagonalHorizontalNoCross(ctx, downRightSegmentA, rightSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left),
            ),
            ctx.Or(
                diagonalHorizontalNoCross(ctx, downRightSegmentA, leftSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft),
            ),
            ctx.Or(
                diagonalDiagonalNoCross(ctx, upRightSegmentA, upLeftSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight),
            ),
            ctx.Or(
                diagonalDiagonalNoCross(ctx, upRightSegmentA, downRightSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft),
            ),
            ctx.Or(
                diagonalDiagonalNoCross(ctx, downLeftSegmentA, upLeftSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight),
            ),
            ctx.Or(
                diagonalDiagonalNoCross(ctx, downLeftSegmentA, downRightSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight),
            ),
            ctx.Or(
                diagonalDiagonalNoCross(ctx, upLeftSegmentA, upRightSegmentB),
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft),
            ),
            ctx.Or(
                diagonalDiagonalNoCross(ctx, upLeftSegmentA, downLeftSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight),
            ),
            ctx.Or(
                diagonalDiagonalNoCross(ctx, downRightSegmentA, upRightSegmentB)
            )
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft),
            ),
            ctx.Or(
                diagonalDiagonalNoCross(ctx, downRightSegmentA, downLeftSegmentB)
            )
        )
}


/** OTHER HELPER METHODS */

function negate(ctx: Context, value: Arith | number) {
    return typeof value == 'number' ? -value : ctx.Neg(value)
}

function rotateOffset(ctx: Context, offset: {
    x: Arith | number,
    y: Arith | number
}, target_rotation: Orientation) {
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