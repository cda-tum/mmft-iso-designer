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
import {EncodedModule, Module, ModuleID, ResultModule} from "./module"
import { Channel, EncodedChannel, ResultChannel } from "./channel"
import {Clamp} from "./clamp";
import {encodeClampConstraints} from "./constraints/clampConstraints";

export { Input, Output }

class Input {
    chip!: Chip
    modules!: Module[]
    channels!: Channel[]
    routingExclusions!: StaticRoutingExclusion[]
    clamps!: Clamp[]

    constructor(obj: Partial<Input>) {
        Object.assign(this, obj)
    }

    updateIds() {
        this.modules.forEach((m, i) => m.id = i)
        this.channels.forEach((c, i) => c.id = i)
    }

    encode(ctx: Context): EncodedInput {
        this.updateIds()
        const modules = this.modules.map(m => m.encode(ctx))
        const channels = this.channels.map((c, i) => c.encode(ctx))
        const clauses = [
            ...modules.flatMap(b => b.encoding.clauses),
            ...channels.flatMap(c => c.encoding.clauses)
        ]

        /* Paper constraints */
        clauses.push(...encodePaperConstraints(ctx, this.chip, modules, channels))

        /* Encode module constraints */
        clauses.push(...modules.flatMap(b => encodeModuleConstraints(ctx, b, this.chip)))

        /* Encode channel constraints */
        clauses.push(...channels.flatMap(c => encodeChannelConstraints(ctx, c, this.chip, modules)))

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
        clauses.push(...cross(channels, this.clamps).flatMap(([c, b]) => encodeClampConstraints(ctx, c, b)))

        return new EncodedInput({
            ...this,
            modules,
            channels,
            clauses
        })
    }

    static from(o: Partial<Input>) {
        if(o.chip === undefined) {
            throw ''
        }

        // fill clamps array with a clamp for each module
        o.modules?.forEach((c, i) => {
            o.clamps?.push(new Clamp({ clampID: i, clampingModuleID: c.id, placement: c.placement}))
        })

        return new Input({
            chip: new Chip(o.chip),
            modules: o.modules?.map(m => new Module(m)) ?? [],
            channels: o.channels?.map(c => new Channel(c)) ?? [],
            routingExclusions: o.routingExclusions?.map(e => new StaticRoutingExclusion(e)) ?? [],
            clamps: o.clamps ?? []
        })
    }
}

class EncodedInput extends Input {
    modules!: EncodedModule[]
    channels!: EncodedChannel[]
    clauses!: Bool[]

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
            clamps: this.clamps
        }
    }
}

class Output extends EncodedInput {
    modules!: ResultModule[]
    channels!: ResultChannel[]

    timing?: number //ms
    success: true = true

    constructor(obj: Partial<Output>) {
        super(obj)
        Object.assign(this, obj)
    }
}