import { toggleFullScreen } from "../event/nomal/fullscreen";
import { initConfigModal, nextPageConfigModal } from "../event/nomal/modal";
import { nextPage, prevPage } from "../event/nomal/next";
import { clearSeries } from "../event/nomal/series";
import { toggleViewer } from "../event/viewer";
import { Vault } from "../vault";
import { EVENT_TYPE } from "../vault/eventType";

function createPageBtn(icon, callback) {
    const btn = $("<div>", {class:"helper-btn page-btn"});
    btn.append($("<span>", {class: icon}))

    btn.on("click", callback)

    return btn
}

function createHelperBtn(icon, callback) {
    const btn = $("<div>", {class:"helper-btn"});
    btn.append($("<span>", {class: icon}))

    btn.on("click", callback)

    return btn
}

function helperBtn () {
    const btnWrapper = $("<div>", {class:"btn-wrapper"});

    const firstLine = $("<div>", {class: "btn-line"})
    const secondLine = $("<div>", {class: "btn-line"})

    const clearSeriesBtn = createHelperBtn("ion-trash-a", clearSeries)

    const pageModalBtn = createHelperBtn("ion-hammer", nextPageConfigModal)

    const settingModalBtn = createHelperBtn("ion-ios-gear", initConfigModal)

    const fullScreenBtn = createHelperBtn("ion-android-expand", toggleFullScreen)

    const imageViewBtn = createHelperBtn("ion-android-image", toggleViewer)
    
    if (location.href.includes("/b/")) {        
        firstLine.append(clearSeriesBtn)
        firstLine.append(pageModalBtn)

        secondLine.append(fullScreenBtn)
        secondLine.append(imageViewBtn)
    }

    firstLine.append(settingModalBtn)

    btnWrapper.append(secondLine)
    btnWrapper.append(firstLine)

    $("body").append(btnWrapper)
}

function pagenationBtn () {
    if (!location.href.includes("/b/")) {   
        return;
    }
    
    const nextBtnWrapper = $("<div>", {class:"next-btn"});
    const prevBtnWrapper = $("<div>", {class:"prev-btn"});

    const prevBtn = createPageBtn("ion-android-arrow-back", function(){
        const v = new Vault()

        if (v.getEventType() === EVENT_TYPE.VIEWER) {
            v.runViewer((g) => g.prev())
        } else {
            prevPage()
        }
    })

    const nextBtn = createPageBtn("ion-android-arrow-forward", function(){
        const v = new Vault()

        if (v.getEventType() === EVENT_TYPE.VIEWER) {
            v.runViewer((g) => g.next())
        } else {
            nextPage()
        }
    })

    nextBtnWrapper.append(nextBtn)
    prevBtnWrapper.append(prevBtn)

    $("body").append(nextBtnWrapper)
    $("body").append(prevBtnWrapper)
}

function toggleBtn (flag) {
    $(".btn-wrapper").remove()
    $(".next-btn").remove()
    $(".prev-btn").remove()
    
    if (!flag) {
        return;
    }
    
    helperBtn()
    pagenationBtn()
}

export { toggleBtn }