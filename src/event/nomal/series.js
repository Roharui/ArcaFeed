import { CONFIG, getConfigWithKey } from "../../config";
import { renderPage } from "../../utils/link";

const COMMENT = "cp"

function seriesInit() {
    let series = $("div.article-series:first")
    let dd = localStorage.getItem("arcalive_tampermonkey_series")
    let du = localStorage.getItem("arcalive_tampermonkey_series_prev") ?? ""

    if (!series.length || dd != null) {
        return;
    }

    let links = series.find(".series-link a").toArray().map(ele => $(ele).attr("href"));

    if (du.includes(links[0])) {
        return;
    }

    localStorage.setItem("arcalive_tampermonkey_series", JSON.stringify(links))
    localStorage.setItem("arcalive_tampermonkey_series_prev", `${du},${links[0]}`)
    localStorage.setItem("arcalive_tampermonkey_series_ori", location.href)

    const url = new URL(links[0], location.origin)
    url.searchParams.append(COMMENT, 1)

    if (getConfigWithKey(CONFIG.NO_REFRESH)) {
        renderPage(url)
    } else {
        location.replace(url)
    }
}

function clearSeries() {
    localStorage.removeItem("arcalive_tampermonkey_series")
    let ori = localStorage.getItem("arcalive_tampermonkey_series_ori")

    if (getConfigWithKey(CONFIG.NO_REFRESH)) {
        renderPage(ori)
    } else {
        location.replace(ori)
    }
}

export { seriesInit, clearSeries }
