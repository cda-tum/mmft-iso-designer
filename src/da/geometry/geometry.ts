import {Arith, Context} from "z3-solver";
import {
    EncodedDynamicModuleRoutingExclusion,
    RoutingExclusion,
    StaticChipRoutingExclusion
} from "../components/routingExclusion";
import {Orientation} from "./orientation";
import {EncodedChannel, SegmentType} from "../components/channel";
import {EncodedModule} from "../components/module";
import {smtSum} from "../utils";

/** MINIMUM COORDINATE-COORDINATE DISTANCE CALCULATION METHODS */

// TESTED
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

// TESTED
// Helper function to calculate symmetric distance
export function minDistanceSym(ctx: Context, c1: Arith | number, c2: Arith | number, distance: Arith | number) {
    return ctx.Or(
        minDistanceAsym(ctx, c1, c2, distance),
        minDistanceAsym(ctx, c2, c1, distance)
    )
}


/** MINIMUM POINT-SEGMENT DISTANCE CALCULATION METHODS */

// TESTED
// method to determine if a point keeps the minimal distance from a vertical or horizontal segment
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
export function pointSegmentDistanceDiag(ctx: Context, point: { x: Arith, y: Arith },
                                         segment: {
                                             x_lower: Arith,
                                             y_lower: Arith,
                                             x_higher: Arith,
                                             y_higher: Arith
                                         }, min_distance: number, isSlopePositive: boolean) {
    const lowerLeft_x = point.x.sub(min_distance)
    const lowerLeft_y = point.y.sub(min_distance)
    const squareSpan = min_distance * 2

    const pointBox = {x: lowerLeft_x, y: lowerLeft_y, x_span: squareSpan, y_span: squareSpan}
    return isSlopePositive ? segmentBoxNoCrossSlopePos(ctx, segment, pointBox) : segmentBoxNoCrossSlopeNeg(ctx, segment, pointBox)
}

// Helper function for the waypointSegmentDistance function to determine whether the waypoint is the start or end of the segment that it is
// checked against --> obviously, it should then not be distanced from it
export function isPointStartOrEnd(ctx: Context, point: { x: Arith, y: Arith },
                                  segment: {
                                      start_x: Arith,
                                      start_y: Arith,
                                      end_x: Arith,
                                      end_y: Arith
                                  }) {
    return ctx.Or(
        ctx.And(ctx.Eq(point.x, segment.start_x), ctx.Eq(point.y, segment.start_y)),      // point equal to start
        ctx.And(ctx.Eq(point.x, segment.end_x), ctx.Eq(point.y, segment.end_y))           // point equal to end
    )
}

