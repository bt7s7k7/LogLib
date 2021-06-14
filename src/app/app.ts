import { DIContext } from "../dependencyInjection/DIContext"
import { Logger } from "../logger/Logger"
import { NodeLogger } from "../nodeLogger/NodeLogger"

const context = new DIContext()

const logger = context.provide(Logger, () => new NodeLogger())

logger.info`${logger}`
logger.info`Strings get ${"escaped"}`
logger.info`Numbers get escaped: ${5}`
logger.info`Others: ${() => { }} ${[6, 8, 1]} ${{ q: 5 }} ${Symbol("test")}`
logger.info`        ${/[^-]\s+f/g} ${new Date()} ${null} ${undefined}`
logger.info`        ${new Set([6, 8, 1])} ${42n} ${new WeakMap()}`
