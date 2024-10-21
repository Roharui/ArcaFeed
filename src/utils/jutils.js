function style(css) {
  $('head').append($('<style>', { text: css }));
}

function hide(selector) {
  $(selector).hide();
}

function remove(selector) {
  $(selector).remove();
}

export { style, hide, remove };
