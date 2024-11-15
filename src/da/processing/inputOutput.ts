import {Bool, Context, Model} from "z3-solver"
import {Chip} from "../components/chip"
import {cross, pairwiseUnique} from "../utils"
import {
    DynamicModuleRoutingExclusion,
    EncodedDynamicModuleRoutingExclusion,
    ResultDynamicModuleRoutingExclusion,
    StaticChipRoutingExclusion
} from "../components/routingExclusion"
import {encodePaperConstraints} from "../constraints/paperConstraints"
import {encodeChannelConstraints} from "../constraints/channelConstraints"
import {encodeChannelPortConstraints} from "../constraints/channelPortConstraints"
import {encodeChannelWaypointConstraints} from "../constraints/channelWaypointsConstraints"
import {encodeChannelChannelConstraints} from "../constraints/channelChannelConstraints"
import {
    encodeStaticRoutingExclusionChannels,
    encodeStaticRoutingExclusionPins
} from "../constraints/staticRoutingExclusionConstraints"
import {encodeModuleConstraints} from "../constraints/moduleConstraints"
import {encodeModuleModuleConstraints} from "../constraints/moduleModuleConstraints"
import {encodeChannelModuleConstraints} from "../constraints/channelModuleConstraints"
import {EncodedModule, Module, ResultModule} from "../components/module"
import {Channel, EncodedChannel, ResultChannel} from "../components/channel"
import {Clamp} from "../components/clamp";
import {EncodedPin, Pin, ResultPin} from "../components/pin";
import {encodePinConstraints} from "../constraints/pinConstraints";
import {encodePinPinConstraints} from "../constraints/pinPinConstraints";
import {encodeModulePinConstraints} from "../constraints/modulePinConstraints";
import {encodeChannelPinConstraints} from "../constraints/channelPinConstraints";
import {encodeClampConstraints} from "../constraints/clampConstraints";
import {
    encodeDynamicModuleRoutingExclusionPins, encodeDynamicRoutingExclusion, encodeDynamicRoutingExclusionChannels
} from "../constraints/dynamicRoutingExclusionConstraints";
import {Constraint} from "./constraint";

export {Input, Output}

export type Clause = {
    constraint: Bool
    literal: string
}

