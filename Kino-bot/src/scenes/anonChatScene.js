import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';

import User from '../models/User.js';

// In-memory storage for active chat sessions
// Map: { userId: partnerId } - bidirectional
const activePairs = new Map();

// Queue of users waiting to be matched
const waitingQueue = [];

// Violation tracking: { userId: count }
const violationCount = new Map();
const MAX_VIOLATIONS = 3;

// 🔒 Admin-only: Get all active chat sessions with user info
export const getActiveChatSessions = async () => {
    const sessions = [];
    const processed = new Set();

    for (const [userId, partnerId] of activePairs.entries()) {
        if (processed.has(userId) || processed.has(partnerId)) continue;

        const user1 = await User.findOne({ telegramId: userId });
        const user2 = await User.findOne({ telegramId: partnerId });

        sessions.push({
            user1: { id: userId, name: user1?.firstName || 'Unknown', username: user1?.username },
            user2: { id: partnerId, name: user2?.firstName || 'Unknown', username: user2?.username }
        });

        processed.add(userId);
        processed.add(partnerId);
    }

    return sessions;
};

// 🔒 Admin-only: Get waiting queue with user info
export const getWaitingUsers = async () => {
    const users = [];
    for (const userId of waitingQueue) {
        const user = await User.findOne({ telegramId: userId });
        users.push({
            id: userId,
            name: user?.firstName || 'Unknown',
            username: user?.username
        });
    }
    return users;
};

// 🛡️ Content Filter - Banned words and patterns
const bannedPatterns = [
    // Uzbek swear words (censored examples)
    /s[e3]ks/i, /p[o0]rn/i, /xxx/i,
    // Common spam patterns
    /t\.me\//i, /https?:\/\//i, /http:\/\//i, /@\w{5,}/i, // Links and @mentions
    /telegram\.me/i, /join/i, /kanal/i, /guruh/i, /channel/i, /group/i,
    // Ad patterns
    /sotiladi/i, /sotaman/i, /arzon/i, /narx/i, /chegirma/i, /aksiya/i,
    /pul ishlash/i, /daromad/i, /investitsiya/i, /kripto/i, /bitcoin/i,
    // Common profanity (Uzbek/Russian)
    /b[l1]ya/i, /suka/i, /huy/i, /pizd/i, /ebal/i, /nahuy/i,
    /axmoq/i, /tentak/i, /jinni/i, /qo['']toq/i
];

// Check if message is a forwarded message
const isForwarded = (msg) => {
    return msg.forward_from || msg.forward_from_chat || msg.forward_date;
};

// Check if message contains banned content
const containsBannedContent = (text) => {
    if (!text) return false;
    return bannedPatterns.some(pattern => pattern.test(text));
};

// Handle violation
const handleViolation = async (ctx, userId, reason) => {
    const count = (violationCount.get(userId) || 0) + 1;
    violationCount.set(userId, count);

    logger.warn(`⚠️ VIP Chat Violation: User ${userId} - ${reason} (${count}/${MAX_VIOLATIONS})`);

    if (count >= MAX_VIOLATIONS) {
        // Auto-ban user
        try {
            await User.findOneAndUpdate(
                { telegramId: userId },
                { isBanned: true }
            );

            await ctx.reply('🚫 <b>SIZ BLOKLANGINGIZ!</b>\n\nChat qoidalarini buzganingiz uchun botdan foydalanish huquqingiz bekor qilindi.', { parse_mode: 'HTML' });

            // Notify admin
            const adminId = process.env.ADMIN_ID ? process.env.ADMIN_ID.split(',')[0].trim() : null;
            if (adminId) {
                await ctx.telegram.sendMessage(adminId,
                    `🚨 <b>Avto-Bloklash!</b>\n\n👤 User ID: <code>${userId}</code>\n📋 Sabab: ${reason}\n⚠️ Qoidabuzarliklar: ${count}`,
                    { parse_mode: 'HTML' }
                );
            }

            return ctx.scene.leave();
        } catch (e) {
            logger.error('Auto-ban error:', e);
        }
    } else {
        await ctx.reply(`⚠️ <b>Ogohlantirish!</b>\n\n${reason}\n\n❌ Qoidabuzarliklar: ${count}/${MAX_VIOLATIONS}\n\n<i>Yana ${MAX_VIOLATIONS - count} ta buzilish - bloklash!</i>`, { parse_mode: 'HTML' });
    }

    return false; // Don't continue processing
};

