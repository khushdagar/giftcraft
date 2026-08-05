'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** True while the action is running — drives the fill. */
  active: boolean;
  label: React.ReactNode;
  /** Label shown while active (defaults to `label`). */
  activeLabel?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  /** Button classes. `relative overflow-hidden` are added automatically. */
  className?: string;
  /** Classes for the fill layer — set its background and text colour. */
  fillClassName?: string;
}

/**
 * A button that fills left-to-right while its action runs, so slow work (order
 * placement, payment, PDF generation) visibly progresses instead of looking
 * frozen.
 *
 * The work has no measurable progress, so the fill eases toward ~92% and only
 * completes if `active` goes false after a successful run — matching the
 * proposal-deck download button's behaviour.
 *
 * The filled label is a second copy of the text clipped to the fill width, so
 * the words stay readable in both the empty and filled parts of the button.
 */
export function FillProgressButton({
  active,
  label,
  activeLabel,
  onClick,
  disabled,
  type = 'button',
  className = '',
  fillClassName = 'bg-white/25',
}: Props) {
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | undefined>(undefined);
  const shown = useRef(0);

  useEffect(() => {
    if (!active) {
      // Action finished or was cancelled — clear the fill.
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = undefined;
      shown.current = 0;
      setProgress(0);
      return;
    }

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      shown.current = 92;
      setProgress(92);
      return;
    }

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      // Ease toward 92%: fast at first, slowing as it approaches — the classic
      // "still working" curve. It never claims to be finished.
      shown.current += (92 - shown.current) * 0.55 * dt;
      setProgress(shown.current);
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = undefined;
    };
  }, [active]);

  const text = active ? (activeLabel ?? label) : label;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || active}
      aria-busy={active}
      className={`relative overflow-hidden ${className}`}
    >
      <span>{text}</span>
      {active && (
        <span
          aria-hidden
          style={{ clipPath: `inset(0 ${100 - progress}% 0 0)`, willChange: 'clip-path' }}
          className={`absolute inset-0 flex items-center justify-center gap-2 ${fillClassName}`}
        >
          {text}
        </span>
      )}
    </button>
  );
}
