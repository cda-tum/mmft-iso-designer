import {init} from "z3-solver"
import {Position} from "../da/geometry/position";
import {Channel} from "../da/components/channel";
import {Chip} from "../da/components/chip";
import {encodeChannelConstraints} from "../da/constraints/channelConstraints";


describe('encodeChannelConstraintsChannelLength', () => {
    async function testEncodeChannelConstraintsChannelLength(mandatoryWaypoints: Position[], length: number, exactLength: boolean) {
        const {Context, em} = await init()
        const ctx = Context('main')
        try {
            const solver = new ctx.Solver()

            let port: [number, number]
            port = [0, 0]
            const fromPort = {
                module: 0,
                port: port
            }

            const toPort = {
                module: 1,
                port: port
            }
            let channelProps

            if (exactLength) {
                channelProps = {
                    id: 0,
                    width: 500,
                    spacing: 500,
                    maxSegments: 10,
                    from: fromPort,
                    to: toPort,
                    exactLength: length
                }
            } else {
                channelProps = {
                    id: 0,
                    width: 500,
                    spacing: 500,
                    maxSegments: 10,
                    from: fromPort,
                    to: toPort,
                    exactLength: length
                }
            }

            // 10 segments implies at least 11 waypoints with x and y coordinate each

            const channelA = new Channel(channelProps)
            const encodedChannelA = channelA.encode(ctx)

            const chip = new Chip({
                originX: 0,
                originY: 0,
                width: 150000,
                height: 150000
            })

            for (let i = 0; i < encodedChannelA.maxSegments; i++) {
                solver.add(encodedChannelA.encoding.waypoints[i].x.eq(mandatoryWaypoints[i].x))
                solver.add(encodedChannelA.encoding.waypoints[i].y.eq(mandatoryWaypoints[i].y))
                console.log("Encoding waypoint " + i + " is set equal to mandatory waypoint (" + mandatoryWaypoints[i].x + " | " + mandatoryWaypoints[i].y + ")")

            }
            encodedChannelA.encoding.clauses.map(c => solver.add(c.expr))

            encodeChannelConstraints(ctx, encodedChannelA, chip, false).map(c => {
                    if (!c.label.includes("active-inactive-segments") && !c.label.includes("inactive-segments-endpoint")) {
                        solver.add(c.expr)
                    }
                }
            )
            solver.add(ctx.Eq(length, encodedChannelA.encoding.length))

            let check = await solver.check()
            if (check === 'sat') {
                const m = solver.model()
                const resultChannel = encodedChannelA.result(m)
                const computedLength = resultChannel.results.length
                if (exactLength) {
                    return computedLength === length
                } else {
                    return computedLength <= length
                }
            } else {
                return false
            }
        } catch (e) {
            console.error('error', e);
        } finally {
            em.PThread.terminateAllThreads();
        }
    }


    test('#1 exact-length all segment types', async () => {
        const mandatoryWaypoints: Position[] = []

        const waypointA = ({ x: 20000, y: 20000 }) // Starting point
        const waypointB = ({ x: 30000, y: 30000 }) // UpLeft segment    (length 20000)
        const waypointC = ({ x: 50000, y: 30000 }) // Right segment     (length 20000)
        const waypointD = ({ x: 50000, y: 50000 }) // Up segment        (length 20000)
        const waypointE = ({ x: 30000, y: 70000 }) // UpLeft segment    (length 40000)
        const waypointF = ({ x: 20000, y: 70000 }) // Left segment      (length 10000)
        const waypointG = ({ x: 20000, y: 90000 }) // Up segment        (length 20000)
        const waypointH = ({ x: 70000, y: 90000 }) // Right segment     (length 50000)
        const waypointI = ({ x: 90000, y: 70000 }) // DownRight segment (length 40000)
        const waypointJ = ({ x: 80000, y: 60000 }) // DownLeft segment  (length 20000)
        const waypointK = ({ x: 80000, y: 50000 }) // Down segment      (length 10000)

        mandatoryWaypoints.push(waypointA, waypointB, waypointC, waypointD, waypointE, waypointF, waypointG, waypointH, waypointI, waypointJ, waypointK)

        const exactLength = 250000

        const d = await testEncodeChannelConstraintsChannelLength(mandatoryWaypoints, exactLength, true)
        expect(d).toBeTruthy()
    })

    test('#1 max-length all segment types', async () => {
        const mandatoryWaypoints: Position[] = []

        const waypointA = ({ x: 20000, y: 20000 }) // Starting point
        const waypointB = ({ x: 30000, y: 30000 }) // UpLeft segment    (length 20000)
        const waypointC = ({ x: 50000, y: 30000 }) // Right segment     (length 20000)
        const waypointD = ({ x: 50000, y: 50000 }) // Up segment        (length 20000)
        const waypointE = ({ x: 30000, y: 70000 }) // UpLeft segment    (length 40000)
        const waypointF = ({ x: 20000, y: 70000 }) // Left segment      (length 10000)
        const waypointG = ({ x: 20000, y: 90000 }) // Up segment        (length 20000)
        const waypointH = ({ x: 70000, y: 90000 }) // Right segment     (length 50000)
        const waypointI = ({ x: 90000, y: 70000 }) // DownRight segment (length 40000)
        const waypointJ = ({ x: 80000, y: 60000 }) // DownLeft segment  (length 20000)
        const waypointK = ({ x: 80000, y: 50000 }) // Down segment      (length 10000)

        mandatoryWaypoints.push(waypointA, waypointB, waypointC, waypointD, waypointE, waypointF, waypointG, waypointH, waypointI, waypointJ, waypointK)

        const maxLength = 250001

        const d = await testEncodeChannelConstraintsChannelLength(mandatoryWaypoints, maxLength, false)
        expect(d).toBeTruthy()
    })

})