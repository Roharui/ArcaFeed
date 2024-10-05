import { render } from "../utils/render"
import { getChannelId } from "../utils/url"
import { isCurPageArticle } from "../utils/check"

function noRefrershLink() {
    $("a").on("click", function(e) {
        const href = $(this).attr("href")
    
        if (getChannelId(href) !== undefined && isCurPageArticle()) {
            e.preventDefault()
            render(href)
        }
    })
}

export { noRefrershLink }