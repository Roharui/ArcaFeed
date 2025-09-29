function createHelperBtn(icon, callback) {
  const btn = $('<div>', { class: 'helper-btn' });
  btn.append($('<span>', { class: icon }));

  btn.on('click', callback);

  return btn;
}

function btnWrapper(cls, content) {
  const btnWrapperDiv = $('<div>', { class: cls });

  content.reverse().forEach((btn) => {
    btnWrapperDiv.append(btn);
  });

  return btnWrapperDiv;
}

export class ButtonManager {
  initHelperBtn() {
    const showCommentModal = createHelperBtn('ion-chatboxes', () =>
      this.doHide('Comment'),
    );
    const showArticleList = createHelperBtn('ion-link', () =>
      this.doHide('List'),
    );
    const nextPageBtn = createHelperBtn('ion-ios-arrow-forward', () =>
      this.nextLink(),
    );
    const filterPageBtn = createHelperBtn('ion-ios-gear', () =>
      this.openArticleFilterModal(),
    );

    const btns = [];

    if (this.mode === 'ARTICLE') {
      btns.push(showArticleList);
      btns.push(showCommentModal);
    }
    if (this.mode === 'CHANNEL') {
      btns.push(nextPageBtn);
    }

    btns.push(filterPageBtn);

    $('body').append(btnWrapper('btn-wrapper right', btns));
  }
}
