import mongoose, { Schema } from 'mongoose';

const transactionSchema = new Schema({
    txid: { type: String, required: true },
    amount: { type: Number, required: true },
    created: { type: Date, default: Date.now() },
    owner_id: { type: String, required: true },
    np_trans: { type: Object, default: {} },
    confirmed: { type: Boolean, default: false }
});

export default mongoose.model('Transaction', transactionSchema);
