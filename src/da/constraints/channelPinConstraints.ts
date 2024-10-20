import {Bool, Context} from "z3-solver";
import {Pin} from "../pin";
import {EncodedChannel} from "../channel";


export function encodeChannelPinConstraints(ctx: Context, pin: Pin, encodedChannel: EncodedChannel): Bool[] {
    const clauses = []

    /* Channel and pin constraints can be added here if necessary */
    return []

}