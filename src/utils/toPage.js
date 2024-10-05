
import { Vault } from "../vault";
import { getArticleId } from "../utils/url"
import { isCurPageArticle } from "./check";
import { render } from "./render";

const v = new Vault()

function toPage(flag) {

    const href = flag ? v.data.nextPageUrl : v.data.prevPageUrl

    if (href === undefined) return;
    if (getArticleId(href) === undefined) return;
    if (!isCurPageArticle()) {
        location.replace(href)
        return;
    }

    render(href)
}

export { toPage }