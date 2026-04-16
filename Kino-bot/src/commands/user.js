import { Markup } from 'telegraf';
import logger from '../utils/logger.js';
import { getMovieByCode, searchMovies, getAllMovies, getTopMovies } from '../services/movieService.js';
import Favorite from '../models/Favorite.js';
import Movie from '../models/Movie.js';
import User from '../models/User.js';
import { getUserByTelegramId } from '../services/userService.js';
import PromoCode from '../models/PromoCode.js';
import { sendMainMenu } from '../utils/menuUtils.js';
import { getSmartRecommendations } from '../services/recommendationService.js';

// Helper function to send movie
export const sendMovie = async (ctx, movie, dbUser) => {
    try {
        // VIP Check
        const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();

        // Increment views using updateOne (movie might be plain object from aggregate)
        if (movie._id) {
            await Movie.updateOne({ _id: movie._id }, { $inc: { views: 1 } }).catch(() => { });
        }
        const views = (movie.views || 0) + 1;

        // Watermark for caption
        const userWatermark = ctx.from.username ? `@${ctx.from.username}` : `ID: ${ctx.from.id}`;

        const escapeHTML = (str) => {
            if (!str) return '';
            return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        };

        let caption = ctx.t('movie_found', {
            title: escapeHTML(movie.title),
            year: (movie.year || (movie.released ? new Date(movie.released).getFullYear() : 'N/A')),
            genre: escapeHTML(Array.isArray(movie.genres) ? movie.genres.join(', ') : (movie.genre || 'N/A')),
            rating: movie.averageRating || '0.0',
            views: views
        });

        if (movie.description) {
            let desc = movie.description.length > 350 ? movie.description.substring(0, 350) + '...' : movie.description;
            caption += `\n📝 ${escapeHTML(desc)}\n`;
        }

        let buttons = [];
        if (!isVip) {
            caption += `\n\n🔒 <i>Faqatgina VIP obunachilargina ushbu kinoni yuklab olib boshqalarga uzata (forward) oladi.</i>`;
            buttons.push([Markup.button.callback('💎 VIP Olish', 'vip_info')]);
        }

        // Send video for all users, but lock forwarding/saving if restricted or non-VIP
        if (movie.fileId) {
            try {
                // Video sending with protection
                await ctx.replyWithVideo(movie.fileId, {
                    caption,
                    parse_mode: 'HTML',
                    protect_content: movie.isRestricted ? true : !isVip,
                    ...Markup.inlineKeyboard(buttons)
                });

                if (!isVip && dbUser && (dbUser.moviesWatched || 0) % 3 === 0) {
                    setTimeout(() => ctx.showVipPromo?.(), 2000);
                }

                return true;
            } catch (e) {
                logger.error('Video send error:', e);
                // Fallback if video fails not implemented to avoid leak, better fail.
                throw e;
            }
        }

        // If has link, show download only for VIP and if NOT restricted
        if (movie.link && isVip && !movie.isRestricted) {
            buttons.unshift([Markup.button.url('📥 Download', movie.link)]);
        }

        if (movie.poster) {
            try {
                await ctx.replyWithPhoto(movie.poster, {
                    caption,
                    parse_mode: 'HTML',
                    protect_content: movie.isRestricted ? true : !isVip,
                    ...Markup.inlineKeyboard(buttons)
                });

                if (!isVip && dbUser && (dbUser.moviesWatched || 0) % 3 === 0) {
                    setTimeout(() => ctx.showVipPromo?.(), 2000);
                }

                return true;
            } catch (e) {
                logger.error('Photo send error:', e);
            }
        }

        // Fallback to text
        await ctx.replyWithHTML(caption, Markup.inlineKeyboard(buttons));
        return true;
    } catch (error) {
        logger.error('sendMovie error:', error);
        await ctx.reply(`🔧 Xatolik yuz berdi: <b>${error.message || 'Nomaʼlum'}</b>`, { parse_mode: 'HTML' }).catch(() => { });
        return false;
    }
};

