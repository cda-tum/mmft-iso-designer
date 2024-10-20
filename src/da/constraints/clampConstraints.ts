import {Bool, Context} from "z3-solver";
import {Clamp} from "../clamp";
import {EncodedModule} from "../module";

export function encodeClampConstraints(ctx: Context, module: EncodedModule, clamp: Clamp): Bool[] {
    const clauses = []

    /* Clamps constraints can be added here if necessary */
    return []

}