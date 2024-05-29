export { Chip }

class Chip {
    width!: number
    height!: number
    originX: number
    originY: number

    constructor(data: Partial<Chip>) {
        Object.assign(this, data)
        this.originX = data.originX ?? 0
        this.originY = data.originY ?? 0
    }
    
    static from(values: {
        width: number
        height: number
    }) {
        return new Chip(values)
    }
}