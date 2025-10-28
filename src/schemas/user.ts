import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true },
  groupId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
}, { timestamps: true });

UserSchema.index({ id: 1, groupId: 1 }, { unique: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
