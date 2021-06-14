import { Logger, LogMessage } from "../logger/Logger"
import { LogLevel } from "../logger/LogLevel"
import { ObjectDescription } from "../logger/ObjectDescription"
import { ConsoleColorUtils } from "./ConsoleColorUtils"
const inspector = require("inspector")

const indentLookup = Array.from({ length: 16 }, (_, i) => " ".repeat(i * 2))
const lineLimit = 50

function writeDescription(desc: ObjectDescription) {
    const root = desc.desc

    const visit = (target: ObjectDescription.AnyDescription, indent: number): { result: string, multiline: boolean } => {
        if (target.type == "primitive") {
            const subtype = typeof target.value
            if (subtype == "string") return {
                result: ConsoleColorUtils.addStyle(JSON.stringify(target.value), "green"),
                multiline: false
            }

            if (subtype == "number" || subtype == "boolean") return {
                result: ConsoleColorUtils.addStyle(JSON.stringify(target.value), "yellow"),
                multiline: false
            }
        } else if (target.type == "bigint") {
            return {
                result: ConsoleColorUtils.addStyle(target.value.toString() + "n", "yellow"),
                multiline: false
            }
        } else if (target.type == "function") {
            return {
                result: ConsoleColorUtils.addStyle(`[${target.subtype} ${target.name}]`, "cyan"),
                multiline: false
            }
        } else if (target.type == "list") {
            const items = target.elements.map(v => visit(v, indent + 1))

            let maxLength = 0

            for (const item of items) {
                if (item.multiline) {
                    maxLength = Infinity
                    break
                }

                if (item.result.length > maxLength) {
                    maxLength = item.result.length
                }
            }

            const prefix = target.name != "Array" ? `${target.name}(${items.length}) [` : "["

            if (maxLength * items.length < lineLimit) {
                return {
                    result: `${prefix}${items.length == 0 ? "" : " " + items.map(v => v.result).join(", ") + " "}]`,
                    multiline: false
                }
            } else {
                return {
                    result: prefix + "\n" + items.map(v => indentLookup[indent + 1] + v.result).join("\n") + "\n" + indentLookup[indent] + "]",
                    multiline: true
                }
            }
        } else if (target.type == "record") {
            const items = target.items.map(v => ({ key: visitKey(v.key, indent + 1), value: visit(v.value, indent + 1) }))

            let maxLength = 0

            for (const item of items) {
                if (item.key.multiline || item.value.multiline) {
                    maxLength = Infinity
                    break
                }

                const length = item.key.result.length + item.value.result.length
                if (length > maxLength) {
                    maxLength = length
                }

            }

            const prefix = target.name ? `${target.name} {` : "{"

            if (maxLength * items.length < lineLimit) {
                return {
                    result: `${prefix}${items.length == 0 ? "" : " " + items.map(v => `${v.key.result}: ${v.value.result}`).join(", ") + " "}}`,
                    multiline: false
                }
            } else {
                return {
                    result: prefix + "\n" + items.map(v => indentLookup[indent + 1] + `${v.key.result}: ${v.value.result}`).join("\n") + "\n" + indentLookup[indent] + "}",
                    multiline: true
                }
            }
        } else if (target.type == "symbol") {
            return {
                result: ConsoleColorUtils.addStyle(target.name, "green"),
                multiline: false
            }
        } else if (target.type == "circular") {
            return {
                result: ConsoleColorUtils.addStyle(`[circular]`, "blue"),
                multiline: false
            }
        } else if (target.type == "date") {
            return {
                result: ConsoleColorUtils.addStyle(target.date, "magenta"),
                multiline: false
            }
        } else if (target.type == "regexp") {
            return {
                result: ConsoleColorUtils.addStyle(target.source, "red"),
                multiline: false
            }
        } else if (target.type == "shallow") {
            return {
                result: ConsoleColorUtils.addStyle(target.name, "white"),
                multiline: false
            }
        }

        return { result: ConsoleColorUtils.addStyle(target.type, "gray"), multiline: false }
    }

    const visitKey = (target: ObjectDescription.AnyDescription, indent: number) => {
        if (target.type == "primitive" && typeof target.value == "string" && !target.value.match(/[^\w$]/g)) return {
            result: target.value,
            multiline: false
        }

        return visit(target, indent)
    }

    return visit(root, 0).result
}

export class NodeLogger extends Logger {
    public sendMessage(message: LogMessage) {
        const level = LogLevel[message.level]
        inspector.console[level.role](...message.content.map(value =>
            typeof value == "string" ? value.trim()
                : typeof value.target == "string"
                    ? [value.target]
                    : value.target
        ))

        const output = process[level.role == "log" ? "stdout" : "stderr"]

        output.write("[")
        output.write(ConsoleColorUtils.addStyle(level.label, level.color))
        output.write("] ")

        for (const value of message.content) {
            if (typeof value == "string") {
                output.write(value)
            } else {
                output.write(writeDescription(value))
            }
        }

        output.write("\n")
    }
}