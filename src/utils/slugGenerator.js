/**
 * Utility functions for generating URL-friendly slugs
 */

/**
 * Generates a URL-friendly slug from a title
 * @param {string} title - The title to convert to slug
 * @param {string} lang - Language code ('fa' for Persian, 'en' for English)
 * @returns {string} Generated slug
 */
export const generateSlug = (title, lang = 'fa') => {
  if (!title || typeof title !== 'string') return '';
  
  if (lang === 'fa') {
    // Persian slug: replace spaces with dash, remove dots and commas, keep Persian characters
    return title
      .trim()
      .replace(/[،,\.]/g, '') // Remove Persian comma (،), English comma, and dots
      .replace(/\s+/g, '-') // Replace spaces with dash
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
  } else {
    // English slug: only a-z, 0-9, -
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Only keep a-z, 0-9, spaces, and dashes
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with dash
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
  }
};

/**
 * Generates slugs for both Persian and English titles
 * @param {Object} title - Object with fa and en properties
 * @returns {Object} Object with fa and en slug properties
 */
export const generateSlugs = (title) => {
  if (!title || typeof title !== 'object') {
    return { fa: '', en: '' };
  }
  
  return {
    fa: generateSlug(title.fa || '', 'fa'),
    en: generateSlug(title.en || title.fa || '', 'en')
  };
};

/**
 * Ensures slug is unique by appending a number if needed
 * @param {Function} checkDuplicate - Function that checks if slug exists (returns boolean)
 * @param {string} baseSlug - Base slug to make unique
 * @param {number} maxAttempts - Maximum attempts to find unique slug
 * @returns {Promise<string>} Unique slug
 */
export const ensureUniqueSlug = async (checkDuplicate, baseSlug, maxAttempts = 100) => {
  if (!baseSlug) return '';
  
  let slug = baseSlug;
  let attempt = 0;
  
  while (await checkDuplicate(slug) && attempt < maxAttempts) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }
  
  if (attempt >= maxAttempts) {
    // Fallback: use timestamp
    slug = `${baseSlug}-${Date.now()}`;
  }
  
  return slug;
};

