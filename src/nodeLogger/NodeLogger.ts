import { DescriptionFormatter } from "../logger/DescriptionFormatter"
import { Logger, LogMessage } from "../logger/Logger"
import { LogLevel } from "../logger/LogLevel"
import { ConsoleColorUtils } from "./ConsoleColorUtils"
const inspector = require("inspector")

export class NodeLogger extends Logger {
    public write: (message: string, type: "stdout" | "stderr") => void = (message, type) => {
        process[type].write(message)
    }

    public sendMessage(message: LogMessage) {
        const level = LogLevel[message.level]
        inspector.console[level.role](...message.content.map(value =>
            typeof value == "string" ? value.trim()
                : typeof value.target == "string"
                    ? [value.target]
                    : value.target
        ))

        let output = ""

        for (const { color, label } of message.origin) {
            output += "["
            output += ConsoleColorUtils.addStyle(label, color)
            output += "]"
        }

        output += "["
        output += ConsoleColorUtils.addStyle(level.label, level.color)
        output += "]"

        for (const { color, label } of message.prefix) {
            output += "["
            output += ConsoleColorUtils.addStyle(label, color)
            output += "]"
        }

        output += " "

        for (const value of message.content) {
            if (typeof value == "string") {
                output += value
            } else {
                output += DescriptionFormatter.formatDescription(value.desc, { color: ConsoleColorUtils.addStyle })
            }
        }

        output += "\n"
        this.write(output, level.role == "log" ? "stdout" : "stderr")
    }
}
