'use client';

// components/np/Md.tsx — a tiny, safe Markdown renderer for the coach's answers.
// Supports: # / ## / ### headings, **bold**, `inline code`, ``` code blocks, "-", "*" and "1." lists,
// paragraphs. Everything becomes React elements (no innerHTML), so model output can never inject
// markup. Anything it does not understand stays plain text.

import { Fragment, useState, type ReactElement, type ReactNode } from 'react';

function inline(text: string, keyBase: string): ReactNode[] {
  // split on **bold** and `code`
  const out: ReactNode[] = [];
  const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      out.push(
        <strong key={`${keyBase}b${i}`} className="font-semibold text-np-text">
          {tok.slice(2, -2)}
        </strong>
      );
    } else {
      out.push(
        <code key={`${keyBase}c${i}`} className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-np-text">
          {tok.slice(1, -1)}
        </code>
      );
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function CodeBlock({ code, copyLabel }: { code: string; copyLabel: string }): ReactElement {
  const [done, setDone] = useState(false);
  return (
    <div className="relative my-3 overflow-hidden rounded-np-ctrl border border-np-line bg-black/40">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(code).then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          });
        }}
        className="absolute right-2 top-2 rounded-md border border-np-line bg-white/5 px-2 py-0.5 text-[11px] font-medium text-np-text-2 hover:text-np-text"
      >
        {done ? '✓' : copyLabel}
      </button>
      <pre className="overflow-x-auto p-3 pr-24 font-mono text-[13px] leading-relaxed text-np-text">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function Md({ text, copyLabel = 'Copy' }: { text: string; copyLabel?: string }): ReactElement {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    // fenced code
    if (line.trim().startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence (or end of text while streaming)
      blocks.push(<CodeBlock key={`k${k++}`} code={buf.join('\n')} copyLabel={copyLabel} />);
      continue;
    }
    // headings
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push(
        <p key={`k${k++}`} className={`${h[1].length === 1 ? 'text-lg' : 'text-base'} mt-3 font-bold tracking-tight text-np-text first:mt-0`}>
          {inline(h[2], `h${k}`)}
        </p>
      );
      i++;
      continue;
    }
    // lists
    const bullet = /^\s*[-*•]\s+(.*)$/;
    const numbered = /^\s*(\d+)[.)]\s+(.*)$/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? numbered.test(lines[i]) : bullet.test(lines[i]))) {
        const mm = (ordered ? numbered : bullet).exec(lines[i]);
        items.push(mm ? mm[ordered ? 2 : 1] : lines[i]);
        i++;
      }
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={`k${k++}`} className={`my-2 space-y-1.5 pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-np-text-3`}>
          {items.map((it, n) => (
            <li key={n} className="pl-1">
              {inline(it, `l${k}${n}`)}
            </li>
          ))}
        </Tag>
      );
      continue;
    }
    // paragraph: consecutive plain lines
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !bullet.test(lines[i]) &&
      !numbered.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`k${k++}`} className="my-2 first:mt-0 last:mb-0">
        {buf.map((b, n) => (
          <Fragment key={n}>
            {n > 0 && <br />}
            {inline(b, `p${k}${n}`)}
          </Fragment>
        ))}
      </p>
    );
  }
  return <div className="break-words text-[15px] leading-relaxed text-np-text">{blocks}</div>;
}
