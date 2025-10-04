
function isString(str: string | null | undefined): str is string {
  return !!str;
}

function getRegexMatchByIndex(match: RegExpMatchArray | null, index: number): string {
  if (!match) throw Error("Regex Match is null")
  if (match.length < index) throw Error("Regex Match index is Over");

  const result = match[index];

  if (isString(result)) {
    return result;
  }

  throw Error("Regex Metch is Not String")
}


function getRegexMatchByIndexTry(match: RegExpMatchArray | null, index: number, instade: string): string {
  try {
    if (!match) throw Error("Regex Match is null")
    if (match.length < index) throw Error("Regex Match index is Over");

    const result = match[index];

    if (isString(result)) {
      return result;
    }

    throw Error("Regex Metch is Not String")
  } catch (e) {
    return instade;
  }
}


function isNotNull<T>(obj: T | null | undefined): T {
  if (!obj) throw Error("this Object is Null");
  return obj;
}

export { isString, getRegexMatchByIndex, getRegexMatchByIndexTry, isNotNull }
