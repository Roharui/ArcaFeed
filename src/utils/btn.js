import { nextPageConfigModal } from "../event/nomal/modal";
import { nextPage, prevPage } from "../event/nomal/next";
import { clearSeries } from "../event/nomal/series";
import { Vault } from "../vault";
import { EVENT_TYPE } from "../vault/eventType";

function toggleBtn (flag) {
    if (!flag) {
        $(".btn-wrapper").remove()
        return;
    }

    const btnWrapper = $("<div>", {class:"btn-wrapper"});
        
    const prevBtn = $("<div>", {class:"helper-btn"});
    prevBtn.append($("<span>", {class: "ion-android-arrow-back"}))

    prevBtn.on("click", function(){
        const v = new Vault()

        if (v.getEventType() === EVENT_TYPE.VIEWER) {
            v.runViewer((g) => g.prev())
        } else {
            prevPage()
        }
    })

    const nextBtn = $("<div>", {class:"helper-btn"});
    nextBtn.append($("<span>", {class: "ion-android-arrow-forward"}))

    nextBtn.on("click", function(){
        const v = new Vault()

        if (v.getEventType() === EVENT_TYPE.VIEWER) {
            v.runViewer((g) => g.next())
        } else {
            nextPage()
        }
    })

    const clearSeriesBtn = $("<div>", {class:"helper-btn"});
    clearSeriesBtn.append($("<span>", {class: "ion-trash-a"}))

    clearSeriesBtn.on("click", function(){
        clearSeries()
    })

    const pageModal = $("<div>", {class:"helper-btn"});
    pageModal.append($("<span>", {class: "ion-hammer"}))

    pageModal.on("click", function(){
        nextPageConfigModal()
    })

    btnWrapper.append(pageModal)
    btnWrapper.append(clearSeriesBtn)
    btnWrapper.append(prevBtn)
    btnWrapper.append(nextBtn)

    $("body").append(btnWrapper)
}

export { toggleBtn }