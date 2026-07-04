import React, { useEffect, useRef, useState } from "react";

interface LazyMockupProps {
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
}

/**
 * LazyMockup – dynamically loads a component when it becomes visible in the viewport.
 * Usage: <LazyMockup importFn={() => import("./AccountingMockup")} fallback={<div>Loading...</div>} />
 */
export default function LazyMockup({ importFn, fallback = null }: LazyMockupProps) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !Component) {
          importFn()
            .then((mod) => setComponent(() => mod.default))
            .catch(() => setComponent(() => () => <>{fallback}</>));
          observer.disconnect();
        }
      });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [importFn, fallback, Component]);

  return <div ref={ref}>{Component ? <Component /> : fallback}</div>;
}
