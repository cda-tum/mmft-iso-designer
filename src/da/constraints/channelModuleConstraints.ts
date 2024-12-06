import { Context } from "z3-solver";
import { EncodedModule } from "../components/module";
import { EncodedChannel } from "../components/channel";
import {Constraint} from "../processing/constraint";

/* Constraints between channels and modules */
export function encodeChannelModuleConstraints(ctx: Context, channel: EncodedChannel, module: EncodedModule): Constraint[] {
    const clauses: Constraint[] = []

    /* Add any necessary constraints for channels and modules here */
    return clauses
}