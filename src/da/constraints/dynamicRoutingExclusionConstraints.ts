import {Bool, Context} from "z3-solver";
import {EncodedChannel} from "../channel";
import {
    boxBoxMinDistance, channelSegmentRoutingExclusionDistance,
    channelSegmentRoutingExclusionNoCross,
    waypointRoutingExclusionDistance
} from "../geometry/geometry";
import {EncodedDynamicModuleRoutingExclusion} from "../routingExclusion";
import {EncodedPin} from "../pin";
import {EnumBitVecValue} from "../z3Helpers";
import {Orientation} from "../orientation";
import {smtSum} from "../utils";

export function encodeDynamicRoutingExclusion(ctx: Context, exclusion: EncodedDynamicModuleRoutingExclusion): Bool[] {
    const clauses = []
    const module = exclusion.encoding.moduleInstance

    // If orientation of module is already pre-defined -> type is EnumBitVecValue
    if (module.encoding.orientation instanceof EnumBitVecValue) {
        if (module.encoding.orientation.value === Orientation.Up || module.encoding.orientation.value === undefined) {
            clauses.push(
                ctx.And(
                    exclusion.encoding.positionX.eq(smtSum(ctx, exclusion.position.x, module.encoding.positionX)),
                    exclusion.encoding.positionY.eq(smtSum(ctx, exclusion.position.y, module.encoding.positionY)),
                )
            )
        } else if (module.encoding.orientation.value === Orientation.Down) {
            const moduleUpperX = smtSum(ctx, module.encoding.positionX, module.spanX(ctx))
            const moduleUpperY = smtSum(ctx, module.encoding.positionY, module.spanY(ctx))
            const exclusionUpperX = typeof moduleUpperX === "number" ? moduleUpperX - exclusion.position.x : moduleUpperX.sub(exclusion.position.x)
            const exclusionUpperY = typeof moduleUpperY === "number" ? moduleUpperY - exclusion.position.y : moduleUpperY.sub(exclusion.position.y)
            const exclusionLowerX = typeof exclusionUpperX === "number" ? exclusionUpperX - exclusion.width : exclusionUpperX.sub(exclusion.width)
            const exclusionLowerY = typeof exclusionUpperY === "number" ? exclusionUpperY - exclusion.height : exclusionUpperY.sub(exclusion.height)
            clauses.push(
                ctx.And(
                    exclusion.encoding.positionX.eq(exclusionLowerX),
                    exclusion.encoding.positionY.eq(exclusionLowerY)
                )
            )
        } else if (module.encoding.orientation.value === Orientation.Right) {
            const originalX = smtSum(ctx, exclusion.position.x, module.encoding.positionX)
            const moduleUpperY = smtSum(ctx, module.encoding.positionY, module.spanY(ctx))
            const exclusionUpperY = typeof moduleUpperY === "number" ? moduleUpperY - exclusion.position.x : moduleUpperY.sub(exclusion.position.x)
            const exclusionLowerY = typeof exclusionUpperY === "number" ? exclusionUpperY - exclusion.width : exclusionUpperY.sub(exclusion.width)
            clauses.push(
                ctx.And(
                    exclusion.encoding.positionX.eq(originalX),
                    exclusion.encoding.positionY.eq(exclusionLowerY)
                )
            )
        } else {
            const originalY = smtSum(ctx, exclusion.position.y, module.encoding.positionY)
            const moduleUpperX = smtSum(ctx, module.encoding.positionX, module.spanX(ctx))
            const exclusionUpperX = typeof moduleUpperX === "number" ? moduleUpperX - exclusion.position.y : moduleUpperX.sub(exclusion.position.y)
            const exclusionLowerX = typeof exclusionUpperX === "number" ? exclusionUpperX - exclusion.height : exclusionUpperX.sub(exclusion.height)
            clauses.push(
                ctx.And(
                    exclusion.encoding.positionX.eq(exclusionLowerX),
                    exclusion.encoding.positionY.eq(originalY)
                )
            )
        }
    }
    // If orientation of module is not pre-defined -> type is EnumBitVec
    else {
        const orientation = module.encoding.orientation
        const spX = module.spanX(ctx)
        const spY = module.spanY(ctx)

        const spanX = typeof spX === "number" ? ctx.Int.val(spX) : spX
        const spanY = typeof spY === "number" ? ctx.Int.val(spY) : spY

        const x_transformed = ctx.Int.const('x_transformed');
        const y_transformed = ctx.Int.const('y_transformed');
        clauses.push(
            ctx.And(
                ctx.Implies(
                    orientation.eq(ctx, Orientation.Up),
                    ctx.And(
                        exclusion.encoding.positionX.eq(exclusion.position.x),
                        exclusion.encoding.positionY.eq(exclusion.position.y)
                    ),
                ),
                ctx.Implies(
                    orientation.eq(ctx, Orientation.Down),
                    ctx.And(
                        x_transformed.eq(spanX.sub(exclusion.encoding.positionX)),
                        y_transformed.eq(spanY.sub(exclusion.encoding.positionY)),
                        ctx.LE(exclusion.encoding.positionX, spanX),
                        ctx.GE(exclusion.encoding.positionX, 0),
                        ctx.LE(exclusion.encoding.positionY, spanY),
                        ctx.GE(exclusion.encoding.positionY, 0)
                    )
                ),
                ctx.Implies(
                    orientation.eq(ctx, Orientation.Right),
                    ctx.And(
                        x_transformed.eq(spanY.sub(exclusion.encoding.positionY)),
                        y_transformed.eq(exclusion.encoding.positionX),
                        ctx.LE(exclusion.encoding.positionX, spanY),
                        ctx.GE(exclusion.encoding.positionX, 0),
                        ctx.LE(exclusion.encoding.positionY, spanX),
                        ctx.GE(exclusion.encoding.positionY, 0)
                    )
                ),
                ctx.Implies(
                    orientation.eq(ctx, Orientation.Left),
                    ctx.And(
                        x_transformed.eq(exclusion.encoding.positionY),
                        y_transformed.eq(spanX.sub(exclusion.encoding.positionX)),
                        ctx.LE(x_transformed, spanY),
                        ctx.GE(x_transformed, 0),
                        ctx.LE(y_transformed, spanX),
                        ctx.GE(y_transformed, 0)
                    )
                ),
            )
        )
    }
    return clauses
}

