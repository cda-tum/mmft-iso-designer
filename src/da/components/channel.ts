import { Arith, Bool, Context, Model } from "z3-solver"
import { Position } from "../geometry/position"
import { EnumBitVec, boolVal, intVal } from "../z3Helpers"
import { ModuleID } from "./module"
import {Constraint, UniqueConstraint} from "../processing/constraint";
import {Layer} from "../geometry/layer";

export type ChannelID = number
type ModulePort = {
    module: ModuleID,
    port: [number, number]
}
type ChannelProperties = {
    id: ChannelID
    width: number
    spacing: number
    maxSegments: number
    from: ModulePort
    to: ModulePort
    mandatoryWaypoints?: Position[]
    maxLength?: number
    exactLength?: number
    channelLayer?: Layer
}
export class Channel {
    id: number
    width: number
    spacing: number
    maxSegments: number
    from: ModulePort
    to: ModulePort
    mandatoryWaypoints?: Position[]
    maxLength?: number
    exactLength?: number
    channelLayer?: Layer

    constructor(o: ChannelProperties) {
        this.id = o.id
        this.width = o.width
        this.spacing = o.spacing
        this.maxSegments = o.maxSegments
        this.from = o.from
        this.to = o.to
        this.mandatoryWaypoints = o.mandatoryWaypoints
        this.maxLength = o.maxLength
        this.exactLength = o.exactLength
        this.channelLayer = o.channelLayer
    }

    encode(ctx: Context): EncodedChannel {
        const var_prefix = `ec_${this.id}_`

        const waypoints = [...Array(this.maxSegments + 1).keys()].map(w => ({
            x: ctx.Int.const(`${var_prefix}${w}_x`),
            y: ctx.Int.const(`${var_prefix}${w}_y`),
        }))

        const segments = [...Array(this.maxSegments).keys()].map(s => ({
            active: ctx.Bool.const(`${var_prefix}${s}_active`),
            type: new EnumBitVec(ctx, `${var_prefix}${s}_type`, SegmentType)
        }))

        const length = ctx.Int.const(`${var_prefix}length`)
        const clauses = []
        clauses.push(...segments.flatMap(s => s.type.clauses))

        const extraClauses = clauses.map((expr, index) => {
            return {
                label: `channel-extra-constraints-id-${this.id}` + UniqueConstraint.generateRandomString(5),
                expr: expr
            }
        })

        return new EncodedChannel({
            ...this,
            encoding: {
                waypoints: waypoints,
                segments: segments,
                length: length,
                clauses: extraClauses
            }
        })
    }
}

type EncodedChannelProperties = {
    waypoints: {
        x: Arith
        y: Arith
    }[]
    segments: {
        active: Bool,
        type: EnumBitVec
    }[]
    length: Arith

    /* Extra clauses with regard to the variables above, e.g., limits for enums */
    clauses: Constraint[]
}
export class EncodedChannel extends Channel {
    encoding: EncodedChannelProperties

    constructor(o: ChannelProperties & { encoding: EncodedChannelProperties }) {
        super(o)
        this.encoding = o.encoding
    }

    result(m: Model): ResultChannel {
        const segments = this.encoding.segments.map(s => ({
            active: boolVal(m, s.active),
            type: s.type.result(m)
        }))
        const activeSegments = segments.filter(s => s.active).length
        const waypoints = this.encoding.waypoints.map(w => ({
            x: intVal(m, w.x),
            y: intVal(m, w.y)
        }))
        const length = intVal(m, this.encoding.length)

        return new ResultChannel({
            ...this,
            results: {
                waypoints,
                segments,
                activeSegments,
                length
            }
        })
    }
}

type ResultChannelProperties = {
    waypoints: Position[]
    segments: {
        active: boolean,
        type: SegmentType
    }[]
    activeSegments: number
    length: number
}
export class ResultChannel extends EncodedChannel {
    results!: ResultChannelProperties

    constructor(o: Channel & { encoding: EncodedChannelProperties } & { results: ResultChannelProperties }) {
        super(o)
        this.results = o.results
    }
}

export enum SegmentType {
    Up, Down, Left, Right, UpRight, DownRight, UpLeft, DownLeft
}