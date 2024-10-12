import {Placement} from "./placement";
import {ModuleID} from "./module";

export type ClampID = number
type ClampProperties = {
    clampID: ClampID
    clampingModuleID: ModuleID
    placement?: Placement
    spacing?: number
}

export class Clamp {
    clampID: ClampID
    clampingModuleID: ModuleID
    placement?: Placement
    spacing?: number

    constructor(o: ClampProperties) {
        this.clampID = o.clampID
        this.clampingModuleID = o.clampingModuleID
        this.placement = o.placement
        this.spacing = o.spacing
    }
}