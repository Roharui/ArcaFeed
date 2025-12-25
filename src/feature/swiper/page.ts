import type { PageMode, PromiseFunc, PromiseFuncResult } from '@/types';
import type { Param, VaultFull } from '@/vault';

// For Event
function nextLinkForce({ v }: Param) {
  window.location.href = (v as { nextArticleUrl: string }).nextArticleUrl;
}

// For Event
function toLink(mode: PageMode): PromiseFunc {
  return ({ v }: Param): PromiseFuncResult => {
    const { nextArticleUrl, prevArticleUrl } = v as VaultFull;

    const url = mode === 'NEXT' ? nextArticleUrl : prevArticleUrl;

    if (url === 'none') return;

    window.location.replace(url);
  };
}

export { nextLinkForce, toLink };
