import {Position} from "./position";
import {Orientation} from "./orientation";
import {Placement} from "./placement";
import {ModuleID} from "./module";

export type ClampID = number
type ModuleProperties = {
    clampID: ClampID
    clampingModuleID: ModuleID
    width: number
    height: number
    pitch: number
    spacing: number
    position?: Position
    orientation?: Orientation
    placement?: Placement
}

export class Clamp {
    clampID: ClampID
    clampingModuleID: ModuleID
    width: number
    height: number
    pitch: number
    spacing: number
    position?: Position
    orientation?: Orientation
    placement?: Placement

    constructor(o: ModuleProperties) {
        this.clampID = o.clampID
        this.clampingModuleID = o.clampingModuleID
        this.width = o.width
        this.height = o.height
        this.pitch = o.pitch
        this.spacing = o.spacing
        this.position = o.position
        this.orientation = o.orientation
        this.placement = o.placement
    }
}