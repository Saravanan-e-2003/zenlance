import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., "invoice-2508", "proposal-2508"
  sequence: { type: Number, default: 0 }
});

// Static method to get next sequence number atomically
counterSchema.statics.getNextSequence = async function(sequenceId) {
  const counter = await this.findByIdAndUpdate(
    sequenceId,
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequence;
};

const Counter = mongoose.model('Counter', counterSchema);

export default Counter; 