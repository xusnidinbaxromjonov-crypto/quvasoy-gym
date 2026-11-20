/**
 * Normalizes and validates Uzbek phone numbers
 * Accepts:
 *   +998901234567
 *   998901234567
 *   901234567
 *   +998 90 123 45 67
 * Returns normalized +998901234567 or null if invalid
 */
export const normalizePhone = (input) => {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');

  if (digits.length === 9) {
    return `+998${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits}`;
  }

  return null;
};

export const isValidUzPhone = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  // Valid Uzbek mobile network codes: 90, 91, 93, 94, 95, 97, 98, 99, 88, 33, 77, 20, 50, etc.
  const regex = /^\+998(33|50|77|88|90|91|93|94|95|97|98|99)\d{7}$/;
  return regex.test(normalized);
};
