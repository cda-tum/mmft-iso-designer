import {Context} from "z3-solver";
import {EncodedChannel} from "../components/channel";
import {
    boxBoxMinDistance, channelSegmentRoutingExclusionDistance,
    channelSegmentRoutingExclusionNoCross,
    waypointRoutingExclusionDistance
} from "../geometry/geometry";
import {EncodedDynamicModuleRoutingExclusion} from "../components/routingExclusion";
import {EncodedPin, Pin} from "../components/pin";
import {EnumBitVecValue} from "../z3Helpers";
import {Orientation} from "../geometry/orientation";
import {smtSum} from "../utils";
import {EncodedModule} from "../components/module";
import {Constraint, UniqueConstraint} from "../processing/constraint";
import {Chip} from "../components/chip";
import {Clamp} from "../components/clamp";

export function encodeDynamicRoutingExclusion(ctx: Context, exclusion: EncodedDynamicModuleRoutingExclusion, modules: EncodedModule[], chip: Chip): Constraint[] {
    const clauses: Constraint[] = []
    const module = modules[exclusion.module]
    let label

    /* Dynamic module-based exclusion zones must have same orientation as its module */
    {
        if (module.id === exclusion.module) {
            // If orientation of module is already pre-defined -> type is EnumBitVecValue
            if (module.encoding.orientation instanceof EnumBitVecValue) {

                // If position of module is also already pre-defined -> exclusion position can only have one final position
                if (module.position !== undefined) {
                    if (module.encoding.orientation.value === Orientation.Up) {
                        label = "dynamic-routing-exclusion-constraints-fixed-position-and-orientation-up-id" + exclusion.id
                        const exclusionLowerX = exclusion.position.x + module.position.x
                        const exclusionLowerY = exclusion.position.y + module.position.y
                        clauses.push(
                            {
                                expr: ctx.And(
                                    ctx.Eq(exclusion.encoding.positionX, exclusionLowerX),
                                    ctx.Eq(exclusion.encoding.positionY, exclusionLowerY)
                                ),
                                label: label + UniqueConstraint.generateRandomString()
                            }
                        )
                    } else if (module.encoding.orientation.value === Orientation.Down) {
                        const moduleUpperX = module.position.x + module.width
                        const moduleUpperY = module.position.y + module.height
                        const exclusionUpperX = moduleUpperX - exclusion.position.x
                        const exclusionUpperY = moduleUpperY - exclusion.position.y
                        const exclusionLowerX = exclusionUpperX - exclusion.width
                        const exclusionLowerY = exclusionUpperY - exclusion.height
                        label = "dynamic-routing-exclusion-constraints-fixed-orientation-down-id" + exclusion.id
                        clauses.push(
                            {
                                expr: ctx.And(
                                    ctx.Eq(exclusion.encoding.positionX, exclusionLowerX),
                                    ctx.Eq(exclusion.encoding.positionY, exclusionLowerY)
                                ),
                                label: label + UniqueConstraint.generateRandomString()
                            }
                        )
                    } else if (module.encoding.orientation.value === Orientation.Right) {
                        const exclusionLowerX = module.position.x + exclusion.position.y
                        const newRelativeExclusionY = module.width - exclusion.position.x - exclusion.width
                        const exclusionLowerY = module.position.y + newRelativeExclusionY
                        label = "dynamic-routing-exclusion-constraints-fixed-position-and-orientation-right-id" + exclusion.id
                        clauses.push(
                            {
                                expr: ctx.And(
                                    ctx.Eq(exclusion.encoding.positionX, exclusionLowerX),
                                    ctx.Eq(exclusion.encoding.positionY, exclusionLowerY)
                                ),
                                label: label + UniqueConstraint.generateRandomString()
                            }
                        )
                    } else { // orientation = Left
                        const exclusionLowerY = module.position.y + exclusion.position.x
                        const newRelativeExclusionX = module.height - exclusion.position.y - exclusion.height
                        const exclusionLowerX = module.position.x + newRelativeExclusionX
                        label = "dynamic-routing-exclusion-constraints-fixed-position-and-orientation-left-id" + exclusion.id
                        clauses.push(
                            {
                                expr: ctx.And(
                                    ctx.Eq(exclusion.encoding.positionX, exclusionLowerX),
                                    ctx.Eq(exclusion.encoding.positionY, exclusionLowerY)
                                ),
                                label: label + UniqueConstraint.generateRandomString()
                            }
                        )
                    }
                }
                // If position of module is NOT already pre-defined -> exclusion position depends on module position
                else {
                    if (module.encoding.orientation.value === Orientation.Up) {
                        const exclusionLowerX = smtSum(ctx, module.encoding.positionX, exclusion.position.x)
                        const exclusionLowerY = smtSum(ctx, module.encoding.positionY, exclusion.position.y)
                        label = "dynamic-routing-exclusion-constraints-free-position-fixed-orientation-up-id" + exclusion.id
                        clauses.push(
                            {
                                expr: ctx.And(
                                    ctx.Eq(exclusion.encoding.positionX, exclusionLowerX),
                                    ctx.Eq(exclusion.encoding.positionY, exclusionLowerY)
                                ),
                                label: label + UniqueConstraint.generateRandomString()
                            }
                        )
                    } else if (module.encoding.orientation.value === Orientation.Down) {
                        const moduleUpperX = smtSum(ctx, module.encoding.positionX, module.width)
                        const moduleUpperY = smtSum(ctx, module.encoding.positionY, module.height)
                        const exclusionUpperX = typeof moduleUpperX === "number" ? moduleUpperX - exclusion.position.x : moduleUpperX.sub(exclusion.position.x)
                        const exclusionUpperY = typeof moduleUpperY === "number" ? moduleUpperY - exclusion.position.y : moduleUpperY.sub(exclusion.position.y)
                        const exclusionLowerX = typeof exclusionUpperX === "number" ? exclusionUpperX - module.width : exclusionUpperX.sub(module.width)
                        const exclusionLowerY = typeof exclusionUpperY === "number" ? exclusionUpperY - module.height : exclusionUpperY.sub(module.height)

                        label = "dynamic-routing-exclusion-constraints-free-position-fixed-orientation-down-id" + exclusion.id
                        clauses.push(
                            {
                                expr: ctx.And(
                                    ctx.Eq(exclusion.encoding.positionX, exclusionLowerX),
                                    ctx.Eq(exclusion.encoding.positionY, exclusionLowerY)
                                ),
                                label: label + UniqueConstraint.generateRandomString()
                            }
                        )
                    } else if (module.encoding.orientation.value === Orientation.Right) {
                        const exclusionLowerX = smtSum(ctx, module.encoding.positionX, exclusion.position.y)
                        const newRelativeExclusionY = module.width - exclusion.position.x - exclusion.width
                        const exclusionLowerY = smtSum(ctx, module.encoding.positionY, newRelativeExclusionY)
                        label = "dynamic-routing-exclusion-constraints-free-position-fixed-orientation-right-id" + exclusion.id
                        clauses.push(
                            {
                                expr: ctx.And(
                                    ctx.Eq(exclusion.encoding.positionX, exclusionLowerX),
                                    ctx.Eq(exclusion.encoding.positionY, exclusionLowerY)
                                ),
                                label: label + UniqueConstraint.generateRandomString()
                            }
                        )
                    } else { // orientation = Left
                        const exclusionLowerY = smtSum(ctx, module.encoding.positionY, exclusion.position.x)
                        const newRelativeExclusionX = module.height - exclusion.position.y - exclusion.height
                        const exclusionLowerX = smtSum(ctx, module.encoding.positionX, newRelativeExclusionX)
                        label = "dynamic-routing-exclusion-constraints-free-position-fixed-orientation-left-id" + exclusion.id
                        clauses.push(
                            {
                                expr: ctx.And(
                                    ctx.Eq(exclusion.encoding.positionX, exclusionLowerX),
                                    ctx.Eq(exclusion.encoding.positionY, exclusionLowerY)
                                ),
                                label: label + UniqueConstraint.generateRandomString()
                            }
                        )
                    }
                }
            }

            // If orientation of module is not pre-defined -> type is EnumBitVec
            else {
                // If position of module is pre-defined -> exclusion position can only have four possible final positions depending on orientation
                if (module.position !== undefined) {
                    // ORIGINAL coordinates of exclusion (in the whole grid of the chip) -> UP direction
                    const upExclusionLowerX = exclusion.position.x + module.position.x
                    const upExclusionLowerY = exclusion.position.y + module.position.y

                    // DOWN direction
                    const downModuleUpperX = module.position.x + module.width
                    const downModuleUpperY = module.position.y + module.height
                    const downExclusionUpperX = downModuleUpperX - exclusion.position.x
                    const downExclusionUpperY = downModuleUpperY - exclusion.position.y
                    const downExclusionLowerX = downExclusionUpperX - exclusion.width
                    const downExclusionLowerY = downExclusionUpperY - exclusion.height

                    // RIGHT direction
                    const rightExclusionLowerX = module.position.x + exclusion.position.y
                    const rightNewRelativeExclusionY = module.width - exclusion.position.x - exclusion.width
                    const rightExclusionLowerY = module.position.y + rightNewRelativeExclusionY

                    // LEFT direction
                    const leftExclusionLowerY = module.position.y + exclusion.position.x
                    const leftNewRelativeExclusionX = module.height - exclusion.position.y - exclusion.height
                    const leftExclusionLowerX = module.position.x + leftNewRelativeExclusionX

                    label = "dynamic-routing-exclusion-constraints-fixed-position-free-orientation-id" + exclusion.id

                    clauses.push(
                        {
                            expr: ctx.And(
                                ctx.Implies(
                                    module.encoding.orientation.eq(ctx, Orientation.Up),
                                    ctx.And(
                                        ctx.Eq(exclusion.encoding.positionX, upExclusionLowerX),
                                        ctx.Eq(exclusion.encoding.positionY, upExclusionLowerY)
                                    )
                                ),
                                ctx.Implies(
                                    module.encoding.orientation.eq(ctx, Orientation.Down),
                                    ctx.And(
                                        ctx.Eq(exclusion.encoding.positionX, downExclusionLowerX),
                                        ctx.Eq(exclusion.encoding.positionY, downExclusionLowerY)
                                    )
                                ),
                                ctx.Implies(
                                    module.encoding.orientation.eq(ctx, Orientation.Right),
                                    ctx.And(
                                        ctx.Eq(exclusion.encoding.positionX, rightExclusionLowerX),
                                        ctx.Eq(exclusion.encoding.positionY, rightExclusionLowerY)
                                    )
                                ),
                                ctx.Implies(
                                    module.encoding.orientation.eq(ctx, Orientation.Left),
                                    ctx.And(
                                        ctx.Eq(exclusion.encoding.positionX, leftExclusionLowerX),
                                        ctx.Eq(exclusion.encoding.positionY, leftExclusionLowerY)
                                    )
                                )
                            ),
                            label: label + UniqueConstraint.generateRandomString()
                        }
                    )
                }
                // If position of module is not pre-defined -> exclusion position depends entirely on position and orientation of the free module
                else {
                    // ORIGINAL coordinates of exclusion (in the whole grid of the chip) -> UP direction
                    const upExclusionLowerX = smtSum(ctx, exclusion.position.x, module.encoding.positionX)
                    const upExclusionLowerY = smtSum(ctx, exclusion.position.y, module.encoding.positionY)

                    // DOWN direction
                    const downModuleUpperX = smtSum(ctx, module.encoding.positionX, module.width)
                    const downModuleUpperY = smtSum(ctx, module.encoding.positionY, module.height)
                    const downExclusionUpperX = typeof downModuleUpperX === "number" ? downModuleUpperX - exclusion.position.x : downModuleUpperX.sub(exclusion.position.x)
                    const downExclusionUpperY = typeof downModuleUpperY === "number" ? downModuleUpperY - exclusion.position.y : downModuleUpperY.sub(exclusion.position.y)
                    const downExclusionLowerX = typeof downExclusionUpperX === "number" ? downExclusionUpperX - exclusion.width : downExclusionUpperX.sub(exclusion.width)
                    const downExclusionLowerY = typeof downExclusionUpperY === "number" ? downExclusionUpperY - exclusion.height : downExclusionUpperY.sub(exclusion.height)

                    // RIGHT direction
                    const rightExclusionLowerX = smtSum(ctx, module.encoding.positionX, exclusion.position.y)
                    const rightNewRelativeExclusionY = module.width - exclusion.position.x - exclusion.width
                    const rightExclusionLowerY = smtSum(ctx, module.encoding.positionY, rightNewRelativeExclusionY)

                    // LEFT direction
                    const leftExclusionLowerY = smtSum(ctx, module.encoding.positionY, exclusion.position.x)
                    const leftNewRelativeExclusionX = module.height - exclusion.position.y - exclusion.height
                    const leftExclusionLowerX = smtSum(ctx, module.encoding.positionX, leftNewRelativeExclusionX)

                    label = "dynamic-routing-exclusion-constraints-free-position-free-orientation-id" + exclusion.id

                    clauses.push(
                        {
                            expr: ctx.And(
                                ctx.Implies(
                                    module.encoding.orientation.eq(ctx, Orientation.Up),
                                    ctx.And(
                                        ctx.Eq(exclusion.encoding.positionX, upExclusionLowerX),
                                        ctx.Eq(exclusion.encoding.positionY, upExclusionLowerY)
                                    )
                                ),
                                ctx.Implies(
                                    module.encoding.orientation.eq(ctx, Orientation.Down),
                                    ctx.And(
                                        ctx.Eq(exclusion.encoding.positionX, downExclusionLowerX),
                                        ctx.Eq(exclusion.encoding.positionY, downExclusionLowerY)
                                    )
                                ),
                                ctx.Implies(
                                    module.encoding.orientation.eq(ctx, Orientation.Right),
                                    ctx.And(
                                        ctx.Eq(exclusion.encoding.positionX, rightExclusionLowerX),
                                        ctx.Eq(exclusion.encoding.positionY, rightExclusionLowerY)
                                    )
                                ),
                                ctx.Implies(
                                    module.encoding.orientation.eq(ctx, Orientation.Left),
                                    ctx.And(
                                        ctx.Eq(exclusion.encoding.positionX, leftExclusionLowerX),
                                        ctx.Eq(exclusion.encoding.positionY, leftExclusionLowerY)
                                    )
                                )
                            ),
                            label: label + UniqueConstraint.generateRandomString()
                        }
                    )
                }
            }
        }
    }

    /* Dynamic module-based exclusion zones must be within the boundaries of the chip */
    label = "dynamic-routing-exclusion-constraints-chip-boundaries-exclusion-id-"
    {
        const chipLowerX = chip.originX
        const chipHigherX = chip.originX + chip.width
        const chipLowerY = chip.originY
        const chipHigherY = chip.originY + chip.height

        clauses.push(
            {
                expr: ctx.And(
                    ctx.GE(exclusion.encoding.positionX, chipLowerX),
                    ctx.LE(exclusion.encoding.positionX, chipHigherX),
                    ctx.GE(exclusion.encoding.positionY, chipLowerY),
                    ctx.LE(exclusion.encoding.positionY, chipHigherY),
                ),
                label: label + exclusion.id + UniqueConstraint.generateRandomString()
            }
        )
    }
    return clauses
}

