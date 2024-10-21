import { Bool, Context, Model } from "z3-solver"
import { Chip } from "./chip"
import { cross, pairwiseUnique } from "./utils"
import { StaticRoutingExclusion } from "./routingExclusion"
import { encodePaperConstraints } from "./constraints/paperConstraints"
import { encodeChannelConstraints } from "./constraints/channelConstraints"
import { encodeChannelPortConstraints } from "./constraints/channelPortConstraints"
import { encodeChannelWaypointConstraints } from "./constraints/channelWaypoints"
import { encodeChannelChannelConstraints } from "./constraints/channelChannelConstraints"
import { encodeStaticRoutingExclusion } from "./constraints/staticRoutingExclusion"
import { encodeModuleConstraints } from "./constraints/moduleConstraints"
import { encodeModuleModuleConstraints } from "./constraints/moduleModuleConstraints"
import { encodeChannelModuleConstraints } from "./constraints/channelModuleConstraints"
import {EncodedModule, Module, ResultModule} from "./module"
import { Channel, EncodedChannel, ResultChannel } from "./channel"
import {Clamp} from "./clamp";
import {EncodedPin, Pin, ResultPin} from "./pin";
import {encodePinConstraints} from "./constraints/pinConstraints";
import {encodePinPinConstraints} from "./constraints/pinPinConstraints";
import {encodeModulePinConstraints} from "./constraints/modulePinConstraints";
import {encodeChannelPinConstraints} from "./constraints/channelPinConstraints";
import {encodeClampConstraints} from "./constraints/clampConstraints";

export { Input, Output }

class Input {
    chip!: Chip
    modules!: Module[]
    channels!: Channel[]
    routingExclusions!: StaticRoutingExclusion[]
    clamps!: Clamp[]
    softCorners?: boolean
    pins!: Pin[]


    constructor(obj: Partial<Input>) {
        Object.assign(this, obj)
    }

    updateIds() {
        this.modules.forEach((m, i) => m.id = i)
        this.channels.forEach((c, i) => c.id = i)
        this.pins.forEach((p, i) => p.id = i)
    }

    encode(ctx: Context): EncodedInput {
        this.updateIds()
        const modules = this.modules.map(m => m.encode(ctx))
        const channels = this.channels.map((c, i) => c.encode(ctx))
        const pins = this.pins.map((p, i) => p.encode(ctx))
        const clauses = [
            ...modules.flatMap(b => b.encoding.clauses),
            ...channels.flatMap(c => c.encoding.clauses),
            ...pins.flatMap((p => p.encoding.clauses))
        ]
        const softCorners = this.softCorners

        /* Paper constraints */
        clauses.push(...encodePaperConstraints(ctx, this.chip, modules, channels))

        /* Encode module constraints */
        clauses.push(...modules.flatMap(b => encodeModuleConstraints(ctx, b, this.chip)))

        /* Encode channel constraints */
        clauses.push(...channels.flatMap(c => encodeChannelConstraints(ctx, c, this.chip, modules, softCorners)))

        /* Encode channel ports connections */
        clauses.push(...channels.flatMap(c => encodeChannelPortConstraints(ctx, c, modules[c.from.module], modules[c.to.module])))

        /* Encode channel fixed waypoints */
        clauses.push(...channels.flatMap(c => encodeChannelWaypointConstraints(ctx, c)))

        /* Encode inter-module effects */
        clauses.push(...pairwiseUnique(modules).flatMap(([a, b]) => encodeModuleModuleConstraints(ctx, a, b)))

        /* Encode inter-channel effects */
        clauses.push(...pairwiseUnique(channels).flatMap(([a, b]) => encodeChannelChannelConstraints(ctx, a, b, modules)))

        /* Encode channel-module effects */
        clauses.push(...cross(channels, modules).flatMap(([c, b]) => encodeChannelModuleConstraints(ctx, c, b)))

        /* Encode routing exclusion zones */
        clauses.push(...cross(channels, this.routingExclusions).flatMap(([c, e]) => encodeStaticRoutingExclusion(ctx, c, e)))

        /* Encode clamps */
        clauses.push(...cross(modules, this.clamps).flatMap(([c, b]) => encodeClampConstraints(ctx, c, b)))

        /* Encode pins */
        clauses.push(...pins.flatMap(b => encodePinConstraints(ctx, b, modules, this.chip)))

        /* Encode inter-pin effects */
        clauses.push(...pairwiseUnique(pins).flatMap(([a, b]) => encodePinPinConstraints(ctx, a, b, modules)))

        /* Encode pin-module effects */
        clauses.push(...cross(modules, pins).flatMap(([m, p]) => encodeModulePinConstraints(ctx, p, m, modules)))

        /* Encode channel-pin constraints */
        clauses.push(...cross(channels, pins).flatMap(([c, p]) => encodeChannelPinConstraints(ctx, p, c)))

        return new EncodedInput({
            ...this,
            modules,
            channels,
            clauses,
            pins
        })
    }

    static from(o: Partial<Input>) {
        if(o.chip === undefined) {
            throw ''
        }

        const pins: Pin[] = []
        const clamps: Clamp[] = []

        // fill a new clamps array with a clamp for each module
        o.modules?.forEach((c, i) => {
            clamps.push(new Clamp({ clampID: i, clampingModuleID: c.id, placement: c.placement}))
        })

        /** ADJUST PIN RADIUS HERE **/

        // fill a new pins array with three pins for each module (radius of pin is hard set to 1000 here and propagated to all following encoding)
        o.modules?.forEach((c, k) => {
            for (let i = 0; i < 3; i++) {
                pins.push(new Pin({ id: k, module: k, radius: 1000}))
            }
        })

        return new Input({
            chip: new Chip(o.chip),
            modules: o.modules?.map(m => new Module(m)) ?? [],
            channels: o.channels?.map(c => new Channel(c)) ?? [],
            routingExclusions: o.routingExclusions?.map(e => new StaticRoutingExclusion(e)) ?? [],
            clamps: clamps,
            pins: pins,
            softCorners: o.softCorners
        })
    }
}

class EncodedInput extends Input {
    modules!: EncodedModule[]
    channels!: EncodedChannel[]
    clauses!: Bool[]
    pins!: EncodedPin[]

    constructor(obj: Partial<EncodedInput>) {
        super(obj)
        this.clauses = []
        Object.assign(this, obj)
    }

    result(m: Model): Output {
        return {
            ...this,
            success: true,
            modules: this.modules.map(b => b.result(m)),
            channels: this.channels.map(c => c.result(m)),
            clamps: this.clamps,
            pins: this.pins.map(p => p.result(m))
        }
    }
}

class Output extends EncodedInput {
    modules!: ResultModule[]
    channels!: ResultChannel[]
    pins!: ResultPin[]

    timing?: number //ms
    success: true = true

    constructor(obj: Partial<Output>) {
        super(obj)
        Object.assign(this, obj)
    }
}