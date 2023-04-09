import { LogMessage } from "./Logger"
import { LogLevel } from "./LogLevel"
import { ObjectDescription, RawSegment } from "./ObjectDescription"

interface Options {
    color: (text: string, color: RawSegment["color"]) => string
    lineLimit?: number
    colorMap?: Record<DescriptionFormatter.ColorType, RawSegment["color"]>
}

export namespace DescriptionFormatter {
    export const DEFAULT_COLOR_MAP: Record<ColorType, RawSegment["color"]> = {
        string: { custom: false, name: "green" },
        primitive: { custom: false, name: "yellow" },
        function: { custom: false, name: "cyan" },
        symbol: { custom: false, name: "green" },
        circular: { custom: false, name: "blue" },
        date: { custom: false, name: "magenta" },
        regexp: { custom: false, name: "red" },
        shallow: { custom: false, name: "white" },
        other: { custom: false, name: "gray" }
    }

    export const DEFAULT_COLOR_CODES = {
        black: "#000000",
        blue: "#2472c8",
        brightBlack: "#666666",
        brightBlue: "#3b8eea",
        brightCyan: "#29b8db",
        brightGreen: "#23d18b",
        brightMagenta: "#d670d6",
        brightRed: "#f14c4c",
        brightWhite: "#ffffff",
        brightYellow: "#f5f543",
        cyan: "#11a8cd",
        green: "#0dbc79",
        magenta: "#bc3fbc",
        red: "#cd3131",
        white: "#e5e5e5",
        yellow: "#e5e510",
        grey: "#aaaaaa",
        gray: "#aaaaaa"
    }

    export type ColorType =
        | "string"
        | "primitive"
        | "function"
        | "symbol"
        | "circular"
        | "date"
        | "regexp"
        | "shallow"
        | "other"

    export function formatDescription(root: ObjectDescription.AnyDescription, { color, lineLimit = 50, colorMap = DEFAULT_COLOR_MAP }: Options) {
        const visit = (target: ObjectDescription.AnyDescription, indent: number): { result: string, multiline: boolean } => {
            if (target.type == "primitive") {
                const subtype = typeof target.value
                if (subtype == "string") return {
                    result: color(JSON.stringify(target.value), colorMap.string),
                    multiline: false
                }

                if (subtype == "number" || subtype == "boolean") return {
                    result: color(target.value.toString(), colorMap.primitive),
                    multiline: false
                }
            } else if (target.type == "bigint") {
                return {
                    result: color(target.value.toString() + "n", colorMap.primitive),
                    multiline: false
                }
            } else if (target.type == "function") {
                return {
                    result: color(`[${target.subtype} ${target.name}]`, colorMap.function),
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
                        result: prefix + "\n" + items.map(v => "  ".repeat(indent + 1) + v.result).join("\n") + "\n" + "  ".repeat(indent) + "]",
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
                        result: prefix + "\n" + items.map(v => "  ".repeat(indent + 1) + `${v.key.result}: ${v.value.result}`).join("\n") + "\n" + "  ".repeat(indent) + "}",
                        multiline: true
                    }
                }
            } else if (target.type == "symbol") {
                return {
                    result: color(target.name, colorMap.symbol),
                    multiline: false
                }
            } else if (target.type == "circular") {
                return {
                    result: color(`[circular]`, colorMap.circular),
                    multiline: false
                }
            } else if (target.type == "date") {
                return {
                    result: color(target.date, colorMap.date),
                    multiline: false
                }
            } else if (target.type == "regexp") {
                return {
                    result: color(target.source, colorMap.regexp),
                    multiline: false
                }
            } else if (target.type == "shallow") {
                return {
                    result: color(target.name, colorMap.shallow),
                    multiline: false
                }
            } else if (target.type == "raw") {
                const result = target.segments.map(v => color(v.text, v.color)).join("")
                return {
                    result, multiline: result.includes("\n")
                }
            }

            return { result: color(target.type, colorMap.other), multiline: false }
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

    export function formatMessage(message: LogMessage, options: Options) {
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
                output += formatDescription(value.desc, options)
            }
        }

        return output
    }
}
