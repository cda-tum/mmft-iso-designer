import {Arith, Bool, Context} from "z3-solver";
import {EncodedPin, Pin} from "../components/pin";
import {EncodedChannel, SegmentType} from "../components/channel";
import {
    channelSegmentRoutingExclusionDistance, channelSegmentRoutingExclusionNoCross,
    minDistanceSym,
    pointSegmentDistance,
    pointSegmentDistanceDiag, segmentBoxMinDistance, segmentBoxMinDistanceDiagonal
} from "../geometry/geometry";
import {Constraint} from "../processing/constraint";
import {min} from "d3";
import {StaticChipRoutingExclusion} from "../components/routingExclusion";
import {Position, UncertainPosition} from "../geometry/position";


export function encodeChannelPinConstraints(ctx: Context, pin: EncodedPin, channel: EncodedChannel): Constraint[] {
    const clauses = []
    const exclusionRadius = Pin.pinRadius() + Pin.pinSpacing()
    const min_distance_from_center = ((channel.width / 2) + channel.spacing) + exclusionRadius
    const min_distance_from_exclusion = ((channel.width / 2) + channel.spacing)

    let exclusionPosition: UncertainPosition

    const exclPosX = typeof pin.encoding.positionX === "number" ? pin.encoding.positionX - (exclusionRadius) : pin.encoding.positionX.sub(exclusionRadius)
    const exclPosY = typeof pin.encoding.positionY === "number" ? pin.encoding.positionY - (exclusionRadius) : pin.encoding.positionY.sub(exclusionRadius)

    exclusionPosition = { x: exclPosX, y: exclPosY }

    /* Channels segments must keep minimum distance to pin hole exclusion zones */
    let label = "channel-pin-constraints-segments-near-pins-channel-id-"
    {
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                {
                    expr: ctx.Implies(
                        channel.encoding.segments[i].active,
                        ctx.And(
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.Up),
                                minDistanceSym(ctx, pin.encoding.positionX, channel.encoding.waypoints[i].x, min_distance_from_center)
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.Down),
                                minDistanceSym(ctx, pin.encoding.positionX, channel.encoding.waypoints[i].x, min_distance_from_center)
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.Right),
                                minDistanceSym(ctx, pin.encoding.positionY, channel.encoding.waypoints[i].y, min_distance_from_center)
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.Left),
                                minDistanceSym(ctx, pin.encoding.positionY, channel.encoding.waypoints[i].y, min_distance_from_center)
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.UpRight),
                                segmentBoxMinDistanceDiagonal(ctx, {
                                        x_lower: channel.encoding.waypoints[i].x,
                                        y_lower: channel.encoding.waypoints[i].y,
                                        x_higher: channel.encoding.waypoints[i + 1].x,
                                        y_higher: channel.encoding.waypoints[i + 1].y
                                    }, true, {
                                        x: exclusionPosition.x,
                                        y: exclusionPosition.y,
                                        x_span: exclusionRadius * 2,
                                        y_span: exclusionRadius * 2
                                    }, min_distance_from_exclusion
                                )
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.DownRight),
                                segmentBoxMinDistanceDiagonal(ctx, {
                                        x_lower: channel.encoding.waypoints[i].x,
                                        y_lower: channel.encoding.waypoints[i + 1].y,
                                        x_higher: channel.encoding.waypoints[i + 1].x,
                                        y_higher: channel.encoding.waypoints[i].y
                                    }, false, {
                                        x: exclusionPosition.x,
                                        y: exclusionPosition.y,
                                        x_span: exclusionRadius * 2,
                                        y_span: exclusionRadius * 2
                                    }, min_distance_from_exclusion
                                )
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.DownLeft),
                                segmentBoxMinDistanceDiagonal(ctx, {
                                        x_lower: channel.encoding.waypoints[i + 1].x,
                                        y_lower: channel.encoding.waypoints[i + 1].y,
                                        x_higher: channel.encoding.waypoints[i].x,
                                        y_higher: channel.encoding.waypoints[i].y
                                    }, true, {
                                        x: exclusionPosition.x,
                                        y: exclusionPosition.y,
                                        x_span: exclusionRadius * 2,
                                        y_span: exclusionRadius * 2
                                    }, min_distance_from_exclusion
                                )
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.UpLeft),
                                segmentBoxMinDistanceDiagonal(ctx, {
                                        x_lower: channel.encoding.waypoints[i + 1].x,
                                        y_lower: channel.encoding.waypoints[i].y,
                                        x_higher: channel.encoding.waypoints[i].x,
                                        y_higher: channel.encoding.waypoints[i + 1].y
                                    }, false, {
                                        x: exclusionPosition.x,
                                        y: exclusionPosition.y,
                                        x_span: exclusionRadius * 2,
                                        y_span: exclusionRadius * 2
                                    }, min_distance_from_exclusion
                                )
                            )
                        )
                    ),
                    label: label + channel.id + "-segment-id-" + i + "-with-pin-id-" + pin.id
                }
            )
        }
    }
    return clauses
}