import {Arith, Bool, Context, init} from "z3-solver"
import {Chip} from "../chip"
import {
    channelSegmentsNoCross, horizontalVerticalNoCross, verticalDiagonalNoCross, verticalHorizontalNoCross,
} from "./geometry"
import {encodeChannelConstraints} from "../constraints/channelConstraints"
import {Channel} from "../channel"
import {EncodedModule} from "../module";
import {Placement} from "../placement";
import {EnumBitVecValue} from "../z3Helpers";

function get_int_vars(ctx: Context, n: number) {
    return [...Array(n).keys()].map(v => ctx.Int.const(`${v}`))
}


describe('verticalHorizontalNoCross', () => {
    async function testVerticalHorizontalNoCross(a: {
                                                     c1: number,
                                                     c2_lower: number,
                                                     c2_higher: number
                                                 },
                                                 b: {
                                                     c1_lower: number,
                                                     c1_higher: number,
                                                     c2: number,
                                                 }) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [ac1, ac2l, ac2h, bc1l, bc1h, bc2] = get_int_vars(ctx, 6)
            solver.add(verticalHorizontalNoCross(ctx, {
                c1: ac1,
                c2_lower: ac2l,
                c2_higher: ac2h
            }, {
                c1_lower: bc1l,
                c1_higher: bc1h,
                c2: bc2,
            }))
            solver.add(ac1.eq(a.c1))
            solver.add(ac2l.eq(a.c2_lower))
            solver.add(ac2h.eq(a.c2_higher))
            solver.add(bc1l.eq(b.c1_lower))
            solver.add(bc1h.eq(b.c1_higher))
            solver.add(bc2.eq(b.c2))
            let check = await solver.check()
            if (check === 'sat') {
                return true
            } else {
                return false
            }
        } catch (e) {
            console.error('error', e);
        } finally {
            em.PThread.terminateAllThreads();
        }
    }


    test('#1 vertical-horizontal intersection', async () => {
        const d = await testVerticalHorizontalNoCross({
            c1: 0,
            c2_lower: 0,
            c2_higher: 10
        }, {
            c1_lower: -5,
            c1_higher: 5,
            c2: 5,
        })
        expect(d).toBeFalsy()
    })

    test('#2 vertical-horizontal intersection', async () => {
        const d = await testVerticalHorizontalNoCross({
            c1: 2,
            c2_lower: 3,
            c2_higher: 10
        }, {
            c1_lower: 1,
            c1_higher: 6,
            c2: 4,
        })
        expect(d).toBeFalsy()
    })

    test('#3 vertical-horizontal no intersection', async () => {
        const d = await testVerticalHorizontalNoCross({
            c1: 0,
            c2_lower: 0,
            c2_higher: 10
        }, {
            c1_lower: 1,
            c1_higher: 10,
            c2: 4,
        })
        expect(d).toBeTruthy()
    })

    test('#4 vertical-horizontal no intersection', async () => {
        const d = await testVerticalHorizontalNoCross({
            c1: 0,
            c2_lower: 0,
            c2_higher: 10
        }, {
            c1_lower: -5,
            c1_higher: 5,
            c2: 0,
        })
        expect(d).toBeTruthy()
    })

    test('#5 vertical-horizontal no intersection', async () => {
        const d = await testVerticalHorizontalNoCross({
            c1: 2,
            c2_lower: -4,
            c2_higher: 8
        }, {
            c1_lower: -5,
            c1_higher: 2,
            c2: 3,
        })
        expect(d).toBeTruthy()
    })

    test('#6 vertical-horizontal no intersection', async () => {
        const d = await testVerticalHorizontalNoCross({
            c1: 2,
            c2_lower: -4,
            c2_higher: 8
        }, {
            c1_lower: -2,
            c1_higher: 7,
            c2: 8,
        })
        expect(d).toBeTruthy()
    })
})

