import User from '../schemas/user.js';

export async function addXp(userId: string, groupId: string, amount: number) {
  const user = await User.findOneAndUpdate(
    { id: userId, groupId },
    { $inc: { xp: amount } },
    { upsert: true, new: true }
  );
  // compute level by simple formula
  const newLevel = Math.floor(Math.sqrt(user.xp / 10)) + 1;
  if (newLevel > user.level) {
    user.level = newLevel;
    await user.save();
    return { user, leveled: true };
  }
  return { user, leveled: false };
}