// Function to ensure a given minimum distance between the waypoint of a channel and a segment of the same or another channel
export function waypointSegmentDistance(ctx: Context, channel_a: EncodedChannel, waypoint_a: number, channel_b: EncodedChannel,
                                        segment_b: number, min_distance: number) {
    const point_x = channel_a.encoding.waypoints[waypoint_a].x
    const point_y = channel_a.encoding.waypoints[waypoint_a].y
    const segmentStart_x = channel_b.encoding.waypoints[segment_b].x
    const segmentStart_y = channel_b.encoding.waypoints[segment_b].y
    const segmentEnd_x = channel_b.encoding.waypoints[segment_b + 1].x
    const segmentEnd_y = channel_b.encoding.waypoints[segment_b + 1].y

    const isStartOrEnd = isPointStartOrEnd(ctx, {x: point_x, y: point_y}, {
        start_x: segmentStart_x,
        start_y: segmentStart_y,
        end_x: segmentEnd_x,
        end_y: segmentEnd_y
    })

    return ctx.And(
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Up),
            pointSegmentDistance(ctx, {c1: point_y, c2: point_x}, {
                c1_lower: segmentStart_y,
                c1_higher: segmentEnd_y,
                c2: segmentStart_x
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Down),
            pointSegmentDistance(ctx, {c1: point_y, c2: point_x}, {
                c1_lower: segmentEnd_y,
                c1_higher: segmentStart_y,
                c2: segmentStart_x
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Right),
            pointSegmentDistance(ctx, {c1: point_x, c2: point_y}, {
                c1_lower: segmentStart_x,
                c1_higher: segmentEnd_x,
                c2: segmentStart_y
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.Left),
            pointSegmentDistance(ctx, {c1: point_x, c2: point_y}, {
                c1_lower: segmentEnd_x,
                c1_higher: segmentStart_x,
                c2: segmentStart_y
            }, min_distance)
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpRight),
            ctx.Or(
                isStartOrEnd,
                pointSegmentDistanceDiag(ctx, {x: point_x, y: point_y}, {
                    x_lower: segmentStart_x,
                    y_lower: segmentStart_y,
                    x_higher: segmentEnd_x,
                    y_higher: segmentEnd_y
                }, min_distance, true)
            )
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownRight),
            ctx.Or(
                isStartOrEnd,
                pointSegmentDistanceDiag(ctx, {x: point_x, y: point_y}, {
                    x_lower: segmentStart_x,
                    y_lower: segmentEnd_y,
                    x_higher: segmentEnd_x,
                    y_higher: segmentStart_y
                }, min_distance, false)
            )
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.DownLeft),
            ctx.Or(
                isStartOrEnd,
                pointSegmentDistanceDiag(ctx, {x: point_x, y: point_y}, {
                    x_lower: segmentEnd_x,
                    y_lower: segmentEnd_y,
                    x_higher: segmentStart_x,
                    y_higher: segmentStart_y
                }, min_distance, true)
            )
        ),
        ctx.Implies(
            channel_b.encoding.segments[segment_b].type.eq(ctx, SegmentType.UpLeft),
            ctx.Or(
                isStartOrEnd,
                pointSegmentDistanceDiag(ctx, {x: point_x, y: point_y}, {
                    x_lower: segmentEnd_x,
                    y_lower: segmentStart_y,
                    x_higher: segmentStart_x,
                    y_higher: segmentEnd_y
                }, min_distance, false)
            )
        )
    )
}

/** DIFFERENT MINIMUM DISTANCE METHODS AND HELPER METHODS */

// Helper function for the waypointRoutingExclusionDistance function, measuring distance between the point and a box
// using minDistanceAsym
export function pointBoxMinDistance(ctx: Context, point: { c1: Arith, c2: Arith },
                                    box: {
                                        c1: Arith | number,
                                        c2: Arith | number,
                                        c1_span: Arith | number,
                                        c2_span: Arith | number
                                    }, min_distance: number) {
    const minDistC1Span = typeof box.c1_span === "number" ? box.c1_span + min_distance : box.c1_span.add(min_distance)
    const minDistC2Span = typeof box.c2_span === "number" ? box.c2_span + min_distance : box.c2_span.add(min_distance)
    return ctx.Or(
        minDistanceAsym(ctx, point.c1, box.c1, min_distance),
        minDistanceAsym(ctx, point.c2, box.c2, min_distance),
        minDistanceAsym(ctx, box.c1, point.c1, minDistC1Span),
        minDistanceAsym(ctx, box.c2, point.c2, minDistC2Span)
    )
}

// Helper function for the channelSegmentRoutingExclusionDistance function, measuring distance from the vertical/horizontal segments
// and a given box (e.g. exclusion zone)
export function segmentBoxMinDistance(ctx: Context, segment: { c1_lower: Arith, c1_higher: Arith, c2: Arith },
                                      box: {
                                          x: Arith | number,
                                          y: Arith | number,
                                          x_span: Arith | number,
                                          y_span: Arith | number
                                      }, min_distance: number) {
    const minDistC1Span = typeof box.x_span === "number" ? box.x_span + min_distance : box.x_span.add(min_distance)
    const minDistC2Span = typeof box.y_span === "number" ? box.y_span + min_distance : box.y_span.add(min_distance)
    return ctx.Or(
        minDistanceAsym(ctx, segment.c1_higher, box.x, min_distance),
        minDistanceAsym(ctx, box.x, segment.c1_lower, minDistC1Span),
        minDistanceAsym(ctx, segment.c2, box.y, min_distance),
        minDistanceAsym(ctx, box.y, segment.c2, minDistC2Span)
    )
}

