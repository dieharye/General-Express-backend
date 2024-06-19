const mongoose = require('mongoose');

const CallbackStoreSchema = new mongoose.Schema({
    payment_id: { type: Number, required: false },
    parent_payment_id: { type: Number, required: false },
    invoice_id: { type: Number, default: null },
    payment_status: { type: String, required: false },
    pay_address: { type: String, required: false },
    payin_extra_id: { type: Number, default: null },
    price_amount: { type: Number, required: false },
    price_currency: { type: String, required: false },
    pay_amount: { type: Number, required: false },
    actually_paid: { type: Number, required: false },
    actually_paid_at_fiat: { type: Number, required: false },
    pay_currency: { type: String, required: false },
    order_id: { type: String, default: null },
    order_description: { type: String, default: null },
    purchase_id: { type: String, required: false },
    outcome_amount: { type: Number, required: false },
    outcome_currency: { type: String, required: false },
    payment_extra_ids: { type: mongoose.Schema.Types.Mixed }, // Adjust type accordingly based on actual data
    fee: {
        currency: { type: String, required: false },
        depositFee: { type: Number, required: false },
        withdrawalFee: { type: Number, required: false },
        serviceFee: { type: Number, required: false }
    },
    headers: {
        np_sig: { type: String, required: false }
    }
});

export default mongoose.model('CallbackStore', CallbackStoreSchema);