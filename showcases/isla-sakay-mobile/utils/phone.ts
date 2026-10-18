export function normalizePhilippinePhone(input: string): string | null {
  const raw = input.replace(/[^\d+]/g, "");

  if (/^\+639\d{9}$/.test(raw)) {
    return `0${raw.slice(3)}`;
  }

  const digitsOnly = input.replace(/\D/g, "");
  if (/^639\d{9}$/.test(digitsOnly)) {
    return `0${digitsOnly.slice(2)}`;
  }

  if (/^09\d{9}$/.test(digitsOnly)) {
    return digitsOnly;
  }

  return null;
}
