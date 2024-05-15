export { Chip }

class Chip {
    width!: number
    height!: number
    origin_x: number
    origin_y: number

    constructor(data: Partial<Chip>) {
        Object.assign(this, data)
        this.origin_x = data.origin_x ?? 0
        this.origin_y = data.origin_y ?? 0
    }
    
    static from(values: {
        width: number
        height: number
    }) {
        return new Chip(values)
    }
}