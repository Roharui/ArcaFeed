import { Vault } from "../vault"

function nextComment() {
    let v = new Vault()
    if (v.viewer) {
        return
    }

    if (v.currentComment == null) {
        v.currentComment = $("div.article-comment div.comment-item").attr("id")
    } 

    $('html, body').animate({ scrollTop: $("#" + v.currentComment).offset().top }, 200)
    
    if ($("div.article-comment div.comment-item:last").attr("id") === v.currentComment) {
        var x = document.querySelector("div.article-comment li.page-item.active + li > a")
        
        if (x == undefined) {
            return
        }
        
        location.href = x.href
        return;
    }
    
    v.currentComment = $("#" + v.currentComment).parent().next("div.comment-wrapper").find("div.comment-item").attr("id")
}

function prevComment() {
    let v = new Vault()
    if (v.viewer) {
        return
    }

    if (v.currentComment == null) {
        v.currentComment = $("div.article-comment div.comment-item:last").attr("id")
    }
    
    $('html, body').animate({ scrollTop: $("#" + v.currentComment).offset().top }, 200)
    
    if ($("div.article-comment div.comment-item:first").attr("id") === v.currentComment) {
        var x = $("div.article-comment li.page-item.active").prev("li").find("a")

        if (!x.length) {
            return
        }
        
        location.href = x.attr("href")
        return;
    }
    
    v.currentComment = $("#" + v.currentComment).parent().prev("div.comment-wrapper").find("div.comment-item").attr("id")
}

export { nextComment, prevComment }