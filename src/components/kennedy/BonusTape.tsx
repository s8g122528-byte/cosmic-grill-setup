import { Flame, Gift, Pizza, Sparkles } from "lucide-react";

type Item = { label: string; Icon: typeof Flame };

const TOP: Item[] = [
  { label: "Malai Boti Platter — Rs 200 Off", Icon: Flame },
  { label: "Second Large Pizza — Half Price", Icon: Pizza },
];

const BOTTOM: Item[] = [
  { label: "Free Delivery Inside Narowal", Icon: Gift },
  { label: "Seekh Kebab Combo — Limited Today", Icon: Sparkles },
];

function Row({ items, reverse }: { items: Item[]; reverse?: boolean }) {
  return (
    <div className="tape-track" data-reverse={reverse ? "true" : undefined}>
      {[0, 1].map((copy) => (
        <div className="tape-row" key={copy} aria-hidden={copy === 1}>
          {items.map(({ label, Icon }, i) => (
            <span className="tape-item" key={`${copy}-${i}`}>
              <Icon className="tape-icon" aria-hidden="true" />
              <span>{label}</span>
              <span className="tape-dot" aria-hidden="true" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function BonusTape() {
  return (
    <section
      className="tape-section"
      aria-label="Today's deals and bonus offers"
    >
      <div className="ticket ticket--gold">
        <span className="ticket-badge">
          <Pizza aria-hidden="true" />
          <span>Crazy Deal</span>
        </span>
        <div className="ticket-window">
          <Row items={TOP} />
        </div>
      </div>
      <div className="ticket ticket--flame">
        <span className="ticket-badge">
          <Gift aria-hidden="true" />
          <span>Today's Bonus</span>
        </span>
        <div className="ticket-window">
          <Row items={BOTTOM} reverse />
        </div>
      </div>
    </section>
  );
}
