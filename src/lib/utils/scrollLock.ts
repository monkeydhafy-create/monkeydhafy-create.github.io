/**
 * Ref-counted scroll lock. Locks <html> via class (see app.css `.nb-scroll-locked`).
 * `scrollbar-gutter: stable` on <html> keeps layout width identical, so no content jump
 * when the scrollbar disappears. Multiple overlays (select + dialog) stack safely.
 */
let lockCount = 0;

export function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  lockCount++;
  document.documentElement.classList.add('nb-scroll-locked');
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) document.documentElement.classList.remove('nb-scroll-locked');
  };
}