export function encodeDynamicRoutingExclusionChannels(ctx: Context, channel: EncodedChannel, exclusion: EncodedDynamicModuleRoutingExclusion, modules: EncodedModule[]): Constraint[] {

    /* Since dynamic module-based routing exclusion zones are restricted to (e.g. optical) barrier-free zones on one side
    the other side is not affected and can be routing channels there
     */
    const clauses = []

    /* Channels segments may not be near dynamic routing exclusion zones */
    let label = "dynamic-routing-exclusion-constraints-segments-near-exclusion-id-"
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                {
                    expr: ctx.Implies(
                        channel.encoding.segments[i].active,
                        channelSegmentRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance)
                    ),
                    label: label + exclusion.id + "-channel-id-" + channel.id + "-segment-id-" + i + UniqueConstraint.generateRandomString()
                }
            )
        }
    }

    /* Channels waypoints may not be near dynamic routing exclusion zones */
    label = "dynamic-routing-exclusion-constraints-waypoints-near-exclusion-id-"
    {
        const min_distance = channel.width / 2 + channel.spacing
        for (let i = 0; i <= channel.maxSegments; i++) {
            clauses.push(
                {
                    expr: waypointRoutingExclusionDistance(ctx, channel, i, exclusion, min_distance),
                    label: label + exclusion.id + "-channel-id-" + channel.id + "-waypoint-id-" + i + UniqueConstraint.generateRandomString()
                }
            )
        }
    }

    /* Channel segments may not cross dynamic routing exclusion zones */
    label = "dynamic-routing-exclusion-constraints-segments-cross-exclusion-id-"
    {
        for (let i = 0; i < channel.maxSegments; i++) {
            clauses.push(
                {
                    expr: ctx.Implies(
                        channel.encoding.segments[i].active,
                        channelSegmentRoutingExclusionNoCross(ctx, channel, i, exclusion)
                    ),
                    label: label + exclusion.id + "-channel-id-" + channel.id + "-segment-id-" + i + UniqueConstraint.generateRandomString()
                }
            )
        }
    }
    return clauses
}


