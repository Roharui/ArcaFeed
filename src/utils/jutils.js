function style(css) {
  $('head').append($('<style>', { text: css }));
}

function styleHide(selector) {
  $('head').append($('<style>', { text: `${selector} { display: none; }` }));
}

function hide(selector) {
  $(selector).hide();
}

function show(selector) {
  $(selector).show();
}

function remove(selector) {
  $(selector).remove();
}

export { style, styleHide, hide, show, remove };
