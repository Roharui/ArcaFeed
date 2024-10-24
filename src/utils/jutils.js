function style(css) {
  $('head').append($('<style>', { text: css }));
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

export { style, hide, show, remove };
