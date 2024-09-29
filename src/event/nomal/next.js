import { CONFIG, getConfigWithKey } from "../../config";
import { getChannelId } from "../../utils";

const COMMENT = "cp"

function moveLink(href) {
    const url = new URL(href, location.origin)
    url.searchParams.append(COMMENT, 1)

    location.replace(url.href)
}

function filterLink(rows) {
    rows = rows.filter(ele => !($(ele).hasClass("notice") || $(ele).hasClass("head") || $(ele).attr("href").includes("#c_")))

    const channelId = getChannelId()

    let pageFilter = getConfigWithKey(CONFIG.PAGE_FILTER)[channelId]

    if (pageFilter === undefined) {
        pageFilter = {
            include: [],
            exclude: []
        }
    }

    let { include, exclude } = pageFilter

    if (include.length == 0 && exclude.length == 0 === undefined) {
        return rows;
    }

    return rows.filter(ele => {
        let eleText = $(ele).find(".badge-success").text()

        let isInclude = include.length != 0 ? include.reduce((prev, cur) => prev || eleText.includes(cur), false) : true
        let isExclude = exclude.length != 0 ? exclude.reduce((prev, cur) => prev && !eleText.includes(cur), true) : true

        return isInclude && isExclude
    })
}

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
        let isCurrent = $("a.vrow.active").length == 0;

        let rows = !isCurrent
            ? filterLink($("a.vrow.active").nextAll().get())
            : filterLink($("a.vrow:not(.notice)").get())

        if (rows.length === 0) {
            let page = $(".page-item.active").next()
            href = page.find("a").attr("href")
        } else {
            href = rows[0].href
        }
    }

    moveLink(href)
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
        let isCurrent = $("a.vrow.active").length == 0;

        let rows = !isCurrent
            ? filterLink($("a.vrow.active").prevAll().get())
            : filterLink($("a.vrow:not(.notice)").get())

        if (rows.length === 0) {
            let page = $(".page-item.active").prev()
            href = page.find("a").attr("href")
        } else {
            href = rows[0].href
        }
    }

    moveLink(href)
}


export { prevPage, nextPage }