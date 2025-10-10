import {Position} from "../geometry/position";
import {Orientation} from "../geometry/orientation";
import {Placement} from "../geometry/placement";
import {Arith, Context, Model} from "z3-solver";
import {EnumBitVec, EnumBitVecValue, intVal} from "../z3Helpers";
import {Constraint, UniqueConstraint} from "../processing/constraint";

export type InlineComponentID = number
type InlineComponentProperties = {
    id: InlineComponentID
    width: number
    height: number
    pitch: number
    spacing: number
    position?: Position
    orientation?: Orientation
    placement?: Placement
    pinAmount?: number
}

export class InlineComponent {
    id: InlineComponentID
    width: number
    height: number
    pitch: number
    spacing: number
    position?: Position
    orientation?: Orientation
    placement?: Placement
    pinAmount?: number

    pitchOffsetX: number
    pitchOffsetY: number
    pitchOffsetOddX: boolean
    pitchOffsetOddY: boolean
    portsX: number
    portsY: number

    constructor(o: InlineComponentProperties) {
        this.id = o.id
        this.width = o.width
        this.height = o.height
        this.pitch = o.pitch
        this.spacing = o.spacing
        this.position = o.position
        this.orientation = o.orientation
        this.placement = o.placement
        this.pinAmount = o.pinAmount
        this.portsX = Math.floor(this.width / this.pitch) - 1
        const p_offset_x = (this.width - (this.portsX - 1) * this.pitch) / 2
        this.pitchOffsetX = Math.floor(p_offset_x)
        this.pitchOffsetOddX = this.pitchOffsetX !== p_offset_x
        this.portsY = Math.floor(this.height / this.pitch) - 1
        const p_offset_y = (this.height - (this.portsY - 1) * this.pitch) / 2
        this.pitchOffsetY = Math.floor(p_offset_y)
        this.pitchOffsetOddY = this.pitchOffsetY !== p_offset_y
    }

    encode(ctx: Context): EncodedInlineComponent {
        const orientation = this.orientation !== undefined ? new EnumBitVecValue(ctx, Orientation, this.orientation) : new EnumBitVec(ctx, `ilc_${this.id}_rotation`, Orientation)
        const placement = this.placement !== undefined ? new EnumBitVecValue(ctx, Placement, this.placement) : new EnumBitVec(ctx, `ilc_${this.id}_placement`, Placement)

        const position = this.position ? {
            positionX: this.position.x,
            positionY: this.position.y
        } : {
            positionX: ctx.Int.const(`ilc_${this.id}_position_x`),
            positionY: ctx.Int.const(`ilc_${this.id}_position_y`)
        }

        const orientationClauses = orientation.clauses.map(expr => {
            return {
                label: `inline-component-orientation-constraints-id-${this.id}` + UniqueConstraint.generateRandomString(5),
                expr: expr
            }
        })

        const instance = new EncodedInlineComponent({
            ...this,
            encoding: {
                ...position,
                orientation,
                placement,
                clauses: [
                    ...orientationClauses
                ]
            }
        })
        return instance
    }
}


type EncodedInlineComponentProperties = {
    positionX: Arith | number
    positionY: Arith | number
    orientation: EnumBitVec | EnumBitVecValue
    placement: EnumBitVec | EnumBitVecValue

    /* Extra clauses with regard to the variables above, e.g., limits for enums */
    clauses: Constraint[]
}

export class EncodedInlineComponent extends InlineComponent {
    encoding: EncodedInlineComponentProperties

    constructor(o: InlineComponentProperties & { encoding: EncodedInlineComponentProperties }) {
        super(o)
        this.encoding = o.encoding
    }

    spanX(ctx: Context) {
        if (this.encoding.orientation instanceof EnumBitVecValue) {
            switch (this.encoding.orientation.value) {
                case Orientation.Up:
                    return this.width
                case Orientation.Right:
                    return this.height
                case Orientation.Down:
                    return this.width
                case Orientation.Left:
                    return this.height
                default: throw ''
            }

        } else if (this.encoding.orientation instanceof EnumBitVec) {
            return ctx.If(
                this.encoding.orientation.eq(ctx, Orientation.Up),
                this.width,
                ctx.If(
                    this.encoding.orientation.eq(ctx, Orientation.Right),
                    this.height,
                    ctx.If(
                        this.encoding.orientation.eq(ctx, Orientation.Down),
                        this.width,
                        this.height
                    )
                )
            )
        } else {
            throw ''
        }
    }

