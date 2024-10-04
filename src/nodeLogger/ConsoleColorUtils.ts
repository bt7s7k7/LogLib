import { inspect } from "util"
import { ColorName, SegmentColor } from "../prettyPrint/DescriptionFormatter"

export namespace ConsoleColorUtils {
    export const lookup: { [P in ColorName]: [number, number] } = {
        black: inspect.colors.black!,
        blue: inspect.colors.blueBright!,
        cyan: inspect.colors.cyanBright!,
        gray: inspect.colors.gray!,
        green: inspect.colors.greenBright!,
        magenta: inspect.colors.magentaBright!,
        red: inspect.colors.redBright!,
        yellow: inspect.colors.yellowBright!,
        white: inspect.colors.whiteBright!,
        bold: inspect.colors.whiteBright!
    }

    export function addStyle(text: string, color: SegmentColor | ColorName) {
        const colorCode =
            typeof color == "string" ? lookup[color]
                : color.custom ? [color.ansiCode ?? lookup.gray[0], lookup.gray[1]]
                    : lookup[color.name]
        return `\u001b[${colorCode[0]}m${text}\u001b[${colorCode[1]}m`
    }
}
