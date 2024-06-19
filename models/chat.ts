import mongoose, { Document } from 'mongoose';

// Define your schema
const chatSchema = new mongoose.Schema({
    author: {
        username: String,
        avatarId: String,
        role: String
    },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

// Define and export the Mongoose model
export default mongoose.model('Chat', chatSchema);
