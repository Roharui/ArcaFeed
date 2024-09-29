import { config } from "./config"
import { event } from "./event"

import 'jquery-ui'
import 'jquery-ui-css'

import "toastify-css"
import "viewerjs-css"

$(function () {
    config()
    event()
})