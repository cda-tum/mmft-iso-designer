import { Bool, Context, Model } from "z3-solver"
import { Chip } from "./chip"
import { ChannelInstance, EncodedChannelInstance, ResultChannelInstance } from "./channel"
import { cross, pairwise_unique } from "./utils"
import { StaticRoutingExclusion } from "./routingExclusion"
import { encodePaperConstraints } from "./constraints/paperConstraints"
import { encodeChannelConstraints } from "./constraints/channelConstraints"
import { encodeChannelPortConstraints } from "./constraints/channelPortConstraints"
import { encodeChannelWaypointConstraints } from "./constraints/channelWaypoints"
import { encodeChannelChannelConstraints } from "./constraints/channelChannelConstraints"
import { encodeStaticRoutingExclusion } from "./constraints/staticRoutingExclusion"
import { EncodedModuleInstance, ModuleInstance, ResultModuleInstance } from "./module"
import { encodeModuleConstraints } from "./constraints/moduleConstraints"
import { encodeModuleModuleConstraints } from "./constraints/moduleModuleConstraints"
import { encodeChannelModuleConstraints } from "./constraints/channelModuleConstraints"

export { Input, Output }

class Input {
    chip!: Chip
    modules!: ModuleInstance[]
    channels!: ChannelInstance[]
    routing_exclusions!: StaticRoutingExclusion[]

    constructor(obj: Partial<Input>) {
        Object.assign(this, obj)
    }

    encode(ctx: Context): EncodedInput {
        const modules = this.modules.map((b, i) => b.encode(i, this.chip, ctx))
        const channels = this.channels.map((c, i) => c.encode(i, this.chip, ctx))
        const clauses = [
            ...modules.flatMap(b => b.clauses),
            ...channels.flatMap(c => c.clauses)
        ]

        /* Paper constraints */
        clauses.push(...encodePaperConstraints(ctx, this.chip, modules, channels))

        /* Encode module contraints */
        clauses.push(...modules.flatMap(b => encodeModuleConstraints(ctx, b, this.chip)))

        /* Encode channel contraints */
        clauses.push(...channels.flatMap(c => encodeChannelConstraints(ctx, c, this.chip)))

        /* Encode channel ports connections */
        clauses.push(...channels.flatMap(c => encodeChannelPortConstraints(ctx, c, modules[c.from.module], modules[c.to.module])))

        /* Encode channel fixed waypoints */
        clauses.push(...channels.flatMap(c => encodeChannelWaypointConstraints(ctx, c, c.fixed_waypoints)))

        /* Encode inter-module effects */
        clauses.push(...pairwise_unique(modules).flatMap(([a, b]) => encodeModuleModuleConstraints(ctx, a, b)))

        /* Encode inter-channel effects */
        clauses.push(...pairwise_unique(channels).flatMap(([a, b]) => encodeChannelChannelConstraints(ctx, a, b)))

        /* Encode channel-module effects */
        clauses.push(...cross(channels, modules).flatMap(([c, b]) => encodeChannelModuleConstraints(ctx, c, b)))

        /* Encode routing exclusion zones */
        clauses.push(...cross(channels, this.routing_exclusions).flatMap(([c, e]) => encodeStaticRoutingExclusion(ctx, c, e)))

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

        return new Input({
            chip: new Chip(o.chip),
            modules: o.modules?.map(b => new ModuleInstance(b)) ?? [],
            channels: o.channels?.map(c => new ChannelInstance(c)) ?? [],
            routing_exclusions: o.routing_exclusions?.map(e => new StaticRoutingExclusion(e)) ?? []
        })
    }
}

class EncodedInput extends Input {
    modules!: EncodedModuleInstance[]
    channels!: EncodedChannelInstance[]
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
            channels: this.channels.map(c => c.result(m))
        }
    }
}

class Output extends EncodedInput {
    modules!: ResultModuleInstance[]
    channels!: ResultChannelInstance[]

    timing?: number //ms
    success: true = true

    constructor(obj: Partial<Output>) {
        super(obj)
        Object.assign(this, obj)
    }
}