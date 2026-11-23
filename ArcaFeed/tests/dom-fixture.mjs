import { DOMParser, parseHTML } from 'linkedom';

export function domFixture(body = '') {
  const { document, Event, Element, HTMLElement } = parseHTML(
    `<!doctype html><html><head></head><body>${body}</body></html>`,
  );
  return { document, DOMParser, Event, Element, HTMLElement };
}

export function listingFixture({ rows = [], next } = {}) {
  return domFixture(`
    <div class="root-container">
      <div class="article-list">
        <div class="list-table table">
          ${rows
            .map(
              ({ href, category, title }) => `
            <a class="vrow column" href="${href}">
              ${category ? `<span class="text-bg-success">${category}</span>` : ''}
              <span class="title">${title ?? ''}</span>
            </a>
          `,
            )
            .join('')}
        </div>
      </div>
      ${next ? `<ul><li class="page-item active"></li><li class="page-item"><a href="${next}"></a></li></ul>` : ''}
    </div>
  `).document;
}
