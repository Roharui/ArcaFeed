import { Vault } from 'src/vault';
import { render } from './render';

const v = new Vault();

function toNextPage() {
  const href = v.getNextPageUrl();

  render(href);
}

function toPrevPage() {
  const href = v.getPrevPageUrl();

  render(href);
}

export { toNextPage, toPrevPage };
