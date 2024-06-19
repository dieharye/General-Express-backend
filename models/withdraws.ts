import mongoose from 'mongoose';

export enum WithdrawCurrencies {
    BITCOIN = 'BITCOIN',
    ETHEREUM = 'ETHEREUM',
    LITECOIN = 'LITECOIN',
}

// Define your schema
const WithdrawSchema = new mongoose.Schema({
    OwnerId: { type: Object(String), required: true },
    CreatedAt: { type: Date, default: new Date() },
    Currency: { type: String, required: true },
    Amount: { type: Number, required: true },
    Completed: { type: Boolean, default: false },
    Address: { type: String, required: true }
});

// Define and export the Mongoose model
export default mongoose.model('Withdraw', WithdrawSchema);
