import { Context, init } from "z3-solver"
import { ChannelInstance } from "../channel"
import { Chip } from "../chip"
import { channelSegmentsNoCross, segmentSegmentNoCross } from "./geometry"
import { encodeChannelConstraints } from "../constraints/channelConstraints"

function get_int_vars(ctx: Context, n: number) {
    return [...Array(n).keys()].map(v => ctx.Int.const(`${v}`))
}

describe('segmentSegmentNoCross', () => {
    async function testSegmentSegmentNoCross(a: { c1_lower: number, c1_higher: number, c2: number}, b: { c1: number, c2_lower: number, c2_higher: number}) {
        const { Context, em } = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [ac1l, ac1h, ac2, bc1, bc2l, bc2h] = get_int_vars(ctx, 6)
            solver.add(segmentSegmentNoCross(ctx, {
                c1_lower: ac1l,
                c1_higher: ac1h,
                c2: ac2
            }, {
                c1: bc1,
                c2_lower: bc2l,
                c2_higher: bc2h
            }))
            solver.add(ac1l.eq(a.c1_lower))
            solver.add(ac1h.eq(a.c1_higher))
            solver.add(ac2.eq(a.c2))
            solver.add(bc2l.eq(b.c2_lower))
            solver.add(bc2h.eq(b.c2_higher))
            solver.add(bc1.eq(b.c1))
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

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: 0
        }, {
            c1: 0,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeFalsy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: 10
        }, {
            c1: 0,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: -10
        }, {
            c1: 0,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: 9
        }, {
            c1: 0,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeFalsy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: -9
        }, {
            c1: 0,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeFalsy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: 11
        }, {
            c1: 0,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: -11
        }, {
            c1: 0,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: 0
        }, {
            c1: 10,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: 0
        }, {
            c1: -10,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: 0
        }, {
            c1: 9,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeFalsy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: 0
        }, {
            c1: -9,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeFalsy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: 0
        }, {
            c1: 11,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: -10,
            c1_higher: 10,
            c2: 0
        }, {
            c1: -11,
            c2_lower: -10,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: 0,
            c1_higher: 4,
            c2: 0
        }, {
            c1: 5,
            c2_lower: -5,
            c2_higher: 5
        })
        expect(d).toBeTruthy()
    })

    test('', async () => {
        const d = await testSegmentSegmentNoCross({
            c1_lower: 9000,
            c1_higher: 18000,
            c2: 27000
        }, {
            c1: 12000,
            c2_lower: 3000,
            c2_higher: 42000
        })
        expect(d).toBeFalsy()
    })
})

describe('channelSegmentsNoCross', () => {
    async function testChannelSegmentsNoCross(a: { x1: number, y1: number, x2: number, y2: number }, b: { x1: number, y1: number, x2: number, y2: number }) {
        const { Context, em } = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const chip = new Chip({
                origin_x: -5000,
                origin_y: -5000,
                width: 10000,
                height: 10000
            })
            const channel_a = new ChannelInstance({
                width: 1,
                spacing: 1,
                max_segments: 1
            })
            const ea = channel_a.encode(0, undefined, ctx)
            const channel_b = new ChannelInstance({
                width: 1,
                spacing: 1,
                max_segments: 1
            })
            const eb = channel_b.encode(1, undefined, ctx)
            solver.add(...ea.clauses)
            solver.add(...eb.clauses)
            solver.add(ea.waypoints[0].x.eq(a.x1))      
            solver.add(ea.waypoints[0].y.eq(a.y1))     
            solver.add(ea.waypoints[1].x.eq(a.x2))     
            solver.add(ea.waypoints[1].y.eq(a.y2))
            solver.add(eb.waypoints[0].x.eq(b.x1))      
            solver.add(eb.waypoints[0].y.eq(b.y1))     
            solver.add(eb.waypoints[1].x.eq(b.x2))     
            solver.add(eb.waypoints[1].y.eq(b.y2))
            solver.add(...encodeChannelConstraints(ctx, ea, chip))
            solver.add(...encodeChannelConstraints(ctx, eb, chip))
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

    test('#2', async () => {
        const d = await testChannelSegmentsNoCross({
            x1: 0, y1: 0, x2: 10, y2: 0,
        }, {
            x1: 5, y1: -5, x2: 5, y2: 5,
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