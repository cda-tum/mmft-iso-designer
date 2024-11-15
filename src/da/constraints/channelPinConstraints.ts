import {Bool, Context} from "z3-solver";
import {EncodedPin, Pin} from "../components/pin";
import {EncodedChannel, SegmentType} from "../components/channel";
import {
    pointSegmentDistance,
    pointSegmentDistanceDiag
} from "../geometry/geometry";
import {Constraint} from "../processing/constraint";


export function encodeChannelPinConstraints(ctx: Context, pin: EncodedPin, channel: EncodedChannel): Constraint[] {
    const clauses = []
    const exclusionRadius = pin.radius + Pin.pinSpacing()
    const min_distance = ((channel.width / 2) + channel.spacing) + exclusionRadius
    const pinPosition = {c1: pin.encoding.positionX, c2: pin.encoding.positionY}

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
                                pointSegmentDistance(ctx,
                                    pinPosition,
                                    {
                                        c1_lower: channel.encoding.waypoints[i].y,
                                        c1_higher: channel.encoding.waypoints[i + 1].y,
                                        c2: channel.encoding.waypoints[i].x,
                                    }, min_distance)
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.Down),
                                pointSegmentDistance(ctx,
                                    pinPosition,
                                    {
                                        c1_lower: channel.encoding.waypoints[i + 1].y,
                                        c1_higher: channel.encoding.waypoints[i].y,
                                        c2: channel.encoding.waypoints[i].x,
                                    }, min_distance)
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.Right),
                                pointSegmentDistance(ctx,
                                    pinPosition,
                                    {
                                        c1_lower: channel.encoding.waypoints[i].x,
                                        c1_higher: channel.encoding.waypoints[i + 1].x,
                                        c2: channel.encoding.waypoints[i].y,
                                    }, min_distance)
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.Left),
                                pointSegmentDistance(ctx,
                                    pinPosition,
                                    {
                                        c1_lower: channel.encoding.waypoints[i + 1].x,
                                        c1_higher: channel.encoding.waypoints[i].x,
                                        c2: channel.encoding.waypoints[i].y,
                                    }, min_distance)
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.UpRight),
                                pointSegmentDistanceDiag(ctx,
                                    pinPosition,
                                    {
                                        c1_lower: channel.encoding.waypoints[i].x,
                                        c2_lower: channel.encoding.waypoints[i].y,
                                        c1_higher: channel.encoding.waypoints[i + 1].x,
                                        c2_higher: channel.encoding.waypoints[i + 1].y,
                                    }, min_distance, true)
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.DownRight),
                                pointSegmentDistanceDiag(ctx,
                                    pinPosition,
                                    {
                                        c1_lower: channel.encoding.waypoints[i].x,
                                        c2_lower: channel.encoding.waypoints[i + 1].y,
                                        c1_higher: channel.encoding.waypoints[i + 1].x,
                                        c2_higher: channel.encoding.waypoints[i].y,
                                    }, min_distance, false)
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.DownLeft),
                                pointSegmentDistanceDiag(ctx,
                                    pinPosition,
                                    {
                                        c1_lower: channel.encoding.waypoints[i + 1].x,
                                        c2_lower: channel.encoding.waypoints[i + 1].y,
                                        c1_higher: channel.encoding.waypoints[i].x,
                                        c2_higher: channel.encoding.waypoints[i].y,
                                    }, min_distance, true)
                            ),
                            ctx.Implies(
                                channel.encoding.segments[i].type.eq(ctx, SegmentType.UpLeft),
                                pointSegmentDistanceDiag(ctx,
                                    pinPosition,
                                    {
                                        c1_lower: channel.encoding.waypoints[i + 1].x,
                                        c2_lower: channel.encoding.waypoints[i].y,
                                        c1_higher: channel.encoding.waypoints[i].x,
                                        c2_higher: channel.encoding.waypoints[i + 1].y,
                                    }, min_distance, false)
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