    spanY(ctx: Context) {
        if (this.encoding.orientation instanceof EnumBitVecValue) {
            switch (this.encoding.orientation.value) {
                case Orientation.Up:
                    return this.height
                case Orientation.Right:
                    return this.width
                case Orientation.Down:
                    return this.height
                case Orientation.Left:
                    return this.width
                default: throw ''
            }

        } else if (this.encoding.orientation instanceof EnumBitVec) {
            return ctx.If(
                this.encoding.orientation.eq(ctx, Orientation.Up),
                this.height,
                ctx.If(
                    this.encoding.orientation.eq(ctx, Orientation.Right),
                    this.width,
                    ctx.If(
                        this.encoding.orientation.eq(ctx, Orientation.Down),
                        this.height,
                        this.width
                    )
                )
            )
        } else {
            throw ''
        }
    }

    // TODO: change this logic to represent connection points on the edges of the component

    portPosition(ctx: Context, x: number, y: number) {
        if (typeof this.encoding.positionX == 'number' && typeof this.encoding.positionY == 'number') {
            if (this.encoding.orientation instanceof EnumBitVecValue) {
                switch (this.encoding.orientation.value) {
                    case Orientation.Up:
                        return {
                            x: this.encoding.positionX + this.pitchOffsetX + x * this.pitch,
                            y: this.encoding.positionY + this.pitchOffsetY + y * this.pitch
                        }
                    case Orientation.Right:
                        return {
                            x: this.encoding.positionX + this.pitchOffsetY + y * this.pitch,
                            y: this.encoding.positionY + (this.width - (this.pitchOffsetX + x * this.pitch))
                        }
                    case Orientation.Down:
                        return {
                            x: this.encoding.positionX + (this.width - (this.pitchOffsetX + x * this.pitch)),
                            y: this.encoding.positionY + (this.height - (this.pitchOffsetY + y * this.pitch))
                        }
                    case Orientation.Left:
                        return {
                            x: this.encoding.positionX + (this.height - (this.pitchOffsetY + y * this.pitch)),
                            y: this.encoding.positionY + this.pitchOffsetX + x * this.pitch
                        }
                    default: throw ''
                }

            } else if (this.encoding.orientation instanceof EnumBitVec) {
                return {
                    x: ctx.If(
                        this.encoding.orientation.eq(ctx, Orientation.Up),
                        this.encoding.positionX + this.pitchOffsetX + x * this.pitch,
                        ctx.If(
                            this.encoding.orientation.eq(ctx, Orientation.Right),
                            this.encoding.positionX + this.pitchOffsetY + y * this.pitch,
                            ctx.If(
                                this.encoding.orientation.eq(ctx, Orientation.Down),
                                this.encoding.positionX + (this.width - (this.pitchOffsetX + x * this.pitch)),
                                this.encoding.positionX + this.height - (this.pitchOffsetY + y * this.pitch),
                            )
                        )
                    ),
                    y: ctx.If(
                        this.encoding.orientation.eq(ctx, Orientation.Up),
                        this.encoding.positionY + this.pitchOffsetY + y * this.pitch,
                        ctx.If(
                            this.encoding.orientation.eq(ctx, Orientation.Right),
                            this.encoding.positionY + (this.width - (this.pitchOffsetX + x * this.pitch)),
                            ctx.If(
                                this.encoding.orientation.eq(ctx, Orientation.Down),
                                this.encoding.positionY + (this.height - (this.pitchOffsetY + y * this.pitch)),
                                this.encoding.positionY + this.pitchOffsetX + x * this.pitch,
                            )
                        )
                    )
                }
            } else {
                throw ''
            }
        } else if (typeof this.encoding.positionX != 'number' && typeof this.encoding.positionY != 'number') {
            if (this.encoding.orientation instanceof EnumBitVecValue) {
                switch (this.encoding.orientation.value) {
                    case Orientation.Up:
                        return {
                            x: ctx.Sum(this.encoding.positionX, this.pitchOffsetX + x * this.pitch),
                            y: ctx.Sum(this.encoding.positionY, this.pitchOffsetY + y * this.pitch)
                        }
                    case Orientation.Right:
                        return {
                            x: ctx.Sum(this.encoding.positionX, this.pitchOffsetY + y * this.pitch),
                            y: ctx.Sum(this.encoding.positionY, (this.width - (this.pitchOffsetX + x * this.pitch)))
                        }
                    case Orientation.Down:
                        return {
                            x: ctx.Sum(this.encoding.positionX, (this.width - (this.pitchOffsetX + x * this.pitch))),
                            y: ctx.Sum(this.encoding.positionY, (this.height - (this.pitchOffsetY + y * this.pitch)))
                        }
                    case Orientation.Left:
                        return {
                            x: ctx.Sum(this.encoding.positionX, this.height - (this.pitchOffsetY + y * this.pitch)),
                            y: ctx.Sum(this.encoding.positionY, this.pitchOffsetX + x * this.pitch)
                        }
                    default: throw ''
                }
            } else if (this.encoding.orientation instanceof EnumBitVec) {
                return {
                    x: ctx.If(
                        this.encoding.orientation.eq(ctx, Orientation.Up),
                        ctx.Sum(this.encoding.positionX, this.pitchOffsetX + x * this.pitch),
                        ctx.If(
                            this.encoding.orientation.eq(ctx, Orientation.Right),
                            ctx.Sum(this.encoding.positionX, this.pitchOffsetY + y * this.pitch),
                            ctx.If(
                                this.encoding.orientation.eq(ctx, Orientation.Down),
                                ctx.Sum(this.encoding.positionX, (this.width - (this.pitchOffsetX + x * this.pitch))),
                                ctx.Sum(this.encoding.positionX, this.height - (this.pitchOffsetY + y * this.pitch)),
                            )
                        )
                    ),
                    y: ctx.If(
                        this.encoding.orientation.eq(ctx, Orientation.Up),
                        ctx.Sum(this.encoding.positionY, this.pitchOffsetY + y * this.pitch),
                        ctx.If(
                            this.encoding.orientation.eq(ctx, Orientation.Right),
                            ctx.Sum(this.encoding.positionY, (this.width - (this.pitchOffsetX + x * this.pitch))),
                            ctx.If(
                                this.encoding.orientation.eq(ctx, Orientation.Down),
                                ctx.Sum(this.encoding.positionY, (this.height - (this.pitchOffsetY + y * this.pitch))),
                                ctx.Sum(this.encoding.positionY, this.pitchOffsetX + x * this.pitch),
                            )
                        )
                    )
                }
            } else {
                throw ''
            }
        } else {
            throw ''
        }
    }

