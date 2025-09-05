/**
 * Common Validation Helpers
 */
export const validators = {
  /**
   * Check if value is a valid MongoDB ObjectId
   */
  isValidObjectId: id => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  },

  /**
   * Check if value is a valid slug
   */
  isValidSlug: slug => {
    return /^[a-z0-9-]+$/.test(slug);
  },

  /**
   * Check if value is a valid Iranian phone number
   */
  isValidIranianPhone: phone => {
    return /^(\+98|0)?9\d{9}$/.test(phone);
  },

  /**
   * Check if value is a valid Iranian national code
   */
  isValidNationalCode: code => {
    if (!/^\d{10}$/.test(code)) return false;

    const digits = code.split('').map(Number);
    const checksum = digits[9];

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * (10 - i);
    }

    const remainder = sum % 11;
    return (
      (remainder < 2 && checksum === remainder) || (remainder >= 2 && checksum === 11 - remainder)
    );
  },

  /**
   * Sanitize filename
   */
  sanitizeFilename: filename => {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  },

  /**
   * Check if password meets requirements
   */
  isStrongPassword: password => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(password);
  }
};
