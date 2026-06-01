import Image from "next/image";

// Stylized "Library" screen — a grid of the Fathers, real icons from
// /public/icons so the faces are genuine.

const FATHERS: ReadonlyArray<readonly [string, string]> = [
  ["icon-john-chrysostom.jpg", "Chrysostom"],
  ["icon-basil-the-great.jpg", "Basil"],
  ["icon-gregory-the-theologian.jpg", "Gregory"],
  ["icon-athanasius-the-great.jpg", "Athanasius"],
  ["icon-john-of-damascus.jpg", "Damascene"],
  ["icon-maximus-the-confessor.jpg", "Maximus"],
  ["icon-gregory-of-nyssa.jpg", "Nyssa"],
  ["icon-cyril-of-alexandria.jpg", "Cyril"],
  ["icon-ephraim-the-syrian.jpg", "Ephraim"],
  ["icon-gregory-palamas.jpg", "Palamas"],
  ["icon-symeon-the-new-theologian.jpg", "Symeon"],
  ["icon-justin-the-philosopher.jpg", "Justin"],
];

export function LibraryScreen() {
  return (
    <div className="flex h-full flex-col bg-background text-ink">
      <div className="px-4 pb-1 pt-10">
        <p className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
          The Library
        </p>
        <p className="mt-0.5 font-serif text-[18px] text-ink">The Fathers</p>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-3 px-3 pt-2">
        {FATHERS.map(([src, name]) => (
          <div key={src} className="flex flex-col items-center gap-1">
            <div className="relative h-[52px] w-[52px] overflow-hidden rounded-full ring-1 ring-line-gilt">
              <Image
                src={`/icons/${src}`}
                alt=""
                fill
                sizes="52px"
                className="object-cover"
              />
            </div>
            <p className="text-[8px] text-ink-muted">{name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
