import mongoose from 'mongoose';
import { seniorCitzDb } from '../../shared/config/databases.js';
import bcrypt from 'bcrypt';

const AdminSchema = new mongoose.Schema({
  username: String,
  password: String
});

AdminSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

AdminSchema.methods.validatePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

export default seniorCitzDb.model('Admin', AdminSchema);

