
function getChannelId() {
    let x = location.pathname.split("/b/")[1]
    return x.split("/")[0]
}

function getArticleId() {
    let x = location.pathname.split("/b/")[1]
    let xx = x.split("/")[1]
    return xx
}

export { getChannelId, getArticleId }