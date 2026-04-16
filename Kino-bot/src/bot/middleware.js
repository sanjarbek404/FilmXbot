import { findOrCreateUser } from '../services/userService.js';
import { checkSubscription } from '../services/subscriptionService.js';
import logger from '../utils/logger.js';
import { getTranslation } from '../utils/locales.js';
import { Markup } from 'telegraf';
import AdminLog from '../models/AdminLog.js';
import Channel from '../models/Channel.js';
import User from '../models/User.js';

const vipPromoMessages = [
    "🚀 <b>Tezkor yuklab olishni xohlaysizmi?</b>\n\n💎 VIP obuna bo'ling va cheklovsiz tezlikda yuklang!",
    "⭐️ <b>Reklamalardan charchadingizmi?</b>\n\n💎 VIP status oling va reklamasiz botdan foydalaning!",
    "🎬 <b>Yangi kinolarni birinchilardan bo'lib ko'ring!</b>\n\n💎 VIP foydalanuvchilar uchun eksklyuziv imkoniyatlar.",
    "🔒 <b>Maxfiy chat va ko'proq imkoniyatlar!</b>\n\n💎 VIP obuna bilan barchasiga ega bo'ling."
];
// 🛡️ Rate Limiting & Anti-Flood using NodeCache
import NodeCache from 'node-cache';
const rateLimitCache = new NodeCache({ stdTTL: 60, checkperiod: 60 });
const strikesCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });
const subStatusCache = new NodeCache({ stdTTL: 600, checkperiod: 60 }); // 10 minutes cache for sub check

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute
const BAN_THRESHOLD = 3; // Strikes before ban
const BAN_DURATION = 60 * 60 * 1000; // 1 hour

let cachedChannels = null;
let cachedChannelsAt = 0;
let cachedSubEnabled = null;
import { isAdmin } from '../utils/adminHelper.js';

export const authMiddleware = async (ctx, next) => {
    if (!ctx.from) return next();

    const userId = ctx.from.id;

    // 🛡️ Rate Limiting & Anti-Flood
    const now = Date.now();
    const userRateData = rateLimitCache.get(userId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW, lastReq: 0 };

    // Check if rapid spam (requests < 500ms apart)
    if (now - userRateData.lastReq < 500 && !isAdmin(userId)) {
        const strikes = (strikesCache.get(userId) || 0) + 1;
        strikesCache.set(userId, strikes);

        if (strikes >= BAN_THRESHOLD) {
            // AUTO BAN
            const user = await findOrCreateUser(ctx);
            if (user && !user.isBanned) {
                user.isBanned = true;
                await user.save();

                // Log it
                await AdminLog.create({
                    adminId: 'SYSTEM',
                    action: 'auto_ban',
                    targetId: userId,
                    details: 'Anti-Flood Auto Ban (1 Hour)'
                });

                // Unlock after 1 hour
                setTimeout(async () => {
                    const u = await User.findOne({ telegramId: userId });
                    if (u) {
                        u.isBanned = false;
                        await u.save();
                    }
                }, BAN_DURATION);
            }
            strikesCache.del(userId); // Reset strikes
            return ctx.reply('⛔️ <b>Siz spam tufayli 1 soatga bloklandingiz!</b>', { parse_mode: 'HTML' });
        }

        userRateData.lastReq = now;
        rateLimitCache.set(userId, userRateData);
        return ctx.reply('⚠️ <b>Iltimos, sekinroq yozing!</b> (Spam aniqlandi)', { parse_mode: 'HTML' });
    }

    userRateData.lastReq = now;

    if (now > userRateData.resetTime) {
        // Reset window
        userRateData.count = 1;
        userRateData.resetTime = now + RATE_LIMIT_WINDOW;
    } else {
        userRateData.count++;
    }

    rateLimitCache.set(userId, userRateData);

    if (userRateData.count > MAX_REQUESTS_PER_WINDOW && !isAdmin(userId)) {
        logger.warn(`⚠️ Rate limit exceeded for user ${userId}`);
        return ctx.reply('⚠️ Juda ko\'p so\'rov! Biroz kuting va qayta urinib ko\'ring.');
    }

    try {
        const user = await findOrCreateUser(ctx);

        if (user && user.isBanned) {
            return ctx.reply('🚫 Siz botdan foydalana olmaysiz. (You are banned)');
        }

        // Store user in session
        if (!ctx.session) ctx.session = {};
        ctx.session.user = user;

        // Attach i18n helper
        const lang = user.language || 'uz';
        ctx.t = (key, params = {}) => getTranslation(lang, key, params);

        // Attach VIP check helper
        ctx.isVip = () => {
            return user && user.vipUntil && new Date(user.vipUntil) > new Date();
        };

        // Attach VIP promo helper
        ctx.showVipPromo = async (forceShow = false) => {
            // Only show to non-VIP users
            if (ctx.isVip() && !forceShow) return;

            const randomPromo = vipPromoMessages[Math.floor(Math.random() * vipPromoMessages.length)];

            try {
                await ctx.reply(randomPromo, {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('💎 VIP Olish', 'vip_info')]
                    ])
                });
            } catch (e) {
                // Silently fail
            }
        };

        // 📢 MANDATORY SUBSCRIPTION CHECK - ALL USERS (including admin)
        try {
            // Skip subscription check for callback queries to keep inline buttons responsive.
            // Subscription gating is enforced on message-based interactions (/start, text, etc).
            if (ctx.updateType === 'callback_query') {
                return next();
            }

            // Bypass subscription check for admins to keep admin panel fast.
            if (isAdmin(userId)) {
                return next();
            }

            // Per-cache check: if user passed subscription check recently, don't re-check each message.
            // This avoids slow getChatMember on every text.
            if (subStatusCache.get(userId)) {
                return next();
            }

            const subStatus = await checkSubscription(ctx);

            if (subStatus !== true && Array.isArray(subStatus) && subStatus.length > 0) {
                logger.info(`User ${userId} not subscribed to ${subStatus.length} channel(s)`);
                const buttons = subStatus.map(ch => [
                    Markup.button.url(`📢 ${ch.name}`, ch.inviteLink.startsWith('http') ? ch.inviteLink : `https://${ch.inviteLink}`)
                ]);
                buttons.push([Markup.button.callback('✅ Tekshirish', 'check_subscription')]);

                await ctx.reply(
                    '📢 <b>Botdan foydalanish uchun quyidagi kanallarga obuna bo\'ling:</b>\n\n<i>Obuna bo\'lgach, "✅ Tekshirish" tugmasini bosing.</i>',
                    {
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard(buttons)
                    }
                );
                return; // Stop processing - user must subscribe first
            }

            // Mark as ok for a while in cache (10 min TTL handled by NodeCache default)
            subStatusCache.set(userId, true);
        } catch (e) {
            logger.error('Subscription check error:', e);
            // Continue on error to not block users
        }

        return next();
    } catch (e) {
        logger.error('Auth middleware error:', e);
        // Default to uz on error
        ctx.t = (key, params = {}) => getTranslation('uz', key, params);
        ctx.isVip = () => false;
        ctx.showVipPromo = async () => { };
        return next();
    }
};

export const adminMiddleware = (ctx, next) => {
    try {
        if (!isAdmin(ctx.from.id)) return;
        return next();
    } catch (err) {
        logger.error('Admin Middleware Error:', err.message);
        return ctx.reply("❌ Xatolik yuz berdi.");
    }
};
