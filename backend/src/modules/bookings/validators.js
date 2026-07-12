const { z } = require('zod');

const createBookingSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID'),
  startTime: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid start time format'
  }),
  endTime: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid end time format'
  }),
  bookedOnBehalfOfDeptId: z.string().uuid('Invalid department ID').optional().nullable(),
  notes: z.string().max(1000).optional().nullable()
}).refine(data => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return end > start;
}, {
  message: 'End time must be strictly after start time',
  path: ['endTime']
});

module.exports = {
  createBookingSchema
};
