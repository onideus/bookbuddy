/**
 * JSON Schema validators for reading entry endpoints (T050)
 * Using Fastify's built-in validation
 */

import { Limits } from '../../../../shared/constants.js';
import { ReadingStatus } from '../../../../shared/constants.js';

/**
 * Schema for creating a reading entry
 */
export const createReadingEntrySchema = {
  body: {
    type: 'object',
    required: ['title', 'author', 'status'],
    properties: {
      title: {
        type: 'string',
        minLength: 1,
        maxLength: Limits.TITLE_MAX,
      },
      author: {
        type: 'string',
        minLength: 1,
        maxLength: Limits.AUTHOR_MAX,
      },
      edition: {
        type: 'string',
        maxLength: Limits.EDITION_MAX,
        nullable: true,
      },
      isbn: {
        type: 'string',
        pattern: '^[0-9-]{10,17}$',
        nullable: true,
      },
      status: {
        type: 'string',
        enum: [ReadingStatus.TO_READ, ReadingStatus.READING, ReadingStatus.FINISHED],
      },
    },
  },
};

/**
 * Schema for getting reading entries (query params)
 */
export const getReadingEntriesSchema = {
  querystring: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: [ReadingStatus.TO_READ, ReadingStatus.READING, ReadingStatus.FINISHED],
        nullable: true,
      },
      page: {
        type: 'integer',
        minimum: 1,
        default: 1,
      },
      pageSize: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 50,
      },
    },
  },
  params: {
    type: 'object',
    required: ['readerId'],
    properties: {
      readerId: {
        type: 'string',
        format: 'uuid',
      },
    },
  },
};

/**
 * Schema for updating reading entry status
 */
export const updateStatusSchema = {
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: {
        type: 'string',
        enum: [ReadingStatus.TO_READ, ReadingStatus.READING, ReadingStatus.FINISHED],
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        nullable: true,
      },
    },
  },
  params: {
    type: 'object',
    required: ['entryId'],
    properties: {
      entryId: {
        type: 'string',
        format: 'uuid',
      },
    },
  },
};

/**
 * Schema for reader ID param
 */
export const readerIdParamSchema = {
  params: {
    type: 'object',
    required: ['readerId'],
    properties: {
      readerId: {
        type: 'string',
        format: 'uuid',
      },
    },
  },
};

export default {
  createReadingEntrySchema,
  getReadingEntriesSchema,
  updateStatusSchema,
  readerIdParamSchema,
};
