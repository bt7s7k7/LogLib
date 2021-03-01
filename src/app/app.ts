import { Logger } from "../logLib/Logger"

function logAll() {
    Logger.log`Current log level = ${Logger.level}`
    Logger.log``
    Logger.debug`This is debug level`
    Logger.conn`This is conn level`
    Logger.info`This is info level`
    Logger.warn`This is warn level`
    Logger.error`This is error level`
}

logAll()
Logger.level = Logger.LEVELS.debug
Logger.log``
logAll()
Logger.log``
Logger.log`Strings get ${"escaped"}`
Logger.log`Numbers get escaped: ${5}`
Logger.log`Others: ${() => { }} ${[6, 8, 1]} ${{ q: 5 }} ${Symbol("test")}`
Logger.log`        ${/[^-]\s+f/g} ${new Date()} ${null} ${undefined}`

Logger.log``
Logger.log``

let i = 0
const interval = setInterval(() => {
    Logger.replaceLine()
    Logger.log`Counter: ${i}`

    if (i == 100) {
        clearInterval(interval)
    }
    i++
}, 50)
