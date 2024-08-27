import { init } from "./config"
import { event } from "./event"
import { viewInit } from "./event/image"

$(function () {
    viewInit()
    init()
    event()
})