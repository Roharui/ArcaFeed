import { config } from "./config"
import { event } from "./event"
import { viewInit } from "./event/image"

(function() {
    config()
    viewInit()
    event()
})()