
function getChannelId() {
    let x = location.pathname.split("/b/")[1]
    return x.split("/")[0]
}

export { getChannelId }