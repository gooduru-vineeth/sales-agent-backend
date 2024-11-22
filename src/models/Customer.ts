import mongoose from "mongoose";
import { Customer } from "../types/customer";

const CustomerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  product_choice: { type: String },
  conversation_history: [
    {
      timestamp: { type: Date },
      context: { type: Map, of: mongoose.Schema.Types.Mixed },
    },
  ],
});

export default mongoose.model<Customer>("Customer", CustomerSchema);
