import {Box, Typography} from "@mui/joy"
import {useEffect, useState} from "react"

export enum StatusType {
    Idle,
    Error,
    Computing,
    Result
}

type IdleStatus = {
    status: StatusType.Idle
}

type ErrorStatus = {
    status: StatusType.Error
    message?: string
}

type ComputingStatus = {
    status: StatusType.Computing
    startTime: DOMHighResTimeStamp
    filename?: string
}

type ResultStatus = {
    status: StatusType.Result
    timing: DOMHighResTimeStamp
    success: boolean
    filename?: string
    unsatCores?: string[]
}

export type StatusProps = IdleStatus | ErrorStatus | ComputingStatus | ResultStatus

export function Status(props: StatusProps) {

    const [timer, setTimer] = useState<NodeJS.Timer | undefined>(undefined)
    const [elapsedTime, setElapsedTime] = useState(0)

    useEffect(() => {
        if (props.status === StatusType.Computing) {
            const interval = setInterval(() => {
                setElapsedTime(Math.floor((performance.now() - props.startTime) / 1000))
            }, 1000)
            setTimer(interval)
        } else {
            clearInterval(timer)
            setTimer(undefined)
            setElapsedTime(0)
        }
    }, [props.status])

    return (
        <Box>
            {
                props.status === StatusType.Idle &&
                <Typography>Ready. Waiting for input file.</Typography>
            }
            {
                props.status === StatusType.Error &&
                <Typography color="warning">Something went
                    wrong{props.message === undefined && '.'}{props.message !== undefined && `:${props.message}`}</Typography>
            }
            {
                props.status === StatusType.Computing &&
                <Typography>Computing design for file <span className="filename">{props.filename}</span>. <br/> Time
                    elapsed: {elapsedTime} s</Typography>
            }
            {
                props.status === StatusType.Result && (
                    <>
                        <Typography>
                            Computation for file <span className="filename">{props.filename}</span> terminated.
                            <br />
                            Result: {props.success ? (
                            <Typography color="success">ISO-compliant</Typography>
                        ) : (
                            <Typography color="danger">Not ISO-compliant</Typography>
                        )}
                            <br />
                            Total runtime: {props.timing / 1000} s
                        </Typography>
                        {!props.success && (
                            <>
                                <br />
                                <Typography color="danger">Unsatisfiable Constraints:</Typography>
                                <br />
                                {props.unsatCores?.length === 1 ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', paddingX: '5%' }}>
                                        <Typography style={{ textAlign: 'center' }}>
                                            {props.unsatCores[0]}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', paddingX: '5%' }}>
                                        <Box sx={{ flex: 1, paddingRight: 2, paddingLeft: '5%' }}>
                                            {props.unsatCores?.slice(0, Math.ceil(props.unsatCores.length / 2)).map((core, index) => (
                                                <Typography key={`left-${index}`} style={{ textAlign: 'left' }}>
                                                    {core}
                                                </Typography>
                                            ))}
                                        </Box>
                                        <Box sx={{ flex: 1, paddingLeft: 2, paddingRight: '5%' }}>
                                            {props.unsatCores?.slice(Math.ceil(props.unsatCores.length / 2)).map((core, index) => (
                                                <Typography key={`right-${index}`} style={{ textAlign: 'left' }}>
                                                    {core}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </>
                        )}
                    </>
                )
            }
        </Box>
    )
}