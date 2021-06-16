import { DIService } from "../dependencyInjection/DIService"
import { LogColor, LogLevel, LogLevelName } from "./LogLevel"
import { ObjectDescription } from "./ObjectDescription"

export interface LogPrefix {
    label: string
    color: LogColor
}

export interface LogMessage {
    level: LogLevelName
    prefix: LogPrefix[]
    content: (ObjectDescription | string)[]
}

interface LogFunctionTarget {
    getPrefix(): LogPrefix[]
    sendMessage(message: LogMessage): void
}

function makeLogFunction(level: LogLevelName, target: LogFunctionTarget) {
    return function (strings: TemplateStringsArray, ...values: any[]) {
        const content: (ObjectDescription | string)[] = []
        for (let i = 0, len = strings.length, end = values.length; i < len; i++) {
            content.push(strings[i])
            if (i != end) {
                content.push(new ObjectDescription(values[i]))
            }
        }

        target.sendMessage({ level, content, prefix: target.getPrefix() })
    }
}

type LogFunction = ReturnType<typeof makeLogFunction>

export class Logger extends DIService.define<LogFunctionTarget & {
    [P in LogLevelName]: LogFunction
}>() {

    public getPrefix() {
        return [] as LogPrefix[]
    }

    public prefix(prefix: LogPrefix) {
        return new ChildLogger(this, prefix)
    }

    constructor() {
        super()

        for (const key of Object.keys(LogLevel) as (keyof typeof LogLevel)[]) {
            this[key] = makeLogFunction(key, this)
        }
    }
}

class ChildLogger extends Logger {
    public sendMessage(message: LogMessage) {
        this.parent.sendMessage({ ...message, prefix: [...this.parent.getPrefix(), this.customPrefix] })
    }

    constructor(
        public readonly parent: Logger,
        public readonly customPrefix: LogPrefix
    ) { super() }
}
