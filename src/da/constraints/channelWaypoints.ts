import { Context } from "z3-solver"
import { EncodedChannel } from "../components/channel"

export function encodeChannelWaypointConstraints(ctx: Context, channel: EncodedChannel) {
    const clauses = []

    const mandatoryWaypoints = channel.mandatoryWaypoints

    // If mandatory waypoints list matches available waypoints length, all waypoints are predetermined
    if (mandatoryWaypoints !== undefined && mandatoryWaypoints.length === channel.encoding.waypoints.length) {
        mandatoryWaypoints.forEach((mw, i) => {
            clauses.push(ctx.Eq(mw.x, channel.encoding.waypoints[i].x))
            clauses.push(ctx.Eq(mw.y, channel.encoding.waypoints[i].y))
        })
    }

    if (mandatoryWaypoints !== undefined) {
        /* Waypoints appear */
        clauses.push(...[...Array(mandatoryWaypoints.length).keys()].map(w => ctx.Or(
            ...[...Array(channel.encoding.waypoints.length).keys()].map(i =>
                ctx.And(
                    ctx.Eq(channel.encoding.waypoints[i].x, mandatoryWaypoints[w].x),
                    ctx.Eq(channel.encoding.waypoints[i].y, mandatoryWaypoints[w].y)
                )
            )
        )))

        /* Waypoints forward order */
        if (mandatoryWaypoints.length > 1) {
            clauses.push(...[...Array(mandatoryWaypoints.length).keys()].slice(0, -1).flatMap(w =>
                [...Array(channel.encoding.waypoints.length).keys()].slice(0, -1).map(ia => ctx.Implies(
                    ctx.And(
                        ctx.Eq(channel.encoding.waypoints[ia].x, mandatoryWaypoints[w].x),
                        ctx.Eq(channel.encoding.waypoints[ia].y, mandatoryWaypoints[w].y)
                    ),
                    ctx.Or(
                        ...[...Array(channel.encoding.waypoints.length).keys()].slice(ia + 1).map(ib => ctx.And(
                            ctx.Eq(channel.encoding.waypoints[ib].x, mandatoryWaypoints[w + 1].x),
                            ctx.Eq(channel.encoding.waypoints[ib].y, mandatoryWaypoints[w + 1].y)
                        ))
                    )
                ))
            ))
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
    }

    return clauses
}