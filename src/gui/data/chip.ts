import { createEntityAdapter, createSlice } from "@reduxjs/toolkit"

type ChipID = string | number

type Chip = {
    id: ChipID
    width: number
    height: number
}

const chipAdapter = createEntityAdapter<Chip>() 

const chipSlice = createSlice({
    name: 'chip',
    initialState: chipAdapter.getInitialState(),
    reducers: {
        add: chipAdapter.addOne,
        remove: chipAdapter.removeOne,
        update: chipAdapter.updateOne
    }
})

export { chipSlice }
export type { Chip, ChipID }