class Input {
    chip!: Chip
    modules!: Module[]
    channels!: Channel[]
    chipRoutingExclusions!: StaticChipRoutingExclusion[]
    moduleRoutingExclusions!: DynamicModuleRoutingExclusion[]
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
        this.moduleRoutingExclusions.forEach((p, i) => p.id = i)
    }

    encode(ctx: Context): EncodedInput {
        this.updateIds()
        const modules = this.modules.map(m => m.encode(ctx))
        const channels = this.channels.map(c => c.encode(ctx))
        const pins = this.pins.map(p => p.encode(ctx))

        /** DYNAMIC MODULE-BASED EXCLUSION ZONES **/
        /* Input validation: exclusion zone coordinates are defined in the realm of their module, so must be inside modules size boundaries */
        cross(this.modules, this.moduleRoutingExclusions).flatMap(([m, e]) => {
            if (m.id === e.module) {
                let inputValid = true
                if (e.position.x > m.width || e.position.y > m.height) {
                    inputValid = false
                }
                if (!inputValid) {
                    throw 'Dynamic (module-based) exclusion zone coordinates must be located on the corresponding module.'
                }
            }
        })


        const moduleRoutingExclusions = this.moduleRoutingExclusions.map(e => e.encode(ctx, modules))
        let clauses: Constraint[] = []
        clauses = [
            ...modules.flatMap(b => b.encoding.clauses),
            ...channels.flatMap(c => c.encoding.clauses)
        ]
        const softCorners = this.softCorners

        /* Paper constraints */
        clauses.push(...encodePaperConstraints(ctx, this.chip, modules, channels))

        /* Encode module constraints */
        clauses.push(...modules.flatMap(b => encodeModuleConstraints(ctx, b, this.chip)))

        /* Encode channel constraints */
        clauses.push(...channels.flatMap(c => encodeChannelConstraints(ctx, c, this.chip, softCorners)))

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

        /* Encode module-based routing exclusion zones */
        clauses.push(...moduleRoutingExclusions.flatMap(e => encodeDynamicRoutingExclusion(ctx, e)))

        /* Encode chip-based routing exclusion zones and channels */
        clauses.push(...cross(channels, this.chipRoutingExclusions).flatMap(([c, e]) => encodeStaticRoutingExclusionChannels(ctx, c, e)))

        /* Encode module-based routing exclusion zones and channels */
        clauses.push(...cross(channels, moduleRoutingExclusions).flatMap(([c, e]) => encodeDynamicRoutingExclusionChannels(ctx, c, e, modules)))

        /* Encode clamps */
        clauses.push(...cross(modules, this.clamps).flatMap(([c, b]) => encodeClampConstraints(ctx, c, b)))

        /* Encode pins */
        clauses.push(...pins.flatMap(b => encodePinConstraints(ctx, b, modules)))

        /* Encode inter-pin effects */
        clauses.push(...pairwiseUnique(pins).flatMap(([a, b]) => encodePinPinConstraints(ctx, a, b, modules)))

        /* Encode module-pin effects */
        clauses.push(...cross(modules, pins).flatMap(([m, p]) => encodeModulePinConstraints(ctx, p, m, modules)))

        /* Encode channel-pin constraints */
        clauses.push(...cross(channels, pins).flatMap(([c, p]) => encodeChannelPinConstraints(ctx, p, c)))

        /* Encode routing exclusion zones and pins */
        clauses.push(...cross(pins, this.chipRoutingExclusions).flatMap(([p, e]) => encodeStaticRoutingExclusionPins(ctx, p, e)))

        /* Encode routing exclusion zones and pins */
        clauses.push(...cross(pins, moduleRoutingExclusions).flatMap(([p, e]) => encodeDynamicModuleRoutingExclusionPins(ctx, p, e)))

        return new EncodedInput({
            ...this,
            modules,
            channels,
            clauses,
            pins,
            moduleRoutingExclusions
        })
    }

    static from(o: Partial<Input>) {
        if (o.chip === undefined) {
            throw ''
        }

        const pins: Pin[] = []
        const clamps: Clamp[] = []

        // fill a new clamps array with a clamp for each module
        o.modules?.forEach((c, i) => {
            clamps.push(new Clamp({clampID: i, clampingModuleID: c.id, placement: c.placement}))
        })

        // fill a new pins array with three pins for each module
        o.modules?.forEach((c, k) => {
            if (c.pinAmount !== undefined) {
                for (let i = 0; i < c.pinAmount; i++) {
                    pins.push(new Pin({id: i, module: k, radius: Pin.pinRadius()}))
                }
            } else {
                // default number of pins is 3
                for (let i = 0; i < Pin.defaultPins(); i++) {
                    pins.push(new Pin({id: i, module: k, radius: Pin.pinRadius()}))
                }
            }
        })

        return new Input({
            chip: new Chip(o.chip),
            modules: o.modules?.map(m => new Module(m)) ?? [],
            channels: o.channels?.map(c => new Channel(c)) ?? [],
            chipRoutingExclusions: o.chipRoutingExclusions?.map(e => new StaticChipRoutingExclusion(e)) ?? [],
            moduleRoutingExclusions: o.moduleRoutingExclusions?.map(e => new DynamicModuleRoutingExclusion(e)) ?? [],
            clamps: clamps,
            pins: pins,
            softCorners: o.softCorners
        })
    }
}

class EncodedInput extends Input {
    modules!: EncodedModule[]
    channels!: EncodedChannel[]
    clauses!: Constraint[]
    pins!: EncodedPin[]
    moduleRoutingExclusions!: EncodedDynamicModuleRoutingExclusion[]

    constructor(obj: Partial<EncodedInput>) {
        super(obj)
        this.clauses = []
        Object.assign(this, obj)
    }

    result(m: Model): Output {
        const resultModules = this.modules.map(b => b.result(m))
        return {
            ...this,
            success: true,
            modules: resultModules,
            channels: this.channels.map(c => c.result(m)),
            clamps: this.clamps,
            pins: this.pins.map(p => p.result(m)),
            moduleRoutingExclusions: this.moduleRoutingExclusions.map(e => e.result(m, resultModules))
        }
    }
}

class Output extends EncodedInput {
    modules!: ResultModule[]
    channels!: ResultChannel[]
    pins!: ResultPin[]
    moduleRoutingExclusions!: ResultDynamicModuleRoutingExclusion[]

    timing?: number //ms
    success: true = true

    constructor(obj: Partial<Output>) {
        super(obj)
        Object.assign(this, obj)
    }
}