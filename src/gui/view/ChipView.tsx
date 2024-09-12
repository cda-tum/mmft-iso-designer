import { ResultChannel } from "../../da/channel"
import { Output } from "../../da/inputOutput"
import { ResultModule } from "../../da/module"
import { Orientation } from "../../da/orientation"
import { StaticRoutingExclusion } from "../../da/routingExclusion"
import { renderToString } from "react-dom/server"

function randomColor() {
    return '#' + [...Array(3).keys()].map(_ => Math.floor(Math.random() * 7 + 2)).join('')
}

export function svgAsString(chip: Output) {
    return renderToString(<ChipView chip={chip} />)
}

export function ChipView(props: { chip: Output | undefined }) {
    const boundaryStrokeWidth = 500
    const boundaryOffset = boundaryStrokeWidth / 2
    const boundaryColor = '#27f'
    return (
        <svg xmlns="http://www.w3.org/2000/svg" version="1.2" width="100%" height="800" style={{ backgroundColor: '#fff' }}>
            <g transform="scale(0.005 -0.005) translate(20000 -100000)">
                {props.chip &&
                    <rect x={-boundaryOffset} y={-boundaryOffset} width={props.chip.chip.width + boundaryStrokeWidth} height={props.chip.chip.height + boundaryStrokeWidth} fill='none' strokeWidth={boundaryStrokeWidth} stroke={boundaryColor}></rect>
                }

                {props.chip &&
                    props.chip.modules.map((b, i) => <ModuleInstance module={b} ports={props.chip?.channels.flatMap(c => {
                        const ports = []
                        if(c.from.module === i) {
                            ports.push(c.from.port)
                        }
                        if(c.to.module === i) {
                            ports.push(c.to.port)
                        }
                        return ports
                    })}></ModuleInstance>)
                }

                {props.chip &&
                    props.chip.channels.map((c, i) => <Channel channel={c}></Channel>)
                }

                {props.chip &&
                    props.chip.routingExclusions.map((e, i) => <RoutingExclusion exclusion={e}></RoutingExclusion>)
                }
            </g>
        </svg>
    )
}

function ModuleInstance(props: { module: ResultModule, ports?: [number, number][], color?: string }) {
    const strokeWidth = 500
    const strokeOffset = strokeWidth / 2
    const strokeColor = '#59f'

    const strokeDashArray = "300, 300";
    const strokeDashColor = "#87b7ff"

    const portRadius = props.module.pitch / 4
    const portStrokeWidth = portRadius / 4
    const portStrokeOffset = portStrokeWidth / 2
    const portStrokeColor = '#59f'

    const [width, height] = (props.module.results.orientation === Orientation.Up || props.module.results.orientation === Orientation.Down) ? [props.module.width, props.module.height] : [props.module.height, props.module.width]
    const ports = [...(props.ports ?? [])]

    if (props.module.placement == 0 || props.module.placement == undefined) {
        return (
            <g>
                <rect x={props.module.results.positionX + strokeOffset} y={props.module.results.positionY + strokeOffset} width={width - strokeWidth} height={height - strokeWidth} fill='none' stroke={strokeColor} strokeWidth={strokeWidth} />
                {
                    ports.map(port => {
                        const { x: cx, y: cy} = props.module.resultPortPosition(port[0], port[1])
                        return (
                            <circle cx={cx} cy={cy} r={portRadius - portStrokeOffset} stroke={portStrokeColor} strokeWidth={portStrokeWidth} fill='none'></circle>
                        )
                    })
                }
            </g>
        )
    } else {
        return (
            <g>
                <rect x={props.module.results.positionX + strokeOffset} y={props.module.results.positionY + strokeOffset} width={width - strokeWidth} height={height - strokeWidth} fill='none' stroke={strokeDashColor} strokeWidth={strokeWidth} strokeDasharray={strokeDashArray}/>
                {
                    ports.map(port => {
                        const { x: cx, y: cy} = props.module.resultPortPosition(port[0], port[1])
                        return (
                            <circle cx={cx} cy={cy} r={portRadius - portStrokeOffset} stroke={portStrokeColor} strokeWidth={portStrokeWidth} fill='none'></circle>
                        )
                    })
                }
            </g>
        )
    }

}

function Channel(props: { channel: ResultChannel, color?: string }) {
    const color = props.color ?? randomColor()
    //const color = '#000'
    const points = [...props.channel.results.waypoints]
    const d = points.map((p, i) => {
        if (i === 0) {
            return `M ${p.x} ${p.y}`
        } else {
            return `L ${p.x} ${p.y}`
        }
    }).join(' ')
    return (
        <g>
            <path d={d} strokeWidth={props.channel.width} stroke={color} fill="none" strokeLinecap="square"/>
        </g>
    )
}

function RoutingExclusion(props: { exclusion: StaticRoutingExclusion, strokeWidth?: number, color?: string }) {
    const color = props.color ?? '#b00'
    const strokeWidth = props.strokeWidth ?? 300
    const offset = strokeWidth / 2
    return (
        <g>
            <rect x={props.exclusion.position.x + offset} y={props.exclusion.position.y + offset} width={props.exclusion.width - strokeWidth} height={props.exclusion.height - strokeWidth} fill='none' stroke={color} strokeWidth={strokeWidth} strokeDasharray={2*strokeWidth} />
        </g>
    )
}