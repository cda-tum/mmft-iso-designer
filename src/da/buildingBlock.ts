import { Arith, BitVecNum, Bool, Context, Model } from "z3-solver";
import { EnumBitVec, EnumBitVecValue, bool_val, enumbitvec_val, int_val } from "./z3Helpers";
import { Rotation } from "./rotation";
import { Position } from "./position";
import { Chip } from "./chip";
import { encode_block_constraints } from "./constraints/blockConstraints";

export { BuildingBlock, BuildingBlockInstance, EncodedBuildingBlockInstance, ResultBuildingBlockInstance }

class BuildingBlock {
    width!: number
    height!: number
    pitch!: number
    spacing!: number
    pitch_offset_x: number
    pitch_offset_y: number
    pitch_offset_odd_x: boolean
    pitch_offset_odd_y: boolean
    ports_x: number
    ports_y: number
    active_ports?: [number, number][]

    constructor(obj: Partial<BuildingBlock>) {
        Object.assign(this, obj)
        this.ports_x = Math.floor(this.width / this.pitch) - 1
        const p_offset_x = (this.width - (this.ports_x - 1) * this.pitch) / 2
        this.pitch_offset_x = Math.floor(p_offset_x)
        this.pitch_offset_odd_x = this.pitch_offset_x !== p_offset_x
        this.ports_y = Math.floor(this.height / this.pitch) - 1
        const p_offset_y = (this.height - (this.ports_y - 1) * this.pitch) / 2
        this.pitch_offset_y = Math.floor(p_offset_y)
        this.pitch_offset_odd_y = this.pitch_offset_y !== p_offset_y
    }
}

class BuildingBlockInstance extends BuildingBlock {
    fixed_rotation?: Rotation
    fixed_position?: Position

    constructor(obj: Partial<BuildingBlockInstance>) {
        super(obj)
        Object.assign(this, obj)
    }

    encode(bid: number, chip: Chip, ctx: Context): EncodedBuildingBlockInstance {
        const rotation = this.fixed_rotation !== undefined ? new EnumBitVecValue(ctx, Rotation, this.fixed_rotation) : new EnumBitVec(ctx, `ebb_${bid}_rotation`, Rotation)

        const position = this.fixed_position ? {
            position_x: this.fixed_position.x,
            position_y: this.fixed_position.y
        } : {
            position_x: ctx.Int.const(`ebb_${bid}_position_x`),
            position_y: ctx.Int.const(`ebb_${bid}_position_y`)
        }

        const instance = new EncodedBuildingBlockInstance({
            ...this,
            bid,
            ...position,
            rotation,
            clauses: [
                ...rotation.clauses
            ]
        })

        return instance
    }
}

class EncodedBuildingBlockInstance extends BuildingBlockInstance {
    bid!: number
    position_x!: Arith | number
    position_y!: Arith | number
    rotation!: EnumBitVec | EnumBitVecValue
    clauses!: Bool[]

    constructor(obj: Partial<EncodedBuildingBlockInstance>) {
        super(obj)
        this.clauses = []
        Object.assign(this, obj)
    }

    size_x(ctx: Context) {
        if (this.rotation instanceof EnumBitVecValue) {
            switch (this.rotation.value) {
                case Rotation.Up:
                    return this.width
                case Rotation.Right:
                    return this.height
                case Rotation.Down:
                    return this.width
                case Rotation.Left:
                    return this.height
                default: throw ''
            }

        } else if (this.rotation instanceof EnumBitVec) {
            return ctx.If(
                this.rotation.eq(ctx, Rotation.Up),
                this.width,
                ctx.If(
                    this.rotation.eq(ctx, Rotation.Right),
                    this.height,
                    ctx.If(
                        this.rotation.eq(ctx, Rotation.Down),
                        this.width,
                        this.height
                    )
                )
            )
        } else {
            throw ''
        }
    }

    size_y(ctx: Context) {
        if (this.rotation instanceof EnumBitVecValue) {
            switch (this.rotation.value) {
                case Rotation.Up:
                    return this.height
                case Rotation.Right:
                    return this.width
                case Rotation.Down:
                    return this.height
                case Rotation.Left:
                    return this.width
                default: throw ''
            }

        } else if (this.rotation instanceof EnumBitVec) {
            return ctx.If(
                this.rotation.eq(ctx, Rotation.Up),
                this.height,
                ctx.If(
                    this.rotation.eq(ctx, Rotation.Right),
                    this.width,
                    ctx.If(
                        this.rotation.eq(ctx, Rotation.Down),
                        this.height,
                        this.width
                    )
                )
            )
        } else {
            throw ''
        }
    }

