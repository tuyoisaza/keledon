export const interfacePlannerSchema = {
  type: 'object', additionalProperties: false, required: ['status', 'explanation'],
  properties: {
    status: { type: 'string', enum: ['action', 'needs_assistance', 'goal_observed'] },
    explanation: { type: 'string', maxLength: 500 },
    action: {
      type: 'object', additionalProperties: false, required: ['type', 'ref', 'effect', 'expected'],
      properties: {
        type: { type: 'string', enum: ['read', 'focus', 'fill', 'activate', 'scroll'] },
        ref: { type: 'string', maxLength: 6 }, value: { type: 'string', maxLength: 500 },
        effect: { type: 'string', enum: ['read', 'navigate', 'search'] },
        expected: { type: 'string', maxLength: 300 },
      },
    },
  },
  allOf: [{ if: { properties: { status: { const: 'action' } } }, then: { required: ['action'] } }],
};
