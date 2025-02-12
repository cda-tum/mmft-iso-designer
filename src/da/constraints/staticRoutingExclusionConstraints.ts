import {Context} from "z3-solver";
import {StaticChipRoutingExclusion} from "../components/routingExclusion";
import {
    boxBoxMinDistance,
    channelSegmentRoutingExclusionDistance, channelSegmentRoutingExclusionNoCross,
    waypointRoutingExclusionDistance
} from "../geometry/geometry";
import {EncodedChannel} from "../components/channel";
import {EncodedPin, Pin} from "../components/pin";
import {Constraint, UniqueConstraint} from "../processing/constraint";
import {Chip} from "../components/chip";


export function encodeStaticRoutingExclusion(ctx: Context, chip: Chip, exclusion: StaticChipRoutingExclusion): Constraint[] {
    const clauses: Constraint[] = []

    /* Dynamic module-based exclusion zones must be within the boundaries of the chip */
    let label = "static-routing-exclusion-constraints-chip-boundaries-exclusion-id-"
    {
        const chipLowerX = chip.originX
        const chipHigherX = chip.originX + chip.width
        const chipLowerY = chip.originY
        const chipHigherY = chip.originY + chip.height

        clauses.push(
            {
                expr: ctx.And(
                    exclusion.position.x >= chipLowerX,
                    exclusion.position.x <= chipHigherX,
                    exclusion.position.y >= chipLowerY,
                    exclusion.position.y <= chipHigherY
                ),
                label: label + exclusion.id + UniqueConstraint.generateRandomString()
            }
        )
    }
    return clauses
}

export function encodeStaticRoutingExclusionChannels(ctx: Context, channel: EncodedChannel, exclusion: StaticChipRoutingExclusion): Constraint[] {
    const clauses: Constraint[] = []

    /* Channels segments may not be near routing exclusion zones */
    let label = "static-routing-exclusion-constraints-segments-near-exclusion-id-"
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                {
                    expr: ctx.Implies(
                        channel.encoding.segments[i].active,
                        channelSegmentRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance)
                    ),
                    label: label + exclusion.id + "-channel-id-" + channel.id + "-segment-id-" + i
                }
            )
        }
    }

    /* Channels waypoints may not be near routing exclusion zones */
    label = "static-routing-exclusion-constraints-waypoints-near-exclusion-id-"
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i <= channel.maxSegments; i++) {
            clauses.push(
                {
                    expr: waypointRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance),
                    label: label + exclusion.id + "-channel-id-" + channel.id + "-waypoint-id-" + i
                }
            )
        }
    }

    /* Channel segments may not cross routing exclusion zones */
    label = "static-routing-exclusion-constraints-segments-cross-exclusion-id-"
    {
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                {
                    expr: ctx.Implies(
                        channel.encoding.segments[i].active,
                        channelSegmentRoutingExclusionNoCross(ctx, channel, i, exclusion)
                    ),
                    label: label + exclusion.id + "-channel-id-" + channel.id + "-segment-id-" + i
                }
            )
        }
    }

    return clauses
}


export function encodeStaticRoutingExclusionPins(ctx: Context, pin: EncodedPin, exclusion: StaticChipRoutingExclusion): Constraint[] {
    const clauses: Constraint[] = []

    /* Pins may not lie inside routing exclusion zones */
    let label = "static-routing-exclusion-constraints-pins-inside-routing-exclusion-id-"
    {
        // TODO: define meaningful min distance between pins and static exclusion zones
        const min_distance = 500

        const pinExclusion = {
            x: pin.encoding.exclusionPositionX,
            y: pin.encoding.exclusionPositionY,
            x_span: Pin.diameter(Pin.pinRadius()),
            y_span: Pin.diameter(Pin.pinRadius())
        }
        clauses.push(
            {
                expr: ctx.And(
                    boxBoxMinDistance(ctx, pinExclusion,
                        {
                            x: exclusion.position.x,
                            y: exclusion.position.y,
                            x_span: exclusion.width,
                            y_span: exclusion.height
                        }, min_distance)
                ),
                label: label + exclusion.id + "-pin-id-" + pin.id
            }
        )
    }
    return clauses
}