import { createEntityAdapter, createSlice } from "@reduxjs/toolkit"
import { Chip, ChipID } from "./chip"
import { RootState } from "./store"
import { EntityID } from "./entity"

type WorkspaceID = string | number

type WorkspaceState = {
    entities: EntityID[]
    chip?: ChipID
}

type Workspace = {
    id: WorkspaceID
    timeline: WorkspaceState[]
}

const workspaceAdapter = createEntityAdapter<Workspace>()

const workspaceSlice = createSlice({
    name: 'workspace',
    initialState: workspaceAdapter.getInitialState(),
    reducers: {
        add: workspaceAdapter.addOne,
        remove: workspaceAdapter.removeOne,
        update: workspaceAdapter.updateOne
    }
})


const workspaceActions = workspaceSlice.actions
const workspaceSelectors = workspaceAdapter.getSelectors<RootState>((state) => state.workspaces)

export { workspaceSlice, workspaceSelectors, workspaceActions }
export type { Workspace }