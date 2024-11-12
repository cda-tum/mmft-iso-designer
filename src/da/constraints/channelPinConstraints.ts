import {Arith, Bool, Context} from "z3-solver";
import {EncodedPin, Pin} from "../components/pin";
import {EncodedChannel} from "../components/channel";
import {
    channelSegmentRoutingExclusionDistance,
    channelSegmentRoutingExclusionNoCross,
    waypointRoutingExclusionDistance
} from "../geometry/geometry";
import {PinRoutingExclusion} from "../components/routingExclusion";


export function encodeChannelPinConstraints(ctx: Context, pin: EncodedPin, channel: EncodedChannel): Bool[] {
    const clauses = []

    const pinExclusionProperties = {
        position: { x: pin.encoding.exclusionPositionX, y: pin.encoding.exclusionPositionY },
        sideLength: Pin.diameter(pin.radius)
    }
    const exclusion = new PinRoutingExclusion(pinExclusionProperties)

    /* Channels segments may not be near pins on both sides */
    {
        const min_distance = ((channel.width / 2) + channel.spacing)
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                ctx.Implies(
                    channel.encoding.segments[i].active,
                    channelSegmentRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance)
                )
            )
        }
    }

    /* Channels waypoints may not be near pin-hole zones */
    {
        const min_distance = (channel.width / 2 + channel.spacing)
        for (let i = 0; i <= channel.maxSegments; i++) {
            clauses.push(
                waypointRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance)
            )
        }
    }

    /* Channel segments may not cross pin-hole zones */
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