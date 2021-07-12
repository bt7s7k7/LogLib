import { LogColor } from "./LogLevel"

const primitiveTypes = new Set(["string", "number", "boolean"])

export interface RawSegment {
    color: { custom: false, name: LogColor } | { custom: true, code: string, ansiCode?: number },
    text: string
}

export class ObjectDescription {
    public readonly desc = ObjectDescription.inspectObject(this.target)
    constructor(public readonly target: any) { }
}

export namespace ObjectDescription {
    class Context {
        public readonly seen: Map<any, string[]> = this.parent?.seen ?? new Map()

        public descent(path: string[]) {
            return new Context(this, [...this.path, ...path])
        }

        constructor(
            public readonly parent: Context | null = null,
            public readonly path: string[] = parent?.path ?? []
        ) { }
    }

    export function inspectObject(target: any, ctx = new Context()): AnyDescription {
        if (primitiveTypes.has(typeof target)) {
            return {
                type: "primitive",
                value: target
            }
        } else if (typeof target == "function") {
            const isClass = target.toString().startsWith("class")
            let name = target.name || "(anon)"

            if (name == "(anon)" && target.toString().length < 50) {
                name = target.toString().replace(/\n\s*/g, "↲")
            }

            return {
                type: "function",
                subtype: isClass ? "class" : "function",
                name: name
            }
        } else if (typeof target == "symbol") {
            return {
                type: "symbol",
                name: target.toString()
            }
        } else if (typeof target == "bigint") {
            return {
                type: "bigint",
                value: target.toString()
            }
        } else if (typeof target == "undefined") {
            return { type: "undefined" }
        } else if (typeof target == "object") {
            if (target == null) return { type: "null" }

            if (ctx.seen.has(target)) return { type: "circular", path: ctx.seen.get(target)! }
            ctx.seen.set(target, ctx.path)

            if (target instanceof Set || target instanceof Array) {
                return {
                    type: "list",
                    subtype: target instanceof Set ? "set" : "array",
                    name: target.constructor.name,
                    elements:
                        target instanceof Set ? [...target.entries()].map(([key, value], i) => inspectObject(value, ctx.descent(["elements", i.toString()])))
                            : target.map((v, i) => inspectObject(v, ctx.descent(["elements", i.toString()])))
                }
            }

            const asKeyValuePairList = ([key, value]: any[], i: number) => ({
                key: inspectObject(key, ctx.descent(["items", i.toString(), "key"])),
                value: inspectObject(value, ctx.descent(["items", i.toString(), "value"]))
            })

            if (target instanceof Map) {
                return {
                    type: "record",
                    subtype: "map",
                    name: target.constructor.name,
                    items: [...target].map(asKeyValuePairList)
                }
            }

            if (target instanceof RegExp) {
                return {
                    type: "regexp",
                    source: target.toString()
                }
            }

            if (target instanceof Date) {
                return {
                    type: "date",
                    date: target.toISOString()
                }
            }

            if (target instanceof WeakMap || target instanceof WeakSet || target instanceof Promise) {
                return {
                    type: "shallow",
                    name: target.constructor.name
                }
            }

            if (target[RAW_OBJECT]) {
                return {
                    type: "raw",
                    segments: target.segments
                }
            }

            let name: string | null = target.constructor?.name
            if (name == "Object") name = null
            return {
                type: "record",
                subtype: "object",
                name,
                items: [
                    ...Object.entries(target).map(asKeyValuePairList),
                    ...Object.getOwnPropertySymbols(target).map(v => [v, target[v]]).map(asKeyValuePairList)
                ]
            }
        }

        return { type: "unknown" }
    }

    export interface DescriptionBase {
        type: string
    }

    export interface PrimitiveDescription extends DescriptionBase {
        type: "primitive",
        value: string | number | boolean
    }

    export interface NullDescription extends DescriptionBase {
        type: "null"
    }

