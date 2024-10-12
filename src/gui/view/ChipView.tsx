import {ResultChannel} from "../../da/channel"
import {Output} from "../../da/inputOutput"
import {ResultModule} from "../../da/module"
import {Orientation} from "../../da/orientation"
import {StaticRoutingExclusion} from "../../da/routingExclusion"
import {renderToString} from "react-dom/server"
import {Placement} from "../../da/placement";

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
                            ports.push({
                                port: c.from.port,
                                placement: b.placement
                            })
                        }
                        if(c.to.module === i) {
                            ports.push({
                                port: c.to.port,
                                placement: b.placement
                            })
                        }
                        return ports
                    })}></ModuleInstance>)
                }

                // TODO: replace spacing with specific clamp spacing
                {props.chip &&
                    props.chip.modules.map((b, i) => <ClampInstance module={b} placement={b.placement} spacing={1000}></ClampInstance>)
                }

                {props.chip &&
                    props.chip.modules.map((b, i) => b.position && <PinInstance module={b} ></PinInstance>)
                }

                {props.chip &&
                    props.chip.channels.map((c, i) => {
                        if (props.chip) {
                            const fromModule = props.chip.modules[c.from.module];
                            const toModule = props.chip.modules[c.to.module];

                            if (fromModule.placement === toModule.placement && fromModule.placement === Placement.Bottom) {
                                return (
                                    <Channel channel={c} placement={Placement.Bottom} ></Channel>
                                );
                            } else {
                                return (
                                    <Channel channel={c} placement={Placement.Top} ></Channel>
                                );
                            }
                        }
                    })
                }

                {props.chip &&
                    props.chip.routingExclusions.map((e, i) => <RoutingExclusion exclusion={e}></RoutingExclusion>)
                }
            </g>
        </svg>
    )
}

function ModuleInstance(props: { module: ResultModule, ports?: { port: [number, number], placement: Placement | undefined }[], color?: string }) {
    const strokeWidth = 500
    const strokeOffset = strokeWidth / 2
    const strokeColor = '#59f'

    const strokeDashArray = "400, 200";
    const bottomPortDashArray = "150, 120";
    const strokeDashColor = "#87b7ff"

    const portRadius = props.module.pitch / 4
    const portStrokeWidth = portRadius / 4
    const portStrokeOffset = portStrokeWidth / 2
    const portStrokeColor = '#59f'

    const [width, height] = (props.module.results.orientation === Orientation.Up || props.module.results.orientation === Orientation.Down) ? [props.module.width, props.module.height] : [props.module.height, props.module.width]
    const ports = [...(props.ports ?? [])]

    if (props.module.placement === 0 || props.module.placement === undefined) {
        return (
            <g>
                <rect x={props.module.results.positionX + strokeOffset} y={props.module.results.positionY + strokeOffset} width={width - strokeWidth} height={height - strokeWidth} fill='none' stroke={strokeColor} strokeWidth={strokeWidth} />
                {
                    ports.map(port => {
                        const { x: cx, y: cy} = props.module.resultPortPosition(port.port[0], port.port[1])
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
                        const { x: cx, y: cy} = props.module.resultPortPosition(port.port[0], port.port[1])
                        return (
                            <circle cx={cx} cy={cy} r={portRadius - portStrokeOffset} stroke={strokeDashColor} strokeWidth={portStrokeWidth} strokeDasharray={bottomPortDashArray} fill='none'></circle>
                        )
                    })
                }
            </g>
        )
    }
}

function Channel(props: { channel: ResultChannel, color?: string, placement?: Placement | undefined }) {
    const color = props.color ?? randomColor()
    //const color = '#000'
    const points = [...props.channel.results.waypoints]
    const placement = props.placement ?? undefined
    const strokeDashArray = "300, 600";

    const d = points.map((p, i) => {
        if (i === 0) {
            return `M ${p.x} ${p.y}`
        } else {
            return `L ${p.x} ${p.y}`
        }
    }).join(' ')

    if (placement === Placement.Bottom) {
        return (
            <g>
                <path d={d} strokeWidth={props.channel.width} stroke={color} strokeDasharray={strokeDashArray} fill="none" strokeLinecap="round"/>
            </g>
        )
    } else {
        return (
            <g>
                <path d={d} strokeWidth={props.channel.width} stroke={color} fill="none" strokeLinecap="round"/>
            </g>
        )
    }
}

function PinInstance(props: { module: ResultModule, color?: string }) {
    const color = props.color ?? '#87b7ff'
    const pinRadius = 1000
    const pinSpacing = pinRadius / 2
    const pinStrokeWidth = pinRadius / 2

    const leftX = props.module.results.positionX - pinSpacing
    const rightX = props.module.results.positionX + props.module.width + pinSpacing
    const topY = props.module.results.positionY + props.module.height + pinSpacing
    const bottomY = props.module.results.positionY - pinSpacing

    return (
        <g>
            <circle cx={leftX} cy={bottomY} r={pinRadius} stroke={color} strokeWidth={pinStrokeWidth} fill='none'></circle>
            <circle cx={leftX} cy={topY} r={pinRadius} stroke={color} strokeWidth={pinStrokeWidth} fill='none'></circle>
            <circle cx={rightX} cy={bottomY} r={pinRadius} stroke={color} strokeWidth={pinStrokeWidth} fill='none'></circle>
            <circle cx={rightX} cy={topY} r={pinRadius} stroke={color} strokeWidth={pinStrokeWidth} fill='none'></circle>
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

function ClampInstance(props: { module: ResultModule | undefined, placement: Placement | undefined, spacing: number, color?: string }) {
    const strokeWidth = 500
    const strokeOffset = strokeWidth / 2
    const strokeColor = '#afcfff'

    const strokeDashArray = "400, 200";
    const strokeDashColor = "#c6dfff"

    if (props.module) {
        const [width, height] = (props.module.results.orientation === Orientation.Up || props.module.results.orientation === Orientation.Down) ? [props.module.width, props.module.height] : [props.module.height, props.module.width]
        if (props.module.placement === 0 || props.module.placement === undefined) {

            return (
                <g>
                    <rect x={props.module.results.positionX + strokeOffset - props.spacing} y={props.module.results.positionY + strokeOffset - props.spacing} width={width - strokeWidth + 2 * props.spacing} height={height - strokeWidth + 2 * props.spacing} fill='none' stroke={strokeColor} strokeWidth={strokeWidth} />{}
                </g>
            )
        } else {
            return (
                <g>
                    <rect x={props.module.results.positionX + strokeOffset - props.spacing} y={props.module.results.positionY + strokeOffset - props.spacing} width={width - strokeWidth + 2 * props.spacing} height={height - strokeWidth + 2 * props.spacing} fill='none' stroke={strokeDashColor} strokeWidth={strokeWidth} strokeDasharray={strokeDashArray}/>{}
                </g>
            )
        }
    } else {
        return (
            <g>
            </g>
        )
    }
}