import {Bool, Context} from "z3-solver";
import {StaticChipRoutingExclusion} from "../components/routingExclusion";
import {
    boxBoxMinDistance,
    channelSegmentRoutingExclusionDistance,
    channelSegmentRoutingExclusionNoCross,
    waypointRoutingExclusionDistance
} from "../geometry/geometry";
import {EncodedChannel} from "../components/channel";
import {EncodedPin, Pin} from "../components/pin";


export function encodeStaticRoutingExclusionChannels(ctx: Context, channel: EncodedChannel, exclusion: StaticChipRoutingExclusion): Bool[] {
    const clauses = []

    /* Channels segments may not be near routing exclusion zones */
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                ctx.Implies(
                    channel.encoding.segments[i].active,
                    channelSegmentRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance)
                )
            )
        }
    }

    /* Channels waypoints may not be near routing exclusion zones */
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i <= channel.maxSegments; i++) {
            clauses.push(
                waypointRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance)
            )
        }
    }

    /* Channel segments may not cross routing exclusion zones */
    {
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                ctx.Implies(
                    channel.encoding.segments[i].active,
                    channelSegmentRoutingExclusionNoCross(ctx, channel, i, exclusion)
                )
            )
        }
    }

    return clauses
}


export function encodeStaticRoutingExclusionPins(ctx: Context, pin: EncodedPin, exclusion: StaticChipRoutingExclusion): Bool[] {

    const clauses = []

    /* Pins may not lie inside routing exclusion zones */
    {
        // TODO: define meaningful min distance between pins and static exclusion zones
        const min_distance = 500

        const pinExclusion = {
            x: pin.encoding.exclusionPositionX,
            y: pin.encoding.exclusionPositionY,
            x_span: Pin.diameter(pin.radius),
            y_span: Pin.diameter(pin.radius)
        }
        clauses.push(
            boxBoxMinDistance(ctx, pinExclusion,
                {
                    x: exclusion.position.x,
                    y: exclusion.position.y,
                    x_span: exclusion.width,
                    y_span: exclusion.height
                }, min_distance)
        )
    }
    return clauses
}