describe('horizontalVerticalNoCross', () => {
    async function testHorizontalVerticalNoCross(a: {
                                                     c1_lower: number,
                                                     c1_higher: number,
                                                     c2: number,

                                                 },
                                                 b: {
                                                     c1: number,
                                                     c2_lower: number,
                                                     c2_higher: number
                                                 }) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [ac1l, ac1h, ac2, bc1, bc2l, bc2h] = get_int_vars(ctx, 6)
            solver.add(horizontalVerticalNoCross(ctx, {
                c1_lower: ac1l,
                c1_higher: ac1h,
                c2: ac2
            }, {
                c1: bc1,
                c2_lower: bc2l,
                c2_higher: bc2h,
            }))
            solver.add(ac1l.eq(a.c1_lower))
            solver.add(ac1h.eq(a.c1_higher))
            solver.add(ac2.eq(a.c2))
            solver.add(bc1.eq(b.c1))
            solver.add(bc2l.eq(b.c2_lower))
            solver.add(bc2h.eq(b.c2_higher))
            let check = await solver.check()
            if (check === 'sat') {
                return true
            } else {
                return false
            }
        } catch (e) {
            console.error('error', e);
        } finally {
            em.PThread.terminateAllThreads();
        }
    }


    test('#1 horizontal-vertical intersection', async () => {
        const d = await testHorizontalVerticalNoCross({
            c1_lower: -3,
            c1_higher: 3,
            c2: 5,
        }, {
            c1: 1,
            c2_lower: -1,
            c2_higher: 8
        })
        expect(d).toBeFalsy()
    })

    test('#2 horizontal-vertical intersection', async () => {
        const d = await testHorizontalVerticalNoCross({
            c1_lower: 0,
            c1_higher: 5,
            c2: 5,
        }, {
            c1: 1,
            c2_lower: 4,
            c2_higher: 10
        })
        expect(d).toBeFalsy()
    })

    test('#3 horizontal-vertical no intersection', async () => {
        const d = await testHorizontalVerticalNoCross({
            c1_lower: 0,
            c1_higher: 7,
            c2: 7,
        }, {
            c1: 3,
            c2_lower: -2,
            c2_higher: 7
        })
        expect(d).toBeTruthy()
    })

    test('#4 horizontal-vertical no intersection', async () => {
        const d = await testHorizontalVerticalNoCross({
            c1_lower: 0,
            c1_higher: 10,
            c2: 10,
        }, {
            c1: 5,
            c2_lower: 0,
            c2_higher: 8
        })
        expect(d).toBeTruthy()
    })

    test('#5 horizontal-vertical no intersection', async () => {
        const d = await testHorizontalVerticalNoCross({
            c1_lower: 0,
            c1_higher: 10,
            c2: 5,
        }, {
            c1: 5,
            c2_lower: 5,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('#6 horizontal-vertical no intersection', async () => {
        const d = await testHorizontalVerticalNoCross({
            c1_lower: 0,
            c1_higher: 10,
            c2: 5,
        }, {
            c1: 10,
            c2_lower: -2,
            c2_higher: 8
        })
        expect(d).toBeTruthy()
    })

    test('#7 horizontal-vertical no intersection', async () => {
        const d = await testHorizontalVerticalNoCross({
            c1_lower: 0,
            c1_higher: 10,
            c2: 5,
        }, {
            c1: 0,
            c2_lower: -2,
            c2_higher: 8
        })
        expect(d).toBeTruthy()
    })

})

describe('verticalDiagonalNoCross', () => {
    async function testVerticalDiagonalNoCross(a: {
                                                     c1: number,
                                                     c2_lower: number,
                                                     c2_higher: number
                                                 },
                                                 b: {
                                                     c1_lower: number,
                                                     c2_lower: number,
                                                     c1_higher: number,
                                                     c2_higher: number
                                                 }) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [ac1, ac2l, ac2h, bc1l, bc1h, bc2l, bc2h] = get_int_vars(ctx, 7)
            solver.add(verticalDiagonalNoCross(ctx, {
                c1: ac1,
                c2_lower: ac2l,
                c2_higher: ac2h
            }, {
                c1_lower: bc1l,
                c2_lower: bc1h,
                c1_higher: bc2l,
                c2_higher: bc2h
            }))
            solver.add(ac1.eq(a.c1))
            solver.add(ac2l.eq(a.c2_lower))
            solver.add(ac2h.eq(a.c2_higher))
            solver.add(bc1l.eq(b.c1_lower))
            solver.add(bc1h.eq(b.c1_higher))
            solver.add(bc2l.eq(b.c2_lower))
            solver.add(bc2h.eq(b.c2_higher))
            let check = await solver.check()
            if (check === 'sat') {
                return true
            } else {
                return false
            }
        } catch (e) {
            console.error('error', e);
        } finally {
            em.PThread.terminateAllThreads();
        }
    }


    test('#1 vertical-horizontal intersection', async () => {
        const d = await testVerticalDiagonalNoCross({
            c1: 0,
            c2_lower: 0,
            c2_higher: 10
        }, {
            c1_lower: -5,
            c2_lower: 0,
            c1_higher: 5,
            c2_higher: 10
        })
        expect(d).toBeFalsy()
    })

})

