"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function LocaleSwitcherLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);

  const currentLocale = pathname.split("/")[1] || "bg";

  const switchLocale = (locale: string) => {
    const segments = pathname.split("/");
    segments[1] = locale;
    const newPath = segments.join("/");
    return newPath + (params.toString() ? `?${params}` : "");
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={switchLocale("bg")}
        className={`rounded-md px-2 py-1 transition-colors ${currentLocale === "bg" ? "bg-primary text-white" : "text-muted-foreground"} hover:bg-primary/10`}
      >
        BG
      </Link>
      <Link
        href={switchLocale("en")}
        className={`rounded-md px-2 py-1 transition-colors ${currentLocale === "en" ? "bg-primary text-white" : "text-muted-foreground"} hover:bg-primary/10`}
      >
        EN
      </Link>
    </div>
  );
}

function LocaleSwitcherFallback() {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-md px-2 py-1 text-muted-foreground">BG</span>
      <span className="rounded-md px-2 py-1 text-muted-foreground">EN</span>
    </div>
  );
}

export function LocaleSwitcher() {
  return (
    <Suspense fallback={<LocaleSwitcherFallback />}>
      <LocaleSwitcherLinks />
    </Suspense>
  );
}
