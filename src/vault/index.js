import { getArticleId, getChannelId } from "../utils/url";

const DEFAULT_CONFIG = {
    pageFilter: {},
    viewer: {
        fitScreen: false,
        defaultStart: false,
    }
}

const DEFAULT_VAULT = {
    htmlSaver: {},
    urlSort: [],
    nextPageUrl: "",
    prevPageUrl: "",
}

class Vault {
    static instance = null;

    constructor() {
        if (Vault.instance) return Vault.instance;

        this.config = localStorage.getItem("aralive_helper_config") 
            ? JSON.parse(localStorage.getItem("aralive_helper_config")) 
            : {...DEFAULT_CONFIG}
        this.data = {...DEFAULT_VAULT}
        this.gallery = null

        Vault.instance = this;
    }

    getEventType() {
        const gallery = this.gallery;
        if (gallery !== null && (gallery.showing || gallery.isShown || gallery.showing)) return "VIEWER";
        return "DEFAULT"
    }

    getHtml(url) {
        if (!this.data.htmlSaver.hasOwnProperty(btoa(url))) return;
        return this.data.htmlSaver[btoa(url)];
    }

    setHtml(url, html) {
        if (this.data.htmlSaver.hasOwnProperty(btoa(url))) return;
        this.data.urlSort.push(url)

        if (this.data.urlSort > 10) {
            const u = this.data.urlSort.shift()
            delete this.data.htmlSaver[u];
        }

        this.data.htmlSaver[btoa(url)] = html
    }

    getPageFilter(channelId) {
        if (!channelId in this.config.pageFilter) return;
        return this.config.pageFilter[channelId]
    }

    setPageFilter(channelId, pageFilter) {
        this.config.pageFilter[channelId] = pageFilter
        this.setPageUrl()
        this.saveConfig()
    }

    setViewerConfig(config) {
        this.config.viewer = config
        this.saveConfig()
    }
    
    saveConfig() {
        localStorage.setItem("aralive_helper_config", JSON.stringify(this.config))
    }
    
    filterLink(rows) {
        rows = rows.filter(ele => !($(ele).hasClass("notice") || $(ele).hasClass("head") || $(ele).attr("href").includes("#c_")))

        const channelId = getChannelId()
        
        let pageFilter = this.getPageFilter(channelId)

        if (pageFilter === undefined) {
            pageFilter = {
                include: [],
                exclude: []
            }
        }

        let { include, exclude } = pageFilter

        if (include.length == 0 && exclude.length == 0) {
            return rows;
        }

        return rows.filter(ele => {
            let eleText = $(ele).find(".badge-success").text()

            let isInclude = include.length != 0 ? include.reduce((prev, cur) => prev || eleText.includes(cur), false) : true
            let isExclude = exclude.length != 0 ? exclude.reduce((prev, cur) => prev && !eleText.includes(cur) && !(eleText.length == 0 && cur == '노탭'), true) : true

            return isInclude && isExclude
        })
    }

    getNextPageUrl() {
        let href = undefined;

        let articleId = getArticleId()

        let rows = (articleId === undefined) 
            ? this.filterLink($(`a.vrow.column`).nextAll().get()) 
            : this.filterLink($(`a.vrow.column[href="${location.pathname + location.search}"]`).nextAll().get())

        if (rows.length === 0) {
            let page = $(".page-item.active").next()
            href = page.find("a").attr("href")
        } else {
            href = rows[0].href
        }

        return href;
    }

    getPrevPageUrl() {
        let href = undefined;

        let articleId = getArticleId()

        let rows = (articleId === undefined) 
            ? this.filterLink($(`a.vrow.column`).prevAll().get()) 
            : this.filterLink($(`a.vrow.column[href="${location.pathname + location.search}"]`).prevAll().get())

        if (rows.length === 0) {
            let page = $(".page-item.active").prev()
            href = page.find("a").attr("href")
        } else {
            href = rows[0].href
        }

        return href;
    }

    setPageUrl() {
        this.data.nextPageUrl = this.getNextPageUrl()
        this.data.prevPageUrl = this.getPrevPageUrl()

        if (!this.data.htmlSaver.hasOwnProperty(btoa(this.data.nextPageUrl))) {
            fetch(this.data.nextPageUrl)
                .then(res => res.text())
                .then(res => this.setHtml(this.data.nextPageUrl, res));
        }

        if (this.data.prevPageUrl == undefined) return;

        if (!this.data.htmlSaver.hasOwnProperty(btoa(this.data.prevPageUrl))) {
            fetch(this.data.prevPageUrl)
                .then(res => res.text())
                .then(res => this.setHtml(this.data.prevPageUrl, res));
        }
    }
    
    setGallery(g) {
        this.gallery = g
    }

    runViewer(f) {
        if (this.gallery == null) return;
        f(this.gallery)
    }
}

export { Vault }