describe('channelSegmentsNoCrossSameSide', () => {
    async function testChannelSegmentsNoCross(a: { x1: number, y1: number, x2: number, y2: number }, b: {
        x1: number,
        y1: number,
        x2: number,
        y2: number
    }) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const chip = new Chip({
                originX: -5000,
                originY: -5000,
                width: 10000,
                height: 10000
            })
            const channel_a = new Channel({
                id: 0,
                width: 1,
                spacing: 1,
                maxSegments: 1,
                from: {
                    module: 0,
                    port: [0, 0]
                },
                to: {
                    module: 0,
                    port: [0, 2]
                }
            })
            const ea = channel_a.encode(ctx)
            const channel_b = new Channel({
                id: 1,
                width: 1,
                spacing: 1,
                maxSegments: 1,
                from: {
                    module: 1,
                    port: [0, 0]
                },
                to: {
                    module: 1,
                    port: [0, 2]
                }
            })

            const clauses: Bool[] = []
            const encodingProps = {
                positionX: 0,
                positionY: 0,
                orientation: new EnumBitVecValue(ctx, "orientation", 1),
                placement: new EnumBitVecValue(ctx, "placement", 0),
                clauses: clauses
            }
            const moduleProps0 = {
                id: 0,
                width: 2000,
                height: 1000,
                pitch: 0,
                spacing: 50,
                position: undefined,
                orientation: undefined,
                placement: Placement.Top,
                encoding: encodingProps
            }
            const moduleProps1 = {
                id: 1,
                width: 2000,
                height: 1000,
                pitch: 0,
                spacing: 50,
                position: undefined,
                orientation: undefined,
                placement: Placement.Top,
                encoding: encodingProps
            }

            const module0 = new EncodedModule(moduleProps0)
            const module1 = new EncodedModule(moduleProps1)

            const modules: EncodedModule[] = []
            modules.push(module0, module1)
            const eb = channel_b.encode(ctx)
            solver.add(...ea.encoding.clauses)
            solver.add(...eb.encoding.clauses)
            solver.add(ea.encoding.waypoints[0].x.eq(a.x1))
            solver.add(ea.encoding.waypoints[0].y.eq(a.y1))
            solver.add(ea.encoding.waypoints[1].x.eq(a.x2))
            solver.add(ea.encoding.waypoints[1].y.eq(a.y2))
            solver.add(eb.encoding.waypoints[0].x.eq(b.x1))
            solver.add(eb.encoding.waypoints[0].y.eq(b.y1))
            solver.add(eb.encoding.waypoints[1].x.eq(b.x2))
            solver.add(eb.encoding.waypoints[1].y.eq(b.y2))
            solver.add(...encodeChannelConstraints(ctx, ea, chip, modules))
            solver.add(...encodeChannelConstraints(ctx, eb, chip, modules))

            let check1 = await solver.check()
            let sat1;
            if (check1 === 'sat') {
                sat1 = true
            } else {
                sat1 = false
            }
            solver.add(channelSegmentsNoCross(ctx, ea, 0, eb, 0))
            let check2 = await solver.check()
            if (check2 === 'sat') {
                return true
            } else {
                return !sat1
            }
        } catch (e) {
            console.error('error', e);
        } finally {
            em.PThread.terminateAllThreads();
        }
    }

    test('#1 identity', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: 0, y1: 0, x2: 10, y2: 0,
        }, {
            x1: 0, y1: 0, x2: 10, y2: 0,
        })
        expect(d).toBeTruthy()
    })


    // test case with same values in test "right-up intersection" passes
    // still to be determined what's wrong here
    test('#2 up-right intersection', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: 0, y1: 0, x2: 0, y2: 10,
        }, {
            x1: -5, y1: 5, x2: 5, y2: 5,
        })
        expect(d).toBeFalsy()
    })

    test('#3', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: 0, y1: 0, x2: 9, y2: 0,
        }, {
            x1: 10, y1: -5, x2: 10, y2: 5,
        })
        expect(d).toBeTruthy()
    })

    test('#4', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: -5, y1: 0, x2: 5, y2: 0,
        }, {
            x1: 0, y1: -5, x2: 0, y2: 5,
        })
        expect(d).toBeFalsy()
    })

    test('#5', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: 5, y1: 0, x2: -5, y2: 0,
        }, {
            x1: 0, y1: -5, x2: 0, y2: 5,
        })
        expect(d).toBeFalsy()
    })

    test('#6', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: 5, y1: 0, x2: -5, y2: 0,
        }, {
            x1: 0, y1: 5, x2: 0, y2: -5,
        })
        expect(d).toBeFalsy()
    })

    test('#7', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: -5, y1: 0, x2: 5, y2: 0,
        }, {
            x1: 0, y1: 5, x2: 0, y2: -5,
        })
        expect(d).toBeFalsy()
    })

    test('#8', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: -5, y1: 0, x2: 5, y2: 0,
        }, {
            x1: -5, y1: 10, x2: 5, y2: 10,
        })
        expect(d).toBeTruthy()
    })

    test('#9', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: 5, y1: 0, x2: -5, y2: 0,
        }, {
            x1: -5, y1: 10, x2: 5, y2: 10,
        })
        expect(d).toBeTruthy()
    })

    test('#10', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: 5, y1: 0, x2: -5, y2: 0,
        }, {
            x1: 5, y1: 10, x2: -5, y2: 10,
        })
        expect(d).toBeTruthy()
    })

    test('#11', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: -5, y1: 0, x2: 5, y2: 0,
        }, {
            x1: 5, y1: 10, x2: -5, y2: 10,
        })
        expect(d).toBeTruthy()
    })
})


