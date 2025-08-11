export const toDateInputValue = (isoString) => {
  if (!isoString) return ""; // return empty string if null/blank
  const date = new Date(isoString);
  return date.toISOString().split("T")[0];
};