const anonChatScene = new Scenes.BaseScene('ANON_CHAT_SCENE');

anonChatScene.enter(async (ctx) => {
    const userId = ctx.from.id;

    // 🔒 STRICT VIP CHECK - Verify VIP is still valid
    const user = await User.findOne({ telegramId: userId });
    const isVip = user && user.vipUntil && new Date(user.vipUntil) > new Date();

    if (!isVip) {
        await ctx.reply('🔒 <b>VIP obunangiz tugagan!</b>\n\nVIP chatdan foydalanish uchun obunani yangilang.', { parse_mode: 'HTML' });
        return ctx.scene.leave();
    }

    // Check if already in a chat
    if (activePairs.has(userId)) {
        return ctx.reply('🔗 Siz allaqachon suhbatdasiz! /cancel bilan chiqing.');
    }

    // Check if someone is waiting
    const waitingUserIndex = waitingQueue.findIndex(id => id !== userId);

    if (waitingUserIndex !== -1) {
        // Found a partner!
        const partnerId = waitingQueue.splice(waitingUserIndex, 1)[0];

        // Verify partner is still VIP
        const partnerUser = await User.findOne({ telegramId: partnerId });
        const partnerIsVip = partnerUser && partnerUser.vipUntil && new Date(partnerUser.vipUntil) > new Date();

        if (!partnerIsVip) {
            // Partner's VIP expired, skip them
            return anonChatScene.enter(ctx); // Re-run enter to find another partner
        }

        // Create bidirectional link
        activePairs.set(userId, partnerId);
        activePairs.set(partnerId, userId);

        const welcomeMsg = '🎉 <b>Suhbatdosh topildi!</b>\n\n🥷 Siz anonim tarzda suhbatlashmoqdasiz.\n\n⚠️ <b>Qoidalar:</b>\n├ 🚫 Reklama, link, kanal tavsiya qilish TAQIQLANADI\n├ 🚫 So\'kinish va haqorat TAQIQLANADI\n├ 🚫 Xabarlarni forward qilish MUMKIN EMAS\n└ ❌ Qoidabuzarlik = BLOKLASH\n\nChiqish: /cancel';

        await ctx.reply(welcomeMsg, {
            parse_mode: 'HTML',
            ...Markup.keyboard([['🔴 Suhbatni tugatish']]).resize()
        });

        try {
            await ctx.telegram.sendMessage(partnerId, welcomeMsg, {
                parse_mode: 'HTML',
                ...Markup.keyboard([['🔴 Suhbatni tugatish']]).resize()
            });
        } catch (e) {
            logger.error('Failed to notify partner:', e);
        }
    } else {
        // No one waiting, add to queue
        if (!waitingQueue.includes(userId)) {
            waitingQueue.push(userId);
        }

        await ctx.reply('🔍 <b>Suhbatdosh qidirilmoqda...</b>\n\n⏳ Iltimos, kuting. Boshqa VIP foydalanuvchi ulanishi bilan suhbat boshlanadi.\n\nBekor qilish: /cancel', {
            parse_mode: 'HTML',
            ...Markup.keyboard([['❌ Bekor qilish']]).resize()
        });
    }
});