describe('channelSegmentsNoCrossDifferentSides', () => {
    async function testChannelSegmentsNoCross(a: { x1: number, y1: number, x2: number, y2: number }, b: {
        x1: number,
        y1: number,
        x2: number,
        y2: number
    }) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const chip = new Chip({
                originX: -5000,
                originY: -5000,
                width: 10000,
                height: 10000
            })
            const channel_a = new Channel({
                id: 0,
                width: 1,
                spacing: 1,
                maxSegments: 1,
                from: {
                    module: 0,
                    port: [0, 0]
                },
                to: {
                    module: 0,
                    port: [0, 2]
                }
            })
            const ea = channel_a.encode(ctx)
            const channel_b = new Channel({
                id: 1,
                width: 1,
                spacing: 1,
                maxSegments: 1,
                from: {
                    module: 1,
                    port: [0, 0]
                },
                to: {
                    module: 1,
                    port: [0, 2]
                }
            })

            const clauses: Bool[] = []
            const encodingProps = {
                positionX: 0,
                positionY: 0,
                orientation: new EnumBitVecValue(ctx, "orientation", 1),
                placement: new EnumBitVecValue(ctx, "placement", 1),
                clauses: clauses
            }

            // one module is placed on top
            const moduleProps0 = {
                id: 0,
                width: 9900,
                height: 9900,
                pitch: 0,
                spacing: 50,
                position: undefined,
                orientation: undefined,
                placement: Placement.Top,
                encoding: encodingProps
            }

            // one module is placed on the bottom
            const moduleProps1 = {
                id: 1,
                width: 9900,
                height: 9900,
                pitch: 0,
                spacing: 50,
                position: undefined,
                orientation: undefined,
                placement: Placement.Bottom,
                encoding: encodingProps
            }

            const module0 = new EncodedModule(moduleProps0)
            const module1 = new EncodedModule(moduleProps1)

            const modules: EncodedModule[] = []
            modules.push(module0, module1)
            const eb = channel_b.encode(ctx)
            solver.add(...ea.encoding.clauses)
            solver.add(...eb.encoding.clauses)
            solver.add(ea.encoding.waypoints[0].x.eq(a.x1))
            solver.add(ea.encoding.waypoints[0].y.eq(a.y1))
            solver.add(ea.encoding.waypoints[1].x.eq(a.x2))
            solver.add(ea.encoding.waypoints[1].y.eq(a.y2))
            solver.add(eb.encoding.waypoints[0].x.eq(b.x1))
            solver.add(eb.encoding.waypoints[0].y.eq(b.y1))
            solver.add(eb.encoding.waypoints[1].x.eq(b.x2))
            solver.add(eb.encoding.waypoints[1].y.eq(b.y2))
            solver.add(...encodeChannelConstraints(ctx, ea, chip, modules))
            solver.add(...encodeChannelConstraints(ctx, eb, chip, modules))
            let check1 = await solver.check()
            let sat1;
            if (check1 === 'sat') {
                sat1 = true
            } else {
                sat1 = false
            }
            solver.add(channelSegmentsNoCross(ctx, ea, 0, eb, 0))
            let check2 = await solver.check()
            if (check2 === 'sat') {
                return true
            } else {
                return !sat1
            }
        } catch (e) {
            console.error('error', e);
        } finally {
            em.PThread.terminateAllThreads();
        }
    }

    test('downleft-downright no intersection different sides', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: 5, y1: 5, x2: -5, y2: -5,
        }, {
            x1: -5, y1: 5, x2: 5, y2: -5,
        })
        expect(d).toBeTruthy()
    })

    test('up-right no intersection different sides', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: 0, y1: -5, x2: 0, y2: 5,
        }, {
            x1: -5, y1: 0, x2: 5, y2: 0,
        })
        expect(d).toBeTruthy()
    })
})


