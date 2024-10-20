function isFullscreen() {
  return (
    (document.fullscreenElement && document.fullscreenElement !== null) ||
    (document.webkitFullscreenElement &&
      document.webkitFullscreenElement !== null) ||
    (document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
    (document.msFullscreenElement && document.msFullscreenElement !== null)
  );
}

function toggleFullScreen() {
  if (isFullscreen()) {
    const cancellFullScreen =
      document.exitFullscreen ||
      document.mozCancelFullScreen ||
      document.webkitExitFullscreen ||
      document.msExitFullscreen;
    cancellFullScreen.call(document);
  } else {
    var elem = document.documentElement;
    var rfs =
      elem.requestFullscreen ||
      elem.webkitRequestFullScreen ||
      elem.mozRequestFullScreen ||
      elem.msRequestFullScreen;
    rfs.call(elem);
  }
}

export { isFullscreen, toggleFullScreen };
