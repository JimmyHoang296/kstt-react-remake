export const toDateInputValue = (isoString) => {
    if (!isoString) return ""; // return empty string if null/blank
    const date = new Date(isoString);
    return date.toISOString().split("T")[0];
};

export function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`
}