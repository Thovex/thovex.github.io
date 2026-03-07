// ─── Fullscreen animation trigger (separate from component for fast-refresh) ───
// Uses CustomEvent on window to avoid Vite module-duplication issues.

export type PrestigeAnimationType =
  | 'prestige'
  | 'voidCollapse'
  | 'singularity'
  | 'expedition'
  | 'ascendancy'
  | 'allGenerators'
  | 'systemUnlock';

export interface AnimationContext {
  /** Lines of context/reward info to display below the title */
  details?: string[];
}

interface AnimationPayload {
  type: PrestigeAnimationType;
  context: AnimationContext;
}

const EVENT_NAME = 'prestige-animation';

export function triggerPrestigeAnimation(type: PrestigeAnimationType, context: AnimationContext = {}) {
  window.dispatchEvent(new CustomEvent<AnimationPayload>(EVENT_NAME, { detail: { type, context } }));
}

export function onPrestigeAnimation(handler: (type: PrestigeAnimationType, context: AnimationContext) => void): () => void {
  const listener = (e: Event) => {
    const payload = (e as CustomEvent<AnimationPayload>).detail;
    handler(payload.type, payload.context);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
