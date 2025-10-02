import type { ArticleFilterImpl } from '@/types';
import type { Vault } from '@/vault';

class ArticleBase {
  articleList: string[] = [];
  articleFilterConfig: ArticleFilterImpl = { tab: [], title: [] };

  consturctor(v: Vault) {
    this.articleList = v.config.articleList;
    this.articleFilterConfig = v.config.articleFilterConfig[
      v.href.channelId
    ] || { tab: [], title: [] };
  }
}

export { ArticleBase };
