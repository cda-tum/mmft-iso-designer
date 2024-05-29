import { Bool, Context } from "z3-solver"
import { Chip } from "../chip"
import { nanoid } from "@reduxjs/toolkit"
import { EncodedModule } from "../module"
import { EncodedChannel } from "../channel"

export function encodePaperConstraints(ctx: Context, chip: Chip, modules: EncodedModule[], channels: EncodedChannel[]): Bool[] {
    const clauses: Bool[] = []

    /* Pitch is multiple of 1500um */
    {
        modules.forEach(b => {
            const uid = nanoid()
            const vuid = ctx.Int.const(uid)
            clauses.push(
                ctx.Eq(ctx.Product(vuid, 1500), b.pitch),
                ctx.GT(vuid, 0)
            )
        })
    }

    /* Chip dimensions */
    {
        clauses.push(
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
            )
        )
    }

    /* Module dimensions multiple of 15mm */
    {
        modules.forEach(b => {
            const uid1 = nanoid()
            const vuid1 = ctx.Int.const(uid1)
            const uid2 = nanoid()
            const vuid2 = ctx.Int.const(uid2)
            clauses.push(
                ctx.Eq(ctx.Product(vuid1, 15000), b.width),
                ctx.GT(vuid1, 0)
            )
            clauses.push(
                ctx.Eq(ctx.Product(vuid2, 15000), b.height),
                ctx.GT(vuid2, 0)
            )
        })
    }
    
    /* Port index validation */
    {
        channels.forEach(c => {
            if(modules[c.from.module] === undefined) {
                throw 'Invalid start module'
            }

            if(modules[c.to.module] === undefined) {
                throw 'Invalid end module'
            }

            clauses.push(ctx.Bool.val(c.from.port[0] >= 0))
            clauses.push(ctx.Bool.val(c.from.port[0] < modules[c.from.module].portsX))
            clauses.push(ctx.Bool.val(c.from.port[1] >= 0))
            clauses.push(ctx.Bool.val(c.from.port[1] < modules[c.from.module].portsY))
            clauses.push(ctx.Bool.val(c.to.port[0] >= 0))
            clauses.push(ctx.Bool.val(c.to.port[0] < modules[c.to.module].portsX))
            clauses.push(ctx.Bool.val(c.to.port[1] >= 0))
            clauses.push(ctx.Bool.val(c.to.port[1] < modules[c.to.module].portsY))
        })
    }

    return clauses
}