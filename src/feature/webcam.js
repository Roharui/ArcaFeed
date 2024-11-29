import Webcam from 'webcamjs';

import { Vault } from 'src/vault';
import { toNextPage, toPrevPage } from './toPage';

const v = new Vault();

var isOn = false;
var flag = 'stop';

function success(e) {
  const { check } = JSON.parse(e.response);

  if (check === 'stop') return;

  if (check === 'next') {
    if (v.isViewerActive()) {
      v.runViewer((g) => g.next());
    } else {
      toNextPage();
    }
    $('.root-container').attr('style', 'border-top: 5px solid lightgreen');
  }

  if (check === 'prev') {
    $('.root-container').attr('style', 'border-top: 5px solid red');
  }

  if (flag == 'prev' && check === 'prev') {
    if (v.isViewerActive()) {
      v.runViewer((g) => g.prev());
    } else {
      toPrevPage();
    }
  }

  flag = check;
}

function request(data) {
  GM.xmlHttpRequest({
    method: 'POST',
    url: 'https://test.roharui.site/upload',
    headers: {
      'Content-Type': 'text/plain',
    },
    data: data,
    fetch: true,
    onload: function (e) {
      success(e);
      setTimeout(loop, 3000);
    },
  });
}

function loop() {
  Webcam.snap(request);
}

function webcamSnapToggle() {
  alert('IN PROGRESS');

  return;

  if (isOn) {
    location.reload();
    return;
  }
  isOn = true;

  $('.footer').append(
    $('<div>', {
      id: 'webcam',
      width: '640px',
      height: '640px',
    }),
  );

  Webcam.attach('#webcam');
  $('.root-container').attr('style', 'border-top: 5px solid lightgreen');

  Webcam.on('load', loop);
}

export { webcamSnapToggle };
