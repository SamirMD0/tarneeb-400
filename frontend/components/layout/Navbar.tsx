'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Container from './Container';

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Home',  href: '/'      },
  { label: 'Lobby', href: '/lobby' },
  { label: 'Login', href: '/login' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname   = usePathname();
  const toggleMenu = () => setMenuOpen((p) => !p);
  const closeMenu  = () => setMenuOpen(false);

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{
        background: 'linear-gradient(180deg, rgba(7,8,15,0.92) 0%, rgba(13,17,23,0.85) 100%)',
        borderBottom: '1px solid rgba(229,85,199,0.12)',
        boxShadow: '0 1px 0 rgba(229,85,199,0.08), 0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <Container>
        <nav
          role="navigation"
          aria-label="Main navigation"
          className="flex items-center justify-between h-16"
        >
          {/* ── Logo ─────────────────────────────────────────── */}
          <Link
            href="/"
            onClick={closeMenu}
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded"
          >
            <span
              aria-hidden="true"
              className="text-xl leading-none"
              style={{ filter: 'drop-shadow(0 0 8px #e555c7)' }}
            >
              ♠
            </span>
            <span
              className="text-lg font-bold tracking-tight"
              style={{
                background: 'linear-gradient(90deg, #e555c7 0%, #55aaff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Tarneeb 400
            </span>
          </Link>

          {/* ── Desktop links ─────────────────────────────────── */}
          <ul role="list" className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className="relative px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 block"
                    style={
                      isActive
                        ? {
                            color: '#e555c7',
                            background: 'rgba(229,85,199,0.1)',
                            border: '1px solid rgba(229,85,199,0.25)',
                            textShadow: '0 0 10px rgba(229,85,199,0.6)',
                            boxShadow: '0 0 12px rgba(229,85,199,0.12)',
                          }
                        : {
                            color: '#94a3b8',
                            background: 'transparent',
                            border: '1px solid transparent',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLAnchorElement).style.color = '#f0f4ff';
                        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)';
                        (e.currentTarget as HTMLAnchorElement).style.border = '1px solid rgba(255,255,255,0.07)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8';
                        (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                        (e.currentTarget as HTMLAnchorElement).style.border = '1px solid transparent';
                      }
                    }}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* ── Mobile toggle ──────────────────────────────────── */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={toggleMenu}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            style={{ color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6"  x2="6"  y2="18" />
                <line x1="6"  y1="6"  x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </nav>

        {/* ── Mobile menu ────────────────────────────────────── */}
        {menuOpen && (
          <div id="mobile-menu" role="region" aria-label="Mobile navigation">
            <ul
              role="list"
              className="md:hidden flex flex-col gap-1 pb-4 pt-2"
              style={{ borderTop: '1px solid rgba(229,85,199,0.1)' }}
            >
              {NAV_LINKS.map(({ label, href }) => {
                const isActive = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={closeMenu}
                      className="block px-4 py-2.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                      style={
                        isActive
                          ? {
                              color: '#e555c7',
                              background: 'rgba(229,85,199,0.1)',
                              border: '1px solid rgba(229,85,199,0.2)',
                              textShadow: '0 0 8px rgba(229,85,199,0.5)',
                            }
                          : {
                              color: '#94a3b8',
                              border: '1px solid transparent',
                            }
                      }
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Container>
    </header>
  );
}