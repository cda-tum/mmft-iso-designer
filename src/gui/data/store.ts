import { configureStore } from "@reduxjs/toolkit";
import { chipSlice } from "./chip";
import { workspaceSlice } from "./workspace";
import { entitySlice } from "./entity";

const store = configureStore({
    reducer: {
        entities: entitySlice.reducer,
        workspaces: workspaceSlice.reducer
    },
})

type RootState = ReturnType<typeof store.getState>

export type { RootState }
export { store }