anonChatScene.leave(async (ctx) => {
    const userId = ctx.from.id;

    // Remove from waiting queue if present
    const queueIndex = waitingQueue.indexOf(userId);
    if (queueIndex !== -1) {
        waitingQueue.splice(queueIndex, 1);
    }

    // End active chat if exists
    if (activePairs.has(userId)) {
        const partnerId = activePairs.get(userId);
        activePairs.delete(userId);
        activePairs.delete(partnerId);

        // Notify partner
        try {
            await ctx.telegram.sendMessage(partnerId, '🚪 Suhbatdosh chatni tark etdi.\n\nYangi suhbat boshlash uchun 🗣 VIP Chat tugmasini bosing.', Markup.removeKeyboard());
        } catch (e) { }
    }

    await ctx.reply('🚪 <b>Anonim chat tugatildi.</b>\n\nRahmat! Yangi suhbat uchun qayta kiring.', {
        parse_mode: 'HTML',
        ...Markup.removeKeyboard()
    });
});

// Exit commands
anonChatScene.hears(['❌ Bekor qilish', '🔴 Suhbatni tugatish', '❌ Cancel', '❌ Отмена', '/cancel'], (ctx) => {
    return ctx.scene.leave();
});

// 🛡️ Block forwarded messages
anonChatScene.on('forward', async (ctx) => {
    await handleViolation(ctx, ctx.from.id, 'Xabar forward qilish taqiqlanadi!');
});

// Handle all messages with content filtering
anonChatScene.on(['text', 'photo', 'video', 'voice', 'sticker', 'video_note', 'animation'], async (ctx) => {
    try {
        const userId = ctx.from.id;
        const partnerId = activePairs.get(userId);
        const msg = ctx.message;

        // 🔒 Re-check VIP status for every message
        const user = await User.findOne({ telegramId: userId });
        const isVip = user && user.vipUntil && new Date(user.vipUntil) > new Date();

        if (!isVip) {
            await ctx.reply('🔒 VIP obunangiz tugadi. Chat yakunlandi.');
            return ctx.scene.leave();
        }

        // 🛡️ Check for forwarded messages
        if (isForwarded(msg)) {
            await handleViolation(ctx, userId, 'Xabar forward qilish taqiqlanadi!');
            return;
        }

        // 🛡️ Check text content for banned words/patterns
        const textToCheck = msg.text || msg.caption || '';
        if (containsBannedContent(textToCheck)) {
            await handleViolation(ctx, userId, 'Reklama, link yoki noto\'g\'ri so\'zlar aniqlandi!');
            return;
        }

        if (!partnerId) {
            // User is still in queue, not matched yet
            return ctx.reply('⏳ Suhbatdosh hali topilmadi. Iltimos, kuting...');
        }

        // Forward the message to partner anonymously (with content protection)
        if (msg.text) {
            await ctx.telegram.sendMessage(partnerId, `🥷 ${msg.text}`);
        } else if (msg.photo) {
            const caption = msg.caption ? `🥷 ${msg.caption}` : '🥷';
            await ctx.telegram.sendPhoto(partnerId, msg.photo[msg.photo.length - 1].file_id, {
                caption,
                protect_content: true // Prevent forwarding/saving
            });
        } else if (msg.video) {
            const caption = msg.caption ? `🥷 ${msg.caption}` : '🥷';
            await ctx.telegram.sendVideo(partnerId, msg.video.file_id, {
                caption,
                protect_content: true
            });
        } else if (msg.voice) {
            await ctx.telegram.sendVoice(partnerId, msg.voice.file_id, {
                caption: '🥷 Ovozli xabar',
                protect_content: true
            });
        } else if (msg.sticker) {
            await ctx.telegram.sendSticker(partnerId, msg.sticker.file_id);
        } else if (msg.video_note) {
            await ctx.telegram.sendVideoNote(partnerId, msg.video_note.file_id);
        } else if (msg.animation) {
            await ctx.telegram.sendAnimation(partnerId, msg.animation.file_id, {
                caption: msg.caption ? `🥷 ${msg.caption}` : undefined,
                protect_content: true
            });
        }

    } catch (e) {
        logger.error('Anon chat relay error:', e);
        if (e.message.includes('blocked') || e.message.includes('chat not found')) {
            ctx.reply('⚠️ Suhbatdosh botni bloklagan yoki mavjud emas. Chat tugadi.');
            return ctx.scene.leave();
        }
        ctx.reply('❌ Xabar yuborishda xatolik.');
    }
});

export default anonChatScene;
