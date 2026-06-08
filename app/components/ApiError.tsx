type Props = {
  t: { title: string; desc: string; cta_bot: string; cta_channel: string };
};

export default function ApiError({ t }: Props) {
  return (
    <div className="bg-bisque border border-line rounded-card p-8 text-center">
      <div className="text-3xl mb-4">🎾</div>
      <h3 className="font-serif text-lg font-semibold mb-2">{t.title}</h3>
      <p className="font-sans text-sm text-muted leading-relaxed mb-8 max-w-sm mx-auto">
        {t.desc}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="https://t.me/tennis_analyst_rafik_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-green text-sand font-sans font-semibold px-5 py-2.5 rounded-full hover:bg-green-deep transition-colors text-sm"
        >
          <TelegramIcon />
          {t.cta_bot}
        </a>
        <a
          href="https://t.me/tennismind"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 border border-clay/40 text-clay font-sans font-semibold px-5 py-2.5 rounded-full hover:bg-clay/10 transition-colors text-sm"
        >
          <TelegramIcon />
          {t.cta_channel}
        </a>
      </div>
    </div>
  );
}

function TelegramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
