import { inspect } from "util"
import { LogColor } from "../logger/LogLevel"

export namespace ConsoleColorUtils {
    export const lookup: { [P in LogColor]: [number, number] } = {
        black: inspect.colors.black!,
        blue: inspect.colors.blueBright!,
        cyan: inspect.colors.cyanBright!,
        gray: inspect.colors.gray!,
        green: inspect.colors.greenBright!,
        magenta: inspect.colors.magentaBright!,
        red: inspect.colors.redBright!,
        yellow: inspect.colors.yellowBright!,
        white: inspect.colors.white!
    }

    export function addStyle(text: string, colorName: LogColor) {
        const color = lookup[colorName]
        return `\u001b[${color[0]}m${text}\u001b[${color[1]}m`
    }
}