    port_position(ctx: Context, x: number, y: number) {
        if (typeof this.position_x == 'number' && typeof this.position_y == 'number') {
            if (this.rotation instanceof EnumBitVecValue) {
                switch (this.rotation.value) {
                    case Rotation.Up:
                        return {
                            x: this.position_x + this.pitch_offset_x + x * this.pitch,
                            y: this.position_y + this.pitch_offset_y + y * this.pitch
                        }
                    case Rotation.Right:
                        return {
                            x: this.position_x + this.pitch_offset_y + y * this.pitch,
                            y: this.position_y + (this.width - (this.pitch_offset_x + x * this.pitch))
                        }
                    case Rotation.Down:
                        return {
                            x: this.position_x + (this.width - (this.pitch_offset_x + x * this.pitch)),
                            y: this.position_y + (this.height - (this.pitch_offset_y + y * this.pitch))
                        }
                    case Rotation.Left:
                        return {
                            x: this.position_x + (this.height - (this.pitch_offset_y + y * this.pitch)),
                            y: this.position_y + this.pitch_offset_x + x * this.pitch
                        }
                    default: throw ''
                }

            } else if (this.rotation instanceof EnumBitVec) {
                return {
                    x: ctx.If(
                        this.rotation.eq(ctx, Rotation.Up),
                        this.position_x + this.pitch_offset_x + x * this.pitch,
                        ctx.If(
                            this.rotation.eq(ctx, Rotation.Right),
                            this.position_x + this.pitch_offset_y + y * this.pitch,
                            ctx.If(
                                this.rotation.eq(ctx, Rotation.Down),
                                this.position_x + (this.width - (this.pitch_offset_x + x * this.pitch)),
                                this.position_x + this.height - (this.pitch_offset_y + y * this.pitch),
                            )
                        )
                    ),
                    y: ctx.If(
                        this.rotation.eq(ctx, Rotation.Up),
                        this.position_y + this.pitch_offset_y + y * this.pitch,
                        ctx.If(
                            this.rotation.eq(ctx, Rotation.Right),
                            this.position_y + (this.width - (this.pitch_offset_x + x * this.pitch)),
                            ctx.If(
                                this.rotation.eq(ctx, Rotation.Down),
                                this.position_y + (this.height - (this.pitch_offset_y + y * this.pitch)),
                                this.position_y + this.pitch_offset_x + x * this.pitch,
                            )
                        )
                    )
                }
            } else {
                throw ''
            }
        } else if (typeof this.position_x != 'number' && typeof this.position_y != 'number') {
            if (this.rotation instanceof EnumBitVecValue) {
                switch (this.rotation.value) {
                    case Rotation.Up:
                        return {
                            x: ctx.Sum(this.position_x, this.pitch_offset_x + x * this.pitch),
                            y: ctx.Sum(this.position_y, this.pitch_offset_y + y * this.pitch)
                        }
                    case Rotation.Right:
                        return {
                            x: ctx.Sum(this.position_x, this.pitch_offset_y + y * this.pitch),
                            y: ctx.Sum(this.position_y, (this.width - (this.pitch_offset_x + x * this.pitch)))
                        }
                    case Rotation.Down:
                        return {
                            x: ctx.Sum(this.position_x, (this.width - (this.pitch_offset_x + x * this.pitch))),
                            y: ctx.Sum(this.position_y, (this.height - (this.pitch_offset_y + y * this.pitch)))
                        }
                    case Rotation.Left:
                        return {
                            x: ctx.Sum(this.position_x, this.height - (this.pitch_offset_y + y * this.pitch)),
                            y: ctx.Sum(this.position_y, this.pitch_offset_x + x * this.pitch)
                        }
                    default: throw ''
                }
            } else if (this.rotation instanceof EnumBitVec) {
                return {
                    x: ctx.If(
                        this.rotation.eq(ctx, Rotation.Up),
                        ctx.Sum(this.position_x, this.pitch_offset_x + x * this.pitch),
                        ctx.If(
                            this.rotation.eq(ctx, Rotation.Right),
                            ctx.Sum(this.position_x, this.pitch_offset_y + y * this.pitch),
                            ctx.If(
                                this.rotation.eq(ctx, Rotation.Down),
                                ctx.Sum(this.position_x, (this.width - (this.pitch_offset_x + x * this.pitch))),
                                ctx.Sum(this.position_x, this.height - (this.pitch_offset_y + y * this.pitch)),
                            )
                        )
                    ),
                    y: ctx.If(
                        this.rotation.eq(ctx, Rotation.Up),
                        ctx.Sum(this.position_y, this.pitch_offset_y + y * this.pitch),
                        ctx.If(
                            this.rotation.eq(ctx, Rotation.Right),
                            ctx.Sum(this.position_y, (this.width - (this.pitch_offset_x + x * this.pitch))),
                            ctx.If(
                                this.rotation.eq(ctx, Rotation.Down),
                                ctx.Sum(this.position_y, (this.height - (this.pitch_offset_y + y * this.pitch))),
                                ctx.Sum(this.position_y, this.pitch_offset_x + x * this.pitch),
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

    result(m: Model): ResultBuildingBlockInstance {
        return new ResultBuildingBlockInstance({
            ...this,
            results: {
                position_x: int_val(m, this.position_x),
                position_y: int_val(m, this.position_y),
                rotation: this.rotation.result(m)
            }
        })
    }
}

class ResultBuildingBlockInstance extends EncodedBuildingBlockInstance {
    results!: {
        position_x: number
        position_y: number
        rotation: Rotation
    }

    constructor(obj: Partial<ResultBuildingBlockInstance>) {
        super(obj)
        Object.assign(this, obj)
    }

    result_port_position(ix: number, iy: number): { x: number, y: number } {
        switch (this.results.rotation) {
            case Rotation.Up:
                return {
                    x: this.results.position_x + this.pitch_offset_x + ix * this.pitch,
                    y: this.results.position_y + this.pitch_offset_y + iy * this.pitch
                }
            case Rotation.Right:
                return {
                    x: this.results.position_x + this.pitch_offset_y + iy * this.pitch,
                    y: this.results.position_y + this.pitch_offset_x + (this.ports_x - ix - 1) * this.pitch
                }
            case Rotation.Down:
                return {
                    x: this.results.position_x + this.pitch_offset_x + (this.ports_x - ix - 1) * this.pitch,
                    y: this.results.position_y + this.pitch_offset_y + (this.ports_y - iy - 1) * this.pitch
                }
            case Rotation.Left:
                return {
                    x: this.results.position_x + this.pitch_offset_y + (this.ports_y - iy - 1) * this.pitch,
                    y: this.results.position_y + this.pitch_offset_x + ix * this.pitch
                }
        }
    }
}