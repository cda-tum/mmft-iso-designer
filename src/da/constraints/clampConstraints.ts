import {Bool, Context} from "z3-solver";
import {EncodedModule} from "../components/module";
import {Clamp} from "../components/clamp";
import {Constraint} from "../processing/constraint";

export function encodeClampConstraints(ctx: Context, module: EncodedModule, clamp: Clamp): Constraint[] {
    const clauses: Constraint[] = []

    /* Clamps constraints can be added here if necessary */

    return clauses

}