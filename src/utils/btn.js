import { toggleFullScreen } from "../event/nomal/fullscreen";
import { initConfigModal, nextPageConfigModal } from "../event/nomal/modal";
import { nextPage, prevPage } from "../event/nomal/next";
import { clearSeries } from "../event/nomal/series";
import { toggleViewer } from "../event/viewer";
import { Vault } from "../vault";
import { EVENT_TYPE } from "../vault/eventType";

function createBtn(icon, callback) {
    const btn = $("<div>", {class:"helper-btn"});
    btn.append($("<span>", {class: icon}))

    btn.on("click", callback)

    return btn
}

function toggleBtn (flag) {
    $(".btn-wrapper").remove()
    
    if (!flag) {
        return;
    }

    const btnWrapper = $("<div>", {class:"btn-wrapper"});

    const firstLine = $("<div>", {class: "btn-line"})
    const secondLine = $("<div>", {class: "btn-line"})

    const prevBtn = createBtn("ion-android-arrow-back", function(){
        const v = new Vault()

        if (v.getEventType() === EVENT_TYPE.VIEWER) {
            v.runViewer((g) => g.prev())
        } else {
            prevPage()
        }
    })

    const nextBtn = createBtn("ion-android-arrow-forward",function(){
        const v = new Vault()

        if (v.getEventType() === EVENT_TYPE.VIEWER) {
            v.runViewer((g) => g.next())
        } else {
            nextPage()
        }
    })

    const clearSeriesBtn = createBtn("ion-trash-a", clearSeries)

    const pageModalBtn = createBtn("ion-hammer", nextPageConfigModal)

    const settingModalBtn = createBtn("ion-ios-gear", initConfigModal)

    const fullScreenBtn = createBtn("ion-android-expand", toggleFullScreen)

    const imageViewBtn = createBtn("ion-android-image", toggleViewer)
    
    if (location.href.includes("/b/")) {
        firstLine.append(nextBtn)
        firstLine.append(prevBtn)
        firstLine.append(clearSeriesBtn)

        secondLine.append(fullScreenBtn)
        secondLine.append(imageViewBtn)
    }

    firstLine.append(settingModalBtn)
    firstLine.append(pageModalBtn)

    btnWrapper.append(secondLine)
    btnWrapper.append(firstLine)

    $("body").append(btnWrapper)
}

export { toggleBtn }