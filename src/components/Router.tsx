import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

// Minimal client-side router using hash-based navigation
type Route = {
  pattern: RegExp;
  params?: string[];
};

const ROUTES: Record<string, Route> = {
  '/': { pattern: /^\/$/ },
  '/login': { pattern: /^\/login$/ },
  '/signup': { pattern: /^\/signup$/ },
  '/dashboard': { pattern: /^\/dashboard$/ },
  '/leads/new': { pattern: /^\/leads\/new$/ },
  '/leads/:id': { pattern: /^\/leads\/([^/]+)$/, params: ['id'] },
  '/team': { pattern: /^\/team$/ },
  '/profile': { pattern: /^\/profile$/ },
};

function getPath(): string {
  return window.location.pathname || '/';
}

export function matchRoute(path: string): { route: string; params: Record<string, string> } | null {
  for (const [name, config] of Object.entries(ROUTES)) {
    const match = path.match(config.pattern);
    if (match) {
      const params: Record<string, string> = {};
      if (config.params) {
        config.params.forEach((p, i) => { params[p] = match[i + 1]; });
      }
      return { route: name, params };
    }
  }
  return null;
}

export function navigate(to: string) {
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRouter() {
  const [path, setPath] = useState(getPath);
  const update = useCallback(() => setPath(getPath()), []);
  useEffect(() => {
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, [update]);
  const matched = matchRoute(path);
  return { path, route: matched?.route ?? null, params: matched?.params ?? {} };
}

interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function Link({ href, children, className }: LinkProps) {
  return (
    <a
      href={href}
      className={className}
      onClick={e => {
        e.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}
