import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';
import User from '../models/User.js';
import { getMovieByCode } from '../services/movieService.js';

const reportScene = new Scenes.WizardScene(
    'REPORT_SCENE',
    // Step 1: ask for complaint text
    async (ctx) => {
        try {
            const movieCode = ctx.scene?.state?.movieCode;
            ctx.wizard.state.movieCode = movieCode;

            const movie = movieCode ? await getMovieByCode(parseInt(movieCode)).catch(() => null) : null;
            const movieTitle = movie ? movie.title : (movieCode ? `Kino (kod: ${movieCode})` : 'Kino');

            await ctx.reply(
                `⚠️ <b>Shikoyat yuborish</b>\n\n` +
                `🎬 <b>Kino:</b> ${movieTitle}\n` +
                `📝 <b>Shikoyat matnini yozing:</b>`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('❌ Bekor qilish', 'cancel_report')]
                    ])
                }
            );

            return ctx.wizard.next();
        } catch (e) {
            logger.error('Report scene step1 error:', e);
            return ctx.scene.leave();
        }
    },
    // Step 2: handle input and forward to admins
    async (ctx) => {
        try {
            if (ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_report') {
                await ctx.answerCbQuery('❌ Bekor qilindi').catch(() => { });
                try { await ctx.editMessageText('❌ Bekor qilindi.'); } catch (e) { }
                return ctx.scene.leave();
            }

            if (!ctx.message || !ctx.message.text) {
                return ctx.reply('⚠️ Iltimos, shikoyat matnini yuboring.');
            }

            const text = ctx.message.text.trim();
            if (!text) {
                return ctx.reply('⚠️ Iltimos, shikoyat matnini yuboring.');
            }

            const movieCode = ctx.wizard.state.movieCode;
            const movie = movieCode ? await getMovieByCode(parseInt(movieCode)).catch(() => null) : null;
            const movieTitle = movie ? movie.title : (movieCode ? `Kino (kod: ${movieCode})` : 'Kino');

            const userName = ctx.from.first_name || ctx.from.username || 'Noma\'lum';
            const userUsername = ctx.from.username ? `@${ctx.from.username}` : 'Username yo\'q';

            const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
            if (!admins || admins.length === 0) {
                await ctx.reply('❌ Adminlar topilmadi. Keyinroq urinib ko\'ring.');
                return ctx.scene.leave();
            }

            const reportMsg = `⚠️ <b>YANGI SHIKOYAT!</b>\n\n` +
                `🎬 <b>Kino:</b> ${movieTitle}\n` +
                (movieCode ? `🔢 <b>Kod:</b> <code>${movieCode}</code>\n\n` : `\n`) +
                `👤 <b>Shikoyat yuboruvchi:</b>\n` +
                `├ Ism: ${userName}\n` +
                `├ Username: ${userUsername}\n` +
                `└ ID: <code>${ctx.from.id}</code>\n\n` +
                `📝 <b>Matn:</b>\n${text}\n\n` +
                `📅 <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}`;

            let sentCount = 0;
            for (const admin of admins) {
                try {
                    await ctx.telegram.sendMessage(admin.telegramId, reportMsg, {
                        parse_mode: 'HTML',
                        reply_markup: movieCode
                            ? {
                                inline_keyboard: [
                                    [{ text: '📝 Kinoni tahrirlash', callback_data: `edit_movie_${movieCode}` }],
                                    [{ text: '🗑️ Kinoni o\'chirish', callback_data: `delete_confirm_${movieCode}` }]
                                ]
                            }
                            : undefined
                    });
                    sentCount++;
                } catch (e) {
                    logger.error(`Failed to send report to admin ${admin.telegramId}:`, e);
                }
            }

            if (sentCount > 0) {
                await ctx.reply(`✅ Shikoyatingiz ${sentCount} ta adminga yuborildi!`, { parse_mode: 'HTML' });
            } else {
                await ctx.reply('❌ Shikoyat yuborishda xatolik yuz berdi.', { parse_mode: 'HTML' });
            }

            return ctx.scene.leave();
        } catch (e) {
            logger.error('Report scene step2 error:', e);
            await ctx.reply('❌ Xatolik yuz berdi. Qayta urinib ko\'ring.');
            return ctx.scene.leave();
        }
    }
);

reportScene.action('cancel_report', async (ctx) => {
    try {
        await ctx.answerCbQuery('❌ Bekor qilindi').catch(() => { });
    } catch (e) { }
    return ctx.scene.leave();
});

reportScene.command('cancel', async (ctx) => {
    await ctx.reply('❌ Bekor qilindi.');
    return ctx.scene.leave();
});

export default reportScene;
