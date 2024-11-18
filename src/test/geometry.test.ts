import {Context, init} from "z3-solver"
import {Chip} from "../da/components/chip"
import {
    channelSegmentsNoCross,
    diagonalDiagonalNoCross, diagonalDiagonalNoCrossExtra,
    diagonalHorizontalNoCross,
    diagonalVerticalNoCross,
    horizontalDiagonalNoCross,
    horizontalVerticalNoCross,
    pointSegmentDistanceDiag,
    segmentBoxNoCrossSlopeNeg,
    segmentBoxNoCrossSlopePos,
    verticalDiagonalNoCross,
    verticalDiagonalPosNoCrossExtra,
    verticalHorizontalNoCross,
} from "../da/geometry/geometry"
import {encodeChannelConstraints} from "../da/constraints/channelConstraints"
import {Channel} from "../da/components/channel"
import {EncodedModule} from "../da/components/module";
import {Placement} from "../da/geometry/placement";
import {EnumBitVecValue} from "../da/z3Helpers";
import {encodeChannelChannelConstraints} from "../da/constraints/channelChannelConstraints";
import {Constraint} from "../da/processing/constraint";

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


    test('#1 vertical-horizontal cross', async () => {
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

    test('#2 vertical-horizontal cross', async () => {
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

    test('#3 vertical-horizontal no cross B right', async () => {
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

    test('#4 vertical-horizontal no cross B below', async () => {
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

    test('#5 vertical-horizontal no intersection B left', async () => {
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

    test('#6 vertical-horizontal no intersection B above', async () => {
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


    test('#1 horizontal-vertical cross', async () => {
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

    test('#2 horizontal-vertical cross', async () => {
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

    test('#3 horizontal-vertical no cross B right', async () => {
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

    test('#4 horizontal-vertical no cross B below', async () => {
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

    test('#5 horizontal-vertical no cross B left', async () => {
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

    test('#6 horizontal-vertical no cross B above', async () => {
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
                c2_lower: bc2l,
                c1_higher: bc1h,
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


    test('#1 vertical-diagonal cross', async () => {
        const d = await testVerticalDiagonalNoCross({
            c1: 5,
            c2_lower: 0,
            c2_higher: 10
        }, {
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 10,
            c2_higher: 10
        })
        expect(d).toBeFalsy()
    })

    test('#2 vertical-diagonal cross', async () => {
        const d = await testVerticalDiagonalNoCross({
            c1: 100,
            c2_lower: 0,
            c2_higher: 170
        }, {
            c1_lower: -20,
            c2_lower: 20,
            c1_higher: 120,
            c2_higher: 160
        })
        expect(d).toBeFalsy()
    })

    test('#3 vertical-diagonal no cross B right', async () => {
        const d = await testVerticalDiagonalNoCross({
            c1: 15,
            c2_lower: 0,
            c2_higher: 20
        }, {
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 15,
            c2_higher: 15
        })
        expect(d).toBeTruthy()
    })

    test('#4 vertical-diagonal no cross B below', async () => {
        const d = await testVerticalDiagonalNoCross({
            c1: 5,
            c2_lower: 5,
            c2_higher: 20
        }, {
            c1_lower: 0,
            c2_lower: 10,
            c1_higher: -5,
            c2_higher: 5
        })
        expect(d).toBeTruthy()
    })

    test('#% vertical-diagonal no cross B left', async () => {
        const d = await testVerticalDiagonalNoCross({
            c1: 0,
            c2_lower: 0,
            c2_higher: 20
        }, {
            c1_lower: -20,
            c2_lower: 0,
            c1_higher: 0,
            c2_higher: 20
        })
        expect(d).toBeTruthy()
    })

    test('#& vertical-diagonal no cross B above', async () => {
        const d = await testVerticalDiagonalNoCross({
            c1: 0,
            c2_lower: 0,
            c2_higher: 10
        }, {
            c1_lower: -10,
            c2_lower: 10,
            c1_higher: 10,
            c2_higher: 30
        })
        expect(d).toBeTruthy()
    })
})

describe('verticalDiagonalNoCrossExtra', () => {
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
            solver.add(verticalDiagonalPosNoCrossExtra(ctx, {
                c1: ac1,
                c2_lower: ac2l,
                c2_higher: ac2h
            }, {
                c1_lower: bc1l,
                c2_lower: bc2l,
                c1_higher: bc1h,
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


    test('#1 vertical-diagonal no cross B below', async () => {
        const d = await testVerticalDiagonalNoCross({
            c1: 0,
            c2_lower: 0,
            c2_higher: 15
        }, {
            c1_lower: -5,
            c2_lower: -5,
            c1_higher: 10,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('#2 vertical-diagonal no cross B above', async () => {
        const d = await testVerticalDiagonalNoCross({
            c1: 0,
            c2_lower: 0,
            c2_higher: 10
        }, {
            c1_lower: -10,
            c2_lower: 0,
            c1_higher: 5,
            c2_higher: 15
        })
        expect(d).toBeTruthy()
    })

    test('#3 vertical-diagonal cross bottom', async () => {
        const d = await testVerticalDiagonalNoCross({
            c1: 0,
            c2_lower: -3,
            c2_higher: 15
        }, {
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 20,
            c2_higher: 20
        })
        expect(d).toBeFalsy()
    })

    test('#3 vertical-diagonal cross top', async () => {
        const d = await testVerticalDiagonalNoCross({
            c1: 0,
            c2_lower: 0,
            c2_higher: 16
        }, {
            c1_lower: -10,
            c2_lower: 0,
            c1_higher: 5,
            c2_higher: 15
        })
        expect(d).toBeFalsy()
    })
})

describe('horizontalDiagonalNoCross', () => {
    async function testHorizontalDiagonalNoCross(a: {
                                                     c1_lower: number,
                                                     c1_higher: number,
                                                     c2: number
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
            const [ac1l, ac1h, ac2, bc1l, bc1h, bc2l, bc2h] = get_int_vars(ctx, 7)
            solver.add(horizontalDiagonalNoCross(ctx, {
                c1_lower: ac1l,
                c1_higher: ac1h,
                c2: ac2
            }, {
                c1_lower: bc1l,
                c2_lower: bc2l,
                c1_higher: bc1h,
                c2_higher: bc2h
            }))
            solver.add(ac1l.eq(a.c1_lower))
            solver.add(ac1h.eq(a.c1_higher))
            solver.add(ac2.eq(a.c2))
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


    test('#1 horizontal-diagonal cross', async () => {
        const d = await testHorizontalDiagonalNoCross({
            c1_lower: 0,
            c1_higher: 10,
            c2: 5
        }, {
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 10,
            c2_higher: 10
        })
        expect(d).toBeFalsy()
    })

    test('#2 horizontal-diagonal cross', async () => {
        const d = await testHorizontalDiagonalNoCross({
            c1_lower: 0,
            c1_higher: 10,
            c2: 0
        }, {
            c1_lower: 0,
            c2_lower: -1,
            c1_higher: 2,
            c2_higher: 1
        })
        expect(d).toBeFalsy()
    })

    test('#3 horizontal-diagonal no cross B right', async () => {
        const d = await testHorizontalDiagonalNoCross({
            c1_lower: 0,
            c1_higher: 5,
            c2: 0
        }, {
            c1_lower: 5,
            c2_lower: -5,
            c1_higher: 15,
            c2_higher: 5
        })
        expect(d).toBeTruthy()
    })

    test('#4 horizontal-diagonal no cross B below', async () => {
        const d = await testHorizontalDiagonalNoCross({
            c1_lower: 0,
            c1_higher: 5,
            c2: 0
        }, {
            c1_lower: 5,
            c2_lower: -5,
            c1_higher: 10,
            c2_higher: 0
        })
        expect(d).toBeTruthy()
    })

    test('#5 horizontal-diagonal no cross B left', async () => {
        const d = await testHorizontalDiagonalNoCross({
            c1_lower: 5,
            c1_higher: 10,
            c2: 0
        }, {
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 5,
            c2_higher: 5
        })
        expect(d).toBeTruthy()
    })

    test('#6 horizontal-diagonal no cross B above', async () => {
        const d = await testHorizontalDiagonalNoCross({
            c1_lower: 0,
            c1_higher: 10,
            c2: 5
        }, {
            c1_lower: 0,
            c2_lower: 5,
            c1_higher: 5,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })
})

describe('diagonalVerticalNoCross', () => {
    async function testDiagonalVerticalNoCross(a: {
                                                   c1_lower: number,
                                                   c2_lower: number,
                                                   c1_higher: number,
                                                   c2_higher: number
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
            const [ac1l, ac1h, ac2l, ac2h, bc1, bc2l, bc2h] = get_int_vars(ctx, 7)
            solver.add(diagonalVerticalNoCross(ctx, {
                c1_lower: ac1l,
                c2_lower: ac2l,
                c1_higher: ac1h,
                c2_higher: ac2h
            }, {
                c1: bc1,
                c2_lower: bc2l,
                c2_higher: bc2h
            }))
            solver.add(ac1l.eq(a.c1_lower))
            solver.add(ac1h.eq(a.c1_higher))
            solver.add(ac2l.eq(a.c2_lower))
            solver.add(ac2h.eq(a.c2_higher))
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

    test('#1 diagonal-vertical cross', async () => {
        const d = await testDiagonalVerticalNoCross({
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 10,
            c2_higher: 10
        }, {
            c1: 5,
            c2_lower: 0,
            c2_higher: 10
        })
        expect(d).toBeFalsy()
    })

    test('#2 diagonal-vertical cross', async () => {
        const d = await testDiagonalVerticalNoCross({
            c1_lower: -5,
            c2_lower: -5,
            c1_higher: 5,
            c2_higher: 5
        }, {
            c1: 0,
            c2_lower: -5,
            c2_higher: 5
        })
        expect(d).toBeFalsy()
    })

    test('#3 diagonal-vertical no cross B right', async () => {
        const d = await testDiagonalVerticalNoCross({
            c1_lower: -5,
            c2_lower: -5,
            c1_higher: 5,
            c2_higher: 5
        }, {
            c1: 5,
            c2_lower: -5,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('#4 diagonal-vertical no cross B below', async () => {
        const d = await testDiagonalVerticalNoCross({
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 5,
            c2_higher: 5
        }, {
            c1: 3,
            c2_lower: -10,
            c2_higher: 0
        })
        expect(d).toBeTruthy()
    })

    test('#5 diagonal-vertical no cross B left', async () => {
        const d = await testDiagonalVerticalNoCross({
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 10,
            c2_higher: 10
        }, {
            c1: 0,
            c2_lower: -1,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('#6 diagonal-vertical no cross B above', async () => {
        const d = await testDiagonalVerticalNoCross({
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 10,
            c2_higher: 10
        }, {
            c1: 5,
            c2_lower: 10,
            c2_higher: 20
        })
        expect(d).toBeTruthy()
    })
})

describe('diagonalHorizontalNoCross', () => {
    async function testDiagonalHorizontalNoCross(a: {
                                                     c1_lower: number,
                                                     c2_lower: number,
                                                     c1_higher: number,
                                                     c2_higher: number
                                                 },
                                                 b: {
                                                     c1_lower: number,
                                                     c1_higher: number,
                                                     c2: number
                                                 }) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [ac1l, ac1h, ac2l, ac2h, bc1l, bc1h, bc2] = get_int_vars(ctx, 7)
            solver.add(diagonalHorizontalNoCross(ctx, {
                c1_lower: ac1l,
                c2_lower: ac2l,
                c1_higher: ac1h,
                c2_higher: ac2h
            }, {
                c1_lower: bc1l,
                c1_higher: bc1h,
                c2: bc2
            }))
            solver.add(ac1l.eq(a.c1_lower))
            solver.add(ac1h.eq(a.c1_higher))
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

    test('#1 diagonal-horizontal cross', async () => {
        const d = await testDiagonalHorizontalNoCross({
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 10,
            c2_higher: 10
        }, {
            c1_lower: 0,
            c1_higher: 10,
            c2: 5
        })
        expect(d).toBeFalsy()
    })

    test('#2 diagonal-horizontal cross', async () => {
        const d = await testDiagonalHorizontalNoCross({
            c1_lower: -10,
            c2_lower: -10,
            c1_higher: 10,
            c2_higher: 10
        }, {
            c1_lower: -10,
            c1_higher: 10,
            c2: 9
        })
        expect(d).toBeFalsy()
    })

    test('#3 diagonal-horizontal no cross B right', async () => {
        const d = await testDiagonalHorizontalNoCross({
            c1_lower: -10,
            c2_lower: -10,
            c1_higher: 10,
            c2_higher: 10
        }, {
            c1_lower: 10,
            c1_higher: 15,
            c2: 9
        })
        expect(d).toBeTruthy()
    })

    test('#4 diagonal-horizontal no cross B below', async () => {
        const d = await testDiagonalHorizontalNoCross({
            c1_lower: -10,
            c2_lower: -10,
            c1_higher: 10,
            c2_higher: 10
        }, {
            c1_lower: -10,
            c1_higher: 10,
            c2: -10
        })
        expect(d).toBeTruthy()
    })

    test('#5 diagonal-horizontal no cross B left', async () => {
        const d = await testDiagonalHorizontalNoCross({
            c1_lower: -5,
            c2_lower: -5,
            c1_higher: 5,
            c2_higher: 5
        }, {
            c1_lower: -10,
            c1_higher: -5,
            c2: 0
        })
        expect(d).toBeTruthy()
    })

    test('#6 diagonal-horizontal no cross B above', async () => {
        const d = await testDiagonalHorizontalNoCross({
            c1_lower: -5,
            c2_lower: -5,
            c1_higher: 5,
            c2_higher: 5
        }, {
            c1_lower: -10,
            c1_higher: 10,
            c2: 5
        })
        expect(d).toBeTruthy()
    })

})

describe('diagonalDiagonalNoCross', () => {
    async function testDiagonalDiagonalNoCross(a: {
                                                   c1_lower: number,
                                                   c2_lower: number,
                                                   c1_higher: number,
                                                   c2_higher: number
                                               },
                                               b: {
                                                   c1_lower: number,
                                                   c1_higher: number,
                                                   c2_lower: number,
                                                   c2_higher: number
                                               }) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [ac1l, ac1h, ac2l, ac2h, bc1l, bc1h, bc2l, bc2h] = get_int_vars(ctx, 8)
            solver.add(diagonalDiagonalNoCross(ctx, {
                c1_lower: ac1l,
                c2_lower: ac2l,
                c1_higher: ac1h,
                c2_higher: ac2h
            }, {
                c1_lower: bc1l,
                c2_lower: bc2l,
                c1_higher: bc1h,
                c2_higher: bc2h
            }))
            solver.add(ac1l.eq(a.c1_lower))
            solver.add(ac1h.eq(a.c1_higher))
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

    test('#1 diagonal-diagonal cross', async () => {
        const d = await testDiagonalDiagonalNoCross({
            c1_lower: -5,
            c2_lower: -5,
            c1_higher: 5,
            c2_higher: 5
        }, {
            c1_lower: -5,
            c2_lower: -5,
            c1_higher: 5,
            c2_higher: 5
        })
        expect(d).toBeFalsy()
    })

    test('#2 diagonal-diagonal cross', async () => {
        const d = await testDiagonalDiagonalNoCross({
            c1_lower: -5,
            c2_lower: -5,
            c1_higher: 5,
            c2_higher: 5
        }, {
            c1_lower: -10,
            c2_lower: -10,
            c1_higher: 10,
            c2_higher: 10
        })
        expect(d).toBeFalsy()
    })

    test('#3 diagonal-diagonal cross', async () => {
        const d = await testDiagonalDiagonalNoCross({
            c1_lower: -9,
            c2_lower: -9,
            c1_higher: 1,
            c2_higher: 1
        }, {
            c1_lower: -2,
            c2_lower: -2,
            c1_higher: 10,
            c2_higher: 10
        })
        expect(d).toBeFalsy()
    })

    test('#4 diagonal-diagonal no cross B right', async () => {
        const d = await testDiagonalDiagonalNoCross({
            c1_lower: -9,
            c2_lower: -7,
            c1_higher: 1,
            c2_higher: 3
        }, {
            c1_lower: 2,
            c2_lower: 2,
            c1_higher: 10,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('#5 diagonal-diagonal no cross B below', async () => {
        const d = await testDiagonalDiagonalNoCross({
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 10,
            c2_higher: 10
        }, {
            c1_lower: -1,
            c2_lower: -2,
            c1_higher: 1,
            c2_higher: 0
        })
        expect(d).toBeTruthy()
    })

    test('#6 diagonal-diagonal no cross B left', async () => {
        const d = await testDiagonalDiagonalNoCross({
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 10,
            c2_higher: 10
        }, {
            c1_lower: -10,
            c2_lower: 0,
            c1_higher: 0,
            c2_higher: 10
        })
        expect(d).toBeTruthy()
    })

    test('#7 diagonal-diagonal no cross B above', async () => {
        const d = await testDiagonalDiagonalNoCross({
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 10,
            c2_higher: 10
        }, {
            c1_lower: 0,
            c2_lower: 10,
            c1_higher: 10,
            c2_higher: 20
        })
        expect(d).toBeTruthy()
    })
})

describe('diagonalDiagonalNoCrossExtra', () => {
    async function testDiagonalDiagonalNoCross(a: {
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
            const [asx, asy, aex, aey, bsx, bsy, bex, bey] = get_int_vars(ctx, 8)
            solver.add(diagonalDiagonalNoCrossExtra(ctx, {
                start_x: asx,
                start_y: asy,
                end_x: aex,
                end_y: aey
            }, {
                start_x: bsx,
                start_y: bsy,
                end_x: bex,
                end_y: bey
            }))
            solver.add(asx.eq(a.start_x))
            solver.add(asy.eq(a.start_y))
            solver.add(aex.eq(a.end_x))
            solver.add(aey.eq(a.end_y))
            solver.add(bsx.eq(b.start_x))
            solver.add(bsy.eq(b.start_y))
            solver.add(bex.eq(b.end_x))
            solver.add(bey.eq(b.end_y))
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

    test('#1 diagonal-diagonal cross', async () => {
        const d = await testDiagonalDiagonalNoCross({
            start_x: -3,
            start_y: 0,
            end_x: 3,
            end_y: 6
        }, {
            start_x: -3,
            start_y: 6,
            end_x: 3,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('#2 diagonal-diagonal cross', async () => {
        const d = await testDiagonalDiagonalNoCross({
            start_x: -3,
            start_y: 0,
            end_x: 3,
            end_y: 6
        }, {
            start_x: -1,
            start_y: 4,
            end_x: 3,
            end_y: 0
        })
        expect(d).toBeFalsy()
    })

    test('#3 diagonal-diagonal no cross B right below', async () => {
        const d = await testDiagonalDiagonalNoCross({
            start_x: -3,
            start_y: 0,
            end_x: 3,
            end_y: 6
        }, {
            start_x: 1,
            start_y: 2,
            end_x: 5,
            end_y: -2
        })
        expect(d).toBeTruthy()
    })

    test('#4 diagonal-diagonal no cross B right above', async () => {
        const d = await testDiagonalDiagonalNoCross({
            start_x: -3,
            start_y: 0,
            end_x: -1,
            end_y: 2
        }, {
            start_x: -3,
            start_y: 6,
            end_x: 3,
            end_y: 0
        })
        expect(d).toBeTruthy()
    })

    test('#5 diagonal-diagonal no cross B left below', async () => {
        const d = await testDiagonalDiagonalNoCross({
            start_x: 1,
            start_y: 4,
            end_x: 3,
            end_y: 6
        }, {
            start_x: -3,
            start_y: 6,
            end_x: 3,
            end_y: 0
        })
        expect(d).toBeTruthy()
    })

    test('#5 diagonal-diagonal no cross B left above', async () => {
        const d = await testDiagonalDiagonalNoCross({
            start_x: -3,
            start_y: 0,
            end_x: 3,
            end_y: 6
        }, {
            start_x: -4,
            start_y: 7,
            end_x: -1,
            end_y: 4
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

            const clauses: Constraint[] = []
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
            ea.encoding.clauses.map(c => solver.add(c.expr))
            eb.encoding.clauses.map(c => solver.add(c.expr))
            solver.add(ea.encoding.waypoints[0].x.eq(a.x1))
            solver.add(ea.encoding.waypoints[0].y.eq(a.y1))
            solver.add(ea.encoding.waypoints[1].x.eq(a.x2))
            solver.add(ea.encoding.waypoints[1].y.eq(a.y2))
            solver.add(eb.encoding.waypoints[0].x.eq(b.x1))
            solver.add(eb.encoding.waypoints[0].y.eq(b.y1))
            solver.add(eb.encoding.waypoints[1].x.eq(b.x2))
            solver.add(eb.encoding.waypoints[1].y.eq(b.y2))
            encodeChannelConstraints(ctx, ea, chip, true).map(c => solver.add(c.expr))
            encodeChannelConstraints(ctx, eb, chip, true).map(c => solver.add(c.expr))

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

            const clauses: Constraint[] = []
            const encodingProps0 = {
                positionX: 1000,
                positionY: 1000,
                orientation: new EnumBitVecValue(ctx, "orientation", 1),
                placement: new EnumBitVecValue(ctx, "placement", Placement.Top),
                clauses: clauses
            }

            const encodingProps1 = {
                positionX: 1000,
                positionY: 1000,
                orientation: new EnumBitVecValue(ctx, "orientation", 1),
                placement: new EnumBitVecValue(ctx, "placement", Placement.Bottom),
                clauses: clauses
            }

            // one module is placed on top
            const moduleProps0 = {
                id: 0,
                width: 9900,
                height: 9900,
                pitch: 0,
                spacing: 50,
                position: {x: 1000, y: 1000},
                orientation: undefined,
                placement: Placement.Top,
                encoding: encodingProps0
            }

            // one module is placed on the bottom
            const moduleProps1 = {
                id: 1,
                width: 9900,
                height: 9900,
                pitch: 0,
                spacing: 50,
                position: {x: 1000, y: 1000},
                orientation: undefined,
                placement: Placement.Bottom,
                encoding: encodingProps1
            }

            const module0 = new EncodedModule(moduleProps0)
            const module1 = new EncodedModule(moduleProps1)

            const modules: EncodedModule[] = []
            modules.push(module0, module1)
            const eb = channel_b.encode(ctx)
            ea.encoding.clauses.map(c => solver.add(c.expr))
            eb.encoding.clauses.map(c => solver.add(c.expr))
            solver.add(ea.encoding.waypoints[0].x.eq(a.x1))
            solver.add(ea.encoding.waypoints[0].y.eq(a.y1))
            solver.add(ea.encoding.waypoints[1].x.eq(a.x2))
            solver.add(ea.encoding.waypoints[1].y.eq(a.y2))
            solver.add(eb.encoding.waypoints[0].x.eq(b.x1))
            solver.add(eb.encoding.waypoints[0].y.eq(b.y1))
            solver.add(eb.encoding.waypoints[1].x.eq(b.x2))
            solver.add(eb.encoding.waypoints[1].y.eq(b.y2))
            encodeChannelConstraints(ctx, ea, chip, true).map(c => solver.add(c.expr))
            encodeChannelConstraints(ctx, eb, chip, true).map(c => solver.add(c.expr))
            encodeChannelChannelConstraints(ctx, ea, eb, modules).map(c => solver.add(c.expr))
            return await solver.check()
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
})

describe('segmentBoxNoCrossSlopePos', () => {
    async function testSegmentBoxNoCrossSlopePos(segment: {
        c1_lower: number,
        c2_lower: number,
        c1_higher: number,
        c2_higher: number
    }, box: {
        c1: number,
        c2: number,
        c1_span: number,
        c2_span: number
    }) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [sc1l, sc2l, sc1h, sc2h, bc1, bc2, bc1s, bc2s] = get_int_vars(ctx, 8)

            solver.add(sc1l.eq(segment.c1_lower))
            solver.add(sc2l.eq(segment.c2_lower))
            solver.add(sc1h.eq(segment.c1_higher))
            solver.add(sc2h.eq(segment.c2_higher))
            solver.add(bc1.eq(box.c1))
            solver.add(bc2.eq(box.c2))
            solver.add(bc1s.eq(box.c1_span))
            solver.add(bc2s.eq(box.c2_span))
            solver.add(segmentBoxNoCrossSlopePos(ctx, {
                c1_lower: sc1l,
                c2_lower: sc2l,
                c1_higher: sc1h,
                c2_higher: sc2h
            }, {
                c1: bc1,
                c2: bc2,
                c1_span: box.c1_span,
                c2_span: box.c2_span,
            }))

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

    test('#1 segment no cross upper corner', async () => {
        const d = await testSegmentBoxNoCrossSlopePos({
            c1_lower: -1,
            c2_lower: 0,
            c1_higher: 19,
            c2_higher: 20
        }, {
            c1: 10,
            c2: 0,
            c1_span: 10,
            c2_span: 10
        })
        expect(d).toBeTruthy()
    })

    test('#2 segment cross upper corner', async () => {
        const d = await testSegmentBoxNoCrossSlopePos({
            c1_lower: 1,
            c2_lower: 1,
            c1_higher: 15,
            c2_higher: 15
        }, {
            c1: 5,
            c2: 0,
            c1_span: 10,
            c2_span: 10
        })
        expect(d).toBeFalsy()
    })

    test('#3 segment no cross lower corner', async () => {
        const d = await testSegmentBoxNoCrossSlopePos({
            c1_lower: 0,
            c2_lower: -11,
            c1_higher: 20,
            c2_higher: 9
        }, {
            c1: 0,
            c2: 0,
            c1_span: 10,
            c2_span: 10
        })
        expect(d).toBeTruthy()
    })

    test('#4 segment cross lower corner', async () => {
        const d = await testSegmentBoxNoCrossSlopePos({
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 10,
            c2_higher: 10
        }, {
            c1: 0,
            c2: -4,
            c1_span: 12,
            c2_span: 8
        })
        expect(d).toBeFalsy()
    })

    test('#5 segment cross end inside', async () => {
        const d = await testSegmentBoxNoCrossSlopePos({
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 10,
            c2_higher: 10
        }, {
            c1: -5,
            c2: 0,
            c1_span: 10,
            c2_span: 10
        })
        expect(d).toBeFalsy()
    })
})

describe('segmentBoxNoCrossSlopeNeg', () => {
    async function testSegmentBoxNoCrossSlopeNeg(segment: {
        c1_lower: number,
        c2_lower: number,
        c1_higher: number,
        c2_higher: number
    }, box: {
        c1: number,
        c2: number,
        c1_span: number,
        c2_span: number
    }) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [sc1l, sc2l, sc1h, sc2h, bc1, bc2, bc1s, bc2s] = get_int_vars(ctx, 8)

            solver.add(sc1l.eq(segment.c1_lower))
            solver.add(sc2l.eq(segment.c2_lower))
            solver.add(sc1h.eq(segment.c1_higher))
            solver.add(sc2h.eq(segment.c2_higher))
            solver.add(bc1.eq(box.c1))
            solver.add(bc2.eq(box.c2))
            solver.add(bc1s.eq(box.c1_span))
            solver.add(bc2s.eq(box.c2_span))
            solver.add(segmentBoxNoCrossSlopeNeg(ctx, {
                c1_lower: sc1l,
                c2_lower: sc2l,
                c1_higher: sc1h,
                c2_higher: sc2h
            }, {
                c1: bc1,
                c2: bc2,
                c1_span: box.c1_span,
                c2_span: box.c2_span,
            }))

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

    test('#1 segment cross upper corner', async () => {
        const d = await testSegmentBoxNoCrossSlopeNeg({
            c1_lower: -4,
            c2_lower: 0,
            c1_higher: 5,
            c2_higher: 9
        }, {
            c1: -11,
            c2: 0,
            c1_span: 11,
            c2_span: 6      // the segment is just cutting the upper right corner of the box
        })
        expect(d).toBeFalsy()
    })

    test('#2 segment cross upper corner', async () => {
        const d = await testSegmentBoxNoCrossSlopeNeg({
            c1_lower: -4,
            c2_lower: 0,
            c1_higher: 5,
            c2_higher: 9
        }, {
            c1: -11,
            c2: 0,
            c1_span: 11,
            c2_span: 5      // when the box is lower the segment lies on the corner (without cutting it)
        })
        expect(d).toBeTruthy()
    })

    test('#3 segment cross lower corner', async () => {
        const d = await testSegmentBoxNoCrossSlopeNeg({
            c1_lower: -3,
            c2_lower: -5,
            c1_higher: 6,
            c2_higher: 4
        }, {
            c1: 0,
            c2: 0,
            c1_span: 11,
            c2_span: 6          // the segment is just cutting the lower right corner of the box
        })
        expect(d).toBeFalsy()
    })

    test('#4 segment no cross lower corner', async () => {
        const d = await testSegmentBoxNoCrossSlopeNeg({
            c1_lower: -3,
            c2_lower: -5,
            c1_higher: 6,
            c2_higher: 4
        }, {
            c1: 1,          // when the box is further right the segment just touches the corner (without cutting it)
            c2: 0,
            c1_span: 11,
            c2_span: 6
        })
        expect(d).toBeTruthy()
    })

    test('#5 segment cross end inside', async () => {
        const d = await testSegmentBoxNoCrossSlopeNeg({
            c1_lower: -3,
            c2_lower: 0,
            c1_higher: 2,
            c2_higher: 5
        }, {
            c1: -11,
            c2: 0,
            c1_span: 11,
            c2_span: 6
        })
        expect(d).toBeFalsy()
    })
})

describe('pointSegmentDistanceDiagonal', () => {
    async function testPointSegmentDistanceDiagonal(point: {
        c1: number,
        c2: number
    }, segment: {
        c1_lower: number,
        c2_lower: number,
        c1_higher: number,
        c2_higher: number
    }, min_distance: number, isSlopePositive: boolean) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()
            const [pc1, pc2, sc1l, sc2l, sc1h, sc2h] = get_int_vars(ctx, 6)

            solver.add(sc1l.eq(segment.c1_lower))
            solver.add(sc2l.eq(segment.c2_lower))
            solver.add(sc1h.eq(segment.c1_higher))
            solver.add(sc2h.eq(segment.c2_higher))
            solver.add(pc1.eq(point.c1))
            solver.add(pc2.eq(point.c2))
            solver.add(pointSegmentDistanceDiag(ctx, {
                c1: pc1,
                c2: pc2
            }, {
                c1_lower: sc1l,
                c2_lower: sc2l,
                c1_higher: sc1h,
                c2_higher: sc2h,
            }, min_distance, isSlopePositive))

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

    test('#1 segment slope negative', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            c1: 0,
            c2: 0
        }, {
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 6,
            c2_higher: 6        // actual distance = 3 (Manhattan = 6)
        }, 3, false)
        expect(d).toBeTruthy()
    })

    test('#2 segment slope negative', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            c1: 0,
            c2: 0
        }, {
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 6,
            c2_higher: 6        // actual distance = 3 (Manhattan = 6)
        }, 4, false)
        expect(d).toBeFalsy()
    })

    test('#3 segment slope negative', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            c1: 4,
            c2: 4
        }, {
            c1_lower: -3,
            c2_lower: -3,
            c1_higher: 3,
            c2_higher: 3        // actual distance = 4 (Manhattan = 8)
        }, 4, false)
        expect(d).toBeTruthy()
    })

    test('#4 segment slope negative', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            c1: 4,
            c2: 4
        }, {
            c1_lower: -3,
            c2_lower: -3,
            c1_higher: 3,
            c2_higher: 3        // actual distance = 4 (Manhattan = 8)
        }, 5, false)
        expect(d).toBeFalsy()
    })

    test('#5 segment slope positive', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            c1: 7,
            c2: 0
        }, {
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 5,
            c2_higher: 5        // actual distance = 3.5 (Manhattan = 7)
        }, 3, true)
        expect(d).toBeTruthy()
    })

    test('#6 segment slope positive', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            c1: 7,
            c2: 0
        }, {
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 5,
            c2_higher: 5        // actual distance = 3.5 (Manhattan = 7)
        }, 4, true)
        expect(d).toBeFalsy()
    })

    test('#7 segment slope positive', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            c1: 0,
            c2: 4
        }, {
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 5,
            c2_higher: 5        // actual distance = 2 (Manhattan = 4)
        }, 2, true)
        expect(d).toBeTruthy()
    })

    test('#8 segment slope positive', async () => {
        const d = await testPointSegmentDistanceDiagonal({
            c1: 0,
            c2: 4
        }, {
            c1_lower: 0,
            c2_lower: 0,
            c1_higher: 5,
            c2_higher: 5        // actual distance = 2 (Manhattan = 4)
        }, 3, true)
        expect(d).toBeFalsy()
    })
})



