import {Bool, Context, init} from "z3-solver"
import {Chip} from "../chip"
import {
    channelSegmentsNoCross,
    pointSegmentDistanceDiagonal,
    pointPointDistance,
    segmentSegmentNoCrossNew
} from "./geometry"
import {encodeChannelConstraints} from "../constraints/channelConstraints"
import {Channel} from "../channel"
import {EncodedModule} from "../module";
import {Placement} from "../placement";
import {EnumBitVecValue} from "../z3Helpers";

function get_int_vars(ctx: Context, n: number) {
    return [...Array(n).keys()].map(v => ctx.Int.const(`${v}`))
}

// Testing all possible intersections of octa-directional segments to ensure proper functionality of the segmentSegmentNoCross method
describe('segmentSegmentNoCross', () => {
    async function testSegmentSegmentNoCross(a: {
                                                 start_x: number,
                                                 start_y: number,
                                                 end_x: number,
                                                 end_y: number
                                             },
                                             b: {
                                                 start_x: number,
                                                 start_y: number,
                                                 end_x: number,
                                                 end_y: number
                                             }) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [ax1, ay1, ax2, ay2, bx1, by1, bx2, by2] = get_int_vars(ctx, 8)
            solver.add(segmentSegmentNoCrossNew(ctx, {
                start_x: ax1,
                start_y: ay1,
                end_x: ax2,
                end_y: ay2
            }, {
                start_x: bx1,
                start_y: by1,
                end_x: bx2,
                end_y: by2
            }))
            solver.add(ax1.eq(a.start_x))
            solver.add(ay1.eq(a.start_y))
            solver.add(ax2.eq(a.end_x))
            solver.add(ay2.eq(a.end_y))
            solver.add(bx1.eq(b.start_x))
            solver.add(by1.eq(b.start_y))
            solver.add(bx2.eq(b.end_x))
            solver.add(by2.eq(b.end_y))
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


    test('up-right intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 10
        }, {
            start_x: -5,
            start_y: 5,
            end_x: 5,
            end_y: 5
        })
        expect(d).toBeFalsy()
    })

    test('up-left intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 10
        }, {
            start_x: 5,
            start_y: 5,
            end_x: -5,
            end_y: 5
        })
        expect(d).toBeFalsy()
    })

    test('up-upright intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 10
        }, {
            start_x: -5,
            start_y: 0,
            end_x: 5,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('up-upleft intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 10
        }, {
            start_x: 5,
            start_y: 0,
            end_x: -5,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('up-downright intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 10
        }, {
            start_x: -5,
            start_y: 10,
            end_x: 5,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('up-downleft intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 10
        }, {
            start_x: 5,
            start_y: 10,
            end_x: -5,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('down-right intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 10,
            end_x: 0,
            end_y: 0
        }, {
            start_x: 5,
            start_y: 10,
            end_x: -5,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('down-left intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 10,
            end_x: 0,
            end_y: 0
        }, {
            start_x: 5,
            start_y: 5,
            end_x: -5,
            end_y: 5
        })
        expect(d).toBeFalsy()
    })

    test('down-upright intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 10,
            end_x: 0,
            end_y: 0
        }, {
            start_x: -5,
            start_y: 0,
            end_x: 5,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('down-upleft intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 10,
            end_x: 0,
            end_y: 0
        }, {
            start_x: 5,
            start_y: 0,
            end_x: -5,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('down-downright intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 10,
            end_x: 0,
            end_y: 0
        }, {
            start_x: -5,
            start_y: 10,
            end_x: 5,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('down-downleft intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 10,
            end_x: 0,
            end_y: 0
        }, {
            start_x: 5,
            start_y: 10,
            end_x: -5,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('right-up intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 5,
            end_x: 5,
            end_y: 5
        }, {
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('right-down intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 5,
            end_x: 5,
            end_y: 5
        }, {
            start_x: 0,
            start_y: 10,
            end_x: 0,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('right-upright intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 5,
            end_x: 5,
            end_y: 5
        }, {
            start_x: -5,
            start_y: 0,
            end_x: 5,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('right-upleft intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 5,
            end_x: 5,
            end_y: 5
        }, {
            start_x: 5,
            start_y: 0,
            end_x: -5,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('right-downright intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 5,
            end_x: 5,
            end_y: 5
        }, {
            start_x: -5,
            start_y: 10,
            end_x: 5,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('right-downleft intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 5,
            end_x: 5,
            end_y: 5
        }, {
            start_x: 5,
            start_y: 10,
            end_x: -5,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('left-up intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 5,
            end_x: -5,
            end_y: 5
        }, {
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('left-down intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 5,
            end_x: -5,
            end_y: 5
        }, {
            start_x: 0,
            start_y: 10,
            end_x: 0,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('left-upright intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 5,
            end_x: -5,
            end_y: 5
        }, {
            start_x: -5,
            start_y: 0,
            end_x: 5,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('left-upleft intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 5,
            end_x: -5,
            end_y: 5
        }, {
            start_x: 5,
            start_y: 0,
            end_x: -5,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('left-downright intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 5,
            end_x: -5,
            end_y: 5
        }, {
            start_x: -5,
            start_y: 10,
            end_x: 5,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('left-downleft intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 5,
            end_x: -5,
            end_y: 5
        }, {
            start_x: 5,
            start_y: 10,
            end_x: -5,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('upright-up intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 0,
            end_x: 5,
            end_y: 10
        }, {
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('upright-down intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 0,
            end_x: 5,
            end_y: 10
        }, {
            start_x: 0,
            start_y: 10,
            end_x: 0,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('upright-left intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 0,
            end_x: 5,
            end_y: 10
        }, {
            start_x: 5,
            start_y: 5,
            end_x: -5,
            end_y: 5
        })
        expect(d).toBeFalsy()
    })

    test('upright-upleft intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 0,
            end_x: 5,
            end_y: 10
        }, {
            start_x: 5,
            start_y: 0,
            end_x: -5,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('upright-downright intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 0,
            end_x: 5,
            end_y: 10
        }, {
            start_x: -5,
            start_y: 10,
            end_x: 5,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('upright-right intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 0,
            end_x: 5,
            end_y: 10
        }, {
            start_x: -5,
            start_y: 5,
            end_x: 5,
            end_y: 5
        })
        expect(d).toBeFalsy()
    })

    test('upleft-up intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 0,
            end_x: -5,
            end_y: 10
        }, {
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('upleft-down intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 0,
            end_x: -5,
            end_y: 10
        }, {
            start_x: 0,
            start_y: 10,
            end_x: 0,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('upleft-left intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 0,
            end_x: -5,
            end_y: 10
        }, {
            start_x: 5,
            start_y: 5,
            end_x: -5,
            end_y: 5
        })
        expect(d).toBeFalsy()
    })

    test('upleft-downleft intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 0,
            end_x: -5,
            end_y: 10
        }, {
            start_x: 5,
            start_y: 10,
            end_x: -5,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('upleft-upright intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 0,
            end_x: -5,
            end_y: 10
        }, {
            start_x: -5,
            start_y: 0,
            end_x: 5,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('upleft-right intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 0,
            end_x: -5,
            end_y: 10
        }, {
            start_x: -5,
            start_y: 5,
            end_x: 5,
            end_y: 5
        })
        expect(d).toBeFalsy()
    })

    test('downleft-up intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 10,
            end_x: -5,
            end_y: 0
        }, {
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('downleft-down intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 10,
            end_x: -5,
            end_y: 0
        }, {
            start_x: 0,
            start_y: 10,
            end_x: 0,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('downleft-left intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 10,
            end_x: -5,
            end_y: 0
        }, {
            start_x: 5,
            start_y: 5,
            end_x: -5,
            end_y: 5
        })
        expect(d).toBeFalsy()
    })

    test('downleft-upleft intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 10,
            end_x: -5,
            end_y: 0
        }, {
            start_x: 5,
            start_y: 0,
            end_x: -5,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('downleft-downright intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 10,
            end_x: -5,
            end_y: 0
        }, {
            start_x: -5,
            start_y: 10,
            end_x: 5,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('downleft-right intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 5,
            start_y: 10,
            end_x: -5,
            end_y: 0
        }, {
            start_x: -5,
            start_y: 5,
            end_x: 5,
            end_y: 5
        })
        expect(d).toBeFalsy()
    })


    // Edge case tests for no intersections

    test('up-up aligned with no gap intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 5
        }, {
            start_x: 0,
            start_y: 5,
            end_x: 0,
            end_y: 10
        })
        expect(d).toBeFalsy()
    })

    test('right-right aligned with no gap intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 5,
            end_x: 0,
            end_y: 5
        }, {
            start_x: 0,
            start_y: 5,
            end_x: 5,
            end_y: 5
        })
        expect(d).toBeFalsy()
    })


    // Edge case tests without intersections to check if the method is just strict enough but detects non-intersections

    test('up-right no intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 10,
            start_y: -5,
            end_x: 10,
            end_y: 5
        }, {
            start_x: 0,
            start_y: 0,
            end_x: 9,
            end_y: 0
        })
        expect(d).toBeTruthy()
    })

    test('down-left no intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: -10
        }, {
            start_x: 5,
            start_y: 1,
            end_x: -5,
            end_y: 1
        })
        expect(d).toBeTruthy()
    })

    test('upright-downleft no intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -4,
            start_y: -3,
            end_x: 2,
            end_y: 3
        }, {
            start_x: 4,
            start_y: 3,
            end_x: -2,
            end_y: -3
        })
        expect(d).toBeTruthy()
    })

    test('right-right parallel no intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: -5,
            start_y: 5,
            end_x: 5,
            end_y: 5
        }, {
            start_x: -5,
            start_y: 3,
            end_x: -5,
            end_y: 3
        })
        expect(d).toBeTruthy()
    })

    test('up-left no intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 5
        }, {
            start_x: 5,
            start_y: 6,
            end_x: -5,
            end_y: 6
        })
        expect(d).toBeTruthy()
    })

    test('up-up aligned with gap no intersection', async () => {
        const d = await testSegmentSegmentNoCross({
            start_x: 0,
            start_y: 0,
            end_x: 0,
            end_y: 5
        }, {
            start_x: 0,
            start_y: 6,
            end_x: 0,
            end_y: 10
        })
        expect(d).toBeTruthy()
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
                placement: new EnumBitVecValue(ctx, "placement", 1),
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
            solver.add(channelSegmentsNoCross(ctx, ea, 0, eb, 0, modules))
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
            solver.add(channelSegmentsNoCross(ctx, ea, 0, eb, 0, modules))
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


describe('pointSegmentDistanceDiagonal', () => {
    async function testPointSegmentDistanceDiagonal(point: { x: number, y: number },
                                                    segment: {
                                                        start: { x: number, y: number },
                                                        end: { x: number, y: number }
                                                    }, min_distance: number) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [px, py, ssx, ssy, sex, sey] = get_int_vars(ctx, 6)
            solver.add(pointSegmentDistanceDiagonal(ctx, {
                x: px,
                y: py
            }, {
                start: {x: ssx, y: ssy},
                end: {x: sex, y: sey}
            }, min_distance))
            solver.add(px.eq(point.x))
            solver.add(py.eq(point.y))
            solver.add(ssx.eq(segment.start.x))
            solver.add(ssy.eq(segment.start.y))
            solver.add(sex.eq(segment.end.x))
            solver.add(sey.eq(segment.end.y))
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

    // Ensuring the correct distance calculation by narrowing down with the following two tests
    test('base case #1 higher than min', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            x: 0,
            y: 0
        }, {
            start: {x: 2, y: 0},
            end: {x: 0, y: 2} // actual distance = sqrt(2) = 1,414
        }, 1.4)
        expect(d).toBeTruthy()
    })

    test('base case #1 lower than min', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            x: 0,
            y: 0
        }, {
            start: {x: 2, y: 0},
            end: {x: 0, y: 2}  // actual distance = sqrt(2) = 1,414
        }, 1.42)
        expect(d).toBeFalsy()
    })

    // Ensuring the correct distance calculation by narrowing down with the following two tests
    test('base case #2 higher than min', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            x: 9,
            y: 5
        }, {
            start: {x: 9, y: -3},
            end: {x: -2, y: 8}  // actual distance = 4 * sqrt(2) = 5,6569
        }, 5.656)
        expect(d).toBeTruthy()
    })

    test('base case #2 lower than min', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            x: 9,
            y: 5
        }, {
            start: {x: 9, y: -3},
            end: {x: -2, y: 8}  // actual distance = 4 * sqrt(2) = 5,6569
        }, 5.657)
        expect(d).toBeFalsy()
    })

    test('special case #1 no sqrt(2) multiple, higher than min', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            x: 8,
            y: 4
        }, {
            start: {x: 7, y: -2},
            end: {x: -1, y: 6}  // actual distance = 3.5 * sqrt(2) = 4,9497
        }, 4.94)
        expect(d).toBeTruthy()
    })

    test('special case #1 no sqrt(2) multiple, lower than min', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            x: 8,
            y: 4
        }, {
            start: {x: 7, y: -2},
            end: {x: -1, y: 6}  // actual distance = 3.5 * sqrt(2) = 4,9497
        }, 4.95)
        expect(d).toBeFalsy()
    })

    test('special case #2 sideA and sideB same length, higher than min', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            x: 8,
            y: 8
        }, {
            start: {x: 8, y: -2},
            end: {x: -2, y: 8}  // actual distance = 5 * sqrt(2) = 7,0711
        }, 7.06)
        expect(d).toBeTruthy()
    })

    test('special case #2 sideA and sideB same length, lower than min', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            x: 8,
            y: 8
        }, {
            start: {x: 8, y: -2},
            end: {x: -2, y: 8}  // actual distance = 5 * sqrt(2) = 7,0711
        }, 7.072)
        expect(d).toBeFalsy()
    })

    test('special case #3 A and B same length opposite signs, higher than min', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            x: 4,
            y: -2
        }, {
            start: {x: -4, y: -2},
            end: {x: 4, y: 6}  // // actual distance = 4 * sqrt(2) = 5,6569
        }, 5.656)
        expect(d).toBeTruthy()
    })

    test('special case #3 A and B same length opposite signs, lower than min', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            x: 4,
            y: -2
        }, {
            start: {x: -4, y: -2},
            end: {x: 4, y: 6}  // actual distance = 4 * sqrt(2) = 5,6569
        }, 5.657)
        expect(d).toBeFalsy()
    })
})


