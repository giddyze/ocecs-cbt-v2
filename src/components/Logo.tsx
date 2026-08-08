import Image from "next/image";

export default function Logo({
  size = 40,
  showText = true,
  textClassName = "text-white",
  variant = "light"
}: {
  size?: number;
  showText?: boolean;
  textClassName?: string;
  variant?: "light" | "dark";
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex-none rounded-full bg-white shadow-sm ring-1 ring-black/5"
        style={{ width: size, height: size }}
      >
        <Image src="/logo.png" alt="OCECS logo" fill className="object-contain p-0.5" priority />
      </div>
      {showText && (
        <div className={textClassName}>
          <p className="font-bold leading-tight tracking-tight">OCECS CBT</p>
          <p className={`text-[11px] leading-tight ${variant === "light" ? "opacity-75" : "opacity-60"}`}>
            Examination Platform
          </p>
        </div>
      )}
    </div>
  );
}
