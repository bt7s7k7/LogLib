
const primitiveTypes = new Set(["string", "number", "boolean"])

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
            return {
                type: "function",
                subtype: isClass ? "class" : "function",
                name: target.name || "(anon)"
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

            if (target instanceof Map) {
                return {
                    type: "record",
                    subtype: "map",
                    name: target.constructor.name,
                    items: [...target].map(([key, value], i) => ({
                        key: inspectObject(key, ctx.descent(["items", i.toString(), "key"])),
                        value: inspectObject(value, ctx.descent(["items", i.toString(), "value"]))
                    }))
                }
            }

            if (target instanceof WeakMap || target instanceof WeakSet || target instanceof Promise) {
                return {
                    type: "shallow",
                    name: target.constructor.name
                }
            }

            let name: string | null = target.constructor?.name
            if (name == "Object") name = null
            return {
                type: "record",
                subtype: "object",
                name,
                items: Object.entries(target).map(([key, value], i) => ({
                    key: inspectObject(key, ctx.descent(["items", i.toString(), "key"])),
                    value: inspectObject(value, ctx.descent(["items", i.toString(), "value"]))
                }))
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

    export type AnyDescription = PrimitiveDescription | NullDescription | UndefinedDescription | SymbolDescription | DateDescription | FunctionDescription | ListDescription | RecordDescription | UnknownDescription | BigintDescription | ShallowDescription | CircularDescription
}