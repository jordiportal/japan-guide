const replacements = [
  [/Descripció/gi, 'Descripció'],
  [/Zona/gi, 'Zona'],
  [/Tipus/gi, 'Tipus'],
  [/Lat/gi, 'Lat'],
  [/Lng/gi, 'Lng']
];

export function normalizeCatalanText(input) {
  if (!input) return '';
  let text = input
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>(\n)?/gi, '\n')
    .replace(/\s+\n/g, '\n')
    .trim();
  for (const [pattern, to] of replacements) {
    text = text.replace(pattern, to);
  }
  return text;
}

export function splitJaFromCa(nameOrDesc) {
  if (!nameOrDesc) return { ca: '', ja: '' };
  const jaMatch = nameOrDesc.match(/[\u3040-\u30ff\u3400-\u9fff]+/g);
  const ja = jaMatch ? jaMatch.join(' ') : '';
  const ca = ja ? nameOrDesc.replace(/[\u3040-\u30ff\u3400-\u9fff]+/g, '').trim() : nameOrDesc;
  return { ca, ja };
}

export function ensureTitle(name_ca, description_ca) {
  if (name_ca && name_ca.trim()) return name_ca.trim();
  if (!description_ca) return 'Sense títol';
  const firstLine = description_ca.split('\n').find(Boolean);
  return firstLine ? firstLine.slice(0, 80) : 'Sense títol';
}