export function encodeDynamicModuleRoutingExclusionPins(ctx: Context, pin: EncodedPin, exclusion: EncodedDynamicModuleRoutingExclusion): Constraint[] {
    const clauses: Constraint[] = []

    /* Pins may not lie inside routing exclusion zones */
    let label = "dynamic-routing-exclusion-constraints-segments-cross-exclusion-id-"
    {
        // TODO: define meaningful min distance between pins and dynamic exclusion zones
        const min_distance = 500
        const pinExclusionRadius = (Pin.pinRadius() + Pin.pinSpacing())
        const pinExclusionSpan = pinExclusionRadius * 2
        const pinExclusionLowerX = typeof pin.encoding.positionX === "number" ? pin.encoding.positionX - pinExclusionRadius : pin.encoding.positionX.sub(pinExclusionRadius)
        const pinExclusionLowerY = typeof pin.encoding.positionY === "number" ? pin.encoding.positionY - pinExclusionRadius : pin.encoding.positionY.sub(pinExclusionRadius)
        clauses.push(
            {
                expr: ctx.And(boxBoxMinDistance(ctx, {
                        x: pinExclusionLowerX,
                        y: pinExclusionLowerY,
                        x_span: pinExclusionSpan,
                        y_span: pinExclusionSpan
                    },
                    {
                        x: exclusion.encoding.positionX,
                        y: exclusion.encoding.positionY,
                        x_span: exclusion.spanX(ctx),
                        y_span: exclusion.spanY(ctx)
                    }, min_distance)),
                label: label + exclusion.id + "-pin-id-" + pin.id + UniqueConstraint.generateRandomString()
            }
        )
    }
    return clauses
}

export function encodeDynamicModuleRoutingExclusionModules(ctx: Context, exclusion: EncodedDynamicModuleRoutingExclusion, module: EncodedModule): Constraint[] {
    const clauses: Constraint[] = []

    /* Other modules (than the one with the exclusion) on both sides of the chip may not lie inside or overlap with routing exclusion zones */
    {
        if (exclusion.module !== module.id) {
            let label = "dynamic-routing-exclusion-constraints-module-id-" + module.id + "-no-cross-exclusion-id-" + exclusion.id
            const min_distance = Clamp.clampSpacing() + Pin.pinSpacing() + Pin.pinRadius()
            {
                clauses.push(
                    {
                        expr: ctx.And(boxBoxMinDistance(ctx, {
                                x: module.encoding.positionX,
                                y: module.encoding.positionY,
                                x_span: module.spanX(ctx),
                                y_span: module.spanY(ctx)
                            },
                            {
                                x: exclusion.encoding.positionX,
                                y: exclusion.encoding.positionY,
                                x_span: exclusion.spanX(ctx),
                                y_span: exclusion.spanY(ctx)
                            }, min_distance)),
                        label: label + UniqueConstraint.generateRandomString()
                    }
                )
            }
        }
    }
    return clauses
}