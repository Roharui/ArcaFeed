import { Vault } from "../../vault"
import { EVENT_TYPE } from "../../vault/eventType"

const CURSOR_CSS = {
    width: '50px',
    height: '50px',
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
    position: 'fixed',
    borderRadius: '25px',
}

function createCursor(e) {
    e.preventDefault()

    let v = new Vault()
    v.eventType = EVENT_TYPE.MOUSE

    let cursor = $("<div>")

    cursor.css(Object.assign(CURSOR_CSS, v.getCursorLoc()))

    v.setCursor(cursor)

    $('body').append(cursor)
}

function moveCursor() {
    let v = new Vault()

    let loc = v.getCursorLoc()
    let cursor = v.getCursor()
    
    cursor.css(Object.assign(CURSOR_CSS, loc))
}

function cursorMoveLeft(e) {
    e.preventDefault()

    let v = new Vault()
    let loc = v.getCursorLoc()

    loc.left -= 10;

    v.setCursorLoc(loc)
    moveCursor()
}

function cursorMoveRight(e) {
    e.preventDefault()

    let v = new Vault()
    let loc = v.getCursorLoc()

    loc.left += 10;
    

    v.setCursorLoc(loc)
    moveCursor()
}

function cursorMoveUp(e) {
    e.preventDefault()

    let v = new Vault()
    let loc = v.getCursorLoc()

    loc.top -= 10;
    
    v.setCursorLoc(loc)
    moveCursor()
}

function cursorMoveDown(e) {
    e.preventDefault()

    let v = new Vault()
    let loc = v.getCursorLoc()

    loc.top += 10;
    
    v.setCursorLoc(loc)
    moveCursor()
}

function clickCursor(e) {
    e.preventDefault()

    let loc = new Vault().getCursorLoc()

    removeCursor(e)

    let ele = document.elementFromPoint(loc.left + 25, loc.top + 25)

    ele.click()
}

function removeCursor(e) {
    e.preventDefault()

    let v = new Vault()
    v.eventType = EVENT_TYPE.DEFAULT

    v.getCursor().remove()
    v.removeCursor()
}

export { createCursor, clickCursor, removeCursor, cursorMoveRight, cursorMoveLeft, cursorMoveUp, cursorMoveDown }