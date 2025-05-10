import { ObjectDescription } from "./ObjectDescription"

export type ColorName = "blue"
    | "cyan"
    | "yellow"
    | "red"
    | "green"
    | "magenta"
    | "white"
    | "gray"
    | "black"
    | "bold"

export type SegmentColor = { custom: false, name: ColorName } | { custom: true, code: string, ansiCode?: number }

export namespace DescriptionFormatter {
    export interface FormatOptions {
        color: (text: string, color: SegmentColor) => string
        lineLimit?: number
        colorMap?: Record<ColorType, SegmentColor>
    }

    export const DEFAULT_COLOR_MAP: Record<ColorType, SegmentColor> = {
        string: { custom: false, name: "green" },
        primitive: { custom: false, name: "yellow" },
        function: { custom: false, name: "cyan" },
        symbol: { custom: false, name: "green" },
        circular: { custom: false, name: "blue" },
        date: { custom: false, name: "magenta" },
        regexp: { custom: false, name: "red" },
        shallow: { custom: false, name: "white" },
        type: { custom: false, name: "bold" },
        other: { custom: false, name: "gray" },
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
        gray: "#aaaaaa",
    }

    export const LIGHT_COLOR_CODES = {
        black: "#000000",
        blue: "#1568c4",
        brightBlack: "#000000",
        brightBlue: "#1568c4",
        brightCyan: "#24b2d6",
        brightGreen: "#1f8236",
        brightMagenta: "#8f288f",
        brightRed: "#b30e0e",
        brightWhite: "#000000",
        brightYellow: "#cf4600",
        cyan: "#24b2d6",
        green: "#1f8236",
        magenta: "#8f288f",
        red: "#b30e0e",
        white: "#191919",
        yellow: "#cf4600",
        grey: "#555555",
        gray: "#555555",
    }

    export const ANSI_COLOR_CODES = {
        black: "30", /* ANSI black */
        blue: "94", /* ANSI bright blue */
        bold: "1", /* ANSI bold */
        cyan: "96", /* ANSI bright cyan */
        gray: "90", /* ANSI bright black */
        green: "92", /* ANSI bright green */
        magenta: "95", /* ANSI bright magenta */
        red: "91", /* ANSI bright red */
        white: "0", /* ANSI reset */
        yellow: "93", /* ANSI bright yellow */
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
        | "type"

    export function htmlColor(text: string, color: SegmentColor) {
        const escapeHTML = (source: string) => source
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")

        const style = color.custom == false && color.name == "bold" ? (
            `font-weight: bold`
        ) : color.custom ? (
            `color: ${color.code}`
        ) : (
            `color: ${LIGHT_COLOR_CODES[color.name as Exclude<ColorName, "bold">]}`
        )

        return `<span style="${style}">${escapeHTML(text)}</span>`
    }

    export function ansiColor(text: string, color: SegmentColor) {
        if (color.custom) {
            return text
        }

        if (color.name == "bold") {
            return `\u001b[1m${text}\u001b[0m`
        }

        return `\u001b[${ANSI_COLOR_CODES[color.name]}m${text}\u001b[0m`
    }

    export function formatDescription(root: ObjectDescription.AnyDescription, { color, lineLimit = 50, colorMap = DEFAULT_COLOR_MAP }: FormatOptions) {
        const visit = (target: ObjectDescription.AnyDescription, indent: number): { result: string, multiline: boolean } => {
            if (target.type == "primitive") {
                const subtype = typeof target.value
                if (subtype == "string") return {
                    result: color(JSON.stringify(target.value), colorMap.string),
                    multiline: false,
                }

                if (subtype == "number" || subtype == "boolean") return {
                    result: color(target.value.toString(), colorMap.primitive),
                    multiline: false,
                }
            } else if (target.type == "bigint") {
                return {
                    result: color(target.value.toString() + "n", colorMap.primitive),
                    multiline: false,
                }
            } else if (target.type == "function") {
                return {
                    result: color(`[${target.subtype} ${target.name}]`, colorMap.function),
                    multiline: false,
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

                const prefix = target.name != "Array" ? `${color(target.name ?? "null", colorMap.type)}(${items.length}) [` : "["

                if (maxLength * items.length < lineLimit) {
                    return {
                        result: `${prefix}${items.length == 0 ? "" : " " + items.map(v => v.result).join(", ") + " "}]`,
                        multiline: false,
                    }
                } else {
                    return {
                        result: prefix + "\n" + items.map(v => "  ".repeat(indent + 1) + v.result).join("\n") + "\n" + "  ".repeat(indent) + "]",
                        multiline: true,
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

                const prefix = target.name ? `${color(target.name, colorMap.type)} {` : "{"

                if (maxLength * items.length < lineLimit) {
                    return {
                        result: `${prefix}${items.length == 0 ? "" : " " + items.map(v => `${v.key.result}: ${v.value.result}`).join(", ") + " "}}`,
                        multiline: false,
                    }
                } else {
                    return {
                        result: prefix + "\n" + items.map(v => "  ".repeat(indent + 1) + `${v.key.result}: ${v.value.result}`).join("\n") + "\n" + "  ".repeat(indent) + "}",
                        multiline: true,
                    }
                }
            } else if (target.type == "symbol") {
                return {
                    result: color(target.name, colorMap.symbol),
                    multiline: false,
                }
            } else if (target.type == "circular") {
                return {
                    result: color(`[circular]`, colorMap.circular),
                    multiline: false,
                }
            } else if (target.type == "date") {
                return {
                    result: color(target.date, colorMap.date),
                    multiline: false,
                }
            } else if (target.type == "regexp") {
                return {
                    result: color(target.source, colorMap.regexp),
                    multiline: false,
                }
            } else if (target.type == "shallow") {
                return {
                    result: color(target.name, colorMap.shallow),
                    multiline: false,
                }
            } else if (target.type == "raw") {
                const result = target.segments.map(segment => "color" in segment ? (
                    segment.indent ? (
                        color(segment.text, segment.color).replace(/\n/g, "\n" + "  ".repeat(indent))
                    ) : (
                        color(segment.text, segment.color)
                    )
                ) : (
                    visit(segment, indent).result
                )).join("")

                return {
                    result, multiline: result.includes("\n"),
                }
            }

            return { result: color(target.type, colorMap.other), multiline: false }
        }

        const visitKey = (target: ObjectDescription.AnyDescription, indent: number) => {
            if (target.type == "primitive" && typeof target.value == "string" && !target.value.match(/[^\w$]/g)) return {
                result: target.value,
                multiline: false,
            }

            return visit(target, indent)
        }

        return visit(root, 0).result
    }
}
