import {Arith, Context} from "z3-solver";
import {StaticRoutingExclusion} from "../routingExclusion";
import {Orientation} from "../orientation";
import {EncodedChannel, SegmentType} from "../channel";
import {EncodedModule} from "../module";


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

// solving the point-segment distance problem by creating a square around the point with 2 * min_distance as the square length
// and then delegating that box and segment to the segmentBoxNoCross functions for diagonal elements
export function pointSegmentDistanceDiag(ctx: Context, point: { c1: Arith, c2: Arith },
                                         segment: {
                                             c1_lower: Arith,
                                             c2_lower: Arith,
                                             c1_higher: Arith,
                                             c2_higher: Arith
                                         }, min_distance: number, isSlopePositive: boolean) {
    const lowerLeft_x = point.c1.sub(min_distance)
    const lowerLeft_y = point.c2.sub(min_distance)
    const squareSpan = min_distance * 2

    const pointBox = {c1: lowerLeft_x, c2: lowerLeft_y, c1_span: squareSpan, c2_span: squareSpan}
    return isSlopePositive ? segmentBoxNoCrossSlopePos(ctx, segment, pointBox) : segmentBoxNoCrossSlopeNeg(ctx, segment, pointBox)
}

// Helper function for the waypointSegmentDistance function to determine whether the waypoint is the start or end of the segment that it is
// checked against --> obviously, it should then not be distanced from it
export function isPointStartOrEnd(ctx: Context, point: { c1: Arith, c2: Arith },
                                  segment: {
                                      start_x: Arith,
                                      start_y: Arith,
                                      end_x: Arith,
                                      end_y: Arith
                                  }) {
    return ctx.Or(
        ctx.And(ctx.Eq(point.c1, segment.start_x), ctx.Eq(point.c2, segment.start_y)),      // point equal to start
        ctx.And(ctx.Eq(point.c1, segment.end_x), ctx.Eq(point.c2, segment.end_y))           // point equal to end
    )
}

// Function to ensure a given minimum distance between the waypoint of a channel and a segment of the same or another channel
export function waypointSegmentDistance(ctx: Context, channel_a: EncodedChannel, waypoint_a: number, channel_b: EncodedChannel,
                                        segment_b: number, min_distance: number) {
    const point_x = channel_a.encoding.waypoints[waypoint_a].x
    const point_y = channel_a.encoding.waypoints[waypoint_a].y
    const thisSeg_x = channel_b.encoding.waypoints[segment_b].x
    const thisSeg_y = channel_b.encoding.waypoints[segment_b].y
    const nextSeg_x = channel_b.encoding.waypoints[segment_b + 1].x
    const nextSeg_y = channel_b.encoding.waypoints[segment_b + 1].y

    const isStartOrEnd = isPointStartOrEnd(ctx, {c1: point_x, c2: point_y}, {
        start_x: thisSeg_x,
        start_y: thisSeg_y,
        end_x: nextSeg_x,
        end_y: nextSeg_y
    })

    return ctx.And(
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up),
            pointSegmentDistance(ctx, {c1: point_y, c2: point_x}, {
                c1_lower: thisSeg_y,
                c1_higher: nextSeg_y,
                c2: thisSeg_x
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down),
            pointSegmentDistance(ctx, {c1: point_y, c2: point_x}, {
                c1_lower: nextSeg_y,
                c1_higher: thisSeg_y,
                c2: thisSeg_x
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right),
            pointSegmentDistance(ctx, {c1: point_x, c2: point_y}, {
                c1_lower: thisSeg_x,
                c1_higher: nextSeg_x,
                c2: thisSeg_y
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left),
            pointSegmentDistance(ctx, {c1: point_x, c2: point_y}, {
                c1_lower: nextSeg_x,
                c1_higher: thisSeg_x,
                c2: thisSeg_y
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight),
            ctx.Or(
                isStartOrEnd,
                pointSegmentDistanceDiag(ctx, {c1: point_x, c2: point_y}, {
                    c1_lower: thisSeg_x,
                    c2_lower: thisSeg_y,
                    c1_higher: nextSeg_x,
                    c2_higher: nextSeg_y
                }, min_distance, true)
            )
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight),
            ctx.Or(
                isStartOrEnd,
                pointSegmentDistanceDiag(ctx, {c1: point_x, c2: point_y}, {
                    c1_lower: thisSeg_x,
                    c2_lower: nextSeg_y,
                    c1_higher: nextSeg_x,
                    c2_higher: thisSeg_y
                }, min_distance, false)
            )
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft),
            ctx.Or(
                isStartOrEnd,
                pointSegmentDistanceDiag(ctx, {c1: point_x, c2: point_y}, {
                    c1_lower: nextSeg_x,
                    c2_lower: nextSeg_y,
                    c1_higher: thisSeg_x,
                    c2_higher: thisSeg_y
                }, min_distance, true)
            )
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft),
            ctx.Or(
                isStartOrEnd,
                pointSegmentDistanceDiag(ctx, {c1: point_x, c2: point_y}, {
                    c1_lower: nextSeg_x,
                    c2_lower: thisSeg_y,
                    c1_higher: thisSeg_x,
                    c2_higher: nextSeg_y
                }, min_distance, false)
            )
        )
    )
}

