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
import {EncodedModule} from "../module";
import {Placement} from "../placement";

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
        // ORIGINAL coordinates of exclusion (in the whole grid of the chip) -> UP direction
        const originalX = smtSum(ctx, exclusion.position.x, module.encoding.positionX)
        const originalY = smtSum(ctx, exclusion.position.y, module.encoding.positionY)

        // DOWN direction
        const downModuleUpperX = smtSum(ctx, module.encoding.positionX, module.spanX(ctx))
        const downModuleUpperY = smtSum(ctx, module.encoding.positionY, module.spanY(ctx))
        const downExclusionUpperX = typeof downModuleUpperX === "number" ? downModuleUpperX - exclusion.position.x : downModuleUpperX.sub(exclusion.position.x)
        const downExclusionUpperY = typeof downModuleUpperY === "number" ? downModuleUpperY - exclusion.position.y : downModuleUpperY.sub(exclusion.position.y)
        const downExclusionLowerX = typeof downExclusionUpperX === "number" ? downExclusionUpperX - exclusion.width : downExclusionUpperX.sub(exclusion.width)
        const downExclusionLowerY = typeof downExclusionUpperY === "number" ? downExclusionUpperY - exclusion.height : downExclusionUpperY.sub(exclusion.height)

        // RIGHT direction
        const rightModuleUpperY = smtSum(ctx, module.encoding.positionY, module.spanY(ctx))
        const rightExclusionUpperY = typeof rightModuleUpperY === "number" ? rightModuleUpperY - exclusion.position.x : rightModuleUpperY.sub(exclusion.position.x)
        const rightExclusionLowerY = typeof rightExclusionUpperY === "number" ? rightExclusionUpperY - exclusion.width : rightExclusionUpperY.sub(exclusion.width)

        // LEFT direction
        const leftModuleUpperX = smtSum(ctx, module.encoding.positionX, module.spanX(ctx))
        const leftExclusionUpperX = typeof leftModuleUpperX === "number" ? leftModuleUpperX - exclusion.position.y : leftModuleUpperX.sub(exclusion.position.y)
        const leftExclusionLowerX = typeof leftExclusionUpperX === "number" ? leftExclusionUpperX - exclusion.height : leftExclusionUpperX.sub(exclusion.height)

        clauses.push(
            ctx.And(
                ctx.Implies(
                    module.encoding.orientation.eq(ctx, Orientation.Up),
                    ctx.And(
                        exclusion.encoding.positionX.eq(originalX),
                        exclusion.encoding.positionY.eq(originalY)
                    )
                ),
                ctx.Implies(
                    module.encoding.orientation.eq(ctx, Orientation.Down),
                    ctx.And(
                        exclusion.encoding.positionX.eq(downExclusionLowerX),
                        exclusion.encoding.positionY.eq(downExclusionLowerY)
                    )
                ),
                ctx.Implies(
                    module.encoding.orientation.eq(ctx, Orientation.Right),
                    ctx.And(
                        exclusion.encoding.positionX.eq(originalX),
                        exclusion.encoding.positionY.eq(rightExclusionLowerY)
                    )
                ),
                ctx.Implies(
                    module.encoding.orientation.eq(ctx, Orientation.Left),
                    ctx.And(
                        exclusion.encoding.positionX.eq(leftExclusionLowerX),
                        exclusion.encoding.positionY.eq(originalY)
                    )
                )
            )
        )

    }
    return clauses
}

export function encodeDynamicRoutingExclusionChannels(ctx: Context, channel: EncodedChannel, exclusion: EncodedDynamicModuleRoutingExclusion, modules: EncodedModule[]): Bool[] {

    /* Since dynamic module-based routing exclusion zones are restricted to (e.g. optical) barrier-free zones on one side
    the other side is not affected and can be routing channels there
     */
    const clauses = []
    const channelModule = modules[channel.from.module]
    const exclusionModule = modules[exclusion.module]

    const channelOnSameSide = (channelModule.placement === Placement.Top && exclusionModule.placement === Placement.Top) ||
        (channelModule.placement === Placement.Bottom && exclusionModule.placement === Placement.Bottom) ||
        (channelModule.placement === undefined && exclusionModule.placement === undefined) ||
        (channelModule.placement === undefined && exclusionModule.placement === Placement.Top) ||
        (channelModule.placement === Placement.Top && exclusionModule.placement === undefined)

    if (channelOnSameSide) {
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
    }
    return clauses
}


export function encodeDynamicModuleRoutingExclusionPins(ctx: Context, pin: EncodedPin, exclusion: EncodedDynamicModuleRoutingExclusion): Bool[] {
    const clauses = []

    /* Pins may not lie inside routing exclusion zones */
    {
        // TODO: define meaningful min distance between pins and dynamic exclusion zones
        const min_distance = 500
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