// Helper function for the channelSegmentRoutingExclusionDistance function, ensuring that the minimum distance between a segment
// and a given box (e.g. exclusion zone) is kept for all points of the segment
export function segmentBoxMinDistanceDiagonal(ctx: Context, segment: {
                                                  x_lower: Arith,
                                                  y_lower: Arith,
                                                  x_higher: Arith,
                                                  y_higher: Arith
                                              }, isSlopePositive: boolean,
                                              box: {
                                                  x: Arith | number,
                                                  y: Arith | number,
                                                  x_span: Arith | number,
                                                  y_span: Arith | number
                                              }, min_distance: number) {
    const c1SubMinDist = typeof box.x === "number" ? box.x - min_distance : box.x.sub(min_distance)
    const c2SubMinDist = typeof box.y === "number" ? box.y - min_distance : box.y.sub(min_distance)
    const minDistC1Span = typeof box.x_span === "number" ? box.x_span + min_distance : box.x_span.add(min_distance)
    const minDistC2Span = typeof box.y_span === "number" ? box.y_span + min_distance : box.y_span.add(min_distance)

    const expandedBox = {
        x: c1SubMinDist,
        y: c2SubMinDist,
        x_span: minDistC1Span,
        y_span: minDistC2Span,
    }
    return isSlopePositive ? segmentBoxNoCrossSlopePos(ctx, segment, expandedBox) : segmentBoxNoCrossSlopeNeg(ctx, segment, expandedBox)
}

// Function to ensure a given minimum distance between two boxes (e.g. pin module exclusion zone and module)
export function boxBoxMinDistance(ctx: Context,
                                  boxA: {
                                      x: Arith | number,
                                      y: Arith | number,
                                      x_span: Arith | number,
                                      y_span: Arith | number
                                  },
                                  boxB: {
                                      x: Arith | number,
                                      y: Arith | number,
                                      x_span: Arith | number,
                                      y_span: Arith | number
                                  }, min_distance: number) {

    const lowerX_A = boxA.x
    const higherX_A = typeof boxA.x_span !== "number" ? boxA.x_span.add(lowerX_A) : typeof lowerX_A !== "number" ? lowerX_A.add(boxA.x_span) : lowerX_A + boxA.x_span
    const lowerY_A = boxA.y
    const higherY_A = typeof boxA.y_span !== "number" ? boxA.y_span.add(lowerY_A) : typeof lowerY_A !== "number" ? lowerY_A.add(boxA.y_span) : lowerY_A + boxA.y_span

    const lowerX_B = boxB.x
    const higherX_B = typeof boxB.x_span !== "number" ? boxB.x_span.add(lowerX_B) : typeof lowerX_B !== "number" ? lowerX_B.add(boxB.x_span) : lowerX_B + boxB.x_span
    const lowerY_B = boxB.y
    const higherY_B = typeof boxB.y_span !== "number" ? boxB.y_span.add(lowerY_B) : typeof lowerY_B !== "number" ? lowerY_B.add(boxB.y_span) : lowerY_B + boxB.y_span

    const subLowerX_B = typeof lowerX_B !== "number" ? lowerX_B.sub(min_distance) : lowerX_B - min_distance
    const sumHigherX_B = typeof higherX_B !== "number" ? higherX_B.add(min_distance) : higherX_B + min_distance
    const subLowerY_B = typeof lowerY_B !== "number" ? lowerY_B.sub(min_distance) : lowerY_B - min_distance
    const sumHigherY_B = typeof higherY_B !== "number" ? higherY_B.add(min_distance) : higherY_B + min_distance

    const x_separated1 = typeof higherX_A !== "number" ? ctx.LE(higherX_A, subLowerX_B) :
        typeof subLowerX_B !== "number" ? ctx.GE(subLowerX_B, higherX_A) : ctx.Bool.val(higherX_A <= subLowerX_B)

    const x_separated2 = typeof lowerX_A !== "number" ? ctx.GE(lowerX_A, sumHigherX_B) :
        typeof sumHigherX_B !== "number" ? ctx.LE(sumHigherX_B, lowerX_A) : ctx.Bool.val(lowerX_A >= sumHigherX_B)

    const x_separated = ctx.Or(x_separated1, x_separated2)

    const y_separated1 = typeof higherY_A !== "number" ? ctx.LE(higherY_A, subLowerY_B) :
        typeof subLowerY_B !== "number" ? ctx.GE(subLowerY_B, higherY_A) : ctx.Bool.val(higherY_A <= subLowerY_B)

    const y_separated2 = typeof lowerY_A !== "number" ? ctx.GE(lowerY_A, sumHigherY_B) :
        typeof sumHigherY_B !== "number" ? ctx.LE(sumHigherY_B, lowerY_A) : ctx.Bool.val(lowerY_A >= sumHigherY_B)

    const y_separated = ctx.Or(y_separated1, y_separated2)

    return ctx.Or(x_separated, y_separated)
}


