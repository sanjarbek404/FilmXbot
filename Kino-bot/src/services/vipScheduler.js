import User from '../models/User.js';
import logger from '../utils/logger.js';

// VIP Expiration Scheduler
// Runs every minute to check and expire VIP subscriptions

let bot = null;

export const initVipScheduler = (telegrafBot) => {
    bot = telegrafBot;

    // Run immediately on start
    checkExpiredVips();

    // Then run every minute
    setInterval(checkExpiredVips, 60 * 1000); // Every 1 minute

    logger.info('✅ VIP Expiration Scheduler initialized');
};

const checkExpiredVips = async () => {
    try {
        const now = new Date();

        // Find users whose VIP just expired (within the last 2 minutes to catch any we missed)
        const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

        const expiredUsers = await User.find({
            vipUntil: {
                $lte: now,
                $gte: twoMinutesAgo
            },
            vipNotified: { $ne: true } // Only notify once
        });

        for (const user of expiredUsers) {
            try {
                // Mark as notified
                user.vipNotified = true;
                await user.save();

                // Notify user
                if (bot) {
                    await bot.telegram.sendMessage(user.telegramId,
                        '⏰ <b>VIP Obunangiz Tugadi!</b>\n\n' +
                        'Sizning VIP statusingiz yakunlandi.\n\n' +
                        '💎 VIP imtiyozlaridan foydalanishni davom ettirish uchun obunani yangilang!\n\n' +
                        '<i>VIP bilan: Eksklyuziv kinolar, Sharh qoldirish va boshqalar!</i>',
                        { parse_mode: 'HTML' }
                    );
                }

                logger.info(`📤 VIP expired notification sent to user ${user.telegramId}`);
            } catch (e) {
                // User may have blocked the bot
                logger.error(`Failed to notify user ${user.telegramId} about VIP expiry:`, e);
            }
        }

        // Reset vipNotified flag for users who renewed (vipUntil > now)
        await User.updateMany(
            {
                vipUntil: { $gt: now },
                vipNotified: true
            },
            { vipNotified: false }
        );

    } catch (e) {
        logger.error('VIP Scheduler Error:', e);
    }
};

export default initVipScheduler;
