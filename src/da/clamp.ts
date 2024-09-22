import {Placement} from "./placement";
import {ModuleID} from "./module";

export type ClampID = number
type ClampProperties = {
    clampID: ClampID
    clampingModuleID: ModuleID
    placement?: Placement
}

export class Clamp {
    clampID: ClampID
    clampingModuleID: ModuleID
    placement?: Placement

    constructor(o: ClampProperties) {
        this.clampID = o.clampID
        this.clampingModuleID = o.clampingModuleID
        this.placement = o.placement
    }
}