import { Reveal } from "./reveal";

const ITEMS = [
  "85+ Church Fathers",
  "Catena Aurea",
  "Daily readings & saints",
  "Multiple translations",
  "Prayer rule",
  "Parishes & monasteries",
];

export function BreadthBand() {
  return (
    <Reveal>
      <div className="rule-gilt" />
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-9">
        {ITEMS.map((item, i) => (
          <li key={item} className="flex items-center gap-5">
            <span className="font-serif text-base italic text-ink-muted">
              {item}
            </span>
            {i < ITEMS.length - 1 && (
              <span aria-hidden="true" className="text-accent/50">
                ·
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="rule-gilt" />
    </Reveal>
  );
}
