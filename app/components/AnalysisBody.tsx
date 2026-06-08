'use client';

import { useState } from 'react';
import ShareButtons from './ShareButtons';

type Props = {
  body: string;
  title: string;
  slug: string;
  t: { read_full: string; hide: string; share_telegram: string; share_whatsapp: string };
};

function renderBody(body: string) {
  const sections = body.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-3">
      {sections.map((section, i) => {
        const trimmed = section.trim();
        if (trimmed.startsWith('## ')) {
          return (
            <h3
              key={i}
              className="font-sans text-xs font-semibold uppercase tracking-wider text-green mt-5 first:mt-0"
            >
              {trimmed.slice(3)}
            </h3>
          );
        }
        return (
          <p key={i} className="font-serif text-sm text-ink/85 leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function AnalysisBody({ body, title, slug, t }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!body) return null;

  return (
    <div className="mt-5 pt-5 border-t border-line">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 font-sans text-xs font-medium text-clay border border-clay/30 px-4 py-2 rounded-full hover:bg-clay/10 transition-colors cursor-pointer"
      >
        {expanded ? t.hide : t.read_full}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.35s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="pt-5">
            {renderBody(body)}
          </div>
        </div>
      </div>

      <ShareButtons title={title} slug={slug} t={{ share_telegram: t.share_telegram, share_whatsapp: t.share_whatsapp }} />
    </div>
  );
}