// Function to ensure a given minimum distance between the waypoint of a channel and an exclusion zone
export function waypointRoutingExclusionDistance(ctx: Context, channel: EncodedChannel, waypoint: number, exclusion: RoutingExclusion, min_distance: number) {
    if (exclusion instanceof StaticChipRoutingExclusion) {
        const routingExclusion = {
            c1: exclusion.position.x,
            c2: exclusion.position.y,
            c1_span: exclusion.width,
            c2_span: exclusion.height
        }
        return pointBoxMinDistance(ctx, {
            c1: channel.encoding.waypoints[waypoint].x,
            c2: channel.encoding.waypoints[waypoint].y
        }, routingExclusion, min_distance)
    } else if (exclusion instanceof EncodedDynamicModuleRoutingExclusion) {
        return pointBoxMinDistance(ctx, {
            c1: channel.encoding.waypoints[waypoint].x,
            c2: channel.encoding.waypoints[waypoint].y
        }, {
            c1: exclusion.encoding.positionX,
            c2: exclusion.encoding.positionY,
            c1_span: exclusion.spanX(ctx),
            c2_span: exclusion.spanY(ctx)
        }, min_distance)
    } else {
        return ctx.Bool.val(false)
    }
}

export function channelSegmentRoutingExclusionDistance(ctx: Context, channel: EncodedChannel, segment: number, exclusion: RoutingExclusion, min_distance: number) {
    if (exclusion instanceof StaticChipRoutingExclusion) {
        const routingExclusion = {
            x: exclusion.position.x,
            y: exclusion.position.y,
            x_span: exclusion.width,
            y_span: exclusion.height
        }
        return ctx.And(
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Up),
                segmentBoxMinDistance(ctx, {
                    c1_lower: channel.encoding.waypoints[segment].y,
                    c1_higher: channel.encoding.waypoints[segment + 1].y,
                    c2: channel.encoding.waypoints[segment].x,
                }, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Down),
                segmentBoxMinDistance(ctx, {
                    c1_lower: channel.encoding.waypoints[segment + 1].y,
                    c1_higher: channel.encoding.waypoints[segment].y,
                    c2: channel.encoding.waypoints[segment].x,
                }, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Right),
                segmentBoxMinDistance(ctx, {
                    c1_lower: channel.encoding.waypoints[segment].x,
                    c1_higher: channel.encoding.waypoints[segment + 1].x,
                    c2: channel.encoding.waypoints[segment].y,
                }, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Left),
                segmentBoxMinDistance(ctx, {
                    c1_lower: channel.encoding.waypoints[segment + 1].x,
                    c1_higher: channel.encoding.waypoints[segment].x,
                    c2: channel.encoding.waypoints[segment].y,
                }, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpRight),
                segmentBoxMinDistanceDiagonal(ctx, {
                    x_lower: channel.encoding.waypoints[segment].x,
                    y_lower: channel.encoding.waypoints[segment].y,
                    x_higher: channel.encoding.waypoints[segment + 1].x,
                    y_higher: channel.encoding.waypoints[segment + 1].y
                }, true, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownRight),
                segmentBoxMinDistanceDiagonal(ctx, {
                    x_lower: channel.encoding.waypoints[segment].x,
                    y_lower: channel.encoding.waypoints[segment + 1].y,
                    x_higher: channel.encoding.waypoints[segment + 1].x,
                    y_higher: channel.encoding.waypoints[segment].y
                }, false, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownLeft),
                segmentBoxMinDistanceDiagonal(ctx, {
                    x_lower: channel.encoding.waypoints[segment + 1].x,
                    y_lower: channel.encoding.waypoints[segment + 1].y,
                    x_higher: channel.encoding.waypoints[segment].x,
                    y_higher: channel.encoding.waypoints[segment].y
                }, true, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpLeft),
                segmentBoxMinDistanceDiagonal(ctx, {
                    x_lower: channel.encoding.waypoints[segment + 1].x,
                    y_lower: channel.encoding.waypoints[segment].y,
                    x_higher: channel.encoding.waypoints[segment].x,
                    y_higher: channel.encoding.waypoints[segment + 1].y
                }, false, routingExclusion, min_distance)
            )
        )
    } else if (exclusion instanceof EncodedDynamicModuleRoutingExclusion) {
        const routingExclusion = {
            x: exclusion.encoding.positionX,
            y: exclusion.encoding.positionY,
            x_span: exclusion.spanX(ctx),
            y_span: exclusion.spanY(ctx)
        }
        return ctx.And(
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Up),
                segmentBoxMinDistance(ctx, {
                    c1_lower: channel.encoding.waypoints[segment].y,
                    c1_higher: channel.encoding.waypoints[segment + 1].y,
                    c2: channel.encoding.waypoints[segment].x,
                }, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Down),
                segmentBoxMinDistance(ctx, {
                    c1_lower: channel.encoding.waypoints[segment + 1].y,
                    c1_higher: channel.encoding.waypoints[segment].y,
                    c2: channel.encoding.waypoints[segment].x,
                }, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Right),
                segmentBoxMinDistance(ctx, {
                    c1_lower: channel.encoding.waypoints[segment].x,
                    c1_higher: channel.encoding.waypoints[segment + 1].x,
                    c2: channel.encoding.waypoints[segment].y,
                }, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Left),
                segmentBoxMinDistance(ctx, {
                    c1_lower: channel.encoding.waypoints[segment + 1].x,
                    c1_higher: channel.encoding.waypoints[segment].x,
                    c2: channel.encoding.waypoints[segment].y,
                }, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpRight),
                segmentBoxMinDistanceDiagonal(ctx, {
                    x_lower: channel.encoding.waypoints[segment].x,
                    y_lower: channel.encoding.waypoints[segment].y,
                    x_higher: channel.encoding.waypoints[segment + 1].x,
                    y_higher: channel.encoding.waypoints[segment + 1].y
                }, true, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownRight),
                segmentBoxMinDistanceDiagonal(ctx, {
                    x_lower: channel.encoding.waypoints[segment].x,
                    y_lower: channel.encoding.waypoints[segment + 1].y,
                    x_higher: channel.encoding.waypoints[segment + 1].x,
                    y_higher: channel.encoding.waypoints[segment].y
                }, false, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownLeft),
                segmentBoxMinDistanceDiagonal(ctx, {
                    x_lower: channel.encoding.waypoints[segment + 1].x,
                    y_lower: channel.encoding.waypoints[segment + 1].y,
                    x_higher: channel.encoding.waypoints[segment].x,
                    y_higher: channel.encoding.waypoints[segment].y
                }, true, routingExclusion, min_distance)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpLeft),
                segmentBoxMinDistanceDiagonal(ctx, {
                    x_lower: channel.encoding.waypoints[segment + 1].x,
                    y_lower: channel.encoding.waypoints[segment].y,
                    x_higher: channel.encoding.waypoints[segment].x,
                    y_higher: channel.encoding.waypoints[segment + 1].y
                }, false, routingExclusion, min_distance)
            )
        )
    } else {
        return ctx.Bool.val(false)
    }
}


