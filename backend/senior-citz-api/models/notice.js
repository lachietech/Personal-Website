import mongoose from 'mongoose';
import { seniorCitzDb } from '../../shared/config/databases.js';

const NoticeSchema = new mongoose.Schema({
  title: String,
  content: String,
  image: {
    data: Buffer,
    contentType: String
  },
  postedAt: {
    type: Date,
    default: Date.now
  }
});

export default seniorCitzDb.model('Notice', NoticeSchema);
