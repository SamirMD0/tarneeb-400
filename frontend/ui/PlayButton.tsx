import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import Link from 'next/link';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;

type PlayButtonProps = {
  label?: string;
  href?: string;
} & (ButtonProps | AnchorProps);

export default function PlayButton({ label = 'Play', href, ...props }: PlayButtonProps) {
  const commonStyles: React.CSSProperties = {
    '--glow-color': 'rgb(217, 176, 255)',
    '--glow-spread-color': 'rgba(191, 123, 255, 0.781)',
    '--enhanced-glow-color': 'rgb(231, 206, 255)',
    '--btn-color': 'rgb(100, 61, 136)',
    border: '0.25em solid var(--glow-color)',
    padding: '1em 3em',
    color: 'var(--glow-color)',
    fontSize: '15px',
    fontWeight: 'bold',
    backgroundColor: 'var(--btn-color)',
    borderRadius: '1em',
    outline: 'none',
    boxShadow:
      '0 0 1em 0.25em var(--glow-color), 0 0 4em 1em var(--glow-spread-color), inset 0 0 0.75em 0.25em var(--glow-color)',
    textShadow: '0 0 0.5em var(--glow-color)',
    position: 'relative',
    transition: 'all 0.3s',
    cursor: 'pointer',
    display: 'inline-block',
    textDecoration: 'none',
    lineHeight: 'normal',
  } as React.CSSProperties;

  return (
    <span className="relative inline-block">
      {href ? (
        <Link
          href={href}
          {...(props as AnchorProps)}
          style={commonStyles}
          className="play-button"
          aria-label={label}
        >
          {label}
        </Link>
      ) : (
        <button
          {...(props as ButtonProps)}
          style={commonStyles}
          className="play-button"
          aria-label={label}
        >
          {label}
        </button>
      )}

      {/* Glow reflection pseudo-element equivalent */}
      <span
        aria-hidden="true"
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          top: '120%',
          left: 0,
          height: '100%',
          width: '100%',
          backgroundColor: 'rgba(191, 123, 255, 0.781)',
          filter: 'blur(2em)',
          opacity: 0.7,
          transform: 'perspective(1.5em) rotateX(35deg) scale(1, 0.6)',
        }}
      />

      <style>{`
        .play-button:hover {
          color: var(--btn-color) !important;
          background-color: var(--glow-color) !important;
          box-shadow: 0 0 1em 0.25em var(--glow-color),
                      0 0 4em 2em var(--glow-spread-color),
                      inset 0 0 0.75em 0.25em var(--glow-color) !important;
        }
        .play-button:active {
          box-shadow: 0 0 0.6em 0.25em var(--glow-color),
                      0 0 2.5em 2em var(--glow-spread-color),
                      inset 0 0 0.5em 0.25em var(--glow-color) !important;
        }
      `}</style>
    </span>
  );
}