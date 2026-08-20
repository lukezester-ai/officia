// src/components/LocaleSwitcher.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function LocaleSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);

  const currentLocale = pathname.split("/")[1] || "bg"; // default bg

  const switchLocale = (locale: string) => {
    const segments = pathname.split("/");
    segments[1] = locale; // replace locale segment
    const newPath = segments.join("/");
    return newPath + (params.toString() ? `?${params}` : "");
  };

  return (
    <div className="flex gap-2 items-center">
      <Link
        href={switchLocale("bg")}
        className={`px-2 py-1 rounded-md transition-colors ${currentLocale === "bg" ? "bg-primary text-white" : "text-muted-foreground"} hover:bg-primary/10`}
      >
        BG
      </Link>
      <Link
        href={switchLocale("en")}
        className={`px-2 py-1 rounded-md transition-colors ${currentLocale === "en" ? "bg-primary text-white" : "text-muted-foreground"} hover:bg-primary/10`}
      >
        EN
      </Link>
    </div>
  );
}
