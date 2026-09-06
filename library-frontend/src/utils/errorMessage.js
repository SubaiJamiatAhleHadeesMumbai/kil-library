/**
 * Safely extracts a displayable error string from any API response or error object.
 * Prevents React crash: "Objects are not valid as a React child" when FastAPI returns array of validation errors.
 */
export function getErrorMessage(error, fallback = "An unexpected error occurred.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;

  const detail = error.response?.data?.detail ?? error.detail ?? error.message;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : "";
        const msg = item?.msg || item?.message || JSON.stringify(item);
        return field ? `${field}: ${msg}` : msg;
      })
      .join("; ");
  }

  if (typeof detail === "object") {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  return String(detail);
}
