import {Bool, Context} from "z3-solver";
import {EncodedPin, Pin} from "../pin";
import {EncodedChannel} from "../channel";
import {
    channelSegmentRoutingExclusionDistance,
    channelSegmentRoutingExclusionNoCross,
    waypointRoutingExclusionDistance
} from "../geometry/geometry";
import {DynamicRoutingExclusion} from "../routingExclusion";


export function encodeChannelPinConstraints(ctx: Context, pin: EncodedPin, channel: EncodedChannel): Bool[] {
    const clauses = []

    /* Routing exclusion zone for every pin position on both sides of chip */
    const diameter = pin.radius * 2
    const exclusionProps = {
        position: {
            x: pin.encoding.positionX.sub(pin.radius),
            y: pin.encoding.positionY.sub(pin.radius)
        }, width: diameter, height: diameter
    }
    const exclusion = new DynamicRoutingExclusion(exclusionProps)

    /* Channels segments may not be near pins on both sides */
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

    clauses.push(ctx.And())
    return clauses

}