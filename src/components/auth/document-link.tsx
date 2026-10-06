'use client';

import type { ComponentProps, MouseEvent } from 'react';
import Link from 'next/link';

type LinkProps = ComponentProps<typeof Link>;

function hrefToString(href: LinkProps['href']) {
  if (typeof href === 'string') return href;
  const pathname = href.pathname ?? '/';
  const query = href.query
    ? `?${new URLSearchParams(href.query as Record<string, string>).toString()}`
    : '';
  return `${pathname}${query}${href.hash ?? ''}`;
}

export function DocumentLink({ href, onClick, ...props }: LinkProps) {
  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        window.location.assign(hrefToString(href));
      }}
    />
  );
}