/** PIN INTERACTION WITH MODULES - METHODS AND HELPER METHODS */

// function to extract/calculate the coordinates of a clamp for the respective given encoded module
export function moduleToClampCoordinates(ctx: Context, module: EncodedModule, clampSpacing: number) {
    let lowerX = module.encoding.positionX
    let lowerY = module.encoding.positionY

    lowerX = typeof lowerX === "number" ? lowerX - clampSpacing : lowerX.sub(clampSpacing)
    lowerY = typeof lowerY === "number" ? lowerY - clampSpacing : lowerY.sub(clampSpacing)

    let spanX = module.spanX(ctx)
    let spanY = module.spanY(ctx)
    let higherX
    let higherY

    clampSpacing = clampSpacing * 2
    higherX = smtSum(ctx, lowerX, spanX, clampSpacing)
    higherY = smtSum(ctx, lowerY, spanY, clampSpacing)

    return {lowerX: lowerX, lowerY: lowerY, higherX: higherX, higherY: higherY}
}

// function to ensure that a given pin defined by its position keeps a minimum distance (here clampSpacing) from a given module (the one it is fixing)
export function pinModuleMinMaxDistance(ctx: Context, point: {
    x1: Arith,
    y1: Arith
}, module: EncodedModule, clampSpacing: number) {

    const clampFrame = moduleToClampCoordinates(ctx, module, clampSpacing)

    return ctx.Or(
        ctx.And(
            ctx.Eq(point.x1, clampFrame.lowerX),
            ctx.GE(point.y1, clampFrame.lowerY),
            ctx.LE(point.y1, clampFrame.higherY),
        ),
        ctx.And(
            ctx.Eq(point.x1, clampFrame.higherX),
            ctx.GE(point.y1, clampFrame.lowerY),
            ctx.LE(point.y1, clampFrame.higherY)
        ),
        ctx.And(
            ctx.Eq(point.y1, clampFrame.lowerY),
            ctx.GE(point.x1, clampFrame.lowerX),
            ctx.LE(point.x1, clampFrame.higherX)
        ),
        ctx.And(
            ctx.Eq(point.y1, clampFrame.higherY),
            ctx.GE(point.x1, clampFrame.lowerX),
            ctx.LE(point.x1, clampFrame.higherX)
        )
    )
}


