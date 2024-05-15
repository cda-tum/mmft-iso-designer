import { Port, PortType } from "./port";
import { EntityID, EntityType } from "../entity";

type Module = {
    id: EntityID
    type: EntityType.Module
    width: number
    height: number
    pitch: number
    ports: Port[]
    position?: Placement
    tentative_position: Placement
    rotation?: Rotation
    tentative_rotation: Rotation
}

type Placement = {
    x: number
    y: number
}

enum Rotation {
    Up,
    Right,
    Down,
    Left
}

type PitchConfiguration = {
    ports: {
        x: number,
        y: number
    }
    offset: {
        x: number,
        y: number
    }
    offset_odd: {
        x: boolean,
        y: boolean
    }
}

function pitch_configuration(module: Module): PitchConfiguration {
    const { pitch, width, height } = module
    const ports = {
        x: Math.floor(width / pitch) - 1,
        y: Math.floor(height / pitch) - 1
    }

    const offset_raw = {
        x: (width - (ports.x - 1) * pitch) / 2,
        y: (height - (ports.y - 1) * pitch) / 2
    }

    const offset = {
        x: Math.floor((width - (ports.x - 1) * pitch) / 2),
        y: Math.floor((height - (ports.y - 1) * pitch) / 2)
    }

    const offset_odd = {
        x: offset.x !== offset_raw.x,
        y: offset.y !== offset_raw.y
    }

    return {
        offset,
        offset_odd,
        ports
    }
}

function generate_ports(module: Module): Port[] {
    const pitch_config = pitch_configuration(module)
    return [...Array(pitch_config.ports.x).keys()].flatMap(x =>
        [...Array(pitch_config.ports.y).keys()].map(y => {
            return {
                id: x * pitch_config.ports.x  + y,
                type: PortType.Grid,
                active: false,
                index_x: x,
                index_y: y
            }
        })
    )
}

function port_position(module: Module, port: Port) {
    const rotation = module.rotation ?? module.tentative_rotation
    const position = module.position ?? module.tentative_position
    const { pitch } = module
    const pitch_config = pitch_configuration(module)
    switch (rotation) {
        case Rotation.Up:
            return {
                x: position.x + pitch_config.offset.x + port.index_x * pitch,
                y: position.y + pitch_config.offset.y + port.index_y * pitch
            }
        case Rotation.Right:
            return {
                x: position.x + pitch_config.offset.y + (pitch_config.ports.y - port.index_y - 1) * pitch,
                y: position.y + pitch_config.offset.x + port.index_x * pitch
            }
        case Rotation.Down:
            return {
                x: position.x + pitch_config.offset.x + (pitch_config.ports.x - port.index_x - 1) * pitch,
                y: position.y + pitch_config.offset.y + (pitch_config.ports.y - port.index_y - 1) * pitch
            }
        case Rotation.Left:
            return {
                x: position.x + pitch_config.offset.y + port.index_y * pitch,
                y: position.y + pitch_config.offset.x + (pitch_config.ports.x - port.index_x - 1) * pitch
            }
    }
}

export type { Module }
export { Rotation, port_position, generate_ports }