export const setupUserCommands = (bot) => {

    // Handle "🔍 Kino qidirish"
    bot.hears(['🔍 Kino qidirish', '🔍 Поиск фильмов', '🔍 Search Movies'], (ctx) => {
        ctx.reply(ctx.t('search_prompt'), { parse_mode: 'HTML' }).catch(() => { });
    });

    // Handle "🆕 Yangi kinolar"
    bot.hears(['🆕 Yangi kinolar', '🆕 Новинки', '🆕 New Movies'], async (ctx) => {
        try {
            const movies = await getAllMovies();
            if (!movies || movies.length === 0) {
                return ctx.reply(ctx.t('not_found'));
            }

            const recent = movies.slice(0, 10);
            let message = '🆕 <b>New Movies:</b>\n\n';
            recent.forEach((m, i) => {
                message += `${i + 1}. 🎬 ${m.title} — <code>${m.code}</code>\n`;
            });
            message += '\n<i>Send code to watch!</i>';

            // Aggressive VIP Promo
            const dbUser = await getUserByTelegramId(ctx.from.id);
            const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();
            const buttons = [];
            if (!isVip) {
                buttons.push([Markup.button.callback('💎 VIP Olish - Eksklyuziv!', 'vip_info')]);
            }

            await ctx.replyWithHTML(message, Markup.inlineKeyboard(buttons));
        } catch (e) {
            logger.error('New movies error:', e);
            ctx.reply(ctx.t('error_general')).catch(() => { });
        }
    });

    // Handle "🔥 Top kinolar"
    bot.hears(['🔥 Top kinolar', '🔥 Топ фильмы', '🔥 Top Movies'], async (ctx) => {
        try {
            const movies = await getTopMovies(10);
            if (!movies || movies.length === 0) {
                return ctx.reply(ctx.t('not_found'));
            }

            let message = ctx.t('menu_top') + ':\n\n';
            movies.forEach((m, i) => {
                message += `${i + 1}. 🎬 ${m.title} — 👁 ${m.views}\nCode: <code>${m.code}</code>\n\n`;
            });

            // Aggressive VIP Promo
            const dbUser = await getUserByTelegramId(ctx.from.id);
            const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();
            const buttons = [];
            if (!isVip) {
                buttons.push([Markup.button.callback('💎 VIP Olish', 'vip_info')]);
            }

            await ctx.replyWithHTML(message, Markup.inlineKeyboard(buttons));
        } catch (e) {
            logger.error('Top movies error:', e);
            ctx.reply(ctx.t('error_general')).catch(() => { });
        }
    });

    // Handle "🎲 Tasodifiy kino"
    bot.hears(['🎲 Tasodifiy kino', '🎲 Случайный фильм', '🎲 Random Movie'], async (ctx) => {
        try {
            const count = await Movie.countDocuments();
            if (count === 0) return ctx.reply(ctx.t('not_found'));
            const random = Math.floor(Math.random() * count);
            const movie = await Movie.findOne().skip(random);
            const dbUser = await getUserByTelegramId(ctx.from.id);
            await ctx.reply('🎲 <b>Tasodifiy tanlandi!</b>', { parse_mode: 'HTML' });
            await sendMovie(ctx, movie, dbUser);
        } catch (e) {
            logger.error('Random movie error:', e);
            ctx.reply(ctx.t('error_general')).catch(() => { });
        }
    });

    // Handle "👤 Shaxsiy Kabinet"
    bot.hears(['👤 Shaxsiy Kabinet', '👤 Личный кабинет', '👤 My Cabinet'], async (ctx) => {
        try {
            const dbUser = await getUserByTelegramId(ctx.from.id);
            const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();
            
            let msg = `👤 <b>${ctx.t('menu_cabinet') || 'Shaxsiy Kabinet'}</b>\n\n`;
            msg += `ID: <code>${ctx.from.id}</code>\n`;
            if (isVip) {
                const daysLeft = Math.ceil((new Date(dbUser.vipUntil) - new Date()) / (1000 * 60 * 60 * 24));
                msg += `💎 <b>Status:</b> VIP (${daysLeft} kun qoldi)\n`;
            } else {
                msg += `💎 <b>Status:</b> Oddiy (VIP emassiz)\n`;
            }
            const buttons = [
                [Markup.button.callback('❤️ Sevimlilar', 'cb_fav'), Markup.button.callback('➕ Saqlash (Kod)', 'cb_add_fav_code')],
                [Markup.button.callback('💡 AI Tavsiyalar', 'cb_ai_rec'), Markup.button.callback('🎰 Omadni sinash', 'cb_random')],
                [Markup.button.callback('📜 Tarixim', 'cb_history'), Markup.button.callback('📊 Statistika', 'cb_stats')],
                [Markup.button.callback('💎 VIP Do\'kon', 'cb_shop'), Markup.button.callback(isVip ? '👑 VIP Aktiv' : '💎 VIP Olish', isVip ? 'cb_vip' : 'cb_shop')],
                [Markup.button.callback('🏆 Reyting - Top 10', 'cb_leaderboard')]
            ];

            await ctx.reply(msg, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
        } catch (e) {
            logger.error('Cabinet error:', e);
            ctx.reply(ctx.t('error_general')).catch(() => { });
        }
    });

    // --- CABINET INLINE ACTIONS ---
    bot.action('cb_add_fav_code', async (ctx) => {
        await ctx.answerCbQuery().catch(()=>{});
        ctx.scene.enter('ADD_FAV_CODE_SCENE');
    });

    bot.action('cb_ai_rec', async (ctx) => {
        try {
            await ctx.answerCbQuery('💡 AI tahlil qilmoqda...').catch(() => {});
            const user = await User.findOne({ telegramId: ctx.from.id });
            if (!user) return;
            
            const reqs = await getSmartRecommendations(user._id, 5);
            if (!reqs || reqs.length === 0) {
                return ctx.reply('📭 Hozircha tavsiyalar yo\'q. Ko\'proq kino ko\'ring!');
            }

            let msg = '💡 <b>AI Tavsiyalar (Sizga moslangan)</b>\n\n';
            reqs.forEach((m, i) => {
                msg += `${i + 1}. 🎬 ${m.title} — <code>${m.code}</code>\n`;
            });
            msg += '\n<i>Kodni yuboring va darhol tomosha qiling!</i>';
            
            await ctx.replyWithHTML(msg);
        } catch (e) {
            logger.error('cb_ai_rec error:', e);
        }
    });

    bot.action('cb_random', async (ctx) => {
        try {
            await ctx.answerCbQuery('🎰 Tasodifiy kino qidirilmoqda...').catch(() => {});
            const count = await Movie.countDocuments();
            if (count === 0) return ctx.reply('📭 Kinolar yo\'q.');
            const random = Math.floor(Math.random() * count);
            const movie = await Movie.findOne().skip(random);
            const user = await User.findOne({ telegramId: ctx.from.id });
            await sendMovie(ctx, movie, user);
        } catch (e) {}
    });

    bot.action('cb_bonus', async (ctx) => {
        try {
            const user = await User.findOne({ telegramId: ctx.from.id });
            if (!user) return ctx.answerCbQuery('❌ Xatolik', { show_alert: true });
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (user.lastDailyBonus && new Date(user.lastDailyBonus) >= today) {
                return ctx.answerCbQuery('⏳ Siz bugungi bonusni olib bo\'lgansiz! O\'yin ertaga davom etadi.', { show_alert: true });
            }
            
            user.points = (user.points || 0) + 10;
            user.lastDailyBonus = new Date();
            await user.save();
            
            await ctx.answerCbQuery('🎁 Tabriklaymiz! O\'yindan +10 ball yutdingiz.', { show_alert: true });
        } catch (e) {}
    });

    bot.action(['cb_shop', 'vip_info'], async (ctx) => {
        try {
            await ctx.answerCbQuery().catch(()=>{});
            return ctx.scene.enter('PAYMENT_RECEIPT_SCENE');
        } catch (e) {}
    });

    bot.on('pre_checkout_query', async (ctx) => {
        try {
            await ctx.answerPreCheckoutQuery(true).catch(()=>{});
        } catch(e) {}
    });

    bot.on('successful_payment', async (ctx) => {
        try {
            const payload = ctx.message.successful_payment.invoice_payload;
            if (payload && payload.startsWith('vip_stars_')) {
                const parts = payload.split('_');
                const days = parseInt(parts[2]);
                const targetId = parseInt(parts[3]);
                
                if (ctx.from.id === targetId) {
                    const user = await User.findOne({ telegramId: targetId });
                    if (user) {
                        const currentVip = user.vipUntil && new Date(user.vipUntil) > new Date() ? new Date(user.vipUntil) : new Date();
                        currentVip.setDate(currentVip.getDate() + days);
                        user.vipUntil = currentVip;
                        await user.save();
                        
                        await ctx.reply(`🎉 <b>Tabriklaymiz! To'lov Muvaffaqiyatli!</b>\n\nSiz <b>${ctx.message.successful_payment.total_amount} ⭐️ Telegram Yulduzi</b> evaziga botimizdan ${days} kunlik VIP ni xarid qildingiz!\n💎 VIP ${currentVip.toISOString().split('T')[0]} sanasiga qadar amal qiladi. Siz bilan ishlashdan xursandmiz!`, { parse_mode: 'HTML' });
                    }
                }
            }
        } catch (e) {
            logger.error('successful_payment err:', e);
        }
    });

    bot.action('cb_leaderboard', async (ctx) => {
        try {
            await ctx.answerCbQuery('Reyting hisoblanmoqda...').catch(()=>{});
            const topUsers = await User.find({ isBanned: false }).sort({ moviesWatched: -1 }).limit(10);
            
            let msg = `🏆 <b>FilmXBot Liderlar Taxtasi (Top 10)</b>\n\n`;
            msg += `<i>Eng ko'p va faol kino ko'rib kelayotgan foydalanuvchilar:</i>\n\n`;
            
            topUsers.forEach((u, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎗';
                const name = (u.firstName || 'Foydalanuvchi').replace(/</g, '').replace(/>/g, ''); // html himoya
                msg += `${medal} <b>${name}</b> — 🎬 ${u.moviesWatched || 0} ta kino\n`;
            });
            
            msg += `\n🛒 <i>Boshqalardan orqada qolmang va eng ko'p kinolarni tomosha qilib reyting cho'qqisiga chiqing!</i>`;
            
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Yopish', 'cb_close_msg')]])
            });
        } catch (e) {
             logger.error('cb_leaderboard err:', e);
        }
    });

    bot.action('cb_close_msg', async (ctx) => {
         await ctx.deleteMessage().catch(()=>{});
    });

    bot.action('cb_stats', async (ctx) => {
        try {
            await ctx.answerCbQuery().catch(() => {});
            const user = await User.findOne({ telegramId: ctx.from.id });
            const isVip = user && user.vipUntil && new Date(user.vipUntil) > new Date();
            const favCount = await Favorite.countDocuments({ user: user._id }).catch(() => 0);

            let msg = `📊 <b>Statistika</b>\n\n`;
            msg += `👤 <b>Ism:</b> ${user.firstName}\n`;
            msg += `❤️ <b>Sevimlilar:</b> ${favCount} ta\n`;
            msg += `🎬 <b>Ko'rilgan kinolar:</b> ${user.moviesWatched || 0} ta\n\n`;
            
            if (!isVip) {
                msg += `<i>💎 VIP so'zini tanlang va qo'shimcha imkoniyatlarni oling!</i>`;
                await ctx.reply(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('💎 VIP Olish', 'vip_info')]]) });
            } else {
                await ctx.reply(msg, { parse_mode: 'HTML' });
            }
        } catch (e) { }
    });

    bot.action('cb_fav', async (ctx) => {
        try {
            const dbUser = await getUserByTelegramId(ctx.from.id);
            const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();

            if (!isVip) return ctx.answerCbQuery(ctx.t('vip_restricted_fav'), { show_alert: true });
            
            await ctx.answerCbQuery().catch(() => {});
            const favorites = await Favorite.find({ user: dbUser._id }).populate('movie');
            if (!favorites || favorites.length === 0) return ctx.reply('📭 <b>Bo\'sh</b>', { parse_mode: 'HTML' });

            let msg = '⭐ <b>Sevimlilar ro\'yxati:</b>\n\n';
            favorites.forEach((f, i) => {
                if (f.movie) msg += `${i + 1}. 🎬 ${f.movie.title} — <code>${f.movie.code}</code>\n`;
            });
            await ctx.replyWithHTML(msg);
        } catch (e) { }
    });

    bot.action('cb_history', async (ctx) => {
        try {
            const dbUser = await User.findOne({ telegramId: ctx.from.id }).populate({ path: 'watchHistory.movie', select: 'title code' });
            const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();

            if (!isVip) return ctx.answerCbQuery(ctx.t('vip_restricted'), { show_alert: true });
            
            await ctx.answerCbQuery().catch(() => {});
            if (!dbUser || !dbUser.watchHistory || dbUser.watchHistory.length === 0) return ctx.reply('📭 Bo\'sh');

            const history = dbUser.watchHistory.slice().reverse();
            let msg = '📜 <b>Mening Tarixim</b>\n\n';
            history.forEach((h, i) => {
                if (h.movie) msg += `${i + 1}. 🎬 ${h.movie.title} — <code>${h.movie.code}</code>\n`;
            });
            await ctx.replyWithHTML(msg);
        } catch (e) { }
    });

    bot.action('cb_vip', async (ctx) => {
        try {
            const user = await getUserByTelegramId(ctx.from.id);
            if (user && user.vipUntil && new Date(user.vipUntil) > new Date()) {
                const diff = new Date(user.vipUntil) - new Date();
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                ctx.answerCbQuery(`⏳ VIP: ${days} kun, ${hours} soat qoldi`, { show_alert: true });
            } else {
                ctx.answerCbQuery('Muddati tugagan', { show_alert: true });
            }
        } catch (e) { }
    });

    // Handle Web App Data response
    bot.on('web_app_data', async (ctx) => {
        try {
            const data = JSON.parse(ctx.message.web_app_data.data);
            if (data.action === 'play_movie' && data.code) {
                const movie = await getMovieByCode(parseInt(data.code));
                if (movie) {
                    const dbUser = await getUserByTelegramId(ctx.from.id);
                    await sendMovie(ctx, movie, dbUser);
                }
            }
        } catch (e) {
            logger.error('Web app data error:', e);
        }
    });

    // Handle Text (Search or Code)
    bot.on('text', async (ctx, next) => {
        try {
            // If user is currently in a Scene/Wizard, do not treat text as global search.
            // This prevents second commands/messages from being interpreted as previous step input.
            if (ctx.scene?.current) {
                return next();
            }

            // Helper to check if text is a known button
            const isButton = Object.values(ctx.session?.user?.language ? {} : {}).some(val => val === ctx.message.text);
            // Simplified button texts check for avoiding text handler conflicts
            const buttonTexts = [
                '🔍 Kino qidirish', '🆕 Yangi kinolar', '📂 Kategoriyalar', '🔥 Top kinolar', '🎲 Tasodifiy kino',
                '👤 Shaxsiy Kabinet', '⚙️ Sozlamalar',
                // Ru
                '🔍 Поиск фильмов', '📂 Категории', '🆕 Новинки', '🔥 Топ фильмы', '🎲 Случайный фильм', '👤 Личный кабинет', '⚙️ Настройки',
                // En
                '🔍 Search Movies', '📂 Categories', '🆕 New Movies', '🔥 Top Movies', '🎲 Random Movie', '👤 My Cabinet', '⚙️ Settings',
                // Legacy / Settings
                '🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English', '🏠 Bosh menyu', '🏠 Главное меню', '🏠 Main Menu'
            ];

            if (!ctx.message?.text || ctx.message.text.startsWith('/') || buttonTexts.includes(ctx.message.text)) {
                return next();
            }

            const text = ctx.message.text.trim();
            // Chat oynasini ortiqcha so'z va kodlardan toza saqlash (App-like UI)
            try { await ctx.deleteMessage(); } catch (e) {}

            // Check if number (Code)
            if (/^\d+$/.test(text)) {
                const code = parseInt(text);
                const movie = await getMovieByCode(code);

                if (movie) {
                    const dbUser = await User.findOne({ telegramId: ctx.from.id }).catch(() => null);
                    await sendMovie(ctx, movie, dbUser);
                } else {
                    ctx.reply(ctx.t('not_found')).catch(() => { });
                }
            } else {
                // Search by title
                const limit = 10;
                const movies = await searchMovies(text);
                if (!movies || movies.length === 0) {
                    return ctx.reply(ctx.t('not_found'), { parse_mode: 'HTML' });
                }

                let msg = `🔎 <b>"${text}"</b> qidiruv natijalari (Sahifa 1):\n\n`;
                const pageMovies = movies.slice(0, limit);
                pageMovies.forEach((m, i) => {
                    msg += `${i + 1}. 🎬 ${m.title} — <code>${m.code}</code>\n`;
                });
                msg += '\n<i>Kodni yuboring!</i>';

                const totalPages = Math.ceil(movies.length / limit);
                const buttons = [];
                if (totalPages > 1) {
                    buttons.push([
                        Markup.button.callback('1/' + totalPages, 'noop'),
                        Markup.button.callback('Keyingi ➡️', `search_2_${text.substring(0, 30)}`)
                    ]);
                }

                // Aggressive VIP Promo
                const dbUser = await getUserByTelegramId(ctx.from.id);
                const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();
                if (!isVip) {
                    buttons.push([Markup.button.callback('💎 VIP Olish - Eksklyuziv!', 'vip_info')]);
                }

                await ctx.replyWithHTML(msg, Markup.inlineKeyboard(buttons));
            }
        } catch (error) {
            logger.error('Text handler error:', error);
            // Don't crash, just skip
        }
    });

    bot.action(/search_(\d+)_(.+)/, async (ctx) => {
        try {
            const page = parseInt(ctx.match[1]);
            const query = ctx.match[2];
            const limit = 10;
            const movies = await searchMovies(query);
            
            if (!movies || movies.length === 0) return ctx.answerCbQuery('Topilmadi', {show_alert:true});
            
            const totalPages = Math.ceil(movies.length / limit);
            if (page > totalPages || page < 1) return ctx.answerCbQuery('Xato sahifa', {show_alert:true});

            const skip = (page - 1) * limit;
            const pageMovies = movies.slice(skip, skip + limit);

            let msg = `🔎 <b>"${query}"</b> qidiruv natijalari ${ctx.t('page_info', {page})}:\n\n`;
            pageMovies.forEach((m, i) => {
                msg += `${skip + i + 1}. 🎬 ${m.title} — <code>${m.code}</code>\n`;
            });
            msg += '\n<i>Kodni yuboring!</i>';

            const buttons = [];
            const nav = [];
            if (page > 1) nav.push(Markup.button.callback(ctx.t('page_prev'), `search_${page - 1}_${query.substring(0, 30)}`));
            nav.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));
            if (page < totalPages) nav.push(Markup.button.callback(ctx.t('page_next'), `search_${page + 1}_${query.substring(0, 30)}`));
            buttons.push(nav);

            const dbUser = await getUserByTelegramId(ctx.from.id);
            const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();
            if (!isVip) {
                buttons.push([Markup.button.callback('💎 VIP Olish - Eksklyuziv!', 'vip_info')]);
            }

            await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
            ctx.answerCbQuery().catch(()=>{});
        } catch(e) {
            ctx.answerCbQuery('Xatolik').catch(()=>{});
        }
    });

    // Handle Callbacks
    bot.action(/fav_(.+)/, async (ctx) => {
        try {
            const dbUser = await getUserByTelegramId(ctx.from.id);
            const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();

            // 🔒 RESTRICTION: Favorites are VIP Only
            if (!isVip) {
                return ctx.answerCbQuery(ctx.t('vip_restricted_fav'), { show_alert: true });
            }

            const movieId = ctx.match[1];
            // dbUser already fetched above
            if (!dbUser) return ctx.answerCbQuery('❌');

            const exists = await Favorite.findOne({ user: dbUser._id, movie: movieId });
            if (exists) {
                await Favorite.findOneAndDelete({ user: dbUser._id, movie: movieId });
                return ctx.answerCbQuery('💔');
            } else {
                await Favorite.create({ user: dbUser._id, movie: movieId });
                return ctx.answerCbQuery('❤️');
            }
        } catch (e) {
            ctx.answerCbQuery('❌').catch(() => { });
        }
    });

    bot.action(/share_(.+)/, async (ctx) => {
        try {
            const code = ctx.match[1];
            const botUsername = ctx.botInfo?.username || 'bot';
            const shareUrl = `https://t.me/${botUsername}?start=${code}`;

            await ctx.reply(`📤 <b>Link:</b>\n\n<code>${shareUrl}</code>`, { parse_mode: 'HTML' });
            ctx.answerCbQuery('📤').catch(() => { });
        } catch (e) {
            ctx.answerCbQuery('❌').catch(() => { });
        }
    });


    bot.action(/review_(\d+)/, async (ctx) => {
        try {
            const code = parseInt(ctx.match[1]);
            const dbUser = await getUserByTelegramId(ctx.from.id);

            // VIP CHECK for Review
            const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();
            if (!isVip) {
                return ctx.answerCbQuery(ctx.t('vip_only_comment'), { show_alert: true });
            }

            ctx.scene.enter('REVIEW_SCENE', { movieCode: code });
            ctx.answerCbQuery();
        } catch (e) {
            logger.error('Review entering error:', e);
        }
    });

    // Handle Read Reviews
    bot.action(/read_reviews_(\d+)/, async (ctx) => {
        try {
            const code = parseInt(ctx.match[1]);
            const movie = await getMovieByCode(code);

            if (!movie || !movie.reviews || movie.reviews.length === 0) {
                return ctx.answerCbQuery(ctx.t('not_found'), { show_alert: true });
            }

            // 🔒 RESTRICTION: Read Reviews are VIP Only
            const dbUser = await getUserByTelegramId(ctx.from.id);
            const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();
            if (!isVip) {
                return ctx.answerCbQuery(ctx.t('vip_restricted_review'), { show_alert: true });
            }

            // Show last 5 reviews
            const reviews = movie.reviews.slice(-5).reverse();
            let msg = `💬 <b>"${movie.title}" reviews:</b>\n\n`;

            reviews.forEach(r => {
                const stars = '⭐️'.repeat(r.rating || 0);
                msg += `👤 <b>${r.userName}</b> (${stars})\n📝 <i>${r.comment}</i>\n\n`;
            });

            await ctx.replyWithHTML(msg);
            ctx.answerCbQuery();
        } catch (e) {
            ctx.answerCbQuery('❌');
        }
    });

    // --- CABINET INLINE ACTIONS CONTINUED ---
    bot.action('cb_invite', async (ctx) => {
        try {
            await ctx.answerCbQuery().catch(() => {});
            const link = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
            await ctx.replyWithHTML(ctx.t('referral_promo', { link }), { disable_web_page_preview: true });
        } catch (e) { }
    });

    bot.action('cb_bonus', async (ctx) => {
        try {
            const user = await getUserByTelegramId(ctx.from.id);
            const now = new Date();
            const last = user.lastDailyBonus ? new Date(user.lastDailyBonus) : null;
            const isSameDay = last && last.getDate() === now.getDate() && last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear();

            if (isSameDay) {
                return ctx.answerCbQuery('⏳ Ertaga keling! Bugun oldingiz.', { show_alert: true });
            }
            await ctx.answerCbQuery().catch(() => {});
            user.points = (user.points || 0) + 25;
            user.lastDailyBonus = now;
            await user.save();
            ctx.reply(ctx.t('bonus_claimed', { points: user.points }), { parse_mode: 'HTML' });
        } catch (e) { }
    });

    bot.action('cb_shop', async (ctx) => {
        try {
            await ctx.answerCbQuery().catch(() => {});
            const user = await getUserByTelegramId(ctx.from.id);
            const msg = ctx.t('shop_welcome', { points: user.points || 0 });
            await ctx.replyWithHTML(msg, Markup.inlineKeyboard([
                [Markup.button.callback('💎 7 Kun - 5000 Ball', 'buy_vip_7')]
            ]));
        } catch (e) { }
    });

    // Shop Action
    bot.action('buy_vip_7', async (ctx) => {
        try {
            const user = await getUserByTelegramId(ctx.from.id);
            if (user.points >= 5000) {
                user.points -= 5000;

                // Add VIP
                let currentVip = user.vipUntil && new Date(user.vipUntil) > new Date() ? new Date(user.vipUntil) : new Date();
                user.vipUntil = new Date(currentVip.getTime() + 7 * 24 * 60 * 60 * 1000);
                user.vipNotified = false;
                await user.save();

                // Log
                await AdminLog.create({
                    adminId: 'SYSTEM',
                    action: 'shop_buy_vip',
                    targetId: user.telegramId,
                    details: 'Bought 7 days VIP for 5000 pts'
                });

                ctx.answerCbQuery('✅ Muvaffaqiyatli!');

                // VIP ogohlantirish xabari
                const vipNoticeMsg = `🔄 <b>MUHIM!</b>\n\n` +
                    `Sizning VIP obunangiz <b>aktiv</b> bo'ldi.\n\n` +
                    `💎 <b>VIP imkoniyatlar:</b>\n` +
                    `├ 🎬 Barcha kinolarga cheklovsiz kirish\n` +
                    `├ 💬 Sharh qoldirish va o'qish\n` +
                    `├ ⭐ Sevimlilar ro'yxati\n` +
                    `├ 📜 Ko'rish tarixi\n` +
                    `├ 🎰 Tasodifiy kino\n` +
                    `├ 🎫 Promokod ishlatish\n` +
                    `└ ⚠️ Shikoyat yuborish\n\n` +
                    `<i>Quyidagi menyu yangilandi, davom etishingiz mumkin.</i>`;

                await ctx.telegram.sendMessage(ctx.from.id, vipNoticeMsg, { parse_mode: 'HTML' });

                // AUTO REFRESH MENU
                setTimeout(() => sendMainMenu(ctx), 500); // Refresh menu
            } else {
                ctx.answerCbQuery('❌ Ball yetarli emas!', { show_alert: true });
                ctx.telegram.sendMessage(ctx.from.id, ctx.t('shop_fail'), { parse_mode: 'HTML' });
            }
        } catch (e) { }
    });
    // (Promokod va Eski xaridlar uchirildi)

    // ⚠️ Report Action
    bot.action(/report_(\d+)/, async (ctx) => {
        try {
            const code = ctx.match[1];
            const dbUser = await getUserByTelegramId(ctx.from.id);
            const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();

            // VIP tekshiruvi
            if (!isVip) {
                return ctx.answerCbQuery('⚠️ Shikoyat yuborish faqat VIP foydalanuvchilar uchun!', { show_alert: true });
            }

            await ctx.answerCbQuery('� Shikoyat yozing...');
            return ctx.scene.enter('REPORT_SCENE', { movieCode: code });
        } catch (e) {
            logger.error('Report error:', e);
            ctx.answerCbQuery('❌ Xatolik yuz berdi!', { show_alert: true });
        }
    });

    bot.action('cb_random', async (ctx) => {
        try {
            const isVip = ctx.isVip();
            if (!isVip) return ctx.answerCbQuery(ctx.t('vip_restricted'), { show_alert: true });
            
            await ctx.answerCbQuery().catch(() => {});
            const movies = await Movie.aggregate([{ $sample: { size: 1 } }]);
            if (!movies || movies.length === 0) return ctx.reply('❌ Hozircha kinolar yo\'q.');

            const dbUser = await User.findOne({ telegramId: ctx.from.id });
            await ctx.reply(`🎲 <b>Tasodifiy tanlandi!</b>`, { parse_mode: 'HTML' });
            await sendMovie(ctx, movies[0], dbUser);
        } catch (e) { }
    });

    // (vip_info handler united with cb_shop)
};
