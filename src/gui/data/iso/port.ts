type PortID = number

type Port = {
    id: PortID
} & SpecificPort

enum PortType {
    Grid
}

type SpecificPort = GridPort

type GridPort = {
    type: PortType.Grid
    active: boolean
    index_x: number
    index_y: number
}

export type { PortID, Port }
export { PortType }