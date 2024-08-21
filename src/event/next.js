import { Vault } from "../vault"

function nextPage() {
    if (new Vault().viewer) {
        return
    }
    var x = $("a.active + a")
    var xx = $("li.active + li > a")
    var xxx = $("a.vrow.column")
    var endOfPage = (location.pathname.match(/\//g) || []).length === 2
    if(x == null && endOfPage) {
        location.href = xxx.attr("href")
    } else if (x === null && !endOfPage) {
        location.href = xx.attr("href")
    } else {
        location.href = x.attr("href")
    }
}

function prevPage() {
    if (new Vault().viewer) {
        return
    }
    history.back()
}

export { prevPage, nextPage }