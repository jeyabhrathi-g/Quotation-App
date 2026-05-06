export const sentenceCase = (value) => {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};
