/** Fire-and-forget poker chip that arcs between two elements. */
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function flyChip(
  from: Element | null | undefined,
  to: Element | null | undefined,
  tone: number,
) {
  if (!from || !to || prefersReducedMotion()) {
    return;
  }
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const size = 28;
  const chip = document.createElement('div');
  chip.className = `ballot-chip ballot-chip-fly ballot-tone-${tone % 5}`;
  chip.style.cssText = `position:fixed;left:0;top:0;width:${size}px;height:${size}px;z-index:200;pointer-events:none;`;
  document.body.appendChild(chip);
  const x1 = a.left + a.width / 2 - size / 2;
  const y1 = a.top + a.height / 2 - size / 2;
  const x2 = b.left + b.width / 2 - size / 2;
  const y2 = b.top + b.height / 2 - size / 2;
  const lift = Math.min(70, Math.abs(y2 - y1) / 2 + 30);
  const anim = chip.animate(
    [
      { transform: `translate(${x1}px,${y1}px) scale(1) rotate(0deg)` },
      {
        transform: `translate(${(x1 + x2) / 2}px,${Math.min(y1, y2) - lift}px) scale(1.25) rotate(180deg)`,
        offset: 0.5,
      },
      { transform: `translate(${x2}px,${y2}px) scale(0.9) rotate(360deg)` },
    ],
    { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)' },
  );
  const done = () => chip.remove();
  anim.onfinish = done;
  anim.oncancel = done;
}