describe('pointPointDistanceReal', () => {
    async function testPointPointDistanceReal(a: { c1: number, c2: number }, b: {
        c1: number,
        c2: number
    }, min_distance: number) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [ac1, ac2, bc1, bc2] = get_int_vars(ctx, 4)

            solver.add(pointPointDistance(ctx, {
                x: ac1,
                y: ac2
            }, {
                x: bc1,
                y: bc2
            }, min_distance))

            solver.add(ac1.eq(a.c1))
            solver.add(ac2.eq(a.c2))
            solver.add(bc1.eq(b.c1))
            solver.add(bc2.eq(b.c2))

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

    test('actual distance greater than min_distance #1', async () => {
        const d = await testPointPointDistanceReal(
            {c1: 0, c2: 0},
            {c1: 3, c2: 4}, // distance between (0, 0) and (3, 4) is 5
            4
        )
        expect(d).toBeTruthy()
    })

    test('actual distance less than min_distance', async () => {
        const d = await testPointPointDistanceReal(
            {c1: 0, c2: 0},
            {c1: 3, c2: 4}, // distance between (0, 0) and (3, 4) is 5
            6
        )
        expect(d).toBeFalsy()
    })

    test('actual distance slightly greater than min_distance', async () => {
        const d = await testPointPointDistanceReal(
            {c1: 0, c2: 0},
            {c1: 1, c2: 1}, // distance between (0, 0) and (1, 1) sqrt(2) = 1,414
            1.40
        )
        expect(d).toBeTruthy()
    })

    test('actual distance slightly less than than min_distance', async () => {
        const d = await testPointPointDistanceReal(
            {c1: 0, c2: 0},
            {c1: 1, c2: 1}, // distance between (0, 0) and (1, 1) sqrt(2) = 1,414
            1.43
        )
        expect(d).toBeFalsy()
    })

    test('distance equal to min_distance', async () => {
        const d = await testPointPointDistanceReal(
            {c1: 0, c2: 0},
            {c1: 6, c2: 8}, // distance between (0, 0) and (6, 8) = 10
            10
        )
        expect(d).toBeTruthy()
    })

    test('distance equal to float min_distance', async () => {
        const d = await testPointPointDistanceReal(
            {c1: 0, c2: 0},
            {c1: 6, c2: 8}, // distance between (0, 0) and (6, 8) = 10
            10.0
        )
        expect(d).toBeTruthy()
    })
})

