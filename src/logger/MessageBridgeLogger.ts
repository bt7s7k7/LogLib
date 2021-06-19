import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIService } from "../dependencyInjection/DIService"
import { Logger, LogMessage, LogPrefix } from "./Logger"

export class MessageBridgeLogger extends Logger {
    public readonly messageBridge = this.context.inject(MessageBridge)

    public sendMessage(message: LogMessage) {
        this.messageBridge.sendRequest("logger:log", { ...message, content: message.content.map(v => typeof v == "string" ? v : { ...v, target: null }) })
    }
}

export class LoggerReceiver extends DIService {
    public readonly messageBridge = this.context.inject(MessageBridge)
    public readonly logger = this.context.inject(Logger)

    public handleMessage(message: LogMessage) {
        this.logger.sendMessage({ ...message, origin: [...message.origin, ...this.origin] })
    }

    constructor(
        public readonly origin: LogPrefix[] = []
    ) {
        super()
        this.messageBridge.onRequest.add(this, request => {
            if (request.type == "logger:log") request.handle(async (message: LogMessage) => this.handleMessage(message))
        })
    }
}