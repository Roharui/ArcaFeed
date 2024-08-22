import { Vault } from "../vault"

function nextPage() {
    if (new Vault().viewer) {
        return
    }
    var x = document.querySelector("a.active + a")
    var xx = document.querySelector("li.active + li > a")
    var xxx = document.querySelector("a.vrow.column:not(.notice)")
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
    var x = $("a.vrow.column.active").prev("a:not(.notice)")
    var xx = $("li.active").prev("li").find("a")
    var xxx = $("a.vrow.column:not(.notice):last")
    var endOfPage = (location.pathname.match(/\//g) || []).length === 2
    if(!x.length && endOfPage) {
        location.href = xxx.attr("href")
    } else if (!x.length && !endOfPage) {
        location.href = xx.attr("href")
    } else {
        location.href = x.attr("href")
    }
}

export { prevPage, nextPage }