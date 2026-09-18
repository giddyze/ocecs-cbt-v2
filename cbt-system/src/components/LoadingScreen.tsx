import Image from "next/image";

export default function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-brand-teal/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-teal animate-spin" />
        <div className="absolute inset-2 rounded-full bg-white shadow-sm flex items-center justify-center">
          <Image src="/logo.png" alt="OCECS" width={28} height={28} className="object-contain" />
        </div>
      </div>
      <p className="text-sm text-slate-500 font-medium animate-pulse">{label}</p>
    </div>
  );
}
