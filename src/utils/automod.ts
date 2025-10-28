export function containsLink(text?: string) {
  if (!text) return false;
  const regex = /https?:\/\//i;
  return regex.test(text);
}