describe('pointPointMinDistanceDiagonal', () => {
    async function testPointPointMinDistance(pointA: { x: number, y: number }, pointB: {
        x: number,
        y: number
    }, minDistance: number) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [ax, ay, bx, by] = get_int_vars(ctx, 4)

            //solver.add(pointPointMinDistanceDiagonal(ctx, { x: ax, y: ay } , { x: bx, y: by } , minDistance))
            solver.add(ax.eq(pointA.x))
            solver.add(ay.eq(pointA.y))
            solver.add(bx.eq(pointB.x))
            solver.add(by.eq(pointB.y))

            let check = await solver.check()
            if (check === 'sat') {
                return true
            } else if (check === 'unsat') {
                return false
            } else {
                console.error('Unexpected solver check result:', check)
                return false
            }
        } catch (e) {
            console.error('error', e)
        } finally {
            em.PThread.terminateAllThreads()
        }
    }

    test('base case zero #1', async () => {
        const d = await testPointPointMinDistance(
            {x: 0, y: 0},
            {x: 0, y: 0}, // actual distance = 0
            0
        )
        expect(d).toBeTruthy()
    })

    test('base case same point #2', async () => {
        const d = await testPointPointMinDistance(
            {x: 3, y: 4},
            {x: 3, y: 4}, // actual distance = 0
            0
        )
        expect(d).toBeTruthy()
    })

    test('normal case #1', async () => {
        const d = await testPointPointMinDistance(
            {x: 0, y: 0},
            {x: 4, y: 4}, // actual distance = 8
            8
        )
        expect(d).toBeTruthy()
    })

    test('normal case #1', async () => {
        const d = await testPointPointMinDistance(
            {x: 0, y: 0},
            {x: 4, y: 4}, // actual distance = 8
            7
        )
        expect(d).toBeTruthy()
    })

    test('normal case #2', async () => {
        const d = await testPointPointMinDistance(
            {x: 0, y: 0},
            {x: 5, y: 5}, // actual distance = 10
            11
        )
        expect(d).toBeFalsy()
    })

    test('normal case #3', async () => {
        const d = await testPointPointMinDistance(
            {x: -1, y: 2},
            {x: 4, y: -3}, // actual distance = 10
            9
        )
        expect(d).toBeTruthy()
    })
})
