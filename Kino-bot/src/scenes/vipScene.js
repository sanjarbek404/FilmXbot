import { Scenes, Markup } from 'telegraf';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const vipScene = new Scenes.WizardScene(
    'VIP_SCENE',
    // Step 1: Show Users List / Search
    async (ctx) => {
        try {
            const users = await User.find().sort({ createdAt: -1 }).limit(10);

            const buttons = [];
            users.forEach(u => {
                const name = u.firstName || u.username || `User ${u.telegramId}`;
                buttons.push([Markup.button.callback(name, `select_user_${u.telegramId}`)]);
            });
            buttons.push([Markup.button.callback(ctx.t('cancel') || '❌ Cancel', 'cancel_vip')]);

            await ctx.reply((ctx.t('vip_admin_title') || '💎 VIP Boshqaruv') +
                `\n\n🔎 <b>Qidirish:</b> ism / username yoki Telegram ID yuboring.\n` +
                `<i>Yoki pastdan foydalanuvchini tanlang.</i>`, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
            return ctx.wizard.next();
        } catch (e) {
            logger.error('VIP step 1 error:', e);
            return ctx.scene.leave();
        }
    },
    // Step 2: Handle Selection or Search
    async (ctx) => {
        try {
            if (ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_vip') {
                await ctx.answerCbQuery('❌').catch(() => { });
                try { await ctx.editMessageText(ctx.t('cancel') || '❌ Cancel'); } catch (e) { }
                return ctx.scene.leave();
            }

            // Handle Search Text
            if (ctx.message && ctx.message.text) {
                const query = ctx.message.text;

                // Allow direct numeric ID input (telegramId)
                if (/^\d+$/.test(query.trim())) {
                    const telegramId = parseInt(query.trim());
                    const user = await User.findOne({ telegramId });
                    if (!user) {
                        await ctx.reply(ctx.t('not_found') || 'Not found');
                        return;
                    }

                    ctx.wizard.state.targetUserId = telegramId;
                    ctx.wizard.state.targetUserName = user.firstName || user.username || 'Noma\'lum';

                    await ctx.reply(ctx.t('vip_select_duration', { name: ctx.wizard.state.targetUserName, id: telegramId }), {
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('7 days', 'vip_7'), Markup.button.callback('30 days', 'vip_30')],
                            [Markup.button.callback('90 days', 'vip_90'), Markup.button.callback('Permanent', 'vip_36500')],
                            [Markup.button.callback(ctx.t('cancel') || '❌ Cancel', 'cancel_vip')]
                        ])
                    });

                    return ctx.wizard.next();
                }

                // Search users
                const users = await User.find({
                    $or: [
                        { firstName: { $regex: query, $options: 'i' } },
                        { username: { $regex: query, $options: 'i' } },
                        { telegramId: parseInt(query) || 0 }
                    ]
                }).limit(10);

                if (users.length === 0) {
                    await ctx.reply(ctx.t('not_found') || 'Not found');
                    return; // Stay in this step
                }

                const buttons = [];
                users.forEach(u => {
                    const name = u.firstName || u.username || `User ${u.telegramId}`;
                    buttons.push([Markup.button.callback(name, `select_user_${u.telegramId}`)]);
                });
                buttons.push([Markup.button.callback(ctx.t('cancel') || '❌ Cancel', 'cancel_vip')]);

                await ctx.reply(ctx.t('vip_search_result', { query }), {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard(buttons)
                });
                return; // Stay, allow picking
            }

            // Handle Callback Selection
            if (ctx.callbackQuery && ctx.callbackQuery.data.startsWith('select_user_')) {
                const telegramId = parseInt(ctx.callbackQuery.data.split('_')[2]);
                const user = await User.findOne({ telegramId });

                if (!user) {
                    await ctx.answerCbQuery(ctx.t('not_found'));
                    return;
                }

                ctx.wizard.state.targetUserId = telegramId;
                ctx.wizard.state.targetUserName = user.firstName || user.username || 'Noma\'lum';

                await ctx.editMessageText(ctx.t('vip_select_duration', { name: ctx.wizard.state.targetUserName, id: telegramId }), {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('7 days', 'vip_7'), Markup.button.callback('30 days', 'vip_30')],
                        [Markup.button.callback('90 days', 'vip_90'), Markup.button.callback('Permanent', 'vip_36500')],
                        [Markup.button.callback(ctx.t('cancel'), 'cancel_vip')]
                    ])
                });

                return ctx.wizard.next();
            }
        } catch (e) {
            logger.error('VIP step 2 error:', e);
            return ctx.scene.leave();
        }
    },
    // Step 3: Action Waiter (Logic in actions)
    async (ctx) => {
        // Just wait
    }
);

// Helper to apply VIP
const applyVip = async (ctx, days) => {
    try {
        const telegramId = ctx.wizard.state.targetUserId;
        const vipUntil = new Date();
        vipUntil.setDate(vipUntil.getDate() + days);

        await User.findOneAndUpdate(
            { telegramId },
            {
                vipUntil,
                vipAddedBy: ctx.from.id.toString(),
                vipAddedAt: new Date(),
                vipNotified: false
            }
        );

        const dateStr = vipUntil.toISOString().split('T')[0];

        await ctx.editMessageText(ctx.t('vip_granted', { id: telegramId, date: dateStr }), { parse_mode: 'HTML' });

        // Notify user with detailed VIP info
        try {
            const vipNotifyMsg = `✅ <b>Tabriklaymiz!</b>\n\n` +
                `💎 Sizga <b>${days} kunlik VIP</b> berildi!\n` +
                `📅 Amal qilish muddati: ${dateStr}\n\n` +
                `🔄 <b>MUHIM!</b>\n` +
                `Menyu avtomatik yangilanadi. Agar yangilanmasa, /start yuboring.\n\n` +
                `💎 <b>VIP imkoniyatlar:</b>\n` +
                `├ 🎬 Barcha kinolarga cheklovsiz kirish\n` +
                `├ 💬 Sharh qoldirish va o'qish\n` +
                `├ ⭐ Sevimlilar ro'yxati\n` +
                `├ 📜 Ko'rish tarixi\n` +
                `├ 🎰 Tasodifiy kino\n` +
                `├ 🎫 Promokod ishlatish\n` +
                `└ ⚠️ Shikoyat yuborish\n\n` +
                `<i>Bot qayta ishga tushgach, barcha imkoniyatlar ochiladi!</i>`;

            await ctx.telegram.sendMessage(telegramId, vipNotifyMsg, { parse_mode: 'HTML' });
        } catch (e) {
            logger.error('VIP notify error:', e);
        }

        return ctx.scene.leave();
    } catch (e) {
        logger.error('Apply VIP error:', e);
        ctx.reply(ctx.t('error_general'));
        return ctx.scene.leave();
    }
};

vipScene.action(/^vip_(\d+)$/, async (ctx) => {
    const days = parseInt(ctx.match[1]);
    return applyVip(ctx, days);
});

vipScene.action('cancel_vip', async (ctx) => {
    try {
        await ctx.editMessageText(ctx.t('cancel'));
        return ctx.scene.leave();
    } catch (e) {
        return ctx.scene.leave();
    }
});

export default vipScene;
