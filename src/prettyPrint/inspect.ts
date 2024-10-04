import { DescriptionFormatter } from "./DescriptionFormatter"
import { ObjectDescription } from "./ObjectDescription"

export function inspect(value: any, options?: inspect.InspectOptions) {
    const desc = ObjectDescription.inspectObject(value)

    return DescriptionFormatter.formatDescription(desc, {
        ...options,
        color: options?.color ?? (options?.colors ? inspect.defaultColor : (text) => text)
    })
}

export namespace inspect {
    export let defaultColor: DescriptionFormatter.FormatOptions["color"] = (text) => text

    export interface InspectOptions extends Partial<DescriptionFormatter.FormatOptions> {
        colors?: boolean
    }
}
