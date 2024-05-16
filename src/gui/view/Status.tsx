import { Box, Typography } from "@mui/joy"
import { useEffect, useState } from "react"

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
}

type ResultStatus = {
    status: StatusType.Result
    timing: DOMHighResTimeStamp
    success: boolean
}

export type StatusProps = IdleStatus | ErrorStatus | ComputingStatus | ResultStatus

export function Status(props: StatusProps) {

    const [timer, setTimer] = useState<NodeJS.Timer | undefined>(undefined)
    const [elapsedTime, setElapsedTime] = useState(0)

    useEffect(() => {
        if(props.status === StatusType.Computing) {
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
                <Typography color="warning">An error has occurred{ props.message === undefined && '.' }{ props.message !== undefined && `:${props.message}` }</Typography>
            }
            {
                props.status === StatusType.Computing &&
                <Typography>Computing. Time elapsed: { elapsedTime } s</Typography>
            }
            {
                props.status === StatusType.Result &&
                <Typography>Computation terminated. Result: {props.success && <Typography color="success">SATISFIABLE</Typography>} {!props.success && <Typography color="danger">UNSATISFIABLE</Typography>}. Total runtime: {props.timing / 1000} s</Typography>
            }
        </Box>
    )
}