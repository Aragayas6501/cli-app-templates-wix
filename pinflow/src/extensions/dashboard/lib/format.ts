export const formatNumber = (value?: number): string => (value ?? 0).toLocaleString();

export const formatDateTime = (value?: number | string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export const formatDate = (value?: number | string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

export const errorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
};

export const toDateTimeLocalValue = (value: number): string => {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};