export function encodeDynamicRoutingExclusionChannels(ctx: Context, channel: EncodedChannel, exclusion: EncodedDynamicModuleRoutingExclusion): Bool[] {

    const clauses = []
    /* Channels segments may not be near dynamic routing exclusion zones */
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

    /* Channels segments may not be near dynamic routing exclusion zones */
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

    /* Channels waypoints may not be near dynamic routing exclusion zones */
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i <= channel.maxSegments; i++) {
            clauses.push(
                waypointRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance)
            )
        }
    }

    /* Channel segments may not cross dynamic routing exclusion zones */
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


export function encodeDynamicModuleRoutingExclusionPins(ctx: Context, pin: EncodedPin, exclusion: EncodedDynamicModuleRoutingExclusion): Bool[] {
    const clauses = []

    /* Pins may not lie inside routing exclusion zones */
    {
        // TODO: define meaningful min distance between pins and dynamic exclusion zones
        const min_distance = 1000
        clauses.push(
            boxBoxMinDistance(ctx, {
                    x: pin.encoding.positionX,
                    y: pin.encoding.positionY,
                    x_span: pin.radius * 2,
                    y_span: pin.radius * 2
                },
                {
                    x: exclusion.encoding.positionX,
                    y: exclusion.encoding.positionY,
                    x_span: exclusion.spanX(ctx),
                    y_span: exclusion.spanY(ctx)
                }, min_distance)
        )
    }
    return clauses
}