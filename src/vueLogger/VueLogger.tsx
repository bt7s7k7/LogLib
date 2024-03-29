import { css } from "@emotion/css"
import { computed, defineComponent, markRaw, nextTick, onMounted, onUnmounted, PropType, ref, shallowReactive, watch } from "vue"
import { useContext } from "../dependencyInjectionVue/hooks"
import { eventDecorator } from "../eventDecorator"
import { Disposable } from "../eventLib/Disposable"
import { EventEmitter } from "../eventLib/EventEmitter"
import { EventListener } from "../eventLib/EventListener"
import { Logger, LogMessage } from "../logger/Logger"
import { LogLevel, LogLevelName } from "../logger/LogLevel"
import { ColorName } from "../prettyPrint/DescriptionFormatter"
import { ObjectDescription } from "../prettyPrint/ObjectDescription"
import { Button } from "../vue3gui/Button"
import { useOptionalDynamicsEmitter } from "../vue3gui/DynamicsEmitter"
import { Fold } from "../vue3gui/Fold"

const MAX_MESSAGES = 500

class VueLoggerStore extends Disposable {
    public readonly onMessage = new EventEmitter<LogMessage>()
    public readonly onClear = new EventEmitter()
    protected messages: LogMessage[] = shallowReactive([])

    public clear() {
        this.messages.length = 0
        this.onClear.emit()
    }

    public getMessages(level: LogLevelName) {
        return this.messages.filter(message => LogLevel[message.level].importance >= LogLevel[level].importance)
    }

    public pushMessage(message: LogMessage) {
        this.messages.push(message)
        this.onMessage.emit(message)

        if (this.messages.length > MAX_MESSAGES) {
            this.messages.shift()
        }
    }

    constructor() {
        super()

        markRaw(this)
    }
}

export class VueLogger extends Logger {
    public sendMessage(message: LogMessage) {
        this.store.pushMessage(message)
    }

    public clear() {
        this.store.clear()
    }

    protected readonly store = this.context.provide(VueLoggerStore, "default")
}

type GetDescriptionByType<T extends ObjectDescription.AnyDescription, S extends ObjectDescription.AnyDescription["type"]> = T extends { type: S } ? T : never

const INLINE_TYPES = new Set<ObjectDescription.AnyDescription["type"]>([
    "bigint", "date", "function", "null", "primitive", "regexp", "symbol", "shallow", "undefined", "unknown"
])

const DEFAULT_INLINE_LIMIT = 10
const INLINE_WIDTH_LIMIT = 700

interface FoldableDescSpec<T = any> {
    elements: T[]
    canBeInline: (v: T) => boolean
    start: string
    end: string
    drawElement: (element: T, index: number) => any
    drawElementInline?: (element: T, index: number) => any
    drawLength: boolean
    prefix: string
}

const FoldableDesc = defineComponent({
    name: "VueLoggerView:FoldableDesc",
    props: {
        spec: {
            type: Object as PropType<FoldableDescSpec>,
            required: true
        }
    },
    setup: (props) => {
        const limit = ref(DEFAULT_INLINE_LIMIT)
        const inlineSpan = ref<HTMLSpanElement>()

        onMounted(() => {
            if (inlineSpan.value) {
                const iter = () => {

                    if (limit.value == 0) return

                    const width = inlineSpan.value!.getBoundingClientRect().width

                    if (width > INLINE_WIDTH_LIMIT) {

                        limit.value--
                        setTimeout(() => {
                            iter()
                        }, 10)
                    }
                }

                iter()
            }
        })

        return () => {
            const { elements, canBeInline, drawElement, drawLength, end, start, prefix, drawElementInline = drawElement } = props.spec

            const length = elements.length
            const notEmpty = length > 0

            return <Fold negative>{{
                hidden: () => {
                    let canInline = true
                    for (const element of elements) {
                        if (canBeInline(element)) {
                            canInline = false
                            break
                        }
                    }

                    if (notEmpty && canInline) {
                        return <span ref={inlineSpan}>{prefix}{start + " "}{elements.slice(0, limit.value).map((element, i) => (
                            <span key={i}>{drawElementInline(element, i)}{length > i + 1 && (", " + (i == limit.value - 1 ? "..." : ""))}</span>
                        ))}{" " + end}</span>
                    }
                    else return <span>{prefix.trim() + (notEmpty ? ` ${start}...${end}` : "") || (notEmpty ? `${start}...${end}` : "{}")}</span>
                },
                default: () => notEmpty ? (
                    <span>
                        <span>{prefix}</span>
                        <span>{start}</span>
                        {drawLength && <div class="ml-8">length: <span class={colorLookup.yellow}>{length}</span>{length > 1 && ","}</div>}
                        {elements.map((element, i) => (
                            <div class="ml-8" key={i}>{drawElement(element, i)}{length > i + 1 && ","}</div>
                        ))}
                        <span>{end}</span>
                    </span>
                ) : <span>{prefix.trim() || start + end}</span>,
            }}</Fold>
        }
    }
})

