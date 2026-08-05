/**
 * Inline form-field error message + the matching input styling.
 * Shared by every form so validation looks identical across the app.
 */

const BASE_INPUT =
  "w-full rounded-md border px-4 py-2 text-sm focus:outline-none transition";

export function inputClass(error?: string, extra = ""): string {
  return `${BASE_INPUT} ${
    error
      ? "border-red-400 bg-red-50/40 focus:border-red-500"
      : "border-bdr focus:border-em"
  } ${extra}`.trim();
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}
