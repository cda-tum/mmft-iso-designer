import { Context } from "z3-solver"
import { EncodedChannelInstance } from "../channel"
import { Position } from "../position"
import { pairwise_unique } from "../utils"

export function encode_channel_waypoints_constraints(ctx: Context, channel: EncodedChannelInstance, fixed_waypoints: Position[]) {
    const clauses = []

    if (fixed_waypoints.length > channel.segments_n + 1) {
        throw ''
    }

    /* Waypoints appear */
    {
        clauses.push(...[...Array(fixed_waypoints.length).keys()].map(w => ctx.Or(
            ...[...Array(channel.waypoints.length).keys()].map(i => ctx.And(
                ctx.Eq(channel.waypoints[i].x, fixed_waypoints[w].x),
                ctx.Eq(channel.waypoints[i].y, fixed_waypoints[w].y)
            ))
        )))
    }

    /* Waypoints forward order */
    {
        if (fixed_waypoints.length > 1) {
            clauses.push(...[...Array(fixed_waypoints.length).keys()].slice(0, -1).flatMap(w => 
                [...Array(channel.waypoints.length).keys()].slice(0, -1).map(ia => ctx.Implies(
                    ctx.And(
                        ctx.Eq(channel.waypoints[ia].x, fixed_waypoints[w].x),
                        ctx.Eq(channel.waypoints[ia].y, fixed_waypoints[w].y)
                    ),
                    ctx.Or(
                        ...[...Array(channel.waypoints.length).keys()].slice(ia + 1).map(ib => ctx.And(
                            ctx.Eq(channel.waypoints[ib].x, fixed_waypoints[w + 1].x),
                            ctx.Eq(channel.waypoints[ib].y, fixed_waypoints[w + 1].y)
                        ))
                    )
                ))
            ))
        }
    }

    /* Waypoints backward order */
    /* Bug to fix: exlucde multiple inactive waypoints */
    {
        /*if (fixed_waypoints.length > 1) {
            clauses.push(...[...Array(fixed_waypoints.length).keys()].slice(1).flatMap(w => 
                [...Array(channel.waypoints.length).keys()].slice(1).map(ia => ctx.Implies(
                    ctx.And(
                        ctx.Eq(channel.waypoints[ia].x, fixed_waypoints[w].x),
                        ctx.Eq(channel.waypoints[ia].y, fixed_waypoints[w].y)
                    ),
                    ctx.Or(
                        ...[...Array(channel.waypoints.length).keys()].slice(0, ia).map(ib => ctx.And(
                            ctx.Eq(channel.waypoints[ib].x, fixed_waypoints[w - 1].x),
                            ctx.Eq(channel.waypoints[ib].y, fixed_waypoints[w - 1].y)
                        ))
                    )
                ))
            ))
        }*/
    }

    return clauses
}