const PORTFOLIO_URL = 'https://ayushmxxn.com/';
const TWITTER_URL = 'https://x.com/ayushmxxn';

export default function CreditFooter() {
  return (
    <div className="flex items-center justify-center gap-1.5 border-t border-black/[0.06] py-3 text-[11px] text-hammy-ink/40">
      <span>Made by</span>
      <a
        href={PORTFOLIO_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="ayushmxxn's portfolio"
        className="rounded-full transition-transform duration-150 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-hammy-500 focus-visible:ring-offset-2"
      >
        <img
          src="/avatar.webp"
          alt=""
          className="h-4 w-4 rounded-full object-cover ring-1 ring-black/[0.06]"
        />
      </a>
      <a
        href={TWITTER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-hammy-ink/60 transition-colors hover:text-hammy-500 hover:underline"
      >
        @ayushmxxn
      </a>
    </div>
  );
}