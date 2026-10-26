const BROWSER_PATTERNS: Array<[name: string, pattern: RegExp]> = [
  ['Edge', /\bEdg(?:e|A|iOS)?\/(\d+)/],
  ['Opera', /\bOPR\/(\d+)/],
  ['Firefox', /\b(?:Firefox|FxiOS)\/(\d+)/],
  ['Chrome', /(?:\b|Headless)(?:Chrome|CriOS)\/(\d+)/],
  ['Safari', /\bVersion\/(\d+)[\d.]*.*Safari\//]
];

/** "Chrome 131", "Firefox 133"... Order matters: Edge and Opera also say Chrome, Chrome also says Safari. */
export function describeBrowser(userAgent: string): string {
  for (const [name, pattern] of BROWSER_PATTERNS) {
    const match = pattern.exec(userAgent);
    if (match) return `${name} ${match[1]}`;
  }
  return 'unknown browser';
}