    export interface UndefinedDescription extends DescriptionBase {
        type: "undefined"
    }

    export interface SymbolDescription extends DescriptionBase {
        type: "symbol",
        name: string
    }

    export interface DateDescription extends DescriptionBase {
        type: "date",
        date: string
    }

    export interface FunctionDescription extends DescriptionBase {
        type: "function",
        subtype: "class" | "function",
        name: string
    }

    export interface ListDescription extends DescriptionBase {
        type: "list",
        subtype: "set" | "array",
        name: string | null,
        elements: AnyDescription[]
    }

    export interface RecordDescription extends DescriptionBase {
        type: "record",
        subtype: "object" | "map",
        name: string | null,
        items: { key: AnyDescription, value: AnyDescription }[]
    }

    export interface RegExpDescription extends DescriptionBase {
        type: "regexp",
        source: string
    }

    export interface BigintDescription extends DescriptionBase {
        type: "bigint",
        value: string
    }

    export interface UnknownDescription extends DescriptionBase {
        type: "unknown"
    }

    export interface ShallowDescription extends DescriptionBase {
        type: "shallow",
        name: string
    }

    export interface CircularDescription extends DescriptionBase {
        type: "circular",
        path: string[]
    }

    export interface RawTextDescription extends DescriptionBase {
        type: "raw",
        segments: RawSegment[]
    }

    export type AnyDescription = PrimitiveDescription | NullDescription | UndefinedDescription | SymbolDescription | DateDescription | FunctionDescription | ListDescription | RecordDescription | UnknownDescription | BigintDescription | ShallowDescription | CircularDescription | RawTextDescription | RegExpDescription
}

const RAW_OBJECT = Symbol("rawObject")

const ansiColorMap = {
    "30": "black",
    "31": "red",
    "32": "green",
    "33": "yellow",
    "34": "blue",
    "35": "magenta",
    "36": "cyan",
    "37": "white",
    "90": "gray",
    "91": "redBright",
    "92": "greenBright",
    "93": "yellowBright",
    "94": "blueBright",
    "95": "magentaBright",
    "96": "cyanBright",
    "97": "whiteBright"
}

const colorNameLookup = {
    yellow: "#ddaa00",
    red: "#aa0000",
    green: "#00aa00",
    blue: "#0000aa",
    magenta: "#aa00aa",
    cyan: "#00aaaa",
    yellowBright: "#eedd00",
    redBright: "#ee0000",
    greenBright: "#00dd00",
    blueBright: "#0000ee",
    magentaBright: "#ee00ee",
    cyanBright: "#00ddee",
    grey: "#aaaaaa",
    white: "#ffffff"
}

export namespace LogMarker {
    export function raw(segments: RawSegment[]) {
        return {
            [RAW_OBJECT]: true, segments
        }
    }

    export function rawText(text: string, color: RawSegment["color"] = { custom: false, name: "white" }) {
        return raw([{ text, color }])
    }

    export function ansiText(text: string) {
        text += "\u001b[0m"

        const segments: RawSegment[] = []

        let currStyle: RawSegment["color"] = { custom: true, code: colorNameLookup.white, ansiCode: 37 }
        let prevPos = 0
        let pos = 0
        let i = 0
        while ((pos = text.indexOf("\u001b[", pos)) != -1) {
            const segment = text.slice(prevPos, pos)
            segments.push({ color: currStyle, text: segment })

            const styleNumberStart = pos + 2
            pos = text.indexOf("m", pos) + 1

            const ansiCode = text.slice(styleNumberStart, pos - 1)
            const colorName = ansiColorMap[ansiCode as keyof typeof ansiColorMap] ?? "white"
            currStyle = { custom: true, code: colorNameLookup[colorName as keyof typeof colorNameLookup] ?? colorNameLookup.grey, ansiCode: +ansiCode }

            prevPos = pos
            i++
            if (i > 1000) throw new Error("Infinite loop reached")
        }

        return raw(segments)
    }
}