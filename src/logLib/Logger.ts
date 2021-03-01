import { relative } from "path"
import { inspect, InspectOptions } from "util"

export namespace Logger {
    export interface Level {
        label: string
        target: (message: string) => void
        importance: number
    }

    export const LEVELS = {
        info: {
            label: addStyle("INFO", inspect.colors.cyanBright!),
            // eslint-disable-next-line no-console
            target: console.log,
            importance: 2,
        },
        warn: {
            label: addStyle("WARN", inspect.colors.yellowBright!),
            // eslint-disable-next-line no-console
            target: console.warn,
            importance: 3,
        },
        error: {
            label: addStyle("ERR!", inspect.colors.redBright!),
            // eslint-disable-next-line no-console
            target: console.error,
            importance: 4,
        },
        conn: {
            label: addStyle("CONN", inspect.colors.green!),
            // eslint-disable-next-line no-console
            target: console.log,
            importance: 1,
        },
        debug: {
            label: addStyle("@DEB", inspect.colors.magentaBright!),
            // eslint-disable-next-line no-console
            target: console.log,
            importance: 0,
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

            const output = formatted ? `[${levelToUse.label}] ${formatted}` : ""

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
        // eslint-disable-next-line no-console
        console.log(`\u001b[1A\u001b[2K\u001b[1A`)
    }
}