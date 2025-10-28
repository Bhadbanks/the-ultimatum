import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  settings: {
    xpEnabled: { type: Boolean, default: true },
    automodEnabled: { type: Boolean, default: true },
    verificationEnabled: { type: Boolean, default: true },
    prefix: { type: String, default: '!' }
  }
}, { timestamps: true });

export default mongoose.models.Group || mongoose.model('Group', GroupSchema);
