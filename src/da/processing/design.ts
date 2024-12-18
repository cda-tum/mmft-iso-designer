import {init, Z3_app, Z3_ast} from "z3-solver"
import {Input} from "./inputOutput"


export {design}

async function design(input: Input) {

    (window as any).Module = {
        wasmMemory: {
            initial: 1536 * 1024 * 1024, // bytes
            maximum: 2048 * 1024 * 1024
        }
    }
    const {Context, em, Z3} = await init()

    // Comes out unsat if more than one thread ...
    //Z3.global_param_set('parallel.enable', 'true')
    //Z3.global_param_set('smt.threads', '1') // fails if > 1
    //Z3.global_param_set('smt.random_seed', '1000') //no apparent effect
    //Z3.global_param_set('smt.arith.random_initial_value', 'true') //no apparent effect

    //Z3.global_param_set('auto_config', 'false')
    //Z3.global_param_set('smt.arith.int_eq_branch', 'true')
    const ctx = Context('main')
    try {
        const solver = new ctx.Solver()
        solver.set('unsat_core', true)

        const encoded_input = input.encode(ctx)
        console.log("adding " + encoded_input.clauses.length + " constraints")

        encoded_input.clauses.forEach((c) => {
            solver.addAndTrack(c.expr, c.label);
        })

        let start = performance.now()
        const check = await solver.check()
        const timing = performance.now() - start


        if (check === "unsat") {
            const ctxPtr = solver.ctx.ptr
            const solverPtr = solver.ptr

            // Get the unsat core as a Z3_ast_vector
            const unsatCoreAstVector = Z3.solver_get_unsat_core(ctxPtr, solverPtr)

            const unsatCoreSize = Z3.ast_vector_size(ctxPtr, unsatCoreAstVector)
            const unsatCoreLabels: string[] = []

            // Constants for AST kinds (in this case it is 1)
            const Z3_APP_AST = 1

            // Iterate over the unsat core vector
            for (let i = 0; i < unsatCoreSize; i++) {

                const astPtr = Z3.ast_vector_get(ctxPtr, unsatCoreAstVector, i) as Z3_ast
                const astKind = Z3.get_ast_kind(ctxPtr, astPtr)

                if (astKind === Z3_APP_AST) {
                    const appPtr = Z3.to_app(ctxPtr, astPtr) as Z3_app
                    const declPtr = Z3.get_app_decl(ctxPtr, appPtr)
                    const symbolPtr = Z3.get_decl_name(ctxPtr, declPtr)
                    const labelName = Z3.get_symbol_string(ctxPtr, symbolPtr)

                    if (labelName !== null) {
                        unsatCoreLabels.push(labelName)
                    } else {
                        console.warn(`Label name is null for AST node at index ${i}`)
                    }
                } else {
                    console.warn(`Unexpected AST kind (${astKind}) at index ${i}`)
                }
            }
            console.log('Unsat core labels:', unsatCoreLabels)
            return {
                success: false,
                timing,
                unsatCoreLabels
            } as {
                success: false,
                timing: number,
                unsatCoreLabels: string[]
            }
        }

        else if (check === 'unknown') {
            throw "Z3 cannot determine whether there is a solution."
        } else {
            const model = solver.model()
            const result = encoded_input.result(model)

            /** DEBUGGING AND TESTING **/

            for (let k = 0; k < result.channels.length; k++) {
                console.log("Resulting channel length of channel " + k + ": " + result.channels[k].results.length)
                console.log("Waypoint coordinates for channel " + k + ": ")
                let waypoints = ""
                for (let i = 0; i < result.channels[k].results.waypoints.length; i++) {
                    waypoints += ("{ \"x\": " + result.channels[k].results.waypoints[i].x + ", \"y\": " + result.channels[k].results.waypoints[i].y + "},")
                }
                console.log(waypoints.slice(0, waypoints.length - 1))
            }

            for (let m = 0; m < result.modules.length; m++) {
                console.log("Resulting pins for module : " + m)
                let pinPositions = ""
                result.pins.forEach(pin => {
                    if (pin.module === m) {
                        pinPositions +=("{ \"x\": " + pin.results.positionX + ", \"y\": " + pin.results.positionY + "},")
                    }
                })
                console.log(pinPositions.slice(0, pinPositions.length - 1))
            }

            result.timing = timing
            return result
        }
    } catch (e) {
        console.error('error', e);
    } finally {
        em.PThread.terminateAllThreads();
    }
}