import { Fragment } from 'react';

/**
 * Small, safe markdown renderer for advisor replies (no HTML injection):
 * paragraphs, ### headings, - / 1. lists, | tables |, **bold**, *italic*,
 * `code`, and [n] citation markers rendered as clickable chips.
 */
function Inline({ text, onCite }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[\d+(?:,\s*\d+)*\])/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-fg">{part.slice(2, -2)}</strong>;
    if (/^\*[^*]/.test(part) && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="rounded bg-white/[0.06] px-1 py-0.5 text-[12.5px]">{part.slice(1, -1)}</code>;
    const cite = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
    if (cite) {
      return cite[1].split(',').map((n) => (
        <button key={`${i}-${n}`} type="button" onClick={() => onCite?.(Number(n.trim()))}
          className="mx-0.5 inline-grid h-[18px] min-w-[18px] -translate-y-px place-items-center rounded-md border border-ai/30 bg-ai/10 px-1 align-middle text-[10.5px] font-medium text-ai hover:bg-ai/20">
          {n.trim()}
        </button>
      ));
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export default function Markdown({ text, onCite }) {
  // Some models cite with full-width brackets: keep 【1】 as a [1] citation, drop tool-style ones (【plan_goal】).
  const lines = (text || '').replace(/【\s*(\d+(?:\s*,\s*\d+)*)\s*】/g, '[$1]').replace(/【[^】]*】/g, '').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) rows.push(lines[i].trim().slice(1, -1).split('|').map((c) => c.trim()));
        i += 1;
      }
      blocks.push({ type: 'table', rows });
      continue;
    }
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (heading) blocks.push({ type: 'h', text: heading[1] });
    else if (line.trim()) blocks.push({ type: 'p', text: line });
    i += 1;
  }

  return (
    <div className="space-y-2.5">
      {blocks.map((b, idx) => {
        if (b.type === 'h') return <p key={idx} className="pt-1 text-[13px] font-semibold text-fg"><Inline text={b.text} onCite={onCite} /></p>;
        if (b.type === 'list') {
          return (
            <ul key={idx} className="space-y-1.5">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2"><span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-brand-400" /><span><Inline text={item} onCite={onCite} /></span></li>
              ))}
            </ul>
          );
        }
        if (b.type === 'table' && b.rows.length) {
          const [head, ...body] = b.rows;
          return (
            <div key={idx} className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-[12.5px]">
                <thead className="bg-white/[0.03]"><tr>{head.map((h, j) => <th key={j} className="px-3 py-2 text-left font-medium text-fg"><Inline text={h} onCite={onCite} /></th>)}</tr></thead>
                <tbody className="divide-y divide-line">
                  {body.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} className="px-3 py-1.5"><Inline text={c} onCite={onCite} /></td>)}</tr>)}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={idx}><Inline text={b.text} onCite={onCite} /></p>;
      })}
    </div>
  );
}
