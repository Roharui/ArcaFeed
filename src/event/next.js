
import { Vault } from "../vault"

function nextPage() {
    if (new Vault().viewer) {
        return
    }
    
    let href = "";

    var x = document.querySelector("a.active + a")
    var xx = document.querySelector("li.active + li > a")
    var xxx = document.querySelector("a.vrow.column:not(.notice)")
    var endOfPage = (location.pathname.match(/\//g) || []).length === 2
    if(x == null && endOfPage) {
        href = xxx.href
    } else if (x === null && !endOfPage) {
        href = xx.href
    } else {
        href = x.href
    }

    location.href = href
}

function prevPage(e) {
    if (new Vault().viewer) {
        return
    }

    let href = "";

    var x = $("a.vrow.column.active").prev("a:not(.notice)")
    var xx = $("li.active").prev("li").find("a")
    var xxx = $("a.vrow.column:not(.notice):last")
    var endOfPage = (location.pathname.match(/\//g) || []).length === 2
    if(!x.length && endOfPage) {
        href = xxx.attr("href")
    } else if (!x.length && !endOfPage) {
        href = xx.attr("href")
    } else {
        href = x.attr("href")
    }

    location.href = href
}

function nextComment() {
    if (new Vault().viewer) {
        return
    }

    var x = document.querySelector("div.article-comment li.page-item.active + li > a")

    if (x === undefined) {
        return
    }

    location.href = x.href
}

function prevComment() {
    if (new Vault().viewer) {
        return
    }

    var x = $("div.article-comment li.page-item.active").prev("li").find("a")

    if (!x.length) {
        return
    }

    location.href = x.attr("href")
}

export { prevPage, nextPage, nextComment, prevComment }