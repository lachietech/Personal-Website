import mongoose from 'mongoose';
import { superchatDb } from '../../databases.js';

/**
 * User Schema for storing registered users in MongoDB.
 * Each document represents one user with login credentials and key pair.
 */
const userSchema = new mongoose.Schema({
    // User's first name
    firstname: { type: String, required: true },

    // User's last name
    lastname: { type: String, required: true },

    // User's email address
    email: { type: String, required: true },

    // Unique username used for login/identification
    username: { type: String, required: true, unique: true },

    // Hashed password 
    password: { type: String, required: true },

    // Public RSA key  for encrypting messages
    publicKey: { type: String, required: true },

    // Private RSA key for decrypting messages (encrypted)
    privateKey: { type: String, required: true }
},
// Add createdAt and updatedAt fields automatically
{ timestamps: true }
);

// Create and export the User model (maps to "users" collection in MongoDB).
const User = superchatDb.model('User', userSchema);
export default User;