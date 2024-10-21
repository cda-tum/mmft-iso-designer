import {Bool, Context} from "z3-solver";
import {EncodedModule} from "../module";
import {Clamp} from "../clamp";

export function encodeClampConstraints(ctx: Context, module: EncodedModule, clamp: Clamp): Bool[] {
    const clauses = []

    /* Clamps constraints can be added here if necessary */
    return []

}