/** SEGMENT AND BOX/EXCLUSION-ZONE - NO CROSS METHODS AND HELPER METHODS */

// function to ensure that a vertical or horizontal segment is not crossing a given box
export function segmentBoxNoCross(ctx: Context, segment: { c1_lower: Arith, c1_higher: Arith, c2: Arith },
                                  box: {
                                      x: Arith | number,
                                      y: Arith | number,
                                      x_span: Arith | number,
                                      y_span: Arith | number
                                  }) {
    return ctx.Or(
        ctx.LE(segment.c1_higher, box.x),
        minDistanceAsym(ctx, box.x, segment.c1_lower, box.x_span),
        ctx.LE(segment.c2, box.y),
        minDistanceAsym(ctx, box.y, segment.c2, box.y_span),
    )
}

// Helper function for several functions to check whether an UpRight/DownLeft segment crosses a given box (e.g. exclusion zone)
export function segmentBoxNoCrossSlopePos(ctx: Context, segment: {
                                              x_lower: Arith,
                                              y_lower: Arith,
                                              x_higher: Arith,
                                              y_higher: Arith
                                          },
                                          box: {
                                              x: Arith | number,
                                              y: Arith | number,
                                              x_span: Arith | number,
                                              y_span: Arith | number
                                          }) {
    // y-value of the upper side of the box
    const boxTopSide_y = typeof box.y_span !== "number" ? box.y_span.add(box.y) : typeof box.y !== "number" ? box.y.add(box.y_span) : box.y + box.y_span
    const boxUpperSideOverlap = segment.x_higher.sub(box.x)       // overlap of the segment above the box
    const minimumY = boxUpperSideOverlap.add(boxTopSide_y)          // minimum upper y-value that the segment must have not to cut the box in the upper left corner

    // x-value of the right side of the box
    const boxRightSide_x = typeof box.x_span !== "number" ? box.x_span.add(box.x) : typeof box.x !== "number" ? box.x.add(box.y_span) : box.x + box.x_span
    const boxRightSideOverlap = segment.y_higher.sub(box.y)   // overlap of the segment on the right of the box
    const minimumX = boxRightSideOverlap.add(boxRightSide_x)    // minimum upper x-value that the segment must have not to cut the box in the lower right corner

    const simpleNoCross = ctx.Or(
        ctx.LE(segment.x_higher, box.x),
        ctx.LE(segment.y_higher, box.y),
        ctx.GE(segment.x_lower, boxRightSide_x),
        ctx.GE(segment.y_lower, boxTopSide_y)
    )
    return ctx.Or(
        simpleNoCross,
        ctx.GE(segment.y_higher, minimumY),
        ctx.GE(segment.x_higher, minimumX)
    )
}