/** MIN DISTANCE METHODS AND HELPER METHODS */

// Helper function for the waypointRoutingExclusionDistance function, measuring distance between the point and a box
// using minDistanceAsym
export function pointBoxDistance(ctx: Context, point: { c1: Arith, c2: Arith },
                                 box: {
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

// Helper function for the channelSegmentRoutingExclusionDistance function, measuring distance from the vertical/horizontal segments
// and a given box (e.g. exclusion zone)
export function segmentBoxDistance(ctx: Context, segment: { c1_lower: Arith, c1_higher: Arith, c2: Arith },
                                   box: {
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
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpRight),
            segmentBoxDistanceDiagonal(ctx, {
                c1_lower: channel.encoding.waypoints[segment].x,
                c2_lower: channel.encoding.waypoints[segment].y,
                c1_higher: channel.encoding.waypoints[segment + 1].x,
                c2_higher: channel.encoding.waypoints[segment + 1].y
            }, true, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            }, min_distance)
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownRight),
            segmentBoxDistanceDiagonal(ctx, {
                c1_lower: channel.encoding.waypoints[segment].x,
                c2_lower: channel.encoding.waypoints[segment + 1].y,
                c1_higher: channel.encoding.waypoints[segment + 1].x,
                c2_higher: channel.encoding.waypoints[segment].y
            }, false, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            }, min_distance)
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownLeft),
            segmentBoxDistanceDiagonal(ctx, {
                c1_lower: channel.encoding.waypoints[segment + 1].x,
                c2_lower: channel.encoding.waypoints[segment + 1].y,
                c1_higher: channel.encoding.waypoints[segment].x,
                c2_higher: channel.encoding.waypoints[segment].y
            }, true, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            }, min_distance)
        ),
        ctx.Implies(
            channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpLeft),
            segmentBoxDistanceDiagonal(ctx, {
                c1_lower: channel.encoding.waypoints[segment + 1].x,
                c2_lower: channel.encoding.waypoints[segment].y,
                c1_higher: channel.encoding.waypoints[segment].x,
                c2_higher: channel.encoding.waypoints[segment + 1].y
            }, false, {
                c1: exclusion.position.x,
                c2: exclusion.position.y,
                c1_span: exclusion.width,
                c2_span: exclusion.height
            }, min_distance)
        )
    )
}


/** SEGMENT AND BOX/EXCLUSION-ZONE - NO CROSS METHODS AND HELPER METHODS */

export function segmentBoxNoCross(ctx: Context, segment: { c1_lower: Arith, c1_higher: Arith, c2: Arith },
                                  box: { c1: Arith | number, c2: Arith | number, c1_span: number, c2_span: number }) {
    return ctx.Or(
        ctx.LE(segment.c1_higher, box.c1),
        minDistanceAsym(ctx, box.c1, segment.c1_lower, box.c1_span),
        ctx.LE(segment.c2, box.c2),
        minDistanceAsym(ctx, box.c2, segment.c2, box.c2_span),
    )
}

