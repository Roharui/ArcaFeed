
function isArticle(dom) {
    return dom.find(".article-wrapper").length > 0
}

function getChannelId() {
    let x = location.pathname.split("/b/")[1]
    return x.split("/")[0]
}

function getArticleId() {
    let x = location.pathname.split("/b/")[1]
    let xx = x.split("/")[1]
    return xx
}

export { isArticle, getChannelId, getArticleId }