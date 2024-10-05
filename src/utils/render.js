import { Vault } from "../vault";
import { viewInit } from "../event/viewer";

const v = new Vault()

function render(url){
    window.history.pushState({ prevUrl: window.location.href }, null, url);

    const html = v.getHtml(url)

    if (html == undefined) {
        fetch(url)
            .then(res => res.text())
            .then(renderCallback)
            .then(afterRender)
    } else {
        new Promise((res) => res(renderCallback(html)))
            .then(afterRender)
    }
}

function renderCallback(html) {
    const dom = $(html)

    $(".article-wrapper").toggle(dom.find(".article-wrapper").length > 0)
    
    $("title").html(dom.find("div.title-row div.title").clone().children().remove().end().text())
    $(".article-wrapper").html(dom.find(".article-wrapper").html())

    $(".article-list").html(dom.find(".article-list").html())
    $(".pagination-wrapper").html(dom.find(".pagination-wrapper").html())

    $('html, body').animate({ scrollTop: 0 }, 200)
}

function afterRender() {
    v.setPageUrl()
    viewInit()
}

export { render }