// Helper function for several functions to check whether an UpRight/DownLeft segment crosses a given box (e.g. exclusion zone)
export function segmentBoxNoCrossSlopePos(ctx: Context, segment: {
                                              c1_lower: Arith,
                                              c2_lower: Arith,
                                              c1_higher: Arith,
                                              c2_higher: Arith
                                          },
                                          box: {
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
                ctx.GE(segment.c2_higher, minimumY),
                ctx.GE(segment.c1_higher, minimumX)
            )
        } else {
            const boxTopSide_y = box.c2.add(box.c2_span)                // y-value of the upper side of the box
            const boxUpperSideOverlap = segment.c1_higher.sub(box.c1)   // overlap of the segment above the box
            const minimumY = boxUpperSideOverlap.add(boxTopSide_y)      // minimum upper y-value that the segment must have not to cut the box in the upper right corner

            const boxRightSide_x = box.c1 + box.c1_span                 // x-value of the right side of the box
            const boxRightSideOverlap = segment.c2_higher.sub(box.c2)   // overlap of the segment on the right of the box
            const minimumX = boxRightSideOverlap.add(boxRightSide_x)    // minimum upper x-value that the segment must have not to cut the box in the lower right corner
            return ctx.Or(
                ctx.GE(segment.c2_higher, minimumY),
                ctx.GE(segment.c1_higher, minimumX)
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
            ctx.GE(segment.c2_higher, minimumY),
            ctx.GE(segment.c1_higher, minimumX)
        )
    } else {
        const boxTopSide_y = box.c2.add(box.c2_span)                   // y-value of the upper side of the box
        const boxUpperSideOverlap = segment.c1_higher.sub(box.c1)   // overlap of the segment above the box
        const minimumY = boxUpperSideOverlap.add(boxTopSide_y)      // minimum upper y-value that the segment must have not to cut the box in the upper right corner

        const boxRightSide_x = box.c1.add(box.c1_span)              // x-value of the right side of the box
        const boxRightSideOverlap = segment.c2_higher.sub(box.c2)   // overlap of the segment on the right of the box
        const minimumX = boxRightSideOverlap.add(boxRightSide_x)    // minimum upper x-value that the segment must have not to cut the box in the lower right corner
        return ctx.Or(
            ctx.GE(segment.c2_higher, minimumY),
            ctx.GE(segment.c1_higher, minimumX)
        )
    }
}

// Helper function for several functions to check whether an UpRight/DownLeft segment crosses a given box (e.g. exclusion zone)
export function segmentBoxNoCrossSlopeNeg(ctx: Context, segment: {
                                              c1_lower: Arith,
                                              c2_lower: Arith,
                                              c1_higher: Arith,
                                              c2_higher: Arith
                                          },
                                          box: {
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
                ctx.LE(segment.c1_lower, maximumX),
                ctx.GE(segment.c1_higher, minimumX)
            )
        } else {
            const boxTopSide_y = box.c2.add(box.c2_span)                                    // y-value of the upper side of the box
            const boxLeftSideOverlap = segment.c2_higher.sub(box.c2)                        // overlap of the segment on the left of the box
            const maximumX = ctx.Int.val(box.c1).sub(boxLeftSideOverlap)                    // minimum upper y-value that the segment must have not to cut the box in the upper right corner

            const boxRightSide_x = box.c1 + box.c1_span                                     // x-value of the right side of the box
            const boxRightSideOverlap = boxTopSide_y.sub(segment.c2_lower)                  // overlap of the segment on the right of the box
            const minimumX = ctx.Int.val(boxRightSide_x).add(boxRightSideOverlap)           // minimum upper x-value that the segment must have not to cut the box in the lower right corner
            return ctx.Or(
                ctx.LE(segment.c1_lower, maximumX),
                ctx.GE(segment.c1_higher, minimumX)
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
            ctx.LE(segment.c1_lower, maximumX),
            ctx.GE(segment.c1_higher, minimumX)
        )
    } else {
        const boxTopSide_y = box.c2.add(box.c2_span)                       // y-value of the upper side of the box
        const boxLeftSideOverlap = segment.c2_higher.sub(box.c2)           // overlap of the segment on the left of the box
        const maximumX = box.c1.sub(boxLeftSideOverlap)                    // minimum upper y-value that the segment must have not to cut the box in the upper right corner

        const boxRightSide_x = box.c1.add(box.c1_span)                     // x-value of the right side of the box
        const boxRightSideOverlap = boxTopSide_y.sub(segment.c2_lower)     // overlap of the segment on the right of the box
        const minimumX = boxRightSide_x.add(boxRightSideOverlap)           // minimum upper x-value that the segment must have not to cut the box in the lower right corner
        return ctx.Or(
            ctx.LE(segment.c1_lower, maximumX),
            ctx.GE(segment.c1_higher, minimumX)
        )
    }
}

