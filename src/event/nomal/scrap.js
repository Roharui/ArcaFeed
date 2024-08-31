
import Toastify from 'toastify-js'

function scrap() {
    Toastify({
        text: "Scrap Complete",
        className: "info",
        style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
        }
    }).showToast();

    $("button.scrap-btn").trigger("click")
}

export { scrap }