import { inspect } from "util"
import { DIContext } from "../dependencyInjection/DIContext"
import { Logger } from "../logger/Logger"

const context = new DIContext()

const logger = context.provide(Logger, "default")

logger.sendMessage = v => console.log(inspect(v, { colors: true, depth: Infinity }))

logger.info`Hello ${logger}`