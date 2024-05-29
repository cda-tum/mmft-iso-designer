import { Arith, ArithSort, BitVec, BitVecNum, BitVecSort, Bool, Context, Model, SMTArray } from "z3-solver"

export type { IntArray }

type IntArray = SMTArray<"main", [ArithSort], ArithSort>
type BitVecArray = SMTArray<"main", [ArithSort], BitVecSort>

function parseZ3Int(str: string) {
    return parseInt(str.replace(/([^-0-9])/gm, ''))
}

function getInt(model: Model, v: Arith) {
    const r = model.get(v).toString()
    return parseZ3Int(r)
}

export function intVal(model: Model, v: Arith | number) {
    if (typeof v == 'number') {
        return v
    } else {
        return getInt(model, v)
    }
}

function getBool(model: Model, v: Bool) {
    return model.eval(v).toString() === 'true'
}

export function boolVal(model: Model, v: Bool | boolean) {
    if (typeof v == 'boolean') {
        return v
    } else {
        return getBool(model, v)
    }
}

function getBitVec(model: Model, v: BitVec) {
    return model.eval(v).value()
}

function getEnumBitVec(model: Model, v: EnumBitVec) {
    return v.result(model)
}

function enumbBitVecVal(model: Model, v: EnumBitVec | boolean) {
    if (typeof v == 'boolean') {
        return v
    } else {
        return getEnumBitVec(model, v)
    }
}

export function getIntArray(model: Model, v: SMTArray<"main", [ArithSort], ArithSort>, from: number, to: number) {
    const range = to - from
    if (range <= 0) {
        return []
    }
    return [...Array(range).keys()].map(k => k + from).map(i => parseZ3Int(model.eval(v.select(i)).toString()))
}

export function getEnumArray(model: Model, v: SMTArray<"main", [ArithSort], BitVecSort>, from: number, to: number) {
    const range = to - from
    if (range <= 0) {
        return []
    }
    return [...Array(range).keys()].map(k => k + from).map(i => EnumBitVec.result(model, v.select(i)))
}

export class EnumBitVec {
    ctx: Context
    bitvector: BitVec
    type: any
    variants: number
    bits: number
    clauses: Bool[]

    constructor(ctx: Context, name: string, type: any) {
        this.ctx = ctx
        this.type = type
        const [variants, bits] = variantsAndBits(type)
        this.variants = variants
        this.bits = bits
        this.bitvector = ctx.BitVec.const(name, this.bits)
        this.clauses = []

        if (variants < 2 ** bits) {
            this.clauses.push(
                this.ctx.ULT(
                    this.bitvector,
                    this.value(this.variants)
                )
            )
            
        } else {
            this.clauses.push(
                this.ctx.SGE(
                    this.bitvector,
                    this.ctx.BitVec.val(0, this.bits)
                ).or(this.ctx.SLE(
                    this.bitvector,
                    this.ctx.BitVec.val(0, this.bits)
                ))
            )
        }
    }

    static constraints(ctx: Context, bitvector: BitVec, type: any) {
        const [variants, bits] = variantsAndBits(type)
        if (variants < 2 ** bits) {
            return [
                ctx.ULT(
                    bitvector,
                    EnumBitVec.value(ctx, type, variants)
                )
            ]
            
        } else {
            return [
                ctx.SGE(
                    bitvector,
                    ctx.BitVec.val(0, bits)
                ).or(ctx.SLE(
                    bitvector,
                    ctx.BitVec.val(0, bits)
                ))
            ]
        }
    }

    get var() {
        return this.bitvector
    }

    eq(ctx: Context, value: any) {
        return ctx.Eq(this.bitvector, this.value(value))
    }

    result(model: Model) {
        return Number(getBitVec(model, this.bitvector))
    }

    static result(model: Model, bitvector: BitVec) {
        return Number(getBitVec(model, bitvector))
    }

    value(v: any) {
        return this.ctx.BitVec.val(v.valueOf(), this.bits)
    }

    static value(ctx: Context, type: any, v: any) {
        const [_, bits] = variantsAndBits(type)
        return ctx.BitVec.val(v.valueOf(), bits)
    }

    static bits(type: any) {
        const r = variantsAndBits(type)
        return r[1]
    }
}

export class EnumBitVecValue {
    ctx: Context
    value: any
    bitvector: BitVecNum
    type: any
    variants: number
    bits: number
    clauses: Bool[]

    constructor(ctx: Context, type: any, value: any) {
        this.ctx = ctx
        const [variants, bits] = variantsAndBits(type)
        this.variants = variants
        this.bits = bits
        this.value = value
        this.bitvector = ctx.BitVec.val(value, this.bits)
        this.clauses = []
    }

    get var() {
        return this.bitvector
    }

    result(model: Model) {
        return this.value
    }
}

function variantsAndBits(type: any) {
    const variants = Object.keys(type).length / 2
    const bits = Math.ceil(Math.log2(variants))
    return [variants, bits]
}

function bitvaluesToNumber(bits: boolean[]) {
    return bits.reverse().reduce((a, b, i) => a + (b ? 2 ** i : 0), 0)
}

function z3Switch(ctx: Context, default_condition: Bool, ...conditions: [Bool, Bool][]) {
    const initial = ctx.If(
        conditions[conditions.length - 1][0],
        conditions[conditions.length - 1][1],
        default_condition
    )
    return [...conditions.slice(0, -1)].reverse().reduce((acc, c) => ctx.If(
        c[0],
        c[1],
        acc
    ), initial)
}