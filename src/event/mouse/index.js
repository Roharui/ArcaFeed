import { clickCursor, cursorMoveDown, cursorMoveLeft, cursorMoveRight, cursorMoveUp, removeCursor } from "./mouse"

const MOUSE_EVENT = {
    "ArrowLeft": cursorMoveLeft,
    "ArrowRight": cursorMoveRight,
    "ArrowDown": cursorMoveDown,
    "ArrowUp": cursorMoveUp,
    "Enter": clickCursor,
    "Shift": removeCursor,
}

export { MOUSE_EVENT }