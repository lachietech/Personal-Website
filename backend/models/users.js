import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  	local: { type: String, required: true },
 	state: { type: String, required: true },
  	country: { type: String, required: true }
}, { _id: false });

const userWeatherRecordSchema = new mongoose.Schema({
  	username: { type: String, required: true },
  	password: { type: String, required: true }, // bcrypt hashed
  	email: { type: String, required: true },
  	first_name: { type: String },
  	last_name: { type: String },
  	location: locationSchema,
  	timestamp: { type: Date, default: Date.now },
  	zone: { type: String }, // e.g. Cfa
  	data: { type: mongoose.Schema.Types.Mixed } // stores full API JSON response
});

export default mongoose.model("UserWeatherRecord", userWeatherRecordSchema);