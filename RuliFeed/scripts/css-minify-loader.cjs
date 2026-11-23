'use strict';

/**
 * Minify CSS without altering calc() operators, media queries, pseudo-classes,
 * or quoted string / url() contents.
 */
function minifyCss(source) {
  const preserved = [];
  const hold = (match) => {
    const index = preserved.push(match) - 1;
    return `\u0000${index}\u0000`;
  };

  const withoutComments = source
    .replace(
      /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\(\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^)]*)\s*\)/g,
      hold,
    )
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const minified = withoutComments
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,])\s*/g, '$1')
    .replace(/:\s+/g, ':')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/;}/g, '}')
    .trim();

  return minified.replace(/\u0000(\d+)\u0000/g, (_, index) => preserved[index]);
}

module.exports = function cssMinifyLoader(source) {
  return minifyCss(source);
};
module.exports.minifyCss = minifyCss;
