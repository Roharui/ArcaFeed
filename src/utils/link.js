import { config } from "../config";
import { Vault } from "../vault";


function processAjaxData(html, url){
    window.history.pushState({ prevUrl: window.location.href }, null, url);

    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(html, 'text/html');

    $("body").html($(htmlDoc).find("body").html())
    $("title").html($(htmlDoc).find("title").html())

    $("script").each((i, ele) => {
        let src = $(ele).attr("src")
        let html = $(ele).html()

        $(ele).remove()

        if (src !== undefined) {
            $('<script/>').attr('src', src).appendTo('head');
        } else {
            $('<script/>').html(html).appendTo('head');
        }

    })
    
    $('html, body').animate({ scrollTop: 0 }, 200)
}

function renderPage(url) {
    fetch(url)
        .then(res => res.text())
        .then(text => processAjaxData(text, url))
        .then(() => new Vault().clear())
        .then(() => config())
}

export { renderPage }