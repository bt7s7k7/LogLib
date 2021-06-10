import { inspect } from "util"
import { ObjectDescription } from "../logger/ObjectDescription"

const p = {}
const q = { a: p, b: p }

const result = ObjectDescription.inspectObject(process)

console.log(inspect(result, { colors: true, depth: Infinity }))