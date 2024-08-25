import { init } from "./config"
import { event } from "./event"
import { viewInit } from "./event/image"

$(function () {
    init()
    viewInit()
    event()
})