// function ensuring that a given segment does not cross a static routing exclusion (e.g. cutout piece on the chip)
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

export function verticalHorizontalNoCross(ctx: Context, segment_a: { c1: Arith, c2_lower: Arith, c2_higher: Arith },
                                          segment_b: { c1_lower: Arith, c1_higher: Arith, c2: Arith }) {
    return ctx.Or(
        ctx.LE(segment_b.c2, segment_a.c2_lower), // B entirely below A
        ctx.LE(segment_b.c1_higher, segment_a.c1), // B entirely left of A
        ctx.GE(segment_b.c2, segment_a.c2_higher), // B entirely above A
        ctx.GE(segment_b.c1_lower, segment_a.c1) // B entirely right of A
    )
}

export function horizontalVerticalNoCross(ctx: Context, segment_a: { c1_lower: Arith, c1_higher: Arith, c2: Arith },
                                          segment_b: { c1: Arith, c2_lower: Arith, c2_higher: Arith }) {
    return verticalHorizontalNoCross(ctx, segment_b, segment_a)
}

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
    )
}

export function diagonalVerticalNoCross(ctx: Context,
                                        segA: { c1_lower: Arith, c1_higher: Arith, c2_lower: Arith, c2_higher: Arith },
                                        segB: { c1: Arith, c2_lower: Arith, c2_higher: Arith }) {
    return verticalDiagonalNoCross(ctx, segB, segA)
}

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
    )
}

export function diagonalHorizontalNoCross(ctx: Context,
                                          segA: {
                                              c1_lower: Arith,
                                              c1_higher: Arith,
                                              c2_lower: Arith,
                                              c2_higher: Arith
                                          },
                                          segB: { c1_lower: Arith, c1_higher: Arith, c2: Arith }) {
    return horizontalDiagonalNoCross(ctx, segB, segA)
}

