import mongoose, { Document, Model, Schema } from 'mongoose';

// Define interface for document
export interface ItemDocument extends Document {
    itemId: string;
    itemName: string;
    value: number;
}

// Define interface for model
export interface ItemModel extends Model<ItemDocument> { }

// Define schema
const ItemSchema: Schema = new Schema({
    itemId: { type: String, required: true },
    itemName: { type: String, required: true },
    value: { type: Number, required: true }
});

// Define and export model
export default mongoose.model('Item', ItemSchema);