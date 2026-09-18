import Image from "next/image";

// A faint, oversized, rotated logo sitting behind page content — the
// "official document" watermark treatment. Purely decorative, absolutely
// positioned, non-interactive (pointer-events-none) so it never interferes
// with anything on top of it. Cheap: one static image, no animation.
export default function Watermark({ opacity = 0.05 }: { opacity?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
      style={{ opacity }}
      aria-hidden="true"
    >
      <div className="w-[140%] h-[140%] relative -rotate-12">
        <Image src="/logo.png" alt="" fill className="object-contain" />
      </div>
    </div>
  );
}
