import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { Connection } from "./iso/connection";
import { RootState } from "./store";
import { Module } from "./iso/module";

type EntityID = number
enum EntityType {
    Module,
    Connection
}
type Entity = Module | Connection

const entityAdapter = createEntityAdapter<Entity>() 

const entitySlice = createSlice({
    name: 'entities',
    initialState: entityAdapter.getInitialState(),
    reducers: {
        add: entityAdapter.addOne,
        remove: entityAdapter.removeOne,
        update: entityAdapter.updateOne
    }
})

const entityActions = entitySlice.actions
const entitySelectors = entityAdapter.getSelectors<RootState>((state) => state.entities)

export type { Entity, EntityID }
export { entitySlice, entityActions, entitySelectors, EntityType }