
const COMMENT = "cp"

function nextPage() {
    let href = "";

    let series = localStorage.getItem("arcalive_tampermonkey_series")

    if (series != null) {
        let arr = JSON.parse(series)

        let idx = arr.indexOf(location.pathname) + 1

        if (arr.length == idx + 1) {
            localStorage.removeItem("arcalive_tampermonkey_series")
            window.close()
            return;
        }

        href = arr[idx]
    } else {
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
    }

    const url = new URL(href, location.origin)
    url.searchParams.append(COMMENT, 1)

    location.replace(url.href)
}

function prevPage() {
    let href = "";

    let series = localStorage.getItem("arcalive_tampermonkey_series")

    if (series != null) {
        let arr = JSON.parse(series)

        let idx = arr.indexOf(location.pathname) - 1

        if (idx == 0) {
            return;
        }

        href = arr[idx]
    } else {
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
    }

    const url = new URL(href, location.origin)
    url.searchParams.append(COMMENT, 1)

    location.replace(url.href)
}


export { prevPage, nextPage }