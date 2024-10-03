import { config } from "../config";
import { Vault } from "../vault";


function processAjaxData(html, url){
    window.history.pushState({ prevUrl: window.location.href }, null, url);

    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(html, 'text/html');

    $("body").empty()
    $("title").empty()

    document.querySelector("body").innerHTML = htmlDoc.querySelector("body").innerHTML
    document.querySelector("title").innerHTML = htmlDoc.querySelector("title").innerHTML

    document.querySelectorAll("script").forEach(ele => ele.remove())

    htmlDoc.querySelectorAll("script").forEach(ele => {
        let src = ele.src
        let html = ele.innerHTML
        
        var script= document.createElement('script');

        if (src !== undefined) {
            script.src = src
        } else {
            script.innerHTML = html
        }

        document.querySelector("head").appendChild(script)
    })

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