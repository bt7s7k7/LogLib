import { DIService } from "../dependencyInjection/DIService"
import { ColorName, DescriptionFormatter } from "../prettyPrint/DescriptionFormatter"
import { ObjectDescription } from "../prettyPrint/ObjectDescription"
import { LogLevel, LogLevelName } from "./LogLevel"

export interface LogPrefix {
    label: string
    color: ColorName
}

export interface LogMessage {
    origin: LogPrefix[]
    level: LogLevelName
    prefix: LogPrefix[]
    content: (ObjectDescription | string)[]
}

interface LogFunctionTarget {
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

        target.sendMessage({ level, content, prefix: [], origin: [] })
    }
}

type LogFunction = ReturnType<typeof makeLogFunction>

export class Logger extends DIService.define<LogFunctionTarget & {
    [P in LogLevelName]: LogFunction
}>() {
    public prefix(prefix: LogPrefix) {
        return this.context.instantiate(() => new ChildLogger(this, prefix))
    }

    constructor() {
        super()

        for (const key of Object.keys(LogLevel) as (keyof typeof LogLevel)[]) {
            this[key] = makeLogFunction(key, this)
        }
    }

    public static formatMessage(message: LogMessage, options: DescriptionFormatter.FormatOptions) {
        const level = LogLevel[message.level]

        let output = ""

        for (const { color, label } of message.origin) {
            output += "["
            output += options.color(label, { custom: false, name: color })
            output += "]"
        }

        output += "["
        output += options.color(level.label, { custom: false, name: level.color })
        output += "]"

        for (const { color, label } of message.prefix) {
            output += "["
            output += options.color(label, { custom: false, name: color })
            output += "]"
        }

        output += " "

        for (const value of message.content) {
            if (typeof value == "string") {
                output += value
            } else {
                output += DescriptionFormatter.formatDescription(value.desc, options)
            }
        }

        return output
    }

}

class ChildLogger extends Logger {
    public sendMessage(message: LogMessage) {
        if (message.origin.length > 0) this.parent.sendMessage(message)
        else this.parent.sendMessage({ ...message, prefix: [this.customPrefix, ...message.prefix] })
    }

    constructor(
        public readonly parent: Logger,
        public readonly customPrefix: LogPrefix
    ) { super() }
}
