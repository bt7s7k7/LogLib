import { css } from "@emotion/css"
import { computed, defineComponent, PropType, shallowReactive } from "vue"
import { useContext } from "../dependencyInjectionVue/hooks"
import { eventDecorator } from "../eventDecorator"
import { Logger, LogMessage } from "../logger/Logger"
import { LogColor, LogLevel } from "../logger/LogLevel"
import { ObjectDescription } from "../logger/ObjectDescription"
import { Fold } from "../vue3gui/Fold"

class VueLoggerStore {
    public messages: LogMessage[] = shallowReactive([])
}

export class VueLogger extends Logger {
    public sendMessage(message: LogMessage) {
        this.store.messages.push(message)
    }

    protected readonly store = this.context.provide(VueLoggerStore, "default")
}

type GetDescriptionByType<T extends ObjectDescription.AnyDescription, S extends ObjectDescription.AnyDescription["type"]> = T extends { type: S } ? T : never

const INLINE_TYPES = new Set<ObjectDescription.AnyDescription["type"]>([
    "bigint", "date", "function", "null", "primitive", "regexp", "symbol", "shallow", "undefined", "unknown"
])

const descViews: {
    [P in ObjectDescription.AnyDescription["type"]]?: (props: {
        desc: GetDescriptionByType<ObjectDescription.AnyDescription, P>,
        root: ObjectDescription.AnyDescription
    }) => any
} = {
    primitive: (props) => () => {
        const value = props.desc.value
        if (typeof value == "string") return <span class={colorLookup.green}>{JSON.stringify(value)}</span>
        else return <span class={colorLookup.yellow}>{JSON.stringify(value)}</span>
    },
    bigint: (props) => () => {
        const value = props.desc.value
        return <span class={colorLookup.yellow}>{value.toString()}n</span>
    },
    function: (props) => () => {
        return <span class={colorLookup.cyan}>[{props.desc.subtype} {props.desc.name}]</span>
    },
    shallow: (props) => () => {
        return <span class={colorLookup.blue}>{props.desc.name}</span>
    },
    list: (props) => () => {
        const length = props.desc.elements.length
        const prefix = props.desc.name == "Array" ? "" : `${props.desc.name} (${length}) `
        return <Fold inline negative>{{
            hidden: () => {
                let canInline = true
                for (const element of props.desc.elements) {
                    if (!INLINE_TYPES.has(element.type)) {
                        canInline = false
                        break
                    }
                }

                if (canInline && length > 0) {
                    return <span>{prefix}[ {props.desc.elements.slice(0, 10).map((element, i) => (
                        <span key={i}><DescView desc={element} root={props.root} />{length > i + 1 && ", "}</span>
                    ))} ]</span>
                }
                else return <span>{prefix || "[]"}</span>
            },
            default: () => length > 0 ? (
                <span>
                    <span>{prefix}</span>
                    <span>[</span>
                    <div class="ml-8">length: <span class={colorLookup.yellow}>{length}</span>{length > 1 && ","}</div>
                    {props.desc.elements.map((element, i) => (
                        <div class="ml-8" key={i}>{i}: <DescView desc={element} root={props.root} />{length > i + 1 && ","}</div>
                    ))}
                    <span>]</span>
                </span>
            ) : <span>{prefix || "[]"}</span>,
        }}</Fold>
    },
    record: (props) => () => {
        const length = props.desc.items.length
        const notEmpty = length > 0
        const prefix = props.desc.name == "Object" || !props.desc.name ? "" : `${props.desc.name + (!notEmpty ? ` {} ` : "")} `
        return <Fold inline negative>{{
            hidden: () => {
                let canInline = true
                for (const { key, value } of props.desc.items) {
                    if (!INLINE_TYPES.has(key.type) || !INLINE_TYPES.has(value.type)) {
                        canInline = false
                        break
                    }
                }

                if (notEmpty && canInline) {
                    return <span>{prefix}{"{ "}{props.desc.items.slice(0, 10).map(({ key, value }, i) => (
                        <span key={i}>{
                            key.type == "primitive" && typeof key.value == "string" && !key.value.match(/[^\w$]/g) ? key.value
                                : <DescView desc={key} root={props.root} />
                        }: <DescView desc={value} root={props.root} />{length > i + 1 && ", "}</span>
                    ))}{" }"}</span>
                }
                else return <span>{prefix.trim() + (notEmpty ? " {...}" : "") || (notEmpty ? "{...}" : "{}")}</span>
            },
            default: () => notEmpty ? (
                <span>
                    <span>{prefix}</span>
                    <span>{"{"}</span>
                    {props.desc.items.map(({ key, value }, i) => (
                        <div class="ml-8" key={i}>{
                            key.type == "primitive" && typeof key.value == "string" && !key.value.match(/[^\w$]/g) ? key.value
                                : <DescView desc={key} root={props.root} />
                        }: <DescView desc={value} root={props.root} />{length > i + 1 && ","}</div>
                    ))}
                    <span>{"}"}</span>
                </span>
            ) : <span>{prefix.trim() || "{}"}</span>,
        }}</Fold>
    }
}

const descViewComponents = Object.fromEntries(Object.entries(descViews).map(([key, value]) => [key, defineComponent({
    name: "VueLoggerView:" + key,
    props: {
        desc: {
            type: Object as PropType<ObjectDescription.AnyDescription>,
            required: true
        },
        root: {
            type: Object as PropType<ObjectDescription.AnyDescription>,
            required: true
        }
    },
    setup: value as any
})]))

const DescView = defineComponent({
    name: "VueLoggerView:" + "desc_view",
    props: {
        desc: {
            type: Object as PropType<ObjectDescription.AnyDescription>,
            required: true
        },
        root: {
            type: Object as PropType<ObjectDescription.AnyDescription>,
            required: true
        }
    },
    setup(props, ctx) {
        const type = computed(() => descViewComponents[props.desc.type])

        return () => (
            type.value ? <type.value class="vertical-align-top" root={props.root} desc={props.desc} />
                : <span class={[colorLookup.gray, "vertical-align-top"]}>{props.desc.type}</span>
        )
    }
})

const colorLookup: Record<LogColor, string> = {
    black: css({ color: "black" }),
    blue: css({ color: "#00aaff" }),
    cyan: css({ color: "cyan" }),
    gray: css({ color: "gray" }),
    green: css({ color: "lightgreen" }),
    magenta: css({ color: "magenta" }),
    red: css({ color: "red" }),
    white: css({ color: "white" }),
    yellow: css({ color: "yellow" })
}

export const VueLoggerView = eventDecorator(defineComponent({
    name: "VueLoggerView",
    setup(props, ctx) {
        const context = useContext()

        const store = context.inject(VueLoggerStore)

        return () => (
            <div class="bg-black p-2">
                {store.value.messages.map((message, i) => (
                    <pre class="m-0" key={i}>
                        <span>[<span class={colorLookup[LogLevel[message.level].color]}>{LogLevel[message.level].label}</span>]</span>
                        <span>
                            {message.prefix.map((prefix, i) => (
                                <span key={i}>[<span class={colorLookup[prefix.color]}>{prefix.label}</span>]</span>
                            ))}
                        </span>
                        {" "}
                        <span>
                            {message.content.map((item, i) => (
                                typeof item == "string" ? <span class="inline-block" key={i}>{item}</span>
                                    : <DescView class="inline-block" root={item.desc} key={i} desc={item.desc} />
                            ))}
                        </span>
                    </pre>
                ))}
            </div>
        )
    }
}))