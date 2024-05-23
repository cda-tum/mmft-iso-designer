import { Arith, ArithSort, BitVecSort, Bool, Context, Model, SMTArray } from "z3-solver"
import { Position } from "./position"
import { EnumBitVec, IntArray, bool_val, get_bool, get_enum_array, get_int_array, int_val } from "./z3Helpers"
import { Chip } from "./chip"
import uuid from "v4-uuid"

export { Channel, ChannelInstance, EncodedChannelInstance, ResultChannelInstance, SegmentType }

class Channel {
    width!: number
    spacing!: number
    height?: number
    max_segments?: number

    constructor(obj: Partial<Channel>) {
        Object.assign(this, obj)
    }

    create(options: { from: { module: number, port: [number, number] }, to: { module: number, port: [number, number] }, fixed_waypoints?: Position[], static_waypoints?: Position[], max_segments?: number, fixed_length?: number }): ChannelInstance {
        return new ChannelInstance({
            ...this,
            ...options
        })
    }
}

class ChannelInstance extends Channel {

    from!: {
        module: number,
        port: [number, number]
    }
    to!: {
        module: number,
        port: [number, number]
    }

    fixed_waypoints!: Position[]
    static_waypoints?: Position[]
    max_segments!: number
    fixed_length!: number

    constructor(obj: Partial<ChannelInstance>) {
        super(obj)
        Object.assign(this, obj)
        this.fixed_waypoints ??= []
    }

    encode(cid: number, chip: Chip | undefined, ctx: Context): EncodedChannelInstance {
        const var_prefix = `ec_${cid}_`

        const waypoints = [...Array(this.max_segments + 1).keys()].map(w => ({
            x: ctx.Int.const(`${var_prefix}${w}_x`),
            y: ctx.Int.const(`${var_prefix}${w}_y`),
        }))

        const segments = [...Array(this.max_segments).keys()].map(s => ({
            active: ctx.Bool.const(`${var_prefix}${s}_active`),
            type: new EnumBitVec(ctx, `${var_prefix}${s}_type`, SegmentType)
        }))

        const length = ctx.Int.const(`${var_prefix}length_active`)

        const clauses = []
        clauses.push(...segments.flatMap(s => s.type.clauses))

        if(this.static_waypoints !== undefined) {
            if(this.static_waypoints.length !== waypoints.length) {
                throw 'misconfiguration'
            }
            waypoints.forEach((w, i) => {
                clauses.push(ctx.Eq(w.x, this.static_waypoints![i].x))
                clauses.push(ctx.Eq(w.y, this.static_waypoints![i].y))
            })
        }

        return new EncodedChannelInstance({
            ...this,
            id: cid,
            segments_n: this.max_segments,
            waypoints,
            segments,
            clauses,
            length
        })
    }
}

class EncodedChannelInstance extends ChannelInstance {
    id!: number
    var_prefix!: string
    clauses: Bool[]

    segments_n!: number
    waypoints!: {
        x: Arith
        y: Arith
    }[]
    segments!: {
        active: Bool,
        type: EnumBitVec
    }[]

    length!: Arith

    constructor(obj: Partial<EncodedChannelInstance>) {
        super(obj)
        this.clauses = []
        Object.assign(this, obj)
    }

    result(m: Model): ResultChannelInstance {
        const segments = this.segments.map(s => ({
            active: bool_val(m, s.active),
            type: s.type.result(m)
        }))
        const active_segments = segments.filter(s => s.active).length
        const waypoints = this.waypoints.map(w => ({
            x: int_val(m, w.x),
            y: int_val(m, w.y)
        }))
        const length = int_val(m, this.length)

        return new ResultChannelInstance({
            ...this,
            results: {
                waypoints,
                segments,
                active_segments,
                length
            }
        })
    }
}

class ResultChannelInstance extends EncodedChannelInstance {
    results!: {
        waypoints: Position[]
        segments: {
            active: boolean,
            type: SegmentType
        }[]
        active_segments: number
        length: number
    }

    constructor(obj: Partial<ResultChannelInstance>) {
        super(obj)
        Object.assign(this, obj)
    }
}

enum SegmentType {
    Up, Down, Left, Right
}