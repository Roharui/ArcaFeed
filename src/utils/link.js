import { isArticle } from ".";
import { config } from "../config";
import { Vault } from "../vault";


function processAjaxData(html, url){
    window.history.pushState({ prevUrl: window.location.href }, null, url);

    const dom = $(html)

    if (!isArticle(dom)) {
        location.replace(url)
    }

    $("title").html(dom.find("title").html())
    $(".article-wrapper").html(dom.find(".article-wrapper").html())
    $(".article-list").html(dom.find(".article-list").html())

    $('html, body').animate({ scrollTop: 0 }, 200)
}

function fetchPage(url, callback) {
    fetch(url)
        .then(res => res.text())
        .then(html => callback(html))
}

function renderNextPage() {
    const v = new Vault()
    processAjaxData(v.nextPageHtml, v.nextPageUrl)
    v.clear()
    config()
}

function renderPrevPage() {
    const v = new Vault()
    processAjaxData(v.prevPageHtml, v.prevPageUrl)
    v.clear()
    config()
}

function renderPage(url) {
    fetch(url)
        .then(res => res.text())
        .then(text => processAjaxData(text, url))
        .then(() => new Vault().clear())
        .then(() => config())
}

export { fetchPage, renderPage, renderNextPage, renderPrevPage }