export function diagonalDiagonalNoCross(ctx: Context,
                                        segA: { c1_lower: Arith, c1_higher: Arith, c2_lower: Arith, c2_higher: Arith },
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


// EXTRA CONSTRAINTS FOR LESS STRICTNESS AND MORE ACCURACY

export function verticalDiagonalPosNoCrossExtra(ctx: Context,
                                                segA: { c1: Arith, c2_lower: Arith, c2_higher: Arith },
                                                segB: {
                                                    c1_lower: Arith,
                                                    c2_lower: Arith,
                                                    c1_higher: Arith,
                                                    c2_higher: Arith
                                                }) {

    const delta_x = segA.c1.sub(segB.c1_lower)
    const segB_y_at_segA_c1 = segB.c2_lower.add(delta_x)
    return ctx.Or(
        ctx.LE(segB_y_at_segA_c1, segA.c2_lower),       // constraint for B just below A
        ctx.GE(segB_y_at_segA_c1, segA.c2_higher)       // constraint for B just above A
    )
}

export function diagonalPosVerticalNoCrossExtra(ctx: Context,
                                                segA: {
                                                    c1_lower: Arith,
                                                    c1_higher: Arith,
                                                    c2_lower: Arith,
                                                    c2_higher: Arith
                                                },
                                                segB: { c1: Arith, c2_lower: Arith, c2_higher: Arith }) {
    return verticalDiagonalPosNoCrossExtra(ctx, segB, segA)
}

export function horizontalDiagonalPosNoCrossExtra(ctx: Context,
                                                  segA: { c1_lower: Arith, c1_higher: Arith, c2: Arith },
                                                  segB: {
                                                      c1_lower: Arith,
                                                      c2_lower: Arith,
                                                      c1_higher: Arith,
                                                      c2_higher: Arith
                                                  }) {
    const delta_y = segA.c2.sub(segB.c2_lower)
    const segB_x_at_segA_c2 = segB.c1_lower.add(delta_y)
    return ctx.Or(
        ctx.LE(segB_x_at_segA_c2, segA.c1_lower),       // constraint for B just left of A
        ctx.GE(segB_x_at_segA_c2, segA.c1_higher)       // constraint for B just right of A
    )
}

export function diagonalPosHorizontalNoCrossExtra(ctx: Context,
                                                  segA: {
                                                      c1_lower: Arith,
                                                      c1_higher: Arith,
                                                      c2_lower: Arith,
                                                      c2_higher: Arith
                                                  },
                                                  segB: { c1_lower: Arith, c1_higher: Arith, c2: Arith }) {
    return horizontalDiagonalPosNoCrossExtra(ctx, segB, segA)
}


export function verticalDiagonalNegNoCrossExtra(ctx: Context,
                                                segA: { c1: Arith, c2_lower: Arith, c2_higher: Arith },
                                                segB: {
                                                    c1_lower: Arith,
                                                    c1_higher: Arith,
                                                    c2_lower: Arith,
                                                    c2_higher: Arith
                                                }) {
    const delta_x = segB.c1_higher.sub(segA.c1)
    const segB_y_at_segA_c1 = segB.c2_lower.add(delta_x)
    return ctx.Or(
        ctx.LE(segB_y_at_segA_c1, segA.c2_lower),       // constraint for B just below A
        ctx.GE(segB_y_at_segA_c1, segA.c2_higher)       // constraint for B just above A
    )
}

export function diagonalNegVerticalNoCrossExtra(ctx: Context,
                                                segA: {
                                                    c1_lower: Arith,
                                                    c1_higher: Arith,
                                                    c2_lower: Arith,
                                                    c2_higher: Arith
                                                },
                                                segB: { c1: Arith, c2_lower: Arith, c2_higher: Arith }) {
    return verticalDiagonalNegNoCrossExtra(ctx, segB, segA)
}


export function horizontalDiagonalNegNoCrossExtra(ctx: Context,
                                                  segA: { c1_lower: Arith, c1_higher: Arith, c2: Arith },
                                                  segB: {
                                                      c1_lower: Arith,
                                                      c1_higher: Arith,
                                                      c2_lower: Arith,
                                                      c2_higher: Arith
                                                  }) {
    const delta_y = segB.c2_higher.sub(segA.c2)
    const segB_x_at_segA_c2 = segB.c1_lower.add(delta_y)
    return ctx.Or(
        ctx.LE(segB_x_at_segA_c2, segA.c1_lower),       // constraint for B just below A
        ctx.GE(segB_x_at_segA_c2, segA.c1_higher)       // constraint for B just above A
    )
}

export function diagonalNegHorizontalNoCrossExtra(ctx: Context,
                                                  segA: {
                                                      c1_lower: Arith,
                                                      c1_higher: Arith,
                                                      c2_lower: Arith,
                                                      c2_higher: Arith
                                                  },
                                                  segB: { c1_lower: Arith, c1_higher: Arith, c2: Arith }) {
    return horizontalDiagonalNegNoCrossExtra(ctx, segB, segA)
}


// Helper methods for the diagonalDiagonalNoCrossExtra function that transform diagonal elements into corresponding horizontal and vertical segments
function transformPoint(point: { x: Arith, y: Arith }) {
    const newX = point.x.sub(point.y)
    const newY = point.x.add(point.y)
    return {x: newX, y: newY}
}

function transformSegment(seg: { start_x: Arith, start_y: Arith, end_x: Arith, end_y: Arith }) {
    const newStart = transformPoint({x: seg.start_x, y: seg.start_y})
    const newEnd = transformPoint({x: seg.end_x, y: seg.end_y})
    return {start_x: newStart.x, start_y: newStart.y, end_x: newEnd.x, end_y: newEnd.y}
}

// Method than converts the two diagonal segments into horizontal/vertical ones so that checks for crossings are simpler and
// existing functionality can be reused again
export function diagonalDiagonalNoCrossExtra(ctx: Context,
                                             segPositiveSlope: {
                                                 start_x: Arith,
                                                 start_y: Arith,
                                                 end_x: Arith,
                                                 end_y: Arith
                                             },
                                             segNegativeSlope: {
                                                 start_x: Arith,
                                                 start_y: Arith,
                                                 end_x: Arith,
                                                 end_y: Arith
                                             }) {

    const newVerticalSeg = transformSegment(segPositiveSlope)
    const newHorizontalSeg = transformSegment(segNegativeSlope)

    return verticalHorizontalNoCross(ctx, {
            c1: newVerticalSeg.start_x,
            c2_lower: newVerticalSeg.start_y,
            c2_higher: newVerticalSeg.end_y
        },
        {c1_lower: newHorizontalSeg.start_x, c1_higher: newHorizontalSeg.end_x, c2: newHorizontalSeg.start_y},)
}


/** CHANNEL INTERSECTION METHOD **/

// adds constraints for all possible segment crossings (6x8 = 48 possible intersections)
export function channelSegmentsNoCross(ctx: Context, channel_a: EncodedChannel, segment_a: number, channel_b: EncodedChannel, segment_b: number, modules?: EncodedModule[]) {

    if (modules) {
        const module1 = modules[channel_a.from.module]
        const module2 = modules[channel_b.from.module]

        if (module1.placement !== module2.placement) {
            return ctx.And()
        }
    }

    // defining variables for waypoints for cleaner code
    const waypointsA = channel_a.encoding.waypoints
    const waypointsB = channel_b.encoding.waypoints

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
            ctx.Or(verticalDiagonalNoCross(ctx, upSegmentA, upRightSegmentB), verticalDiagonalPosNoCrossExtra(ctx, upSegmentA, upRightSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Up),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft)
            ),
            ctx.Or(verticalDiagonalNoCross(ctx, upSegmentA, downLeftSegmentB), verticalDiagonalPosNoCrossExtra(ctx, upSegmentA, downLeftSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Down),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight)
            ),
            ctx.Or(verticalDiagonalNoCross(ctx, downSegmentA, upRightSegmentB), verticalDiagonalPosNoCrossExtra(ctx, downSegmentA, upRightSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Down),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft)
            ),
            ctx.Or(verticalDiagonalNoCross(ctx, downSegmentA, downLeftSegmentB), verticalDiagonalPosNoCrossExtra(ctx, downSegmentA, downLeftSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Up),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight)
            ),
            ctx.Or(verticalDiagonalNoCross(ctx, upSegmentA, downRightSegmentB), verticalDiagonalNegNoCrossExtra(ctx, upSegmentA, downRightSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Up),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft)
            ),
            ctx.Or(verticalDiagonalNoCross(ctx, upSegmentA, upLeftSegmentB), verticalDiagonalNegNoCrossExtra(ctx, upSegmentA, upLeftSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Down),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft)
            ),
            ctx.Or(verticalDiagonalNoCross(ctx, downSegmentA, upLeftSegmentB), verticalDiagonalNegNoCrossExtra(ctx, downSegmentA, upLeftSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Down),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight)
            ),
            ctx.Or(verticalDiagonalNoCross(ctx, downSegmentA, downRightSegmentB), verticalDiagonalNegNoCrossExtra(ctx, downSegmentA, downRightSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Right),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight),
            ),
            ctx.Or(horizontalDiagonalNoCross(ctx, rightSegmentA, upRightSegmentB), horizontalDiagonalPosNoCrossExtra(ctx, rightSegmentA, upRightSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Right),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft),
            ),
            ctx.Or(horizontalDiagonalNoCross(ctx, rightSegmentA, downLeftSegmentB), horizontalDiagonalPosNoCrossExtra(ctx, rightSegmentA, downLeftSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Left),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight),
            ),
            ctx.Or(horizontalDiagonalNoCross(ctx, leftSegmentA, upRightSegmentB), horizontalDiagonalPosNoCrossExtra(ctx, leftSegmentA, upRightSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Left),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft),
            ),
            ctx.Or(horizontalDiagonalNoCross(ctx, leftSegmentA, downLeftSegmentB), horizontalDiagonalPosNoCrossExtra(ctx, leftSegmentA, downLeftSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Right),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft),
            ),
            ctx.Or(horizontalDiagonalNoCross(ctx, rightSegmentA, upLeftSegmentB), horizontalDiagonalNegNoCrossExtra(ctx, rightSegmentA, upLeftSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Right),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight),
            ),
            ctx.Or(horizontalDiagonalNoCross(ctx, rightSegmentA, downRightSegmentB), horizontalDiagonalNegNoCrossExtra(ctx, rightSegmentA, downRightSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Left),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft),
            ),
            ctx.Or(horizontalDiagonalNoCross(ctx, leftSegmentA, upLeftSegmentB), horizontalDiagonalNegNoCrossExtra(ctx, leftSegmentA, upLeftSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.Left),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight),
            ),
            ctx.Or(horizontalDiagonalNoCross(ctx, leftSegmentA, downRightSegmentB), horizontalDiagonalNegNoCrossExtra(ctx, leftSegmentA, downRightSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up),
            ),
            ctx.Or(diagonalVerticalNoCross(ctx, upRightSegmentA, upSegmentB), diagonalPosVerticalNoCrossExtra(ctx, upRightSegmentA, upSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down),
            ),
            ctx.Or(diagonalVerticalNoCross(ctx, upRightSegmentA, downSegmentB), diagonalPosVerticalNoCrossExtra(ctx, upRightSegmentA, downSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up),
            ),
            ctx.Or(diagonalVerticalNoCross(ctx, downLeftSegmentA, upSegmentB), diagonalPosVerticalNoCrossExtra(ctx, downLeftSegmentA, upSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down),
            ),
            ctx.Or(diagonalVerticalNoCross(ctx, downLeftSegmentA, downSegmentB), diagonalPosVerticalNoCrossExtra(ctx, downLeftSegmentA, downSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up),
            ),
            ctx.Or(diagonalVerticalNoCross(ctx, upLeftSegmentA, upSegmentB), diagonalNegVerticalNoCrossExtra(ctx, upLeftSegmentA, upSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down),
            ),
            ctx.Or(diagonalVerticalNoCross(ctx, upLeftSegmentA, downSegmentB), diagonalNegVerticalNoCrossExtra(ctx, upLeftSegmentA, downSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up),
            ),
            ctx.Or(diagonalVerticalNoCross(ctx, downRightSegmentA, upSegmentB), diagonalNegVerticalNoCrossExtra(ctx, downRightSegmentA, upSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down),
            ),
            ctx.Or(diagonalVerticalNoCross(ctx, downRightSegmentA, downSegmentB), diagonalNegVerticalNoCrossExtra(ctx, downRightSegmentA, downSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right),
            ),
            ctx.Or(diagonalHorizontalNoCross(ctx, upRightSegmentA, rightSegmentB), diagonalPosHorizontalNoCrossExtra(ctx, upRightSegmentA, rightSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left),
            ),
            ctx.Or(diagonalHorizontalNoCross(ctx, upRightSegmentA, leftSegmentB), diagonalPosHorizontalNoCrossExtra(ctx, upRightSegmentA, leftSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right),
            ),
            ctx.Or(diagonalHorizontalNoCross(ctx, downLeftSegmentA, rightSegmentB), diagonalPosHorizontalNoCrossExtra(ctx, downLeftSegmentA, rightSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left),
            ),
            ctx.Or(diagonalHorizontalNoCross(ctx, downLeftSegmentA, leftSegmentB), diagonalPosHorizontalNoCrossExtra(ctx, downLeftSegmentA, leftSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right),
            ),
            ctx.Or(diagonalHorizontalNoCross(ctx, upLeftSegmentA, rightSegmentB), diagonalNegHorizontalNoCrossExtra(ctx, upLeftSegmentA, rightSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left),
            ),
            ctx.Or(diagonalHorizontalNoCross(ctx, upLeftSegmentA, leftSegmentB), diagonalNegHorizontalNoCrossExtra(ctx, upLeftSegmentA, leftSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right),
            ),
            ctx.Or(diagonalHorizontalNoCross(ctx, downRightSegmentA, rightSegmentB), diagonalNegHorizontalNoCrossExtra(ctx, downRightSegmentA, rightSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left),
            ),
            ctx.Or(diagonalHorizontalNoCross(ctx, downRightSegmentA, leftSegmentB), diagonalNegHorizontalNoCrossExtra(ctx, downRightSegmentA, leftSegmentB))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft),
            ),
            ctx.Or(diagonalDiagonalNoCross(ctx, upRightSegmentA, upLeftSegmentB), diagonalDiagonalNoCrossExtra(ctx, {
                    start_x: waypointsA[segment_a].x,
                    start_y: waypointsA[segment_a].y,
                    end_x: waypointsA[segment_a + 1].x,
                    end_y: waypointsA[segment_a + 1].y
                },
                {
                    start_x: waypointsB[segment_b + 1].x,
                    start_y: waypointsB[segment_b + 1].y,
                    end_x: waypointsB[segment_b].x,
                    end_y: waypointsB[segment_b].y
                }))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight),
            ),
            ctx.Or(diagonalDiagonalNoCross(ctx, upRightSegmentA, downRightSegmentB), diagonalDiagonalNoCrossExtra(ctx, {
                    start_x: waypointsA[segment_a].x,
                    start_y: waypointsA[segment_a].y,
                    end_x: waypointsA[segment_a + 1].x,
                    end_y: waypointsA[segment_a + 1].y
                },
                {
                    start_x: waypointsB[segment_b].x,
                    start_y: waypointsB[segment_b].y,
                    end_x: waypointsB[segment_b + 1].x,
                    end_y: waypointsB[segment_b + 1].y
                }))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft),
            ),
            ctx.Or(diagonalDiagonalNoCross(ctx, downLeftSegmentA, upLeftSegmentB), diagonalDiagonalNoCrossExtra(ctx, {
                    start_x: waypointsA[segment_a + 1].x,
                    start_y: waypointsA[segment_a + 1].y,
                    end_x: waypointsA[segment_a].x,
                    end_y: waypointsA[segment_a].y
                },
                {
                    start_x: waypointsB[segment_b + 1].x,
                    start_y: waypointsB[segment_b + 1].y,
                    end_x: waypointsB[segment_b].x,
                    end_y: waypointsB[segment_b].y
                }))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight),
            ),
            ctx.Or(diagonalDiagonalNoCross(ctx, downLeftSegmentA, downRightSegmentB), diagonalDiagonalNoCrossExtra(ctx, {
                    start_x: waypointsA[segment_a + 1].x,
                    start_y: waypointsA[segment_a + 1].y,
                    end_x: waypointsA[segment_a].x,
                    end_y: waypointsA[segment_a].y
                },
                {
                    start_x: waypointsB[segment_b].x,
                    start_y: waypointsB[segment_b].y,
                    end_x: waypointsB[segment_b + 1].x,
                    end_y: waypointsB[segment_b + 1].y
                }))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight),
            ),
            ctx.Or(diagonalDiagonalNoCross(ctx, upLeftSegmentA, upRightSegmentB), diagonalDiagonalNoCrossExtra(ctx, {
                    start_x: waypointsB[segment_b].x,
                    start_y: waypointsB[segment_b].y,
                    end_x: waypointsB[segment_b + 1].x,
                    end_y: waypointsB[segment_b + 1].y
                },
                {
                    start_x: waypointsA[segment_a + 1].x,
                    start_y: waypointsA[segment_a + 1].y,
                    end_x: waypointsA[segment_a].x,
                    end_y: waypointsA[segment_a].y
                }))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.UpLeft),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft),
            ),
            ctx.Or(diagonalDiagonalNoCross(ctx, upLeftSegmentA, downLeftSegmentB), diagonalDiagonalNoCrossExtra(ctx, {
                    start_x: waypointsB[segment_b + 1].x,
                    start_y: waypointsB[segment_b + 1].y,
                    end_x: waypointsB[segment_b].x,
                    end_y: waypointsB[segment_b].y
                },
                {
                    start_x: waypointsA[segment_a + 1].x,
                    start_y: waypointsA[segment_a + 1].y,
                    end_x: waypointsA[segment_a].x,
                    end_y: waypointsA[segment_a].y
                }))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight),
            ),
            ctx.Or(diagonalDiagonalNoCross(ctx, downRightSegmentA, upRightSegmentB), diagonalDiagonalNoCrossExtra(ctx, {
                    start_x: waypointsB[segment_b].x,
                    start_y: waypointsB[segment_b].y,
                    end_x: waypointsB[segment_b + 1].x,
                    end_y: waypointsB[segment_b + 1].y
                },
                {
                    start_x: waypointsA[segment_a].x,
                    start_y: waypointsA[segment_a].y,
                    end_x: waypointsA[segment_a + 1].x,
                    end_y: waypointsA[segment_a + 1].y
                }))
        ),
        ctx.Implies(
            ctx.And(
                channel_a.encoding.segments[segment_a].type.eq(ctx, SegmentType.DownRight),
                channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft),
            ),
            ctx.Or(diagonalDiagonalNoCross(ctx, downRightSegmentA, downLeftSegmentB), diagonalDiagonalNoCrossExtra(ctx, {
                    start_x: waypointsB[segment_b + 1].x,
                    start_y: waypointsB[segment_b + 1].y,
                    end_x: waypointsB[segment_b].x,
                    end_y: waypointsB[segment_b].y
                },
                {
                    start_x: waypointsA[segment_a].x,
                    start_y: waypointsA[segment_a].y,
                    end_x: waypointsA[segment_a + 1].x,
                    end_y: waypointsA[segment_a + 1].y
                }))
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