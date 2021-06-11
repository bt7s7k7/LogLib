import { DIService } from "../dependencyInjection/DIService"
import { LogLevel, LogLevelName } from "./LogLevel"
import { ObjectDescription } from "./ObjectDescription"

export interface LogMessage {
    level: LogLevelName,
    content: (ObjectDescription | string)[]
}

interface MessageTarget {
    sendMessage(message: LogMessage): void
}

function makeLogFunction(level: LogLevelName, target: MessageTarget) {
    return function (strings: TemplateStringsArray, ...values: any[]) {
        const content: (ObjectDescription | string)[] = []
        for (let i = 0, len = strings.length, end = values.length; i < len; i++) {
            content.push(strings[i])
            if (i != end) {
                content.push(new ObjectDescription(values[i]))
            }
        }

        target.sendMessage({ level, content })
    }
}

type LogFunction = ReturnType<typeof makeLogFunction>

export class Logger extends DIService.define<MessageTarget & {
    [P in LogLevelName]: LogFunction
}>() {

    constructor() {
        super()

        for (const key of Object.keys(LogLevel) as (keyof typeof LogLevel)[]) {
            this[key] = makeLogFunction(key, this)
        }
    }
}
