import { randomUUID } from "crypto"
import { EnumType, Type } from "typescript"
import { Arith, ArithSort, BitVec, BitVecNum, BitVecSort, Bool, Context, Model, SMTArray, Sort } from "z3-solver"

export { get_int, get_bool, int_val, bool_val, get_int_array, get_enum_array, get_bitvec, get_enumbitvec, enumbitvec_val, EnumBitVec, EnumBitVecValue, z3_switch }
export type { IntArray }

type IntArray = SMTArray<"main", [ArithSort], ArithSort>
type BitVecArray = SMTArray<"main", [ArithSort], BitVecSort>

function parse_Z3_int(str: string) {
    return parseInt(str.replace(/([^-0-9])/gm, ''))
}

function get_int(model: Model, v: Arith) {
    const r = model.get(v).toString()
    return parse_Z3_int(r)
}

function int_val(model: Model, v: Arith | number) {
    if (typeof v == 'number') {
        return v
    } else {
        return get_int(model, v)
    }
}

function get_bool(model: Model, v: Bool) {
    return model.eval(v).toString() === 'true'
}

function bool_val(model: Model, v: Bool | boolean) {
    if (typeof v == 'boolean') {
        return v
    } else {
        return get_bool(model, v)
    }
}

function get_bitvec(model: Model, v: BitVec) {
    return model.eval(v).value()
}

function get_enumbitvec(model: Model, v: EnumBitVec) {
    return v.result(model)
}

function enumbitvec_val(model: Model, v: EnumBitVec | boolean) {
    if (typeof v == 'boolean') {
        return v
    } else {
        return get_enumbitvec(model, v)
    }
}

function get_int_array(model: Model, v: SMTArray<"main", [ArithSort], ArithSort>, from: number, to: number) {
    const range = to - from
    if (range <= 0) {
        return []
    }
    return [...Array(range).keys()].map(k => k + from).map(i => parse_Z3_int(model.eval(v.select(i)).toString()))
}

function get_enum_array(model: Model, v: SMTArray<"main", [ArithSort], BitVecSort>, from: number, to: number) {
    const range = to - from
    if (range <= 0) {
        return []
    }
    return [...Array(range).keys()].map(k => k + from).map(i => EnumBitVec.result(model, v.select(i)))
}

class EnumBitVec {
    ctx: Context
    bitvector: BitVec
    type: any
    variants: number
    bits: number
    clauses: Bool[]

    constructor(ctx: Context, name: string, type: any) {
        this.ctx = ctx
        this.type = type
        const [variants, bits] = variants_and_bits(type)
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
        const [variants, bits] = variants_and_bits(type)
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
        return Number(get_bitvec(model, this.bitvector))
    }

    static result(model: Model, bitvector: BitVec) {
        return Number(get_bitvec(model, bitvector))
    }

    value(v: any) {
        return this.ctx.BitVec.val(v.valueOf(), this.bits)
    }

    static value(ctx: Context, type: any, v: any) {
        const [_, bits] = variants_and_bits(type)
        return ctx.BitVec.val(v.valueOf(), bits)
    }

    static bits(type: any) {
        const r = variants_and_bits(type)
        return r[1]
    }
}

class EnumBitVecValue {
    ctx: Context
    value: any
    bitvector: BitVecNum
    type: any
    variants: number
    bits: number
    clauses: Bool[]

    constructor(ctx: Context, type: any, value: any) {
        this.ctx = ctx
        const [variants, bits] = variants_and_bits(type)
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

function variants_and_bits(type: any) {
    const variants = Object.keys(type).length / 2
    const bits = Math.ceil(Math.log2(variants))
    return [variants, bits]
}

function bitvalues_to_number(bits: boolean[]) {
    return bits.reverse().reduce((a, b, i) => a + (b ? 2 ** i : 0), 0)
}

function z3_switch(ctx: Context, default_condition: Bool, ...conditions: [Bool, Bool][]) {
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