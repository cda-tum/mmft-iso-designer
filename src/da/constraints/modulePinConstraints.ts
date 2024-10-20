import {Bool, Context} from "z3-solver";
import {Pin} from "../pin";
import {EncodedModule} from "../module";


export function encodeModulePinConstraints(ctx: Context, pin: Pin, encodedModule: EncodedModule): Bool[] {
    const clauses = []

    /* Channel and pin constraints can be added here if necessary */
    return []

}