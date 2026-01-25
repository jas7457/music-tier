export function getFormattedPhoneNumber(phoneNumber: string): string {
  const reg = /^[\d\s\(\)\+\-]+$/;
  const match = reg.exec(phoneNumber);
  if (!match) {
    return '';
  }
  const digits = phoneNumber.replace(/\D/g, '');

  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 11) {
    return digits;
  }

  return '';
}