// Helper function for several functions to check whether an UpRight/DownLeft segment crosses a given box (e.g. exclusion zone)
export function segmentBoxNoCrossSlopeNeg(ctx: Context, segment: {
                                              x_lower: Arith,
                                              y_lower: Arith,
                                              x_higher: Arith,
                                              y_higher: Arith
                                          },
                                          box: {
                                              x: Arith | number,
                                              y: Arith | number,
                                              x_span: Arith | number,
                                              y_span: Arith | number
                                          }) {
    // y-value of the upper side of the box
    const boxTopSide_y = typeof box.y_span !== "number" ? box.y_span.add(box.y) : typeof box.y !== "number" ? box.y.add(box.y_span) : box.y + box.y_span
    const boxLeftSideOverlap = segment.y_higher.sub(box.y)        // overlap of the segment on the left of the box

    // minimum upper y-value that the segment must have not to cut the box in the upper right corner
    const maximumX = typeof box.x === "number" ? ctx.Int.val(box.x).sub(boxLeftSideOverlap) : box.x.sub(boxLeftSideOverlap)

    // x-value of the right side of the box
    const boxRightSide_x = typeof box.x_span !== "number" ? box.x_span.add(box.x) : typeof box.x !== "number" ? box.x.add(box.x_span) : box.x + box.x_span

    // overlap of the segment on the right of the box
    const boxRightSideOverlap = typeof boxTopSide_y === "number" ? ctx.Int.val(boxTopSide_y).sub(segment.y_lower) : boxTopSide_y.sub(segment.y_lower)
    // minimum upper x-value that the segment must have not to cut the box in the lower left corner
    const minimumX = typeof boxRightSide_x === "number" ? ctx.Int.val(boxRightSide_x).add(boxRightSideOverlap) : boxRightSide_x.add(boxRightSideOverlap)

    const simpleNoCross = ctx.Or(
        ctx.LE(segment.x_higher, box.x),
        ctx.LE(segment.y_higher, box.y),
        ctx.GE(segment.x_lower, boxRightSide_x),
        ctx.GE(segment.y_lower, boxTopSide_y)
    )
    return ctx.Or(
        simpleNoCross,
        ctx.LE(segment.x_lower, maximumX),
        ctx.GE(segment.x_higher, minimumX)
    )
}

