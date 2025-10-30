/**
 * Book Search Normalizer (T014)
 * Transforms provider-specific responses to internal BookSearchResult format
 */

/**
 * Internal BookSearchResult format
 * @typedef {Object} BookSearchResult
 * @property {string} providerId - Provider-specific book ID
 * @property {string} provider - Provider name ('google_books', 'open_library')
 * @property {string} title - Book title
 * @property {string} author - Author(s)
 * @property {string|null} subtitle - Subtitle
 * @property {string|null} isbn10 - ISBN-10
 * @property {string|null} isbn13 - ISBN-13
 * @property {string|null} publisher - Publisher name
 * @property {string|null} publishedDate - Publication date
 * @property {number|null} pageCount - Number of pages
 * @property {string|null} description - Book description
 * @property {string[]|null} categories - Genre/category tags
 * @property {string|null} language - Language code (ISO 639-1)
 * @property {string|null} coverImageUrl - Cover image URL
 * @property {string|null} format - Book format
 * @property {Object} raw - Original provider response
 */

/**
 * Normalize Google Books API response
 * @param {Object} item - Google Books volume item
 * @returns {BookSearchResult} - Normalized result
 */
export function normalizeGoogleBooks(item) {
  const volumeInfo = item.volumeInfo || {};
  const industryIdentifiers = volumeInfo.industryIdentifiers || [];

  // Extract ISBNs
  const isbn10 = industryIdentifiers.find((id) => id.type === 'ISBN_10')?.identifier || null;
  const isbn13 = industryIdentifiers.find((id) => id.type === 'ISBN_13')?.identifier || null;

  // Get best quality cover image
  const imageLinks = volumeInfo.imageLinks || {};
  const coverImageUrl =
    imageLinks.extraLarge ||
    imageLinks.large ||
    imageLinks.medium ||
    imageLinks.small ||
    imageLinks.thumbnail ||
    null;

  return {
    providerId: item.id,
    provider: 'google_books',
    title: volumeInfo.title || 'Unknown Title',
    author: Array.isArray(volumeInfo.authors)
      ? volumeInfo.authors.join(', ')
      : volumeInfo.authors || 'Unknown Author',
    subtitle: volumeInfo.subtitle || null,
    isbn10,
    isbn13,
    publisher: volumeInfo.publisher || null,
    publishedDate: volumeInfo.publishedDate || null,
    pageCount: volumeInfo.pageCount || null,
    description: volumeInfo.description || null,
    categories: volumeInfo.categories || null,
    language: volumeInfo.language || null,
    coverImageUrl,
    format: null, // Google Books doesn't provide format in search
    raw: item,
  };
}

/**
 * Normalize Open Library API response
 * @param {Object} doc - Open Library document
 * @returns {BookSearchResult} - Normalized result
 */
export function normalizeOpenLibrary(doc) {
  // Extract ISBNs (Open Library returns arrays)
  const isbn10 = doc.isbn && doc.isbn.find((isbn) => isbn.length === 10);
  const isbn13 = doc.isbn && doc.isbn.find((isbn) => isbn.length === 13);

  // Construct cover image URL if cover_i exists
  const coverImageUrl = doc.cover_i
    ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
    : null;

  // Format publication date (Open Library uses first_publish_year)
  const publishedDate = doc.first_publish_year ? `${doc.first_publish_year}-01-01` : null;

  return {
    providerId: doc.key || doc.cover_edition_key || null,
    provider: 'open_library',
    title: doc.title || 'Unknown Title',
    author: Array.isArray(doc.author_name)
      ? doc.author_name.join(', ')
      : doc.author_name || 'Unknown Author',
    subtitle: doc.subtitle || null,
    isbn10,
    isbn13,
    publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : doc.publisher || null,
    publishedDate,
    pageCount: doc.number_of_pages_median || null,
    description: null, // Open Library doesn't provide description in search
    categories: doc.subject ? doc.subject.slice(0, 5) : null, // Limit to first 5 subjects
    language: Array.isArray(doc.language) ? doc.language[0] : doc.language || null,
    coverImageUrl,
    format: null,
    raw: doc,
  };
}

/**
 * Normalize search results based on provider
 * @param {Array} results - Raw provider results
 * @param {string} provider - Provider name
 * @returns {Array<BookSearchResult>} - Normalized results
 */
export function normalizeSearchResults(results, provider) {
  if (!Array.isArray(results)) {
    throw new Error('Results must be an array');
  }

  switch (provider) {
    case 'google_books':
      return results.map(normalizeGoogleBooks);
    case 'open_library':
      return results.map(normalizeOpenLibrary);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Extract minimal book data for storage
 * @param {BookSearchResult} normalized - Normalized search result
 * @returns {Object} - Book data for database
 */
export function extractBookData(normalized) {
  return {
    title: normalized.title,
    author: normalized.author,
    subtitle: normalized.subtitle,
    language: normalized.language,
    publisher: normalized.publisher,
    publicationDate: normalized.publishedDate,
    pageCount: normalized.pageCount,
    description: normalized.description,
    categories: normalized.categories,
  };
}

/**
 * Extract edition data for storage
 * @param {BookSearchResult} normalized - Normalized search result
 * @param {string} bookId - Book ID to associate with
 * @returns {Object} - Edition data for database
 */
export function extractEditionData(normalized, bookId) {
  return {
    bookId,
    isbn10: normalized.isbn10,
    isbn13: normalized.isbn13,
    edition: null, // Not typically in search results
    format: normalized.format,
    coverImageUrl: normalized.coverImageUrl,
    providerId: normalized.providerId,
  };
}

export default {
  normalizeGoogleBooks,
  normalizeOpenLibrary,
  normalizeSearchResults,
  extractBookData,
  extractEditionData,
};
