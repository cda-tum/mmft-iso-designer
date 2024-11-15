import {init} from "z3-solver"
import {Input} from "./inputOutput"

export {design}

async function design(input: Input) {
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

        /**
         *
         // Access raw pointers
        const ctxPtr = solver.ctx.ptr;
        const solverPtr = solver.ptr;

        // Enable unsat core generation
        const params = Z3.mk_params(ctxPtr);
        const unsatCoreSymbol = Z3.mk_string_symbol(ctxPtr, 'unsat_core');
        Z3.params_set_bool(ctxPtr, params, unsatCoreSymbol, true);
        Z3.solver_set_params(ctxPtr, solverPtr, params);

        const encoded_input = input.encode(ctx)
        const boolSort = Z3.mk_bool_sort(ctxPtr);

        encoded_input.clauses.forEach((c) => {
        solver.addAndTrack(c.expr, c.label)
        const tempLabelSymbol = Z3.mk_string_symbol(ctxPtr, c.label)
        const tempLabel = Z3.mk_const(ctxPtr, tempLabelSymbol, boolSort);
        Z3.solver_assert_and_track(ctxPtr, solverPtr, c.expr.ptr, tempLabel)
        })
        let start = performance.now()
        const result = await Z3.solver_check(ctxPtr, solverPtr);
        const timing = performance.now() - start

         const Z3_L_FALSE = 0
         const Z3_L_TRUE = 1
         const Z3_L_UNDEF = -1


         if (result === Z3_L_FALSE) {
         // Constraints are unsatisfiable
         // Get the unsat core
         const unsatCoreAstVectorPtr = Z3.solver_get_unsat_core(ctxPtr, solverPtr);
         const size = Z3.ast_vector_size(ctxPtr, unsatCoreAstVectorPtr);

         for (let i = 0; i < size; i++) {
         const astPtr = Z3.ast_vector_get(ctxPtr, unsatCoreAstVectorPtr, i);

         // Extract label name
         const app = Z3.to_app(ctxPtr, astPtr);
         const decl = Z3.get_app_decl(ctxPtr, app);
         const symbol = Z3.get_decl_name(ctxPtr, decl);
         const labelStr = Z3.get_symbol_string(ctxPtr, symbol);

         console.log(`Constraint with label ${labelStr} is in the unsat core.`)
         return {
         success: false,
         timing
         } as {
         success: false,
         timing: number
         }
         }
         let start = performance.now()
         const check = await solver.check()
         const timing = performance.now() - start

         console.log(`Result: ${check}; time elapsed: ${timing} ms`)
         if (check === 'unsat') {

         const ctxPtr = solver.ctx.ptr;
         const solverPtr = solver.ptr;
         const unsatCoreAstVectorPtr = Z3.solver_get_unsat_core(ctxPtr, solverPtr);
         const size = Z3.ast_vector_size(ctxPtr, unsatCoreAstVectorPtr);
         for (let i = 0; i < size; i++) {
         // Get the AST pointer at index i
         const astPtr = Z3.ast_vector_get(ctxPtr, unsatCoreAstVectorPtr, i);

         // Convert the AST pointer to a string
         const constraintStr = Z3.ast_to_string(ctxPtr, astPtr);

         console.log(`Unsat core constraint ${i}: ${constraintStr}`);
         }
         // Create a parameter set
         const params = Z3.mk_params(ctxPtr);

         // Set the 'unsat_core' parameter to true
         const unsatCoreSymbol = Z3.mk_string_symbol(ctxPtr, 'unsat_core');
         Z3.params_set_bool(ctxPtr, params, unsatCoreSymbol, true);

         // Apply the parameters to the solver
         Z3.solver_set_params(ctxPtr, solverPtr, params);

         }
         } else if (result === Z3_L_TRUE) {
         // The constraints are satisfiable
         // Retrieve the model
         // const modelPtr = Z3.solver_get_model(ctxPtr, solverPtr)
         // const model = Z3.mk_model(ctxPtr)
         // const result = encoded_input.result(model)

         }
         **/

        const encoded_input = input.encode(ctx)
        console.log("adding " + encoded_input.clauses.length + " constraints")

        encoded_input.clauses.forEach((c) => {
            solver.addAndTrack(c.expr, c.label)
        })

        let start = performance.now()
        const check = await solver.check()
        const timing = performance.now() - start


        if (check === "unsat") {
            return {
                success: false,
                timing
            } as {
                success: false,
                timing: number
            }
        } else if (check === 'unknown') {
            throw "Z3 cannot determine whether there is a solution."
        } else {
            const model = solver.model()
            const result = encoded_input.result(model)

            /** DEBUGGING AND TESTING **/

            for (let k = 0; k < result.channels.length; k++) {
                console.log("Resulting channel length of channel " + k + ": " + result.channels[k].results.length)
                console.log("Waypoint coordinates for channel " + k + ": ")
                for (let i = 0; i < result.channels[k].results.waypoints.length; i++) {
                    console.log("Waypoint " + i + ": (" + result.channels[k].results.waypoints[i].x + " | " + result.channels[k].results.waypoints[i].y + ")")
                }
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