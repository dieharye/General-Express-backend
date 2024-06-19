import mongoose, { Document, Model, Schema } from 'mongoose';

const cryptoAddressSchema = new mongoose.Schema({
    name: { type: String },
    address: { type: String }, 
    user: { type: mongoose.Schema.ObjectId, ref: 'account' },
    txid: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('CryptoAddress',  cryptoAddressSchema);
