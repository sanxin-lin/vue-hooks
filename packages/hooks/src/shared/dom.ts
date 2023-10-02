export const canUseDom = () => {
  return !!(typeof window !== 'undefined' && window.document && window.document.createElement);
};

export const isBrowser = !!(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
);

export const isDocumentVisible = (): boolean => {
  if (canUseDom()) {
    return document.visibilityState !== 'hidden';
  }
  return true;
};
