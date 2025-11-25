import mongoose from 'mongoose';

/**
 * Message Schema for storing encrypted chat messages in MongoDB.
 * Each document represents one message between two users.
 */
const messageSchema = new mongoose.Schema({
    // The username of the sender
    user: { type: String, required: true },

    // The username of the recipient
    recipient: { type: String, required: true },

    // The actual message content (encrypted before saving)
    message: { type: String, required: true },

    // Timestamp of when the message was sent
    timestamp: { type: Date, default: Date.now },

    // Initialization vector used in encryption (Base64/hex string)
    iv: { type: String, required: true },

    // First key used in hybrid encryption (for me)
    key1: { type: String, required: true },

    // Second key used in hybrid encryption (for recipient)
    key2: { type: String, required: true }
});

// Create and export the Message model from the schema.
// This will map to the "messages" collection in MongoDB.
const Message = mongoose.model('SuperChatMessage', messageSchema);
export default Message;