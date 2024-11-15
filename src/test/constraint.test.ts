import {init} from "z3-solver"
import {Pin} from "../da/components/pin";
import {encodePinConstraints} from "../da/constraints/pinConstraints";
import {Chip} from "../da/components/chip";
import {intVal} from "../da/z3Helpers";
import {EncodedModule} from "../da/components/module";

describe('pinEncode', () => {
    async function testPinEncode(radius: number) {
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

            let testPin0 = new Pin({ radius: radius, module: 0, id: 0})
            let testPin1 = new Pin({ radius: radius, module: 0, id: 1})
            let testPin2 = new Pin({ radius: radius, module: 0, id: 2})

            const pins = []
            pins.push(testPin0, testPin1, testPin2)
            const encodedPins = pins.map((p, i) => p.encode(ctx))
            const modules: EncodedModule[] = []
            solver.add(...encodedPins.flatMap(b => encodePinConstraints(ctx, b, modules)).map(c => c.expr))

            let check = await solver.check()
            if (check === 'sat') {
                const m = solver.model()
                console.log(encodedPins.map((p, i) => p.encoding.positionX.name()))
                const intVal0 = intVal(m, encodedPins[0].encoding.positionX)
                console.log(intVal0)
                const resultPin0 = encodedPins[0].result(m)
                console.log(resultPin0)
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
        const d = await testPinEncode(1000)
        expect(d).toBeTruthy()
    })

})