import { DOMParser, parseHTML } from 'linkedom';

export function domFixture(body = '') {
  const { document, Event, Element, HTMLElement } = parseHTML(
    `<!doctype html><html><head></head><body>${body}</body></html>`,
  );
  return { document, DOMParser, Event, Element, HTMLElement };
}

export function listingFixture({ rows = [], next } = {}) {
  return domFixture(`
    <div id="board_list">
      <table class="board_list_table"><tbody>
        ${rows
          .map(
            ({ href, category, title }) => `
          <tr class="table_body">
            <td class="divsn">${category ?? ''}</td>
            <td class="subject"><a class="subject_link" href="${href}">${title ?? ''}</a></td>
          </tr>
        `,
          )
          .join('')}
      </tbody></table>
      ${next ? `<span class="btn_num active">1</span><a class="btn_num" href="${next}">2</a>` : ''}
    </div>
  `).document;
}
