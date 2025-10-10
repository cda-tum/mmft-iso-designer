import {Context} from "z3-solver"
import {EncodedChannel} from "../components/channel"
import {Constraint, UniqueConstraint} from "../processing/constraint";

export function encodeChannelWaypointConstraints(ctx: Context, channel: EncodedChannel): Constraint[] {
    const clauses: Constraint[] = []
    const mandatoryWaypoints = channel.mandatoryWaypoints


    // If mandatory waypoints list matches available waypoints length, all waypoints are predetermined
    let label = "channel-waypoint-constraints-all-predetermined-id"
    if (mandatoryWaypoints !== undefined && mandatoryWaypoints.length === channel.encoding.waypoints.length) {
        mandatoryWaypoints.forEach((mw, i) => {
            clauses.push(
                {
                    expr: ctx.Eq(mw.x, channel.encoding.waypoints[i].x),
                    label: label + channel.id + "waypoint-" + i + "x-coord"
                }
            )
            clauses.push(
                {
                    expr: ctx.Eq(mw.y, channel.encoding.waypoints[i].y),
                    label: label + channel.id + "waypoint-" + i + "y-coord"
                }
            )
        })
    }

    if (mandatoryWaypoints !== undefined) {
        /* Waypoints appear */
        label = "channel-waypoint-constraints-some-predetermined-id"
        clauses.push(
            {
                expr:
                    ctx.And(...[...Array(mandatoryWaypoints.length).keys()].map(w => ctx.Or(
                        ...[...Array(channel.encoding.waypoints.length).keys()].map(i =>
                            ctx.And(
                                ctx.Eq(channel.encoding.waypoints[i].x, mandatoryWaypoints[w].x),
                                ctx.Eq(channel.encoding.waypoints[i].y, mandatoryWaypoints[w].y)
                            )
                        )
                    ))),
                label: label + channel.id + UniqueConstraint.generateRandomString(5)
            }
        )

        /* Waypoints forward order */
        label = "channel-waypoint-constraints-forward-order-id"
        if (mandatoryWaypoints.length > 1) {
            clauses.push(
                {
                    expr: ctx.And(
                        ...[...Array(mandatoryWaypoints.length).keys()].slice(0, -1).flatMap(w =>
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
                        )
                    ),
                    label: label + channel.id + UniqueConstraint.generateRandomString(5)
                }
            )
        }

        /* Waypoints backward order */
        // TODO: Bug to fix: exclude multiple inactive waypoints */
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