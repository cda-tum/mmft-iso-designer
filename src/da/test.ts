import { init } from "z3-solver"

export { example }

async function example() {
    const { Context, em, Z3 } = await init()
    const ctx = Context('main')
    try {
        const solver = new ctx.Solver()
        
        const b = ctx.BitVec.const('b', 2)
        //solver.add(ctx.UGE(b, 0))
        //solver.add(ctx.SGE(b, ctx.BitVec.val(0, 2)).or(ctx.SLE(b, ctx.BitVec.val(0, 2))))
        //solver.add(ctx.Eq(b, ctx.BitVec.val(-1, 2)))
        ;[...solver.assertions().values()].forEach(f => console.log(f.toString()))
        const check = await solver.check()
        if(check === 'unsat') {
            console.log('unsat')
        } else if (check === 'unknown') {
            console.log('unknown')
        } else {
            console.log('sat')
            const model = solver.model()
            console.log('b = ', Number(model.eval(b).value()))
        }
    } catch (e) {
        console.error('error', e);
    } finally {
        em.PThread.terminateAllThreads();
    }
}