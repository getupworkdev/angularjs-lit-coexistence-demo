/**
 * The only place this app calls customElements.define. Guarded, because the
 * same module can be evaluated twice (HMR, a duplicated chunk, two bundles on
 * one page) and a second define of the same tag throws.
 */
export function defineOnce(tag: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
}
