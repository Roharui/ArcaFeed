
import { Vault } from "@vault";
import { isCurPageArticle } from "./check";
import { render } from "./render";

const v = new Vault()

function toPage(flag) {

    const href = flag ? v.data.nextPageUrl : v.data.prevPageUrl

    if (href === undefined) return;
    if (!href.includes("/b/") || !isCurPageArticle()) {
        location.replace(href)
        return;
    }

    render(href)
}

export { toPage }