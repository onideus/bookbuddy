/**
 * JSON Schema validators for progress notes endpoints (T079)
 * Using Fastify's built-in validation
 */

import { Limits } from '../../../../shared/constants.js';

/**
 * Schema for creating a progress note
 */
export const createProgressNoteSchema = {
  body: {
    type: 'object',
    required: ['content'],
    properties: {
      content: {
        type: 'string',
        minLength: 1,
        maxLength: Limits.NOTE_MAX,
      },
      progressMarker: {
        type: 'string',
        maxLength: Limits.PAGE_MARKER_MAX,
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
 * Schema for getting progress notes
 */
export const getProgressNotesSchema = {
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
 * Response schema for a single progress note
 */
export const progressNoteResponseSchema = {
  type: 'object',
  properties: {
    noteId: {
      type: 'string',
      format: 'uuid',
    },
    recordedAt: {
      type: 'string',
      format: 'date-time',
    },
    content: {
      type: 'string',
    },
    progressMarker: {
      type: 'string',
      nullable: true,
    },
    correlationId: {
      type: 'string',
      format: 'uuid',
    },
  },
};

/**
 * Response schema for progress notes list
 */
export const progressNotesListResponseSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      noteId: {
        type: 'string',
        format: 'uuid',
      },
      recordedAt: {
        type: 'string',
        format: 'date-time',
      },
      content: {
        type: 'string',
      },
      progressMarker: {
        type: 'string',
        nullable: true,
      },
      book: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          title: {
            type: 'string',
          },
          author: {
            type: 'string',
          },
          edition: {
            type: 'string',
            nullable: true,
          },
        },
      },
    },
  },
};

export default {
  createProgressNoteSchema,
  getProgressNotesSchema,
  progressNoteResponseSchema,
  progressNotesListResponseSchema,
};