const descViews: {
    [P in ObjectDescription.AnyDescription["type"]]?: (props: {
        desc: GetDescriptionByType<ObjectDescription.AnyDescription, P>,
        root: ObjectDescription.AnyDescription
    }) => any
} = {
    primitive: (props) => () => {
        const value = props.desc.value
        if (typeof value == "string") {
            if (value.length < 100) return <span class={colorLookup.green}>{JSON.stringify(value)}</span>
            else {
                return <Fold negative>{{
                    hidden: () => <span class={colorLookup.green}>{JSON.stringify(value.slice(0, 100)).slice(0, -1)}...</span>,
                    default: () => <span class={colorLookup.green}><div class="inline-block">{value}</div></span>
                }}</Fold>
            }
        }
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
    list: (props) => {
        return () => {
            const length = props.desc.elements.length

            const spec: FoldableDescSpec<ObjectDescription.ListDescription["elements"][number]> = {
                elements: props.desc.elements,
                canBeInline: v => !INLINE_TYPES.has(v.type),
                drawElement: (v, i) => <span>{i}: <DescView desc={v} root={props.root} /></span>,
                drawElementInline: (v, i) => <DescView desc={v} root={props.root} />,
                drawLength: true,
                start: "[",
                end: "]",
                prefix: props.desc.name == "Array" ? "" : `${props.desc.name} (${length}) `
            }

            return <FoldableDesc spec={spec} />
        }
    },
    record: (props) => {
        return () => {
            const length = props.desc.items.length

            const spec: FoldableDescSpec<ObjectDescription.RecordDescription["items"][number]> = {
                elements: props.desc.items,
                canBeInline: ({ key, value }) => !INLINE_TYPES.has(key.type) || !INLINE_TYPES.has(value.type),
                drawElement: ({ key, value }, i) => (
                    <span>
                        {
                            key.type == "primitive" && typeof key.value == "string" && !key.value.match(/[^\w$]/g) ? key.value
                                : <DescView desc={key} root={props.root} />
                        }
                        : <DescView desc={value} root={props.root} />
                    </span>
                ),
                drawLength: false,
                start: "{",
                end: "}",
                prefix: props.desc.name == "Object" || !props.desc.name ? "" : `${props.desc.name + (length == 0 ? ` {} ` : "")} `
            }

            return <FoldableDesc spec={spec} />
        }
    },
    circular: (props) => () => {
        let target = props.root
        for (const key of props.desc.path) {
            target = (target as any)[key]
        }

        return <span><span class={colorLookup.blue}>[C] </span><DescView desc={target} root={props.root} /></span>
    },
    symbol: (props) => () => <span class={colorLookup.green}>{props.desc.name}</span>,
    date: (props) => () => <span class={colorLookup.magenta}>{props.desc.date}</span>,
    regexp: (props) => () => <span class={colorLookup.red}>{props.desc.source}</span>,
    raw: (props) => () => <span>{props.desc.segments.map(({ color, text }, i) =>
        color.custom ? <span key={i} style={{ color: color.code }}>{text}</span>
            : <span key={i} class={colorLookup[color.name]}>{text}</span>
    )}</span>
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

const colorLookup: Record<ColorName, string> = {
    black: css({ color: "black" }),
    blue: css({ color: "#00aaff" }),
    cyan: css({ color: "cyan" }),
    gray: css({ color: "gray" }),
    green: css({ color: "lightgreen" }),
    magenta: css({ color: "#ff99ee" }),
    red: css({ color: "#ff5555" }),
    white: css({ color: "white" }),
    yellow: css({ color: "yellow" })
}

export const VueLoggerView = eventDecorator(defineComponent({
    name: "VueLoggerView",
    props: {
        level: {
            type: String as PropType<LogLevelName>,
            default: () => "info"
        },
        levelSelector: { type: Boolean }
    },
    emits: {
        levelChanged: (name: LogLevelName) => true
    },
    setup(props, ctx) {
        const context = useContext()

        const store = context.inject(VueLoggerStore)
        {
            const listener = new EventListener()

            store.value.onMessage.add(listener, message => {
                if (LogLevel[message.level].importance >= LogLevel[props.level].importance) messages.value.push(message)
                if (messages.value.length > MAX_MESSAGES) {
                    messages.value.shift()
                }
            })

            store.value.onClear.add(listener, () => {
                messages.value.length = 0
            })

            onUnmounted(() => listener.dispose())
        }

        const emitter = useOptionalDynamicsEmitter()

        const messages = ref<LogMessage[]>([])

        const selectLevel = async () => {
            if (!emitter) throw new Error("No emitter injected")

            const level = await emitter.listPrompt(Object.keys(LogLevel) as (keyof typeof LogLevel)[], { title: "Select log level" })

            if (level) ctx.emit("levelChanged", level)
        }

        const container = ref<HTMLDivElement>()
        watch(() => messages.value.length, () => {
            if (!container.value) return
            const containerElement = container.value
            const scrollHeight = containerElement.scrollHeight
            const clientHeight = containerElement.clientHeight
            const scrollTop = containerElement.scrollTop

            if (scrollTop + clientHeight >= scrollHeight) {
                nextTick(() => containerElement.scroll(0, 10000))
            }
        })

        watch(() => props.level, level => {
            messages.value = store.value.getMessages(level)
        }, { immediate: true })

        return () => (
            <div class="bg-dark p-2" ref={container}>
                {messages.value.map((message, i) => LogLevel[message.level].importance >= LogLevel[props.level].importance && (
                    <pre class="m-0" key={i}>
                        <span>
                            {message.origin.map((origin, i) => (
                                <span key={i}>[<span class={colorLookup[origin.color]}>{origin.label}</span>]</span>
                            ))}
                        </span>
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
                <div class="fixed top-0 right-0 p-2 pr-5">
                    {ctx.slots.buttons?.()}
                    {props.levelSelector && <Button onClick={selectLevel}>
                        <code>{LogLevel[props.level].label}</code>
                    </Button>}
                    <Button textual flat onClick={() => store.value.clear()}>Clear</Button>
                </div>
            </div>
        )
    }
}))
