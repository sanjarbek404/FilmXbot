import { Markup } from 'telegraf';
import Movie from '../models/Movie.js';
import User from '../models/User.js';
import { getUserByTelegramId } from '../services/userService.js';
import Favorite from '../models/Favorite.js';
import { getTranslation } from '../utils/locales.js';
import { sendMainMenu } from '../utils/menuUtils.js';
import { checkSubscription } from '../services/subscriptionService.js';
import logger from '../utils/logger.js';
import { sendMovie } from './user.js';

export const setupStartCommand = (bot) => {
    // /help
    bot.command('help', async (ctx) => {
        try {
            if (ctx.scene?.current) await ctx.scene.leave().catch(() => { });

            const msg = `ℹ️ <b>Yordam va Buyruqlar</b>\n\n` +
                `🔹 /start — Botni yangilash\n` +
                `🔹 /help — Yordam olish\n` +
                `🔹 /support — Adminga yozish\n\n` +
                `🎯 <i>Kino topish uchun shunchaki kodini yoki nomini yuboring. Boshqa barcha imkoniyatlar (Shaxsiy kabinet, sozlamalar) pastki menyuda joylashgan.</i>`;

            await ctx.reply(msg, { parse_mode: 'HTML' });
        } catch (e) {
            logger.error('Help command error:', e);
        }
    });

    // /support
    bot.command('support', async (ctx) => {
        try {
            if (ctx.scene?.current) {
                await ctx.scene.leave().catch(() => { });
            }

            const msg = `📞 <b>Qo'llab-quvvatlash</b>\n\n` +
                `Savol yoki muammo bo'lsa adminga yozing:\n` +
                `- @sanjarbek_404`;

            await ctx.reply(msg, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.url('📞 Adminga yozish', 'https://t.me/sanjarbek_404')]])
            });
        } catch (e) {
            logger.error('Support command error:', e);
        }
    });

    bot.start(async (ctx) => {
        try {
            const startPayload = ctx.message?.text?.split(' ')[1];
            let pendingMovieCode = null;
            let referrerId = null;

            // 1. Differentiate Payload (Movie Code vs Referrer ID)
            if (startPayload && /^\d+$/.test(startPayload)) {
                if (startPayload.length >= 7) { 
                    referrerId = startPayload; // Telegram IDs are usually 7+ digits
                } else {
                    pendingMovieCode = parseInt(startPayload); // Movie codes usually 1-6 digits
                }
            }

            // 2. User Creation & Referral (Run immediately to catch referral)
            let user = await User.findOne({ telegramId: ctx.from.id });
            if (!user) {
                try {
                    user = await User.create({
                        telegramId: ctx.from.id,
                        firstName: ctx.from.first_name,
                        username: ctx.from.username,
                        language: 'uz', // Default modern setup
                        invitedBy: (referrerId && referrerId !== ctx.from.id.toString()) ? referrerId : null
                    });
                    
                    // NEW: DYNAMIC ACTION (Aksiya va Global VIP) Welcome Pack
                    try {
                        const Config = (await import('../models/Config.js')).default;
                        const actionConfig = await Config.findOne({ key: 'LATEST_GLOBAL_VIP' });
                        if (actionConfig && actionConfig.value) {
                            const actionData = JSON.parse(actionConfig.value);
                            if (actionData.targetDate > Date.now()) {
                                // Aksiya xali davom etyapti! Bot yoqilganda unga qo'shilamiz
                                user.vipUntil = new Date(actionData.targetDate);
                                await user.save();
                                
                                const msgData = actionData.message;
                                if (msgData) {
                                    if (msgData.type === 'text') {
                                        await ctx.telegram.sendMessage(ctx.from.id, `💎 <b>Aksiya davom etmoqda:</b>\n\n${msgData.content}\n\n<i>Botimizga a'zo bo'lganingiz uchun aksiyada qatnashish huquqini qo'lga kiritdingiz! Sizga shu lahzaning o'zida ommaviy VIP obunasi yuborildi.</i>`, { parse_mode: 'HTML' }).catch(()=>{});
                                    } else if (msgData.type === 'photo') {
                                        await ctx.telegram.sendPhoto(ctx.from.id, msgData.fileId, { caption: msgData.caption ? `💎 <b>Aksiya tabrigi:</b>\n\n${msgData.caption}\n\n<i>Botimizga a'zo bo'lganingiz uchun sizga ommaviy VIP sovg'a tariqasida taqdim etildi.</i>` : '💎 Yangi mijozlar uchun VIP sovg\'a aktivlashtirildi!', parse_mode: 'HTML' }).catch(()=>{});
                                    } else if (msgData.type === 'video') {
                                        await ctx.telegram.sendVideo(ctx.from.id, msgData.fileId, { caption: msgData.caption ? `💎 <b>Aksiya tabrigi:</b>\n\n${msgData.caption}\n\n<i>Botimizga kirganingiz munosabati bilan ushbu imtiyoz sizga ham taqdim etildi.</i>` : '💎 Yangi mijozlar uchun ommaviy VIP taqdim etildi!', parse_mode: 'HTML' }).catch(()=>{});
                                    }
                                }
                            }
                        }
                    } catch (e) {
                         logger.error('Welcome VIP auto-gift error', e);
                    }

                    // Update Referrer
                    if (user.invitedBy) {
                        const referrer = await User.findOne({ telegramId: parseInt(user.invitedBy) });
                        if (referrer) {
                            referrer.referralCount = (referrer.referralCount || 0) + 1;
                            if (referrer.referralCount % 10 === 0) {
                                let currentVip = referrer.vipUntil && new Date(referrer.vipUntil) > new Date() ? new Date(referrer.vipUntil) : new Date();
                                referrer.vipUntil = new Date(currentVip.getTime() + 24 * 60 * 60 * 1000);
                                ctx.telegram.sendMessage(referrer.telegramId, ctx.t('referral_milestone'), { parse_mode: 'HTML' }).catch(() => {});
                                await referrer.save();
                            } else {
                                const left = 10 - (referrer.referralCount % 10);
                                ctx.telegram.sendMessage(referrer.telegramId, ctx.t('referral_progress', { count: referrer.referralCount, left }), { parse_mode: 'HTML' }).catch(() => {});
                                await referrer.save();
                            }
                        }
                    }
                } catch (e) {
                    user = await User.findOne({ telegramId: ctx.from.id }); // Fallback on race condition
                }
            } else if (!user.language) {
                user.language = 'uz'; // Force modern smooth UX
                await user.save();
            }

            // Bind lang manually for this context just in case middleware missed
            ctx.t = (key, params) => getTranslation(user.language, key, params);

            // 3. Mandatory Subscription Check First!
            const subStatus = await checkSubscription(ctx);
            if (subStatus !== true && Array.isArray(subStatus) && subStatus.length > 0) {
                // Save deep link intent for later
                if (pendingMovieCode) {
                    ctx.session = ctx.session || {};
                    ctx.session.pendingMovieCode = pendingMovieCode;
                }

                const buttons = subStatus.map(ch => [Markup.button.url(`➕ ${ch.name}`, ch.inviteLink)]);
                buttons.push([Markup.button.callback(ctx.t('sub_btn_check'), 'check_subscription')]);

                return ctx.reply(ctx.t('sub_check_msg'), {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard(buttons)
                });
            }

            // 4. Send Requested Movie (If passed sub)
            if (pendingMovieCode) {
                const movie = await Movie.findOne({ code: pendingMovieCode });
                if (movie) {
                    await sendMovie(ctx, movie, user);
                    return;
                } else {
                    await ctx.reply(ctx.t('not_found')).catch(() => {});
                }
            }

            // 5. Default Start Check for Custom GIF/Text
            try {
                const Config = (await import('../models/Config.js')).default;
                const startGifConfig = await Config.findOne({ key: 'START_GIF' });
                
                let customSent = false;
                if (startGifConfig && startGifConfig.value) {
                    const data = JSON.parse(startGifConfig.value);
                    const caption = data.caption || `🎬 <b>FilmXBotga Xush kelibsiz!</b>\n\n🔍 Qanday qilib kino topamiz?\nKino maxfiy kodini yoki nomini yuboring.`;
                    
                    if (data.type === 'animation') {
                        await ctx.replyWithAnimation(data.fileId, { caption, parse_mode: 'HTML' }).then(() => customSent = true).catch(() => {});
                    } else if (data.type === 'photo') {
                        await ctx.replyWithPhoto(data.fileId, { caption, parse_mode: 'HTML' }).then(() => customSent = true).catch(() => {});
                    } else if (data.type === 'video') {
                        await ctx.replyWithVideo(data.fileId, { caption, parse_mode: 'HTML' }).then(() => customSent = true).catch(() => {});
                    }
                }

                if (!customSent) {
                    const onboardingText = `🎬 <b>FilmXBot - Eng sara kinolar!</b>\n\n` +
                        `🔍 <b>Kino qidirish judayam oson:</b>\n` +
                        `1️⃣ Shunchaki kino nomini yozing (masalan: <i>Venom</i>)\n` +
                        `2️⃣ Yoki kino kodini yuboring (masalan: <i>125</i>) va darhol tomosha qiling 🍿\n\n` +
                        `🚀 Qo'shimcha imkoniyatlarni pastki menyu orqali boshqaring.`;
                    await ctx.reply(onboardingText, { parse_mode: 'HTML' }).catch(()=>{});
                }
            } catch (err) {
                logger.error('Start GIF send error:', err);
                const onboardingText = `🎬 <b>FilmXBot - Eng sara kinolar!</b>\n\n🔍 Kino nomini yoki kodini yuboring va darhol tomosha qiling.`;
                await ctx.reply(onboardingText, { parse_mode: 'HTML' }).catch(()=>{});
            }
            sendMainMenu(ctx);
        } catch (error) {
            logger.error('Start command error:', error);
        }
    });

    // Language Handlers (Simplified)
    bot.hears(['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English'], async (ctx) => {
        let lang = 'uz';
        if (ctx.message.text.includes('Русский')) lang = 'ru';
        else if (ctx.message.text.includes('English')) lang = 'en';

        const user = await User.findOne({ telegramId: ctx.from.id });
        if (user) {
            user.language = lang;
            await user.save();
            if(!ctx.session) ctx.session = {};
            ctx.session.user = user;
            ctx.t = (key, params) => getTranslation(lang, key, params);
        }
        await ctx.reply(ctx.t('lang_changed'), Markup.removeKeyboard());
        sendMainMenu(ctx);
    });

    // Send Main Menu (Delegated to util)
    const handleMainMenu = (ctx) => sendMainMenu(ctx);

    // Helper for Settings Menu
    bot.hears(['⚙️ Sozlamalar', '⚙️ Настройки', '⚙️ Settings'], (ctx) => {
        ctx.reply(ctx.t('settings_title'), {
            ...Markup.keyboard([
                ['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English'],
                [ctx.t('menu_main')]
            ]).resize()
        });
    });

    // Back to Menu
    bot.hears(['🏠 Bosh menyu', '🏠 Главное меню', '🏠 Main Menu'], (ctx) => sendMainMenu(ctx));

    // Stats Handler (Updated with VIP promo)
    bot.hears(['📊 Mening statistikam', '📊 Моя статистика', '📊 My Stats'], async (ctx) => {
        try {
            const user = await User.findOne({ telegramId: ctx.from.id });
            const isVip = user && user.vipUntil && new Date(user.vipUntil) > new Date();
            const favCount = await Favorite.countDocuments({ user: user._id }).catch(() => 0);

            let msg = `📊 <b>${ctx.t('menu_stats')}</b>\n\n`;
            msg += `👤 <b>Ism:</b> ${user.firstName}\n`;
            msg += `❤️ <b>Sevimlilar:</b> ${favCount} ta\n`;
            msg += `🎬 <b>Ko'rilgan kinolar:</b> ${user.moviesWatched || 0} ta\n\n`;

            if (isVip) {
                const daysLeft = Math.ceil((new Date(user.vipUntil) - new Date()) / (1000 * 60 * 60 * 24));
                msg += `💎 <b>VIP Status:</b> ✅ AKTIV\n`;
                msg += `📅 <b>Qolgan kunlar:</b> ${daysLeft} kun\n`;
            } else {
                msg += `👤 <b>Status:</b> Oddiy foydalanuvchi\n\n`;
                msg += `💎 <i>VIP bo'ling va ko'proq imkoniyatlarga ega bo'ling!</i>`;
            }

            const buttons = [];
            if (!isVip) {
                buttons.push([Markup.button.callback('💎 VIP Olish', 'vip_info')]);
            }

            await ctx.reply(msg, {
                parse_mode: 'HTML',
                ...(buttons.length > 0 ? Markup.inlineKeyboard(buttons) : {})
            });
        } catch (e) {
            logger.error('Stats error:', e);
        }
    });

    // 🗳 Vote / Request Movie Handler (VIP Only)
    bot.hears(['🗳 Ovoz berish', '🗳 Голосование', '🗳 Vote'], async (ctx) => {
        try {
            const user = await User.findOne({ telegramId: ctx.from.id });
            const isVip = user && user.vipUntil && new Date(user.vipUntil) > new Date();

            if (!isVip) {
                return ctx.reply(ctx.t('vip_restricted'));
            }

            ctx.scene.enter('REQUEST_SCENE');
        } catch (e) {
            logger.error('Vote handler error:', e);
        }
    });
    // Check Subscription Callback
    bot.action('check_subscription', async (ctx) => {
        try {
            const subStatus = await checkSubscription(ctx);
            if (subStatus === true) {
                await ctx.deleteMessage().catch(() => { });
                await ctx.reply(ctx.t('sub_success'), { parse_mode: 'HTML' });
                
                // Process pending movie from Start deep link
                if (ctx.session?.pendingMovieCode) {
                    const code = ctx.session.pendingMovieCode;
                    ctx.session.pendingMovieCode = null; // Clear it
                    
                    const movie = await Movie.findOne({ code });
                    const user = await User.findOne({ telegramId: ctx.from.id });
                    if (movie && user) {
                        await sendMovie(ctx, movie, user);
                        return; // Done
                    }
                }
                sendMainMenu(ctx);
            } else {
                await ctx.answerCbQuery(ctx.t('sub_fail'), { show_alert: true });
            }
        } catch (e) {
            ctx.answerCbQuery('Error').catch(() => {});
        }
    });
};

