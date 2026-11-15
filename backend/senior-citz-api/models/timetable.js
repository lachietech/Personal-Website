import mongoose from 'mongoose';
import { seniorCitzDb } from '../../shared/config/databases.js';

import { defaultTimetable } from '../utils/timetable.js';
export { defaultTimetable } from '../utils/timetable.js';

const TimetableEntrySchema = new mongoose.Schema(
  {
    day: { type: String, required: true, trim: true },
    hours: { type: String, required: true, trim: true },
    activities: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const TimetableSchema = new mongoose.Schema({
  entries: {
    type: [TimetableEntrySchema],
    default: defaultTimetable
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

TimetableSchema.statics.getCurrent = async function() {
  const timetable = await this.findOne();
  return timetable?.entries?.length ? timetable.entries : defaultTimetable;
};

export default seniorCitzDb.model('Timetable', TimetableSchema);

