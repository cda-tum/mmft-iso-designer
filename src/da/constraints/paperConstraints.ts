import {Bool, Context} from "z3-solver"
import {Chip} from "../components/chip"
import {nanoid} from "@reduxjs/toolkit"
import {EncodedModule} from "../components/module"
import {EncodedChannel} from "../components/channel"
import {Constraint} from "../processing/constraint";

export function encodePaperConstraints(ctx: Context, chip: Chip, modules: EncodedModule[], channels: EncodedChannel[]): Constraint[] {
    const clauses: Constraint[] = []

    /* Pitch is multiple of 1500um */
    let label = "paper-constraints-module-pitch-id-"
    {
        modules.forEach(b => {
            const uid = nanoid()
            const vuid = ctx.Int.const(uid)
            clauses.push(
                {
                    expr:
                        ctx.And(
                            ctx.Eq(ctx.Product(vuid, 1500), b.pitch),
                            ctx.GT(vuid, 0)
                        ),
                    label: label + b.id.toString(),
                }
            )
        })
    }

    /* Chip dimensions */
    label = "paper-constraints-chip-dimensions"
    {
        clauses.push(
            {
                expr:
                    ctx.Or(
                        ctx.And(
                            ctx.Bool.val(chip.width >= 25000),
                            ctx.Bool.val(chip.width <= 26000),
                            ctx.Bool.val(chip.height >= 75000),
                            ctx.Bool.val(chip.height <= 76000),
                        ),
                        ctx.And(
                            ctx.Bool.val(chip.width >= 25000),
                            ctx.Bool.val(chip.width <= 26000),
                            ctx.Bool.val(chip.height >= 74000),
                            ctx.Bool.val(chip.height <= 75000),
                        ),
                        ctx.And(
                            ctx.Bool.val(chip.width >= 51000),
                            ctx.Bool.val(chip.width <= 52000),
                            ctx.Bool.val(chip.height >= 75000),
                            ctx.Bool.val(chip.height <= 76000),
                        ),
                        ctx.And(
                            ctx.Bool.val(chip.width >= 50000),
                            ctx.Bool.val(chip.width <= 51000),
                            ctx.Bool.val(chip.height >= 74000),
                            ctx.Bool.val(chip.height <= 75000),
                        ),
                        ctx.And(
                            ctx.Bool.val(chip.width >= 127510),
                            ctx.Bool.val(chip.width <= 128010),
                            ctx.Bool.val(chip.height >= 85230),
                            ctx.Bool.val(chip.height <= 85730),
                        )
                    ),
                label: label
            }
        )
    }

    /* Module dimensions multiple of 15mm */
    label = "paper-constraints-module-width-id-"
    let label2 = "paper-constraints-module-height-id-"
    {
        modules.forEach(b => {
            const uid1 = nanoid()
            const vuid1 = ctx.Int.const(uid1)
            const uid2 = nanoid()
            const vuid2 = ctx.Int.const(uid2)
            clauses.push(
                {
                    expr: ctx.And(
                        ctx.Eq(ctx.Product(vuid1, 15000), b.width),
                        ctx.GT(vuid1, 0))
                    ,
                    label: label + b.id.toString(),
                }
            )
            clauses.push(
                {
                    expr: ctx.And(
                        ctx.Eq(ctx.Product(vuid2, 15000), b.height),
                        ctx.GT(vuid2, 0)
                    ),
                    label: label2 + b.id.toString(),
                }
            )
        })
    }

    /* Port index validation */
    let count = 1
    label = "paper-constraints-port-validation-#"
    {
        channels.forEach(c => {
            if (modules[c.from.module] === undefined) {
                throw 'Invalid start module'
            }

            if (modules[c.to.module] === undefined) {
                throw 'Invalid end module'
            }

            clauses.push({expr: ctx.Bool.val(c.from.port[0] >= 0), label: label + count++})
            clauses.push({expr: ctx.Bool.val(c.from.port[0] < modules[c.from.module].portsX), label: label + count++})
            clauses.push({expr: ctx.Bool.val(c.from.port[1] >= 0), label: label + count++})
            clauses.push({expr: ctx.Bool.val(c.from.port[1] < modules[c.from.module].portsY), label: label + count++})
            clauses.push({expr: ctx.Bool.val(c.to.port[0] >= 0), label: label + count++})
            clauses.push({expr: ctx.Bool.val(c.to.port[0] < modules[c.to.module].portsX), label: label + count++})
            clauses.push({expr: ctx.Bool.val(c.to.port[1] >= 0), label: label + count++})
            clauses.push({expr: ctx.Bool.val(c.to.port[1] < modules[c.to.module].portsY), label: label + count++})
        })
    }

    return clauses
}