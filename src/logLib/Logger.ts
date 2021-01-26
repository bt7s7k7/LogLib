import { relative } from "path"
import { inspect, InspectOptions } from "util"

export namespace Logger {
    export interface Level {
        label: string
        target: (message: string) => void
        importance: number
        trace: boolean
    }

    export const LEVELS = {
        info: {
            label: addStyle("INFO", inspect.colors.cyanBright!),
            target: console.log,
            importance: 2,
            trace: false
        },
        warn: {
            label: addStyle("WARN", inspect.colors.yellowBright!),
            target: console.warn,
            importance: 3,
            trace: true
        },
        error: {
            label: addStyle("ERR!", inspect.colors.redBright!),
            target: console.error,
            importance: 4,
            trace: true
        },
        conn: {
            label: addStyle("CONN", inspect.colors.green!),
            target: console.log,
            importance: 1,
            trace: false
        },
        debug: {
            label: addStyle("@DEB", inspect.colors.magentaBright!),
            target: console.log,
            importance: 0,
            trace: true
        }
    }

    export let inspectConfig: InspectOptions = {
        colors: true
    }

    export function formatLogTemplate(strings: TemplateStringsArray, ...values: any[]) {
        const output: string[] = []
        for (let i = 0, len = strings.length, end = values.length; i < len; i++) {
            output.push(strings[i])
            if (i != end) {
                output.push(inspect(values[i], inspectConfig))
            }
        }

        return output.join("")
    }

    export function addStyle(text: string, color: [number, number]) {
        return `\u001b[${color[0]}m${text}\u001b[${color[1]}m`
    }

    export let level: (typeof LEVELS)[keyof typeof LEVELS] = LEVELS.conn

    export function createLogFunction(levelToUse: Level) {
        return (...args: Parameters<typeof formatLogTemplate>) => {
            if (levelToUse.importance < level.importance) return

            const formatted = formatLogTemplate(...args)

            const output = formatted ? `[${levelToUse.label}] ${formatted} ${levelToUse.trace ? addStyle(addStyle(trace(), inspect.colors.grey!), inspect.colors.dim!) : ""}` : ""

            levelToUse.target(output)
        }
    }

    export function trace(offset = 3) {
        const error = new Error()
        const frames = error.stack!.split("\n")
        const frame = frames[offset]
        const path = frame.slice(frame.indexOf("(") + 1, frame.length - 1)
        return relative(process.cwd(), path)
    }

    export const info = createLogFunction(LEVELS.info)
    export const log = info
    export const warn = createLogFunction(LEVELS.warn)
    export const error = createLogFunction(LEVELS.error)
    export const conn = createLogFunction(LEVELS.conn)
    export const debug = createLogFunction(LEVELS.debug)

    export function replaceLine() {
        console.log(`\u001b[1A\u001b[2K\u001b[1A`)
    }
}