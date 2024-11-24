import mongoose from 'mongoose';
import { Customer } from '../types/customer';

const CustomerSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    productInterest: { type: [String] },
  },
  { timestamps: true, collection: 'customers' }
);

export default mongoose.model<Customer>('Customer', CustomerSchema);