// function ensuring that a given segment does not cross a static routing exclusion (e.g. cutout piece on the chip)
export function channelSegmentRoutingExclusionNoCross(ctx: Context, channel: EncodedChannel, segment: number, exclusion: RoutingExclusion) {
    if (exclusion instanceof StaticChipRoutingExclusion) {
        const routingExclusion = {
            x: exclusion.position.x,
            y: exclusion.position.y,
            x_span: exclusion.width,
            y_span: exclusion.height
        }
        return ctx.And(
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Up),
                segmentBoxNoCross(ctx, {
                    c1_lower: channel.encoding.waypoints[segment].y,
                    c1_higher: channel.encoding.waypoints[segment + 1].y,
                    c2: channel.encoding.waypoints[segment].x
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Down),
                segmentBoxNoCross(ctx, {
                    c1_lower: channel.encoding.waypoints[segment + 1].y,
                    c1_higher: channel.encoding.waypoints[segment].y,
                    c2: channel.encoding.waypoints[segment].x
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Right),
                segmentBoxNoCross(ctx, {
                    c1_lower: channel.encoding.waypoints[segment].x,
                    c1_higher: channel.encoding.waypoints[segment + 1].x,
                    c2: channel.encoding.waypoints[segment].y
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Left),
                segmentBoxNoCross(ctx, {
                    c1_lower: channel.encoding.waypoints[segment + 1].x,
                    c1_higher: channel.encoding.waypoints[segment].x,
                    c2: channel.encoding.waypoints[segment].y
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpRight),
                segmentBoxNoCrossSlopePos(ctx, {
                    x_lower: channel.encoding.waypoints[segment].x,
                    y_lower: channel.encoding.waypoints[segment].y,
                    x_higher: channel.encoding.waypoints[segment + 1].x,
                    y_higher: channel.encoding.waypoints[segment + 1].y
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownRight),
                segmentBoxNoCrossSlopeNeg(ctx, {
                    x_lower: channel.encoding.waypoints[segment].x,
                    y_lower: channel.encoding.waypoints[segment + 1].y,
                    x_higher: channel.encoding.waypoints[segment + 1].x,
                    y_higher: channel.encoding.waypoints[segment].y
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownLeft),
                segmentBoxNoCrossSlopePos(ctx, {
                    x_lower: channel.encoding.waypoints[segment + 1].x,
                    y_lower: channel.encoding.waypoints[segment + 1].y,
                    x_higher: channel.encoding.waypoints[segment].x,
                    y_higher: channel.encoding.waypoints[segment].y
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpLeft),
                segmentBoxNoCrossSlopeNeg(ctx, {
                    x_lower: channel.encoding.waypoints[segment + 1].x,
                    y_lower: channel.encoding.waypoints[segment].y,
                    x_higher: channel.encoding.waypoints[segment].x,
                    y_higher: channel.encoding.waypoints[segment + 1].y
                }, routingExclusion)
            )
        )
    } else if (exclusion instanceof EncodedDynamicModuleRoutingExclusion) {
        const routingExclusion = {
            x: exclusion.encoding.positionX,
            y: exclusion.encoding.positionY,
            x_span: exclusion.spanX(ctx),
            y_span: exclusion.spanY(ctx)
        }
        return ctx.And(
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Up),
                segmentBoxNoCross(ctx, {
                    c1_lower: channel.encoding.waypoints[segment].y,
                    c1_higher: channel.encoding.waypoints[segment + 1].y,
                    c2: channel.encoding.waypoints[segment].x
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Down),
                segmentBoxNoCross(ctx, {
                    c1_lower: channel.encoding.waypoints[segment + 1].y,
                    c1_higher: channel.encoding.waypoints[segment].y,
                    c2: channel.encoding.waypoints[segment].x
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Right),
                segmentBoxNoCross(ctx, {
                    c1_lower: channel.encoding.waypoints[segment].x,
                    c1_higher: channel.encoding.waypoints[segment + 1].x,
                    c2: channel.encoding.waypoints[segment].y
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.Left),
                segmentBoxNoCross(ctx, {
                    c1_lower: channel.encoding.waypoints[segment + 1].x,
                    c1_higher: channel.encoding.waypoints[segment].x,
                    c2: channel.encoding.waypoints[segment].y
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpRight),
                segmentBoxNoCrossSlopePos(ctx, {
                    x_lower: channel.encoding.waypoints[segment].x,
                    y_lower: channel.encoding.waypoints[segment].y,
                    x_higher: channel.encoding.waypoints[segment + 1].x,
                    y_higher: channel.encoding.waypoints[segment + 1].y
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownRight),
                segmentBoxNoCrossSlopeNeg(ctx, {
                    x_lower: channel.encoding.waypoints[segment].x,
                    y_lower: channel.encoding.waypoints[segment + 1].y,
                    x_higher: channel.encoding.waypoints[segment + 1].x,
                    y_higher: channel.encoding.waypoints[segment].y
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.DownLeft),
                segmentBoxNoCrossSlopePos(ctx, {
                    x_lower: channel.encoding.waypoints[segment + 1].x,
                    y_lower: channel.encoding.waypoints[segment + 1].y,
                    x_higher: channel.encoding.waypoints[segment].x,
                    y_higher: channel.encoding.waypoints[segment].y
                }, routingExclusion)
            ),
            ctx.Implies(
                channel.encoding.segments[segment].type.eq(ctx, SegmentType.UpLeft),
                segmentBoxNoCrossSlopeNeg(ctx, {
                    x_lower: channel.encoding.waypoints[segment + 1].x,
                    y_lower: channel.encoding.waypoints[segment].y,
                    x_higher: channel.encoding.waypoints[segment].x,
                    y_higher: channel.encoding.waypoints[segment + 1].y
                }, routingExclusion)
            )
        )
    } else {
        return ctx.Bool.val(false)
    }
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
export function channelSegmentsNoCross(ctx: Context, channel_a: EncodedChannel, segment_a: number, channel_b: EncodedChannel, segment_b: number) {

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