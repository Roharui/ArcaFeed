import { Vault } from "../vault";
import { viewInit } from "../event/viewer";

const v = new Vault()

function render(url){
    window.history.pushState({ prevUrl: window.location.href }, null, url);

    const html = v.getHtml(url)

    if (html === undefined) {
        fetch(url)
            .then(res => res.text())
            .then(renderCallback)
    } else {
        renderCallback(html)
    }
}

function renderCallback(html) {
    const dom = $(html)

    $("title").html(dom.find("title").html())
    $(".article-wrapper").html(dom.find(".article-wrapper").html())
    $(".article-list").html(dom.find(".article-list").html())

    $('html, body').animate({ scrollTop: 0 }, 200)

    v.setPageUrl()
    viewInit()
}

export { render }