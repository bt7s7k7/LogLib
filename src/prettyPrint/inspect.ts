import { DescriptionFormatter } from "./DescriptionFormatter"
import { ObjectDescription } from "./ObjectDescription"

export function inspect(value: any, options?: inspect.InspectOptions) {
    const desc = ObjectDescription.inspectObject(value)

    return DescriptionFormatter.formatDescription(desc, {
        ...options,
        color: options?.color ?? (options?.colors ? inspect.defaultColor : (text) => text),
    })
}

export namespace inspect {
    export const HTML_COLOR: DescriptionFormatter.FormatOptions["color"] = (text, color) => {
        text = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")

        if (color.custom) {
            return `<span style="color:${color.code}">${text}</span>`
        } else {
            if (color.name == "bold") {
                return `<b>${text}</b>`
            }

            return `<span style="color:${DescriptionFormatter.DEFAULT_COLOR_CODES[color.name]}">${text}</span>`
        }
    }

    export let defaultColor: DescriptionFormatter.FormatOptions["color"] = (text) => text

    export interface InspectOptions extends Partial<DescriptionFormatter.FormatOptions> {
        colors?: boolean
    }
}