    result(m: Model): ResultInlineComponent {
        return new ResultInlineComponent({
            ...this,
            results: {
                positionX: intVal(m, this.encoding.positionX),
                positionY: intVal(m, this.encoding.positionY),
                orientation: this.encoding.orientation.result(m)
            }
        })
    }
}

type ResultInlineComponentProperties = {
    positionX: number
    positionY: number
    orientation: Orientation
}
export class ResultInlineComponent extends EncodedInlineComponent {
    results: ResultInlineComponentProperties

    constructor(o: InlineComponentProperties & { encoding: EncodedInlineComponentProperties } & { results: ResultInlineComponentProperties }) {
        super(o)
        this.results = o.results
    }

    // TODO: change this logic to represent connection points on the edges of the component

    resultPortPosition(ix: number, iy: number): { x: number, y: number } {
        switch (this.results.orientation) {
            case Orientation.Up:
                return {
                    x: this.results.positionX + this.pitchOffsetX + ix * this.pitch,
                    y: this.results.positionY + this.pitchOffsetY + iy * this.pitch
                }
            case Orientation.Right:
                return {
                    x: this.results.positionX + this.pitchOffsetY + iy * this.pitch,
                    y: this.results.positionY + this.pitchOffsetX + (this.portsX - ix - 1) * this.pitch
                }
            case Orientation.Down:
                return {
                    x: this.results.positionX + this.pitchOffsetX + (this.portsX - ix - 1) * this.pitch,
                    y: this.results.positionY + this.pitchOffsetY + (this.portsY - iy - 1) * this.pitch
                }
            case Orientation.Left:
                return {
                    x: this.results.positionX + this.pitchOffsetY + (this.portsY - iy - 1) * this.pitch,
                    y: this.results.positionY + this.pitchOffsetX + ix * this.pitch
                }
        }
    }
}