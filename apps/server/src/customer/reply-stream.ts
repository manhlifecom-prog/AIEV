// Decode only the reply string from the structured response. Never expose plan JSON.
export function partialReply(json: string): string {
  const start = json.match(/^\s*\{\s*"reply"\s*:\s*"/);
  if (!start) return '';
  let text = '';
  for (let i = start[0].length; i < json.length; i++) {
    const c = json[i];
    if (c === '"') break;
    if (c !== '\\') { text += c; continue; }
    const escape = json[++i];
    if (!escape) break;
    if (escape === 'u') {
      const hex = json.slice(i + 1, i + 5);
      if (!/^[\da-f]{4}$/i.test(hex)) break;
      text += String.fromCharCode(parseInt(hex, 16)); i += 4;
    } else {
      const escaped: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' };
      if (!(escape in escaped)) break;
      text += escaped[escape];
    }
  }
  // A split unicode surrogate must not appear as a replacement character in the UI.
  return text.replace(/[\uD800-\uDBFF]$/, '');
}
