function getChannelId(url) {
  const pathname = url ?? location.pathname;
  const pathnameSplit = pathname.split('/b/');
  if (pathnameSplit.length < 2) return;
  return pathnameSplit[1].split('/')[0];
}

function getArticleId(url) {
  const pathname = url ?? location.pathname;
  const pathnameSplit = pathname.split('/b/');
  if (pathnameSplit.length < 2) return;
  const afterChannelId = pathnameSplit[1].split('/');
  if (afterChannelId.length < 2) return;
  return afterChannelId[1].split('/')[0];
}

export { getArticleId, getChannelId };
