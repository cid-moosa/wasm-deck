type BrandMarkProps = {
  compact?: boolean;
};

export default function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <span className={`brand-lockup${compact ? " brand-lockup--compact" : ""}`}>
      <svg className="brand-symbol" viewBox="0 0 40 40" aria-hidden="true">
        <rect x="1" y="1" width="38" height="38" rx="12" fill="currentColor" />
        <path
          d="M9 12.5 13.6 27l4.3-10.1L22.4 27 27 12.5"
          fill="none"
          stroke="#171914"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.8"
        />
        <circle cx="31.2" cy="13" r="1.8" fill="#171914" />
        <circle cx="31.2" cy="20" r="1.8" fill="#171914" opacity=".55" />
      </svg>
      {!compact && (
        <span className="brand-wordmark" aria-label="WASM Deck">
          <span>WASM</span><b>//</b><span>DECK</span>
        </span>
      )}
    </span>
  );
}
