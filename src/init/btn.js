import { toggleViewer } from "../event/viewer";
import { toggleFullScreen } from "../utils/fullscreen";
import { initConfigModal, nextPageConfigModal } from "../utils/modal";
import { toPage } from "../utils/toPage";
import { Vault } from "../vault";

const v = new Vault()

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

    const pageModalBtn = createHelperBtn("ion-hammer", nextPageConfigModal)

    const settingModalBtn = createHelperBtn("ion-ios-gear", initConfigModal)

    const fullScreenBtn = createHelperBtn("ion-android-expand", toggleFullScreen)

    const imageViewBtn = createHelperBtn("ion-android-image", toggleViewer)
    
    if (location.href.includes("/b/")) {        
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

    const prevBtn = createPageBtn("ion-android-arrow-back", () => toPage(false))

    const nextBtn = createPageBtn("ion-android-arrow-forward", () => toPage(true))

    nextBtnWrapper.append(nextBtn)
    prevBtnWrapper.append(prevBtn)

    $("body").append(nextBtnWrapper)
    $("body").append(prevBtnWrapper)
}

function toggleBtn() {
    $(".btn-wrapper").remove()
    $(".next-btn").remove()
    $(".prev-btn").remove()
    
    helperBtn()
    pagenationBtn()
}

export { toggleBtn }