import { init } from "z3-solver"
import { Input } from "./inputOutput"

export { design }

async function design(input: Input) {
    const { Context, em, Z3 } = await init()
    // Comes out unsat if more than one thread ...
    //Z3.global_param_set('parallel.enable', 'true')
    //Z3.global_param_set('smt.threads', '1') fails if > 1
    //Z3.global_param_set('smt.random_seed', '1000') //no apparent effect
    //Z3.global_param_set('smt.arith.random_initial_value', 'true') //no apparent effect

    //Z3.global_param_set('auto_config', 'false')
    //Z3.global_param_set('smt.arith.int_eq_branch', 'true')
    const ctx = Context('main')
    try {
        const solver = new ctx.Solver()
        solver.set('unsat_core', false)

        const encoded_input = input.encode(ctx)
        solver.add(...encoded_input.clauses)
        console.log("adding " + encoded_input.clauses.length + " constraints")

        let start = performance.now()
        const check = await solver.check()
        const timing = performance.now() - start
        console.log(`Result: ${check}; time elapsed: ${timing} ms`)
        if(check === 'unsat') {
            return {
                success: false,
                timing
            } as {
                success: false,
                timing: number
            }
        } else if (check === 'unknown') {
            throw 'Z3 cannot determine whether there is a solution.'
        } else {
            const model = solver.model()
            const result = encoded_input.result(model)
            result.timing = timing
            return result
        }
    } catch (e) {
        console.error('error', e);
    } finally {
        em.PThread.terminateAllThreads();
    }
}