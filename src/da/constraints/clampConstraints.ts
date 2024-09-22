import {Bool, Context} from "z3-solver";
import {EncodedChannel} from "../channel";
import {StaticRoutingExclusion} from "../routingExclusion";
import {channelSegmentRoutingExclusionDistance} from "../geometry/geometry";
import {Clamp} from "../clamp";

export function encodeClampConstraints(ctx: Context, module: EncodedChannel, clamp: Clamp): Bool[] {
    const clauses = []

    /* Clamps constraints can be added here if necessary */
    {
        clauses.push(ctx.Bool.val(true))
    }

    return clauses

}