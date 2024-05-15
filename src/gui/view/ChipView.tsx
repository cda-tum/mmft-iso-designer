import { ResultBuildingBlockInstance } from "../../da/building_block"
import { ResultChannelInstance } from "../../da/channel"
import { Output } from "../../da/input_output"
import { Rotation } from "../../da/rotation"
import { StaticRoutingExclusion } from "../../da/routing-exclusion"

export { ChipView }

function randomColor() {
    const letters = '0123456789abcdef'
    return '#' + [...Array(3).keys()].map(_ => Math.floor(Math.random() * 7 + 2)).join('')
}

function ChipView(props: { chip: Output | undefined }) {
    const boundaryStrokeWidth = 500
    const boundaryOffset = boundaryStrokeWidth / 2
    const boundaryColor = '#27f'
    return (
        <svg xmlns="http://www.w3.org/2000/svg" version="1.2" width="100%" height="800" style={{ backgroundColor: 'fff' }}>
            <g transform="scale(0.005 -0.005) translate(20000 -100000)">
                {props.chip &&
                    <rect x={-boundaryOffset} y={-boundaryOffset} width={props.chip.chip.width + boundaryStrokeWidth} height={props.chip.chip.height + boundaryStrokeWidth} fill='none' strokeWidth={boundaryStrokeWidth} stroke={boundaryColor}></rect>
                }

                {props.chip &&
                    props.chip.building_blocks.map((b, i) => <BuildingBlockInstance block={b} ports={props.chip?.channels.flatMap(c => {
                        const ports = []
                        if(c.from.building_block == i) {
                            ports.push(c.from.port)
                        }
                        if(c.to.building_block == i) {
                            ports.push(c.to.port)
                        }
                        return ports
                    })}></BuildingBlockInstance>)
                }

                {props.chip &&
                    props.chip.channels.map((c, i) => <Channel channel={c}></Channel>)
                }

                {props.chip &&
                    props.chip.routing_exclusions.map((e, i) => <RoutingExclusion exclusion={e}></RoutingExclusion>)
                }
            </g>
        </svg>
    )
}

function BuildingBlockInstance(props: { block: ResultBuildingBlockInstance, ports?: [number, number][], color?: string }) {
    const strokeWidth = 500
    const strokeOffset = strokeWidth / 2
    const strokeColor = '#59f'

    const portRadius = props.block.pitch / 4
    const portStrokeWidth = portRadius / 4
    const portStrokeOffset = portStrokeWidth / 2
    const portStrokeColor = '#59f'

    const [width, height] = (props.block.results.rotation === Rotation.Up || props.block.results.rotation === Rotation.Down) ? [props.block.width, props.block.height] : [props.block.height, props.block.width]
    const ports = [...props.block.active_ports ?? [], ...(props.ports ?? [])]

    return (
        <g>
            <rect x={props.block.results.position_x + strokeOffset} y={props.block.results.position_y + strokeOffset} width={width - strokeWidth} height={height - strokeWidth} fill='none' stroke={strokeColor} strokeWidth={strokeWidth} />
            {
                ports.map(port => {
                    const { x: cx, y: cy} = props.block.result_port_position(port[0], port[1])
                    return (
                        <circle cx={cx} cy={cy} r={portRadius - portStrokeOffset} stroke={portStrokeColor} strokeWidth={portStrokeWidth} fill='none'></circle>
                    )
                })
            }
        </g>
    )
}

function Channel(props: { channel: ResultChannelInstance, color?: string }) {
    const color = props.color ?? randomColor()
    //const color = '#000'
    const points = [...props.channel.results.waypoints]
    const d = points.map((p, i) => {
        if (i === 0) {
            return `M ${p.x} ${p.y}`
        } else {
            return `L ${p.x} ${p.y}`
        }
    }).join(',')
    return (
        <g>
            <path d={d} strokeWidth={props.channel.width} stroke={color} fill="none" strokeLinecap="square"></path>
        </g>
    )
}

function RoutingExclusion(props: { exclusion: StaticRoutingExclusion, strokeWidth?: number, color?: string }) {
    const color = props.color ?? '#b00'
    const strokeWidth = props.strokeWidth ?? 300
    const offset = strokeWidth / 2
    return (
        <g>
            <rect x={props.exclusion.position_x + offset} y={props.exclusion.position_y + offset} width={props.exclusion.width - strokeWidth} height={props.exclusion.height - strokeWidth} fill='none' stroke={color} strokeWidth={strokeWidth} strokeDasharray={2*strokeWidth} />
        </g>
    )
}