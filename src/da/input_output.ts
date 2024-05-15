import { Bool, Context, Model } from "z3-solver"
import { BuildingBlockInstance, EncodedBuildingBlockInstance, ResultBuildingBlockInstance } from "./building_block"
import { Rotation } from "./rotation"
import { Chip } from "./chip"
import { Channel, ChannelInstance, EncodedChannelInstance, ResultChannelInstance } from "./channel"
import { cross, pairwise_unique } from "./utils"
import { encode_channel_block_constraints } from "./constraints/channel-block-constraints"
import { encode_block_block_constraints } from "./constraints/block-block-constraints"
import { encode_channel_channel_constraints } from "./constraints/channel-channel-constraints"
import { encode_block_constraints } from "./constraints/block-constraints"
import { encode_channel_constraints } from "./constraints/channel-constraints"
import { encode_channel_port_constraints } from "./constraints/channel-port-constraints"
import { StaticRoutingExclusion } from "./routing-exclusion"
import { encode_static_routing_exclusion } from "./constraints/static-routing-exclusion"
import { encode_channel_waypoints_constraints } from "./constraints/channel-waypoints"
import { encode_artificial_paper_constraints } from "./constraints/paper-constraints"

export { Input, Output }

class Input {
    chip!: Chip
    building_blocks!: BuildingBlockInstance[]
    channels!: ChannelInstance[]
    routing_exclusions!: StaticRoutingExclusion[]

    constructor(obj: Partial<Input>) {
        Object.assign(this, obj)
    }

    encode(ctx: Context): EncodedInput {
        const building_blocks = this.building_blocks.map((b, i) => b.encode(i, this.chip, ctx))
        const channels = this.channels.map((c, i) => c.encode(i, this.chip, ctx))
        const clauses = [
            ...building_blocks.flatMap(b => b.clauses),
            ...channels.flatMap(c => c.clauses)
        ]

        /* Paper constraints */
        clauses.push(...encode_artificial_paper_constraints(ctx, this.chip, building_blocks, channels))

        /* Encode block contraints */
        clauses.push(...building_blocks.flatMap(b => encode_block_constraints(ctx, b, this.chip)))

        /* Encode channel contraints */
        clauses.push(...channels.flatMap(c => encode_channel_constraints(ctx, c, this.chip)))

        /* Encode channel ports connections */
        clauses.push(...channels.flatMap(c => encode_channel_port_constraints(ctx, c, building_blocks[c.from.building_block], building_blocks[c.to.building_block])))

        /* Encode channel fixed waypoints */
        clauses.push(...channels.flatMap(c => encode_channel_waypoints_constraints(ctx, c, c.fixed_waypoints)))

        /* Encode inter-block effects */
        clauses.push(...pairwise_unique(building_blocks).flatMap(([a, b]) => encode_block_block_constraints(ctx, a, b)))

        /* Encode inter-channel effects */
        clauses.push(...pairwise_unique(channels).flatMap(([a, b]) => encode_channel_channel_constraints(ctx, a, b)))

        /* Encode channel-block effects */
        clauses.push(...cross(channels, building_blocks).flatMap(([c, b]) => encode_channel_block_constraints(ctx, c, b)))

        /* Encode routing exclusion zones */
        clauses.push(...cross(channels, this.routing_exclusions).flatMap(([c, e]) => encode_static_routing_exclusion(ctx, c, e)))

        return new EncodedInput({
            ...this,
            building_blocks,
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
            building_blocks: o.building_blocks?.map(b => new BuildingBlockInstance(b)) ?? [],
            channels: o.channels?.map(c => new ChannelInstance(c)) ?? [],
            routing_exclusions: o.routing_exclusions?.map(e => new StaticRoutingExclusion(e)) ?? []
        })
    }
}

class EncodedInput extends Input {
    building_blocks!: EncodedBuildingBlockInstance[]
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
            building_blocks: this.building_blocks.map(b => b.result(m)),
            channels: this.channels.map(c => c.result(m))
        }
    }
}

class Output extends EncodedInput {
    building_blocks!: ResultBuildingBlockInstance[]
    channels!: ResultChannelInstance[]

    timing?: number //ms

    constructor(obj: Partial<Output>) {
        super(obj)
        Object.assign(this, obj)
    }
}