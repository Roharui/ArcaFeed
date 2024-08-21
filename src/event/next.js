import { Vault } from "../vault"

function nextPage() {
    if (new Vault().viewer) {
        return
    }
    var x = document.querySelector("a.active + a")
    var xx = document.querySelector("li.active + li > a")
    var xxx = document.querySelector("a.vrow.column")
    var endOfPage = (location.pathname.match(/\//g) || []).length === 2
    if(x == null && endOfPage) {
        location.href = xxx.href
    } else if (x === null && !endOfPage) {
        location.href = xx.href
    } else {
        location.href = x.href
    }
}

function prevPage() {
    if (new Vault().viewer) {
        return
    }
    history.back()
}

export { prevPage, nextPage }