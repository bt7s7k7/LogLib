import { ColorName, DescriptionFormatter, SegmentColor } from "./DescriptionFormatter"

const primitiveTypes = new Set(["string", "number", "boolean"])

export interface RawSegment {
    color: SegmentColor,
    text: string
    indent?: boolean
}

export class ObjectDescription {
    public readonly desc = ObjectDescription.inspectObject(this.target)
    constructor(public readonly target: any) { }
}

export namespace ObjectDescription {
    export class Context {
        public readonly seen: Map<any, string[]> = this.parent?.seen ?? new Map()

        public descent(path: string[]) {
            return new Context(this, [...this.path, ...path])
        }

        constructor(
            public readonly parent: Context | null = null,
            public readonly path: string[] = parent?.path ?? [],
        ) { }
    }

    export function inspectObject(target: any, ctx = new Context()): AnyDescription {
        if (primitiveTypes.has(typeof target)) {
            return {
                type: "primitive",
                value: target,
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
                name: name,
            }
        } else if (typeof target == "symbol") {
            return {
                type: "symbol",
                name: target.toString(),
            }
        } else if (typeof target == "bigint") {
            return {
                type: "bigint",
                value: target.toString(),
            }
        } else if (typeof target == "undefined") {
            return { type: "undefined" }
        } else if (typeof target == "object") {
            if (target == null) return { type: "null" }

            if (target[RAW_OBJECT]) {
                return {
                    type: "raw",
                    segments: target.segments,
                }
            }

            if (ctx.seen.has(target)) return { type: "circular", path: ctx.seen.get(target)! }
            ctx.seen.set(target, ctx.path)

            const isTypedArray = ArrayBuffer.isView(target) && !(target instanceof DataView)
            if (target instanceof Array || isTypedArray) {
                let array = target as any[]
                if (array.length <= 100) {
                    if (isTypedArray) array = [...array]
                } else {
                    array = [
                        ...array.slice(0, 50),
                        LogMarker.rawText(`...${array.length - 100} elements`),
                        ...array.slice(-50),
                    ]
                }

                return {
                    type: "list",
                    subtype: "array",
                    name: target.constructor.name,
                    elements: array.map((v, i) => inspectObject(v, ctx.descent(["elements", i.toString()]))),
                }
            }

            if (target instanceof Set) {
                return {
                    type: "list",
                    subtype: "set",
                    name: target.constructor.name,
                    elements: [...target.entries()].map(([key, value], i) => inspectObject(value, ctx.descent(["elements", i.toString()]))),
                }
            }

            const asKeyValuePairList = ([key, value]: any[], i: number) => ({
                key: inspectObject(key, ctx.descent(["items", i.toString(), "key"])),
                value: inspectObject(value, ctx.descent(["items", i.toString(), "value"])),
            })

            if (target instanceof Map) {
                return {
                    type: "record",
                    subtype: "map",
                    name: target.constructor.name,
                    items: [...target].map(asKeyValuePairList),
                }
            }

            if (target instanceof RegExp) {
                return {
                    type: "regexp",
                    source: target.toString(),
                }
            }

            if (target instanceof Date) {
                return {
                    type: "date",
                    date: target.toISOString(),
                }
            }

            if (target instanceof WeakMap || target instanceof WeakSet || target instanceof Promise) {
                return {
                    type: "shallow",
                    name: target.constructor.name,
                }
            }

            if (LogMarker.CUSTOM in target) {
                const result = target[LogMarker.CUSTOM](ctx)
                if (result != target) {
                    return ObjectDescription.inspectObject(result, ctx)
                }
            }

            if (target instanceof Error) {
                return {
                    type: "raw",
                    segments: [{ color: { custom: false, name: "white" }, text: target.stack ?? target.message }],
                }
            }

            let name: string | null = target.constructor?.name
            if (name == "Object") name = null
            const items: RecordDescription["items"] = []

            for (const [key, value] of Object.entries(target)) {
                items.push(asKeyValuePairList([key, value], items.length))
            }

            for (const symbol of Object.getOwnPropertySymbols(target)) {
                const descriptor = Object.getOwnPropertyDescriptor(target, symbol)!
                // Unlike `entries()`, `getOwnPropertySymbols()` also returns symbols for not enumerable properties
                if (!descriptor.enumerable) continue
                items.push(asKeyValuePairList([symbol, target[symbol]], items.length))
            }

            return {
                type: "record",
                subtype: "object",
                name, items,
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
        segments: (RawSegment | AnyDescription)[]
    }

    export type AnyDescription =
        | PrimitiveDescription | NullDescription | UndefinedDescription | SymbolDescription | DateDescription | FunctionDescription | ListDescription
        | RecordDescription | UnknownDescription | BigintDescription | ShallowDescription | CircularDescription | RawTextDescription | RegExpDescription
}

const RAW_OBJECT = Symbol.for("Logger.ObjectDescription.RawObject")

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
    "97": "whiteBright",
}

export namespace LogMarker {
    export const CUSTOM = Symbol.for("Logger.ObjectDescription.Custom")

    export function raw(segments: (RawSegment | ObjectDescription.AnyDescription)[]): unknown {
        return {
            [RAW_OBJECT]: true, segments,
        }
    }

    export function textSegment(text: string, color: SegmentColor | ColorName | "ansi" = { custom: false, name: "white" }, { indent = false } = {}) {
        if (color == "ansi") {
            text += "\u001b[0m"

            const segments: RawSegment[] = []

            let currStyle: SegmentColor = { custom: true, code: DescriptionFormatter.DEFAULT_COLOR_CODES.white, ansiCode: 37 }
            let prevPos = 0
            let pos = 0
            let i = 0
            while ((pos = text.indexOf("\u001b[", pos)) != -1) {
                const segment = text.slice(prevPos, pos)
                segments.push({ color: currStyle, text: segment, ...(indent ? { indent: true } : undefined) })

                const styleNumberStart = pos + 2
                pos = text.indexOf("m", pos) + 1

                const ansiCode = text.slice(styleNumberStart, pos - 1)
                const colorName = ansiColorMap[ansiCode as keyof typeof ansiColorMap] ?? "white"

                currStyle = {
                    custom: true,
                    code: DescriptionFormatter.DEFAULT_COLOR_CODES[colorName as keyof typeof DescriptionFormatter.DEFAULT_COLOR_CODES] ?? DescriptionFormatter.DEFAULT_COLOR_CODES.grey,
                    ansiCode: +ansiCode
                }

                prevPos = pos
                i++
                if (i > 1000) throw new Error("Infinite loop reached")
            }

            return segments
        }

        if (typeof color == "string") color = { custom: false, name: color }

        return [
            { text, color, ...(indent ? { indent: true } : undefined) }
        ]
    }

    export function rawText(...args: Parameters<typeof textSegment>) {
        return raw(textSegment(...args))
    }

    export function ansiText(text: string) {
        return raw(textSegment(text, "ansi"))
    }
}
