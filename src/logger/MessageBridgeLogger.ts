import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIService } from "../dependencyInjection/DIService"
import { Logger, LogMessage } from "./Logger"

export class MessageBridgeLogger extends Logger {
    public readonly messageBridge = this.context.inject(MessageBridge)

    public sendMessage(message: LogMessage) {
        this.messageBridge.sendRequest("logger:log", { ...message, content: message.content.map(v => typeof v == "string" ? v : { ...v, target: null }) })
    }
}

export class LoggerReceiver extends DIService {
    public readonly messageBridge = this.context.inject(MessageBridge)
    public readonly logger = this.context.inject(Logger)

    constructor() {
        super()
        this.messageBridge.onRequest.add(this, request => {
            if (request.type == "logger:log") request.handle(async (message: LogMessage) => {
                this.logger.sendMessage(message)
            })
        })
    }
}