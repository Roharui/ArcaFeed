/**
 * Pure article-filter rules.
 *
 * This module intentionally has no DOM or jQuery dependency so the matching
 * semantics can be exercised with Node's built-in test runner.
 */

interface ArticleFilterRule {
  allowedTabs: ReadonlySet<string> | null;
  excludedTitles: readonly string[];
}

function normalizeFilterTokens(tokens: readonly string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const value = token.trim();
    if (!value || seen.has(value)) continue;

    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

function createArticleFilterRule(
  tabCategories: readonly string[],
  titleKeywords: readonly string[],
): ArticleFilterRule {
  const normalizedTabs = normalizeFilterTokens(tabCategories);

  return {
    allowedTabs: normalizedTabs.length > 0 ? new Set(normalizedTabs) : null,
    excludedTitles: normalizeFilterTokens(titleKeywords),
  };
}

function matchesArticleFilter(
  rule: ArticleFilterRule,
  tabType: string,
  title: string,
): boolean {
  const tabAllowed =
    rule.allowedTabs === null || rule.allowedTabs.has(tabType.trim());
  const titleAllowed = rule.excludedTitles.every(
    (keyword) => !title.includes(keyword),
  );

  return tabAllowed && titleAllowed;
}

export { createArticleFilterRule, matchesArticleFilter, normalizeFilterTokens };

export type { ArticleFilterRule };
