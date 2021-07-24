export type LogColor = "blue"
    | "cyan"
    | "yellow"
    | "red"
    | "green"
    | "magenta"
    | "white"
    | "gray"
    | "black"

export interface LogLevel {
    label: string
    color: LogColor
    importance: number
    role: "warn" | "error" | "log"
}

export namespace LogLevel {
    export const debug: LogLevel = {
        color: "magenta",
        importance: 0,
        label: "@DBG",
        role: "log"
    }

    export const conn: LogLevel = {
        color: "green",
        importance: 1,
        label: "CONN",
        role: "log"
    }

    export const info: LogLevel = {
        color: "cyan",
        importance: 3,
        label: "INFO",
        role: "log"
    }

    export const warn: LogLevel = {
        color: "yellow",
        importance: 4,
        label: "WARN",
        role: "warn"
    }

    export const error: LogLevel = {
        color: "red",
        importance: 4,
        label: "ERR!",
        role: "error"
    }

    export const crit: LogLevel = {
        color: "red",
        importance: 5,
        label: "crit",
        role: "error"
    }
}

export type LogLevelName = keyof typeof LogLevel
