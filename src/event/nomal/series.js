
const COMMENT = "cp"

function seriesInit() {
    let series = $("div.article-series:first")
    let dd = localStorage.getItem("arcalive_tampermonkey_series")

    if (!series.length || dd != null) {
        return;
    }

    let links = series.find(".series-link a").toArray().map(ele => $(ele).attr("href"));

    localStorage.setItem("arcalive_tampermonkey_series", JSON.stringify(links))

    const url = new URL(links[0], location.origin)
    url.searchParams.append(COMMENT, 1)

    window.open(url, '_blank');
}

function clearSeries() {
    localStorage.removeItem("arcalive_tampermonkey_series")
    window.close()
}

export { seriesInit, clearSeries }
