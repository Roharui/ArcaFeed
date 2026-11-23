import {
  articleWindow,
  compactNavigationArticles as compactArticles,
  findArticleIndex,
  sessionArticleLimit,
} from '@feed/core/vault/article-window';
import { parseHref } from '@/utils/regex';

export { articleWindow, findArticleIndex, sessionArticleLimit };

export function compactNavigationArticles(
  articles: string[],
  path: string,
  hint = -1,
  seriesChannels: readonly string[] = [],
  preserveCompleteList = false,
): string[] {
  return compactArticles(
    articles,
    path,
    hint,
    seriesChannels,
    preserveCompleteList,
    parseHref,
  );
}
