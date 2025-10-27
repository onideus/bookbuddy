/**
 * Rating Validation Schemas (T103)
 * JSON Schema validation for rating endpoints
 */

/**
 * Schema for setting/updating rating
 * PUT /api/reading-entries/:entryId/rating
 */
export const setRatingSchema = {
  body: {
    type: 'object',
    required: ['rating'],
    properties: {
      rating: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        description: 'Rating on 1-5 scale',
      },
      reflectionNote: {
        type: 'string',
        maxLength: 2000,
        description: 'Optional reflection note (max 2000 characters)',
      },
    },
    additionalProperties: false,
  },
  params: {
    type: 'object',
    required: ['entryId'],
    properties: {
      entryId: {
        type: 'string',
        format: 'uuid',
        description: 'Reading entry ID',
      },
    },
  },
};

/**
 * Schema for clearing rating
 * DELETE /api/reading-entries/:entryId/rating
 */
export const clearRatingSchema = {
  params: {
    type: 'object',
    required: ['entryId'],
    properties: {
      entryId: {
        type: 'string',
        format: 'uuid',
        description: 'Reading entry ID',
      },
    },
  },
};

/**
 * Schema for top rated query parameter
 * Added to GET /api/readers/:readerId/reading-entries
 */
export const topRatedQuerySchema = {
  type: 'object',
  properties: {
    topRated: {
      type: 'string',
      enum: ['true', 'false'],
      description: 'Filter for top rated books (rating >= 4)',
    },
  },
};
