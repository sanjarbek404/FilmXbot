import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';
import User from '../models/User.js';

const cancelKeyboard = Markup.inlineKeyboard([
    Markup.button.callback('❌ Bekor qilish (Chiqish)', 'cancel_profile_search')
]);

// Scene: Admin User Profile Search
const userProfileScene = new Scenes.WizardScene(
    'USER_PROFILE_SCENE',
    // Step 1: List all users AND request ID
    async (ctx) => {
        try {
            const users = await User.find().sort({ createdAt: -1 });
            const total = users.length;

            if (total === 0) {
                await ctx.reply('📭 Botda hozircha foydalanuvchilar mavjud emas.');
                return ctx.scene.leave();
            }

            let message = `👥 <b>Barcha foydalanuvchilar (${total} ta):</b>\n\n`;
            let messages = [];

            users.forEach((u, i) => {
                const line = `${i + 1}. <b>${u.firstName || 'Nomsiz'}</b> ${u.username ? `(@${u.username})` : ''} | ID: <code>${u.telegramId}</code>\n`;
                if ((message.length + line.length) > 4000) {
                    messages.push(message);
                    message = '';
                }
                message += line;
            });
            if (message.length > 0) messages.push(message);

            for (let msg of messages) {
                await ctx.reply(msg, { parse_mode: 'HTML' });
            }

            await ctx.reply('🔍 <b>Profilga o\'tish uchun foydalanuvchi ID sini yuboring:</b>', {
                parse_mode: 'HTML',
                ...cancelKeyboard
            });

            return ctx.wizard.next();
        } catch (e) {
            logger.error('UserProfileScene step 1 error:', e);
            await ctx.reply('❌ Xatolik yuz berdi. Qayta urinib ko\'ring: /admin').catch(() => {});
            return ctx.scene.leave();
        }
    },
    // Step 2: Receive ID and show profile (loops until cancel)
    async (ctx) => {
        try {
            // Handle Cancel button
            if (ctx.callbackQuery) {
                if (ctx.callbackQuery.data === 'cancel_profile_search') {
                    await ctx.answerCbQuery('❌ Bekor qilindi').catch(() => {});
                    await ctx.editMessageText('❌ Qidiruv bekor qilindi.').catch(() => {});
                    return ctx.scene.leave();
                }
                await ctx.answerCbQuery().catch(() => {});
                return;
            }

            // Only process text messages
            if (!ctx.message || !ctx.message.text) return;

            const query = ctx.message.text.trim();

            // Ignore bot commands like /start, /admin etc.
            if (query.startsWith('/')) {
                return ctx.scene.leave();
            }

            // Validate numeric ID
            if (!/^\d+$/.test(query)) {
                await ctx.reply('⚠️ <b>Iltimos, faqat ID raqam yuboring!</b>\n\nMasalan: <code>123456789</code>', {
                    parse_mode: 'HTML',
                    ...cancelKeyboard
                });
                return;
            }

            const targetId = Number(query);
            let user = null;

            try {
                user = await User.findOne({ telegramId: targetId });
            } catch (dbErr) {
                logger.error('UserProfileScene DB error:', dbErr);
                await ctx.reply('⚠️ Ma\'lumotlar bazasiga ulanishda xatolik. Qayta urinib ko\'ring.', {
                    ...cancelKeyboard
                });
                return;
            }

            if (!user) {
                await ctx.reply(`📭 <b>ID bo'yicha topilmadi:</b> <code>${targetId}</code>\n\nBoshqa ID yuboring yoki bekor qiling.`, {
                    parse_mode: 'HTML',
                    ...cancelKeyboard
                });
                return;
            }

            // Show user profile
            await showUserProfile(ctx, user);

            // Prompt for next ID
            await ctx.reply('🔍 <b>Yana boshqa profil ko\'rish uchun ID yuboring yoki bekor qiling:</b>', {
                parse_mode: 'HTML',
                ...cancelKeyboard
            });

            return; // stay in step 2

        } catch (e) {
            logger.error('UserProfileScene step 2 error:', e);
            // Don't leave the scene on error, let the admin try again
            await ctx.reply('⚠️ Xatolik yuz berdi. Qayta ID yuboring yoki bekor qiling.', {
                ...cancelKeyboard
            }).catch(() => {});
            return; // stay in step 2
        }
    }
);

// Handle cancel button globally for this scene
userProfileScene.action('cancel_profile_search', async (ctx) => {
    try {
        await ctx.answerCbQuery('❌ Bekor qilindi').catch(() => {});
        await ctx.editMessageText('❌ Qidiruv bekor qilindi.').catch(() => {});
    } catch (e) {}
    return ctx.scene.leave();
});

async function showUserProfile(ctx, user) {
    const roleIcon = user.role === 'superadmin' ? '👑' : user.role === 'admin' ? '👮‍♂️' : '👤';
    const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Noma\'lum';

    let vipStatus = '❌ Yo\'q';
    if (user.vipUntil && new Date(user.vipUntil) > new Date()) {
        const daysLeft = Math.ceil((new Date(user.vipUntil) - new Date()) / (1000 * 60 * 60 * 24));
        vipStatus = `✅ Mavjud (${daysLeft} kun qoldi)`;
    }

    const message = `${roleIcon} <b>Foydalanuvchi Profili</b>\n\n` +
                    `📝 <b>Ism:</b> ${user.firstName || 'Kiritilmagan'}\n` +
                    `🌐 <b>Username:</b> ${user.username ? `@${user.username}` : 'Mavjud emas'}\n` +
                    `🆔 <b>ID:</b> <code>${user.telegramId}</code>\n\n` +
                    `📅 <b>Ro'yxatdan o'tgan:</b> ${joinedDate}\n` +
                    `🎬 <b>Ko'rilgan kinolar:</b> ${user.moviesWatched || 0} ta\n` +
                    `💎 <b>VIP Holati:</b> ${vipStatus}\n` +
                    `🚫 <b>Bloklangan:</b> ${user.isBanned ? 'Ha ❌' : 'Yo\'q ✅'}`;

    const tgLinkButton = Markup.button.url('↗️ Profilga o\'tish', `tg://user?id=${user.telegramId}`);

    await ctx.reply(message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[tgLinkButton]])
    });
}

export default userProfileScene;
