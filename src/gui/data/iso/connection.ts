import { PortID } from "./port"
import { EntityID, EntityType } from "../entity"
type Connection = {
    id: EntityID
    type: EntityType.Connection
    width: number
    spacing: number
} & SpecificConnection

enum ConnectionType {
    TwoPoint
}

type SpecificConnection = TwoPoint

type TwoPoint = {
    connection_type: ConnectionType.TwoPoint
    from: {
        module: EntityID
        port: PortID
    },
    to: {
        module: EntityID
        port: PortID
    }
}

export type { Connection }