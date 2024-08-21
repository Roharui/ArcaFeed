function nextPage() {
    if (localStorage.getItem("viewer") === "on") {
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
    if (localStorage.getItem("viewer") === "on") {
        return
    }
    history.back()
}

export { prevPage, nextPage }