import { Arith, AstVector, Bool, init } from "z3-solver"
import { Input } from "./input_output"
import { EnumBitVec, EnumBitVecValue, get_bitvec, get_int, get_int_array, int_val } from "./z3_helpers"
import { Rotation } from "./rotation"
import { channel_segments_no_cross, min_distance_asym, segment_segment_no_cross } from "./geometry/geometry"
import { SegmentType } from "./channel"
import { smtsum } from "./utils"

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

        /*const [x, y, z] = ctx.Int.consts('x y z')
        const p1 = ctx.LE(x, y)
        const p2 = ctx.LE(y, z)
        const p3 = ctx.LT(z, x)
        solver.add(p1)
        solver.add(p2)
        solver.add(p3)*/

        
        solver.add(...encoded_input.clauses)
        //solver.add(ctx.BitVec.const('ebb_0_rotation', 2).eq(ctx.BitVec.val(3, 2)))

        //;[...solver.assertions().values()].forEach(f => console.log(f.toString()))

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
            /*const avec = Z3.solver_get_unsat_core(ctx.ptr, solver.ptr)
            const size = Z3.ast_vector_size(ctx.ptr, avec)
            const asts = [...Array(size).keys()].map(i => Z3.ast_vector_get(ctx.ptr, avec, i))
            console.log(size)
            console.log(asts)*/
        } else if (check === 'unknown') {
            throw 'Z3 cannot determine whether there is a solution.'
        } else {
            console.log('sat')
            const model = solver.model()
            const result = encoded_input.result(model)
            result.timing = timing
            console.log(result)
            /*console.log(model.eval(encoded_input.channels[3].segments[0].type.bitvector).toString())
            console.log(model.eval(channel_segments_no_cross(ctx, encoded_input.channels[3], 0, encoded_input.channels[2], 1)).toString(), result.channels[2], result.channels[3])
            console.log(model.eval(ctx.Implies(
                ctx.And(
                    encoded_input.channels[3].segments[0].type.eq(ctx, SegmentType.Up),
                    encoded_input.channels[2].segments[0].type.eq(ctx, SegmentType.Right)
                ),
                segment_segment_no_cross(ctx, {
                    c1_lower: encoded_input.channels[3].waypoints[0].y,
                    c1_higher: encoded_input.channels[3].waypoints[0 + 1].y,
                    c2:  encoded_input.channels[3].waypoints[0].x
                }, {
                    c1: encoded_input.channels[2].waypoints[0].y,
                    c2_lower: encoded_input.channels[2].waypoints[0].x,
                    c2_higher: encoded_input.channels[2].waypoints[0 + 1].x,
                })
            ),).toString())
            console.log("3 is up", model.eval(encoded_input.channels[3].segments[0].type.eq(ctx, SegmentType.Up)).toString())
            console.log("2 is right", model.eval(encoded_input.channels[2].segments[0].type.eq(ctx, SegmentType.Right)).toString())
            console.log("no cross", model.eval(segment_segment_no_cross(ctx, {
                c1_lower: encoded_input.channels[3].waypoints[0].y,
                c1_higher: encoded_input.channels[3].waypoints[0 + 1].y,
                c2:  encoded_input.channels[3].waypoints[0].x
            }, {
                c1: encoded_input.channels[2].waypoints[0].y,
                c2_lower: encoded_input.channels[2].waypoints[0].x,
                c2_higher: encoded_input.channels[2].waypoints[0 + 1].x,
            })).toString())
            console.log("no cross", model.eval(segment_segment_no_cross(ctx, {
                c1_lower: ctx.Int.val(9000),
                c1_higher: ctx.Int.val(18000),
                c2: ctx.Int.val(12000)
            }, {
                c1: ctx.Int.val(12000),
                c2_lower: ctx.Int.val(3000),
                c2_higher: ctx.Int.val(42000),
            })).toString())
            console.log(
                model.eval(encoded_input.channels[3].waypoints[0].y).toString(), 
                model.eval(encoded_input.channels[3].waypoints[0 + 1].y).toString(), 
                model.eval(encoded_input.channels[3].waypoints[0].x).toString(), 
                model.eval(encoded_input.channels[2].waypoints[0].y).toString(), 
                model.eval(encoded_input.channels[2].waypoints[0].x).toString(), 
                model.eval(encoded_input.channels[2].waypoints[0 + 1].x).toString())
            console.log(model.eval(ctx.Implies(ctx.And(
                encoded_input.channels[3].segments[0].type.eq(ctx, SegmentType.Up),
                encoded_input.channels[2].segments[0].type.eq(ctx, SegmentType.Right)
            ), true)).toString())*/
            return result
        }
    } catch (e) {
        console.error('error', e);
    } finally {
        em.PThread.terminateAllThreads();
    }
}