import { Markup } from 'telegraf';
import { isAdmin } from '../utils/adminHelper.js';
import logger from '../utils/logger.js';
import { countMovies, deleteMovie, getMovieByCode, getAllMovies, getTopMovies } from '../services/movieService.js';
import { toggleSubscription } from '../services/subscriptionService.js';
import User from '../models/User.js';
import Movie from '../models/Movie.js';
import Channel from '../models/Channel.js';
import Config from '../models/Config.js';
import AdminLog from '../models/AdminLog.js';
import { sendMainMenu } from '../utils/menuUtils.js';

export const setupAdminCommands = (bot) => {
    const adminCheck = async (ctx) => {
        try {
            // Super Admin (Env)
            if (ctx.from?.id && isAdmin(ctx.from.id)) return true;

            // Database Admin
            const user = await User.findOne({ telegramId: ctx.from.id });
            if (user && (user.role === 'admin' || user.role === 'superadmin')) return true;

            return false;
        } catch (e) {
            return false;
        }
    };


    // Admin panel entry
    bot.command('admin', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return;
            const buttons = [
                [Markup.button.callback('➕ Bitta kino qo\'shish', 'admin_add_movie'), Markup.button.callback('📚 Ommaviy qo\'shish', 'admin_bulk_add')],
                [Markup.button.callback('📊 Statistika', 'admin_stats'), Markup.button.callback('📢 Reklama', 'admin_broadcast')],
                [Markup.button.callback('💎 VIP Boshqaruv', 'admin_vip'), Markup.button.callback('🌐 Barchaga VIP', 'admin_global_vip')],
                [Markup.button.callback('🌐 Barchaga VIP berish', 'admin_global_vip'), Markup.button.callback('🗑 Tarqatmani O\'chirish', 'delete_last_broadcast')],
                [Markup.button.callback('🗑️ Kino o\'chirish', 'admin_delete_movie'), Markup.button.callback('✏️ Kino Tahrirlash', 'admin_edit_movie')],
                [Markup.button.callback('🚫 Ban / Unban', 'admin_ban_unban'), Markup.button.callback('⭐ Top kinolar', 'admin_top_movies')],
                [Markup.button.callback('📝 Kinolar ro\'yxati', 'admin_movies_list'), Markup.button.callback('👥 Foydalanuvchilar', 'admin_users_list')],
                [Markup.button.callback('🗑 VIP O\'chirish', 'admin_vip_remove_ui'), Markup.button.callback('📢 Majburiy Obuna', 'admin_subscription')],
                [Markup.button.callback('🎬 Start Xabar/GIF', 'admin_start_gif'), Markup.button.callback('🎫 Promokod yaratish', 'admin_promo')],
                [Markup.button.callback('📢 Avto-Post Sozlamalari', 'admin_autopost'), Markup.button.callback('👤 Profil user', 'admin_user_profile')],
                [Markup.button.callback('👤 Profil user', 'admin_user_profile'), Markup.button.callback('📩 Shaxsiy Xat', 'admin_direct_message')],
                [Markup.button.callback('👮‍♂️ Adminlar', 'admin_admins')],
                [Markup.button.callback('💾 Bazani Zaxiralash', 'admin_backup'), Markup.button.callback('📈 Katta Statistika', 'admin_stats_advanced')]
            ];

            if (isAdmin(ctx.from.id)) {
                buttons.unshift([Markup.button.callback('🖥 Server', 'admin_server'), Markup.button.callback('🗂 Admin Logs', 'admin_logs')]);
            }

            await ctx.reply(`👑 <b>Admin Panel</b>\n\n👇 Kerakli bo'limni tanlang:`, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
        } catch (e) {
            logger.error('Admin command error:', e);
        }
    });

    bot.action('admin_add_movie', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
            await ctx.answerCbQuery();
            return ctx.scene.enter('ADD_MOVIE_SCENE');
        } catch (e) { }
    });

    bot.action('admin_bulk_add', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
            await ctx.answerCbQuery();
            return ctx.scene.enter('BULK_ADD_MOVIE_SCENE');
        } catch (e) { }
    });

    bot.action('admin_broadcast', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
            await ctx.answerCbQuery();
            return ctx.scene.enter('BROADCAST_SCENE');
        } catch (e) { }
    });

    bot.action('admin_vip', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
            await ctx.answerCbQuery();
            return ctx.scene.enter('VIP_SCENE');
        } catch (e) { }
    });

    bot.action('admin_start_gif', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
            await ctx.answerCbQuery();
            return ctx.scene.enter('START_GIF_SCENE');
        } catch (e) { }
    });

    bot.action('admin_global_vip', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
            await ctx.answerCbQuery();
            return ctx.scene.enter('GLOBAL_VIP_SCENE');
        } catch (e) { }
    });

    bot.action('admin_edit_movie', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
            await ctx.answerCbQuery();
            return ctx.scene.enter('EDIT_MOVIE_SCENE');
        } catch (e) { }
    });

    bot.action('admin_autopost', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
            await ctx.answerCbQuery();
            return ctx.scene.enter('AUTO_POST_SETTINGS_SCENE');
        } catch (e) { }
    });

    bot.action('admin_subscription', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
            await ctx.answerCbQuery();
            return ctx.scene.enter('MANDATORY_SUBSCRIPTION_SCENE');
        } catch (e) { }
    });

    bot.action('admin_promo', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
            await ctx.answerCbQuery();
            return ctx.scene.enter('PROMO_WIZARD_SCENE');
        } catch (e) {
            ctx.answerCbQuery('❌').catch(() => { });
        }
    });

    bot.action('admin_user_profile', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
            await ctx.answerCbQuery();
            return ctx.scene.enter('USER_PROFILE_SCENE');
        } catch (e) {
            logger.error('Admin user profile action error:', e);
            ctx.answerCbQuery('❌').catch(() => { });
        }
    });

    bot.action('admin_direct_message', async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
            await ctx.answerCbQuery();
            return ctx.scene.enter('DIRECT_MESSAGE_SCENE');
        } catch (e) {
            logger.error('Admin direct message action error:', e);
        }
    });

    bot.action('admin_stats', async (ctx) => {
        if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery();

            const userCount = await User.countDocuments().catch(() => 0);
            const bannedCount = await User.countDocuments({ isBanned: true }).catch(() => 0);
            const movieCount = await countMovies().catch(() => 0);

            let views = 0;
            try {
                const totalViews = await Movie.aggregate([
                    { $group: { _id: null, total: { $sum: '$views' } } }
                ]);
                views = totalViews[0]?.total || 0;
            } catch (e) { }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } }).catch(() => 0);
            const newMoviesToday = await Movie.countDocuments({ createdAt: { $gte: today } }).catch(() => 0);

            return ctx.reply(
                `📊 <b>Batafsil Statistika</b>\n\n` +
                `👥 <b>Foydalanuvchilar:</b>\n` +
                `├ Jami: ${userCount}\n` +
                `├ Bugun qo'shilgan: ${newUsersToday}\n` +
                `└ Bloklangan: ${bannedCount}\n\n` +
                `🎬 <b>Kinolar:</b>\n` +
                `├ Jami: ${movieCount}\n` +
                `├ Bugun qo'shilgan: ${newMoviesToday}\n` +
                `└ Umumiy ko'rishlar: ${views}\n\n` +
                `📈 O'rtacha ko'rish: ${movieCount > 0 ? Math.round(views / movieCount) : 0}`,
                { parse_mode: 'HTML' }
            );
        } catch (e) {
            logger.error('Admin stats action error:', e);
        }
    });

    bot.action('admin_delete_movie', async (ctx) => {
        if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery();
            const movies = await Movie.find().sort({ createdAt: -1 }).limit(10);
            if (!movies || movies.length === 0) {
                return ctx.reply('📭 Kinolar yo\'q.');
            }
            const buttons = movies.map(m => [
                Markup.button.callback(`🗑️ ${m.title} (${m.code})`, `delete_${m.code}`)
            ]);
            buttons.push([Markup.button.callback('❌ Bekor qilish', 'cancel_delete')]);
            return ctx.reply('🗑️ <b>O\'chirish uchun kinoni tanlang:</b>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
        } catch (e) {
            logger.error('Admin delete movie action error:', e);
        }
    });

    bot.action('admin_top_movies', async (ctx) => {
        if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery();
            const movies = await getTopMovies(10);
            if (!movies || movies.length === 0) return ctx.reply('📭 Kinolar yo\'q.');
            let msg = '⭐ <b>Eng ko\'p ko\'rilgan kinolar:</b>\n\n';
            movies.forEach((m, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                msg += `${medal} ${m.title} — 👁 ${m.views || 0} | <code>${m.code}</code>\n`;
            });
            return ctx.replyWithHTML(msg);
        } catch (e) {
            logger.error('Admin top movies action error:', e);
        }
    });

    bot.action('admin_movies_list', async (ctx) => {
        if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery();
            const movies = await Movie.find().sort({ createdAt: -1 }).limit(20);
            if (!movies || movies.length === 0) return ctx.reply('📭 Kinolar yo\'q.');

            let msg = '📝 <b>Kinolar ro\'yxati (oxirgi 20 ta):</b>\n\n';
            movies.forEach((m, i) => {
                msg += `${i + 1}. <code>${m.code}</code> — ${m.title} (👁${m.views || 0})\n`;
            });
            return ctx.replyWithHTML(msg);
        } catch (e) {
            logger.error('Admin movies list action error:', e);
        }
    });

    bot.action('admin_users_list', async (ctx) => {
        if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery();
            const users = await User.find().sort({ createdAt: -1 }).limit(20);
            const total = await User.countDocuments().catch(() => 0);

            let msg = `👥 <b>Foydalanuvchilar (${total} ta):</b>\n\n`;
            users.forEach((u) => {
                const status = u.isBanned ? '🚫' : '✅';
                msg += `${status} ${u.firstName || 'Nomsiz'} — <code>${u.telegramId}</code>\n`;
            });
            return ctx.replyWithHTML(msg);
        } catch (e) {
            logger.error('Admin users list action error:', e);
        }
    });

    bot.action('admin_vip_remove_ui', async (ctx) => {
        if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery();
            const users = await User.find({ vipUntil: { $gt: new Date() } }).limit(10);
            if (!users || users.length === 0) return ctx.reply('📭 Hozircha VIP foydalanuvchilar yo\'q.');

            const buttons = users.map(u => [
                Markup.button.callback(`❌ ${u.firstName} (${u.telegramId})`, `remove_vip_${u.telegramId}`)
            ]);
            buttons.push([Markup.button.callback('❌ Bekor qilish', 'cancel_vip_remove')]);

            return ctx.reply('🗑 <b>VIP ni o\'chirish uchun foydalanuvchini tanlang:</b>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
        } catch (e) {
            logger.error('Admin vip remove ui action error:', e);
        }
    });

    bot.action('admin_ban_unban', async (ctx) => {
        if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery();

            const recentUsers = await User.find({ telegramId: { $nin: process.env.ADMIN_ID.split(",").map(id => id.trim()) } })
                .sort({ _id: -1 })
                .limit(10);

            if (!recentUsers || recentUsers.length === 0) {
                return ctx.reply('📭 Foydalanuvchilar topilmadi.');
            }

            const buttons = recentUsers.map(u => {
                const label = `${u.isBanned ? '✅ Unban' : '🚫 Ban'} ${u.firstName || u.username || 'User'} (${u.telegramId})`;
                const action = u.isBanned ? `unban_user_${u.telegramId}` : `ban_user_${u.telegramId}`;
                return [Markup.button.callback(label, action)];
            });

            return ctx.reply('🚫 <b>Ban/Unban</b>\n\nFoydalanuvchini tanlang:', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
        } catch (e) {
            logger.error('Admin ban/unban action error:', e);
        }
    });

    bot.action(/unban_user_(\d+)/, async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const targetId = parseInt(ctx.match[1]);
            await User.findOneAndUpdate({ telegramId: targetId }, { isBanned: false }, { new: true });
            await AdminLog.create({
                adminId: ctx.from.id,
                action: 'unban_user_ui',
                targetId: targetId,
                details: 'Unbanned via UI'
            });
            await ctx.answerCbQuery('✅ Unban qilindi');
            await ctx.editMessageText(`✅ <b>Blok olib tashlandi:</b> <code>${targetId}</code>`, { parse_mode: 'HTML' });
        } catch (e) {
            logger.error('Unban action error:', e);
            ctx.answerCbQuery('❌').catch(() => { });
        }
    });

    bot.action('admin_admins', async (ctx) => {
        if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery();
            const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
            let msg = '👮‍♂️ <b>Bot Adminlari:</b>\n\n';
            admins.forEach(a => {
                const isSuper = isAdmin(a.telegramId);
                msg += `👤 <b>${a.firstName}</b> ${isSuper ? '👑 (Bosh Admin)' : ''}\n🆔 <code>${a.telegramId}</code>\n\n`;
            });
            const buttons = [
                [Markup.button.callback('➕ Admin qo\'shish', 'add_admin_info'), Markup.button.callback('🗑 Admin o\'chirish', 'remove_admin_list')]
            ];
            return ctx.replyWithHTML(msg, Markup.inlineKeyboard(buttons));
        } catch (e) {
            logger.error('Admin admins list action error:', e);
        }
    });

    bot.action('admin_logs', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery();
            const logs = await AdminLog.find().sort({ createdAt: -1 }).limit(15);
            if (logs.length === 0) return ctx.reply('📭 Loglar bo\'sh.');

            let msg = '🛡 <b>Admin Logs (Last 15):</b>\n\n';
            logs.forEach(l => {
                const date = l.createdAt.toISOString().split('T')[0];
                msg += `📅 ${date} | 👮‍♂️ <code>${l.adminId}</code>\n⚡️ <b>${l.action}</b> -> 🎯 <code>${l.targetId || 'N/A'}</code>\n📝 <i>${l.details}</i>\n\n`;
            });
            return ctx.replyWithHTML(msg);
        } catch (e) {
            logger.error('Admin logs action error:', e);
        }
    });

    bot.action('admin_server', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery();
            const uptime = process.uptime();
            const uptimeHrs = Math.floor(uptime / 3600);
            const uptimeMins = Math.floor((uptime % 3600) / 60);

            const memoryUsage = process.memoryUsage();
            const ramUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;

            const msg = `🖥 <b>Server Status:</b>\n\n` +
                `🟢 <b>Uptime:</b> ${uptimeHrs}h ${uptimeMins}m\n` +
                `🧠 <b>RAM Usage:</b> ${ramUsed} MB\n` +
                `⚡️ <b>Node Version:</b> ${process.version}\n` +
                `📅 <b>Server Time:</b> ${new Date().toLocaleString()}`;
            return ctx.replyWithHTML(msg);
        } catch (e) {
            logger.error('Admin server action error:', e);
        }
    });

    // Handle Stats
    bot.hears('📊 Statistika', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const userCount = await User.countDocuments().catch(() => 0);
            const bannedCount = await User.countDocuments({ isBanned: true }).catch(() => 0);
            const movieCount = await countMovies().catch(() => 0);

            let views = 0;
            try {
                const totalViews = await Movie.aggregate([
                    { $group: { _id: null, total: { $sum: '$views' } } }
                ]);
                views = totalViews[0]?.total || 0;
            } catch (e) { }

            // Today's stats
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } }).catch(() => 0);
            const newMoviesToday = await Movie.countDocuments({ createdAt: { $gte: today } }).catch(() => 0);

            ctx.reply(`📊 <b>Batafsil Statistika</b>\n\n👥 <b>Foydalanuvchilar:</b>\n├ Jami: ${userCount}\n├ Bugun qo'shilgan: ${newUsersToday}\n└ Bloklangan: ${bannedCount}\n\n🎬 <b>Kinolar:</b>\n├ Jami: ${movieCount}\n├ Bugun qo'shilgan: ${newMoviesToday}\n└ Umumiy ko'rishlar: ${views}\n\n📈 O'rtacha ko'rish: ${movieCount > 0 ? Math.round(views / movieCount) : 0}`, { parse_mode: 'HTML' });
        } catch (err) {
            logger.error('Stats error:', err);
            ctx.reply('❌ Xatolik yuz berdi.').catch(() => { });
        }
    });

    // Handle Delete Movie
    bot.hears('🗑️ Kino o\'chirish', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const movies = await Movie.find().sort({ createdAt: -1 }).limit(10);

            if (!movies || movies.length === 0) {
                return ctx.reply('📭 Kinolar yo\'q.');
            }

            const buttons = movies.map(m => [
                Markup.button.callback(`🗑️ ${m.title} (${m.code})`, `delete_${m.code}`)
            ]);
            buttons.push([Markup.button.callback('❌ Bekor qilish', 'cancel_delete')]);

            ctx.reply('🗑️ <b>O\'chirish uchun kinoni tanlang:</b>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
        } catch (e) {
            logger.error('Delete movies error:', e);
            ctx.reply('❌ Xatolik yuz berdi.').catch(() => { });
        }
    });

    bot.action(/delete_(\d+)/, async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
            const code = parseInt(ctx.match[1]);
            const deleted = await deleteMovie(code);
            if (deleted) {
                await AdminLog.create({
                    adminId: ctx.from.id,
                    action: 'delete_movie',
                    targetId: code,
                    details: `Deleted movie: ${deleted.title}`
                });
                await ctx.editMessageText(`✅ Kino o'chirildi: ${deleted.title}`);
            } else {
                await ctx.answerCbQuery('❌ Kino topilmadi');
            }
        } catch (e) {
            logger.error('Delete action error:', e);
            ctx.answerCbQuery('❌ Xatolik').catch(() => { });
        }
    });

    bot.action('cancel_delete', async (ctx) => {
        try {
            await ctx.editMessageText('❌ Bekor qilindi.');
        } catch (e) { }
    });

    // Handle Movies List
    bot.hears('📝 Kinolar ro\'yxati', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const movies = await Movie.find().sort({ createdAt: -1 }).limit(20);
            if (!movies || movies.length === 0) return ctx.reply('📭 Kinolar yo\'q.');

            let msg = '📝 <b>Kinolar ro\'yxati (oxirgi 20 ta):</b>\n\n';
            movies.forEach((m, i) => {
                msg += `${i + 1}. <code>${m.code}</code> — ${m.title} (👁${m.views || 0})\n`;
            });
            ctx.replyWithHTML(msg);
        } catch (e) {
            logger.error('Movies list error:', e);
            ctx.reply('❌ Xatolik yuz berdi.').catch(() => { });
        }
    });

    // Handle Users List
    bot.hears('👥 Foydalanuvchilar', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const users = await User.find().sort({ createdAt: -1 }).limit(20);
            const total = await User.countDocuments().catch(() => 0);

            let msg = `👥 <b>Foydalanuvchilar (${total} ta):</b>\n\n`;
            users.forEach((u) => {
                const status = u.isBanned ? '🚫' : '✅';
                msg += `${status} ${u.firstName || 'Nomsiz'} — <code>${u.telegramId}</code>\n`;
            });
            ctx.replyWithHTML(msg);
        } catch (e) {
            logger.error('Users list error:', e);
            ctx.reply('❌ Xatolik yuz berdi.').catch(() => { });
        }
    });

    // Handle Ban/Unban
    bot.hears('🚫 Ban / Unban', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            ctx.reply('🚫 <b>Ban/Unban qilish</b>\n\nFoydalanuvchi ID raqamini yuboring:\n\n/ban 123456789\n/unban 123456789', {
                parse_mode: 'HTML'
            });
        } catch (e) { }
    });

    // Handle Top Movies
    bot.hears('⭐ Top kinolar', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const movies = await getTopMovies(10);
            if (!movies || movies.length === 0) return ctx.reply('📭 Kinolar yo\'q.');

            let msg = '⭐ <b>Eng ko\'p ko\'rilgan kinolar:</b>\n\n';
            movies.forEach((m, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                msg += `${medal} ${m.title} — 👁 ${m.views || 0} | <code>${m.code}</code>\n`;
            });
            ctx.replyWithHTML(msg);
        } catch (e) {
            logger.error('Top movies error:', e);
            ctx.reply('❌ Xatolik yuz berdi.').catch(() => { });
        }
    });

    // Return to main menu
    bot.hears('🏠 Bosh menyu', (ctx) => {
        try {
            ctx.reply(`🎥 <b>FilmXBot Boshqaruvi</b>\n\nMarhamat, kerakli bo'limni tanlang:`, {
                parse_mode: 'HTML',
                ...Markup.keyboard([
                    ['🔍 Kino qidirish', '📂 Kategoriyalar'],
                    ['🆕 Yangi kinolar', '⭐ Sevimlilar'],
                    ['🔥 Top kinolar', '📊 Mening statistikam']
                ]).resize()
            });
        } catch (e) { }
    });

    // Ban User (Interactive & Direct)
    bot.command('ban', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const parts = ctx.message.text.split(' ');
            const telegramId = parseInt(parts[1]);

            // INTERACTIVE MODE: No ID provided
            if (!telegramId) {
                const recentUsers = await User.find({ isBanned: false, telegramId: { $nin: process.env.ADMIN_ID.split(",").map(id => id.trim()) } })
                    .sort({ _id: -1 }) // Newest first
                    .limit(10);

                if (recentUsers.length === 0) return ctx.reply('📭 No active users found.');

                const buttons = recentUsers.map(u => [
                    Markup.button.callback(`🚫 ${u.firstName} (${u.telegramId})`, `ban_user_${u.telegramId}`)
                ]);

                return ctx.reply('🚫 <b>Select user to ban:</b>\n<i>Or type /ban 123456789</i>', {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard(buttons)
                });
            }

            // DIRECT MODE: ID provided

            // 🛡 SECURITY: Protect Super Admin
            if (isAdmin(telegramId)) {
                // TREASON: Admin tried to ban Super Admin
                await User.findOneAndUpdate({ telegramId: ctx.from.id }, { role: 'user' });
                return ctx.reply('🚨 <b>XAVFSIZLIK TIZIMI:</b>\n\nSiz Bosh Adminni bloklamoqchi bo\'ldingiz. Bu taqiqlangan!\n\n❌ <b>Sizning Admin huquqingiz olib tashlandi.</b>', { parse_mode: 'HTML' });
            }

            const user = await User.findOneAndUpdate(
                { telegramId },
                { isBanned: true },
                { new: true }
            );
            if (user) {
                await AdminLog.create({
                    adminId: ctx.from.id,
                    action: 'ban_user',
                    targetId: telegramId,
                    details: 'Banned via command'
                });
                ctx.reply(`🚫 <b>Bloklandi:</b> ${user.firstName || user.username || telegramId}`, { parse_mode: 'HTML' });
            } else {
                ctx.reply('❌ Foydalanuvchi topilmadi.');
            }
        } catch (e) {
            logger.error('Ban error:', e);
            ctx.reply('❌ Xatolik yuz berdi.');
        }
    });

    // Handle Ban Action (Interactive)
    bot.action(/ban_user_(\d+)/, async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const targetId = parseInt(ctx.match[1]);

            // 🛡 SECURITY: Protect Super Admin
            if (isAdmin(targetId)) {
                return ctx.answerCbQuery('❌ Super Adminni ban qilib bo\'lmaydi!', { show_alert: true });
            }

            const user = await User.findOneAndUpdate(
                { telegramId: targetId },
                { isBanned: true },
                { new: true }
            );

            if (user) {
                await AdminLog.create({
                    adminId: ctx.from.id,
                    action: 'ban_user_ui',
                    targetId: targetId,
                    details: 'Banned via UI'
                });
                await ctx.answerCbQuery(`🚫 ${user.firstName} bloklandi!`);
                await ctx.editMessageText(`✅ <b>Bloklandi:</b> ${user.firstName} (ID: <code>${targetId}</code>)`, { parse_mode: 'HTML' });
            } else {
                ctx.answerCbQuery('❌ Topilmadi');
            }
        } catch (e) {
            logger.error('Ban action error:', e);
            ctx.answerCbQuery('❌ Xatolik');
        }
    });

    // /unban (Interactive) ...
    bot.command('unban', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const parts = ctx.message.text.split(' ');
            const telegramId = parseInt(parts[1]);
            if (!telegramId) return ctx.reply('⚠️ Format: /unban 123456789');

            const user = await User.findOneAndUpdate(
                { telegramId },
                { isBanned: false },
                { new: true }
            );
            if (user) {
                await AdminLog.create({
                    adminId: ctx.from.id,
                    action: 'unban_user',
                    targetId: telegramId,
                    details: 'Unbanned via command'
                });
                ctx.reply(`✅ <b>Blok olib tashlandi:</b> ${user.firstName || user.username || telegramId}`, { parse_mode: 'HTML' });
            } else {
                ctx.reply('❌ Foydalanuvchi topilmadi.');
            }
        } catch (e) {
            logger.error('Unban error:', e);
            ctx.reply('❌ Xatolik yuz berdi.').catch(() => { });
        }
    });

    bot.action('delete_last_broadcast', async (ctx) => {
        try {
            await ctx.answerCbQuery('O\'chirish boshlandi...').catch(() => { });
            const users = await User.find({ lastBroadcastMsgId: { $ne: null } });
            if (!users || users.length === 0) {
                return ctx.reply('📭 Hozircha tizimda o\'chirish mumkin bo\'lgan oxirgi xabar yozuvi topilmadi.');
            }

            await ctx.reply(`🗑 <b>Massaviy o'chirish boshlandi!</b>\n\nJami <b>${users.length} ta</b> foydalanuvchining chatidan botning oxirgi xabari (reklamasi) olib tashlanmoqda...`, { parse_mode: 'HTML' });

            let success = 0;
            let failed = 0;
            (async () => {
                for (let i = 0; i < users.length; i++) {
                    const u = users[i];
                    try {
                        await ctx.telegram.deleteMessage(u.telegramId, u.lastBroadcastMsgId);
                        success++;
                    } catch (e) {
                        failed++;
                    }
                    u.lastBroadcastMsgId = null;
                    await u.save();

                    await new Promise(r => setTimeout(r, 40)); // Rate limit himoyasi
                }
                try {
                    await ctx.reply(`✅ <b>O'chirish amaliyoti Muvaffaqiyatli yakunlandi!</b>\n\n🗑 O'chirildi: ${success}\n❌ O'chirib bo'lmadi: ${failed} (foydalanuvchi o'z vaqtida e'lonni o'chirgan yoki qoidalar ruxsat bermaydi)`, { parse_mode: 'HTML' });
                } catch (e) { }
            })();
        } catch (e) {
            logger.error('Delete broadcast error:', e);
        }
    });

    // VIP Management Commands

    // /addvip user_id days
    bot.command('addvip', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const parts = ctx.message.text.split(' ');
            const telegramId = parseInt(parts[1]);
            const days = parseInt(parts[2]);

            if (!telegramId || !days) {
                return ctx.reply('⚠️ Format: /addvip 123456789 30');
            }

            const vipUntil = new Date();
            vipUntil.setDate(vipUntil.getDate() + days);

            const user = await User.findOneAndUpdate(
                { telegramId },
                {
                    vipUntil,
                    vipAddedBy: ctx.from.id.toString(),
                    vipAddedAt: new Date()
                },
                { new: true }
            );

            if (user) {
                await AdminLog.create({
                    adminId: ctx.from.id,
                    action: 'add_vip',
                    targetId: telegramId,
                    details: `Added VIP for ${days} days`
                });

                const formattedDate = vipUntil.toISOString().split('T')[0];
                ctx.reply(`💎 <b>VIP berildi!</b>\n\n👤 User: <code>${telegramId}</code>\n📅 Tugash muddati: ${formattedDate}`, { parse_mode: 'HTML' });
                // Notify user? - Optional, but good UX.
                try {
                    await ctx.telegram.sendMessage(telegramId, `🎉 <b>Tabriklaymiz!</b>\n\nSizga ${days} kunga VIP status berildi!\n📅 Tugash muddati: ${formattedDate}\n\n<i>Endi barcha kinolarni tomosha qilishingiz mumkin.</i>`, { parse_mode: 'HTML' });
                } catch (e) {
                    ctx.reply(`⚠️ Userga xabar yuborilmadi (bloklagan bo'lishi mumkin). VIP baribir berildi.`);
                }
            } else {
                ctx.reply('❌ Foydalanuvchi topilmadi. Avval botga start bosgan bo\'lishi kerak.');
            }
        } catch (e) {
            logger.error('Add VIP error:', e);
            ctx.reply('❌ Xatolik yuz berdi.').catch(() => { });
        }
    });

    // /removevip user_id
    bot.command('removevip', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const parts = ctx.message.text.split(' ');
            const telegramId = parseInt(parts[1]);

            if (!telegramId) return ctx.reply('⚠️ Format: /removevip 123456789');

            const user = await User.findOneAndUpdate(
                { telegramId },
                {
                    vipUntil: null,
                    vipAddedBy: null,
                    vipAddedAt: null
                },
                { new: true }
            );

            if (user) {
                await AdminLog.create({
                    adminId: ctx.from.id,
                    action: 'remove_vip',
                    targetId: telegramId,
                    details: 'Removed VIP via command'
                });
                ctx.reply(`🗑️ <b>VIP olib tashlandi:</b> <code>${telegramId}</code>`, { parse_mode: 'HTML' });
                try {
                    await ctx.telegram.sendMessage(telegramId,
                        '⚠️ <b>VIP obunangiz o\'chirildi.</b>\n\n' +
                        '<i>Menyu yangilanadi. Davom etish uchun /start yuborishingiz ham mumkin.</i>',
                        { parse_mode: 'HTML' }
                    );
                } catch (e) { }
            } else {
                ctx.reply('❌ Foydalanuvchi topilmadi.');
            }
        } catch (e) {
            logger.error('Remove VIP error:', e);
            ctx.reply('❌ Xatolik yuz berdi.').catch(() => { });
        }
    });

    // /checkvip user_id
    bot.command('checkvip', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const parts = ctx.message.text.split(' ');
            const telegramId = parseInt(parts[1]);

            if (!telegramId) return ctx.reply('⚠️ Format: /checkvip 123456789');

            const user = await User.findOne({ telegramId });

            if (!user) {
                return ctx.reply('❌ Foydalanuvchi topilmadi.');
            }

            if (user.vipUntil && new Date(user.vipUntil) > new Date()) {
                const daysLeft = Math.ceil((new Date(user.vipUntil) - new Date()) / (1000 * 60 * 60 * 24));
                const dateStr = new Date(user.vipUntil).toISOString().split('T')[0];
                ctx.reply(`💎 <b>VIP Active</b>\n\n👤 User: <a href="tg://user?id=${user.telegramId}">${user.firstName}</a>\n🆔 ID: <code>${user.telegramId}</code>\n📅 Tugash sanasi: ${dateStr}\n⏳ Qolgan kunlar: ${daysLeft}`, { parse_mode: 'HTML' });
            } else {
                ctx.reply(`👤 <b>User (Oddiy)</b>\n\n👤 User: <a href="tg://user?id=${user.telegramId}">${user.firstName}</a>\n🆔 ID: <code>${user.telegramId}</code>\n❌ VIP mavjud emas yoki muddati tugagan.`, { parse_mode: 'HTML' });
            }
        } catch (e) {
            logger.error('Check VIP error:', e);
            ctx.reply('❌ Xatolik yuz berdi.').catch(() => { });
        }
    });

    // Handle Unmasked Leaderboard (Admin)
    bot.hears('🏆 VIP Leaderboard', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const users = await User.find({ vipUntil: { $gt: new Date() } })
                .sort({ moviesWatched: -1 })
                .limit(20);

            if (!users || users.length === 0) return ctx.reply('📭 Hozircha VIP reyting bo\'sh.');

            let msg = '🏆 <b>VIP Top 20 (Admin View)</b>\n\n';
            users.forEach((u, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                msg += `${medal} <a href="tg://user?id=${u.telegramId}">${u.firstName || 'User'}</a> (ID: <code>${u.telegramId}</code>) — 🎬 ${u.moviesWatched || 0}\n`;
            });
            ctx.replyWithHTML(msg);
        } catch (e) {
            ctx.reply('❌ Xatolik');
        }
    });

    // Handle VIP Removal UI
    bot.hears('🗑 VIP O\'chirish', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            // Find current VIPs
            const users = await User.find({ vipUntil: { $gt: new Date() } }).limit(10);
            if (!users || users.length === 0) return ctx.reply('📭 Hozircha VIP foydalanuvchilar yo\'q.');

            const buttons = users.map(u => [
                Markup.button.callback(`❌ ${u.firstName} (${u.telegramId})`, `remove_vip_${u.telegramId}`)
            ]);
            buttons.push([Markup.button.callback('❌ Bekor qilish', 'cancel_vip_remove')]);

            ctx.reply('🗑 <b>VIP ni o\'chirish uchun foydalanuvchini tanlang:</b>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
        } catch (e) {
            ctx.reply('❌ Xatolik');
        }
    });

    bot.action(/remove_vip_(\d+)/, async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
            const telegramId = parseInt(ctx.match[1]);

            await User.findOneAndUpdate(
                { telegramId },
                { vipUntil: null, vipAddedBy: null, vipAddedAt: null }
            );

            await ctx.answerCbQuery('✅ VIP olib tashlandi');
            await AdminLog.create({
                adminId: ctx.from.id,
                action: 'remove_vip',
                targetId: telegramId,
                details: 'Removed VIP via UI'
            });
            await ctx.editMessageText(`✅ <b>VIP olib tashlandi:</b> <code>${telegramId}</code>`, { parse_mode: 'HTML' });

            // Notify user
            try {
                await ctx.telegram.sendMessage(telegramId,
                    '⚠️ <b>VIP obunangiz o\'chirildi.</b>\n\n' +
                    '<i>Menyu yangilanadi. Davom etish uchun /start yuborishingiz ham mumkin.</i>',
                    { parse_mode: 'HTML' }
                );
                await sendMainMenu({
                    ...ctx,
                    from: { id: telegramId, first_name: undefined },
                    session: ctx.session,
                    t: ctx.t,
                    reply: (text, extra) => ctx.telegram.sendMessage(telegramId, text, extra)
                });
            } catch (e) { }
        } catch (e) {
            logger.error('Remove VIp Action error', e);
        }
    });

    bot.action('cancel_vip_remove', async (ctx) => {
        await ctx.editMessageText('❌ Bekor qilindi.');
    });

    // Dynamic Admin Management

    // Dynamic Admin Management

    // Subscription Management
    bot.hears('📢 Majburiy Obuna', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const channels = await Channel.find();
            const config = await Config.findOne({ key: 'subscription_enabled' });
            const isEnabled = config ? config.value : true; // Default true

            let msg = `📢 <b>Majburiy Obuna Sozlamalari</b>\n\n`;
            msg += `Status: ${isEnabled ? '✅ Yoqilgan' : '❌ O\'chirilgan'}\n\n`;

            if (channels.length === 0) {
                msg += '📭 Hozircha kanallar yo\'q.';
            } else {
                msg += '📋 <b>Ulanishga majburiy kanallar:</b>\n\n';
                channels.forEach((c, i) => {
                    msg += `${i + 1}. <a href="${c.inviteLink}">${c.name}</a> (ID: <code>${c.channelId}</code>)\n`;
                });
            }

            msg += '\n\n👇 <b>Amallar:</b>';

            const toggleBtn = isEnabled
                ? Markup.button.callback('❌ O\'chirish', 'sub_toggle_off')
                : Markup.button.callback('✅ Yoqish', 'sub_toggle_on');

            ctx.replyWithHTML(msg, Markup.inlineKeyboard([
                [toggleBtn],
                [Markup.button.callback('➕ Kanal qo\'shish', 'add_channel'), Markup.button.callback('🗑 Kanal o\'chirish', 'delete_channel_menu')]
            ]));
        } catch (e) {
            logger.error('Sub menu error:', e);
            ctx.reply('❌ Xatolik');
        }
    });

    // Toggle Subscription Action
    bot.action('sub_toggle_off', async (ctx) => {
        await toggleSubscription(false);
        await ctx.answerCbQuery('Majburiy obuna o\'chirildi');
        // Refresh menu (trigger command handler logic via function/message edit)
        // Simple way: Edit message
        await ctx.editMessageText('✅ <b>Majburiy obuna o\'chirildi.</b>\n\nQayta kirish uchun menyudan tanlang.', { parse_mode: 'HTML' });
    });

    bot.action('sub_toggle_on', async (ctx) => {
        await toggleSubscription(true);
        await ctx.answerCbQuery('Majburiy obuna yoqildi');
        await ctx.editMessageText('✅ <b>Majburiy obuna yoqildi.</b>\n\nQayta kirish uchun menyudan tanlang.', { parse_mode: 'HTML' });
    });

    // Add Channel Action
    bot.action('add_channel', async (ctx) => {
        try {
            await ctx.reply('✍️ <b>Kanal qo\'shish</b>\n\nKanal IDsi va Linkini quyidagi formatda yuboring:\n\n<code>/addchannel -100123456789 https://t.me/kanal_link</code>\n\n<i>Bot kanalga avval ADMIN qilingan bo\'lishi shart!</i>', { parse_mode: 'HTML' });
            ctx.answerCbQuery();
        } catch (e) { }
    });

    bot.command('addchannel', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const parts = ctx.message.text.split(' ');
            // /addchannel id link
            if (parts.length < 3) return ctx.reply('⚠️ Format: /addchannel -100xxx https://t.me/xxx');

            const channelId = parts[1];
            const link = parts[2];

            // Verify
            try {
                const chat = await ctx.telegram.getChat(channelId);
                await Channel.create({
                    channelId,
                    name: chat.title || 'Kanal',
                    inviteLink: link,
                    addedBy: ctx.from.id
                });
                await AdminLog.create({
                    adminId: ctx.from.id,
                    action: 'add_channel',
                    targetId: channelId,
                    details: `Added channel: ${chat.title}`
                });
                ctx.reply(`✅ <b>Kanal qo'shildi:</b> ${chat.title}`);
            } catch (e) {
                logger.error('Add channel command error:', e);
                ctx.reply('❌ Bot kanalga ulanolmadi. Bot admin ekanligini va ID to\'g\'riligini tekshiring.');
            }
        } catch (e) { ctx.reply('❌ Xatolik'); }
    });

    // Delete Channel Menu
    bot.action('delete_channel_menu', async (ctx) => {
        try {
            const channels = await Channel.find();
            if (channels.length === 0) return ctx.answerCbQuery('Kanallar yo\'q', true);

            const buttons = channels.map(c => [Markup.button.callback(`🗑 ${c.name}`, `del_channel_${c.channelId}`)]);
            buttons.push([Markup.button.callback('❌ Bekor qilish', 'cancel_vip_remove')]); // Reuse cancel

            ctx.editMessageText('🗑 <b>O\'chirish uchun kanalni tanlang:</b>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
        } catch (e) { }
    });

    bot.action(/del_channel_(.+)/, async (ctx) => {
        try {
            const channelId = ctx.match[1];
            await Channel.findOneAndDelete({ channelId });
            await AdminLog.create({
                adminId: ctx.from.id,
                action: 'remove_channel',
                targetId: channelId,
                details: 'Removed channel via UI'
            });
            await ctx.answerCbQuery('🗑 O\'chirildi');
            await ctx.editMessageText('✅ Kanal o\'chirildi.');
        } catch (e) { }
    });


    // /makeadmin user_id
    bot.command('makeadmin', async (ctx) => {
        try {
            // Only Super Admin (Env ID)
            if (!isAdmin(ctx.from.id)) {
                return ctx.reply('❌ Bu buyruq faqat Bosh Admin uchun!');
            }

            const parts = ctx.message.text.split(' ');
            const telegramId = parseInt(parts[1]);

            if (!telegramId) return ctx.reply('⚠️ ID kiriting: /makeadmin 123456');

            const user = await User.findOne({ telegramId });
            if (!user) return ctx.reply('❌ Foydalanuvchi topilmadi.');

            user.role = 'admin';
            await user.save();

            await AdminLog.create({
                adminId: ctx.from.id,
                action: 'make_admin',
                targetId: telegramId,
                details: 'Promoted to Admin'
            });

            ctx.reply(`✅ <b>Yangi Admin tayinlandi!</b>\n\n👤 ${user.firstName} (<code>${user.telegramId}</code>) endi bot admini.`, { parse_mode: 'HTML' });
            try { await ctx.telegram.sendMessage(telegramId, '👮‍♂️ <b>Tabriklaymiz!</b>\n\nSizga botda <b>Admin</b> huquqi berildi.\n/admin buyrug\'ini yuborib panelga kirishingiz mumkin.', { parse_mode: 'HTML' }); } catch (e) { }

        } catch (e) {
            logger.error('Make Admin Error:', e);
            ctx.reply('❌ Xatolik');
        }
    });

    // /removeadmin user_id
    bot.command('removeadmin', async (ctx) => {
        try {
            // Only Super Admin
            if (!isAdmin(ctx.from.id)) {
                // TRAP: If a normal admin tries to remove someone (especially Super Admin), warn them or logging.
                // But specifically for 'removeadmin', we just say No.
                return ctx.reply('❌ Bu buyruq faqat Bosh Admin uchun!');
            }

            const parts = ctx.message.text.split(' ');
            const telegramId = parseInt(parts[1]);

            if (!telegramId) return ctx.reply('⚠️ ID kiriting: /removeadmin 123456');

            // ⚠️ SECURITY CHECK: Prevent removing Super Admin
            if (isAdmin(telegramId)) {
                return ctx.reply('❌ Siz Bosh Adminni o\'chira olmaysiz!');
            }

            const user = await User.findOne({ telegramId });
            if (!user) return ctx.reply('❌ Foydalanuvchi topilmadi.');

            user.role = 'user';
            await user.save();

            await AdminLog.create({
                adminId: ctx.from.id,
                action: 'remove_admin',
                targetId: telegramId,
                details: 'Demoted to User'
            });

            ctx.reply(`✅ <b>Admin olib tashlandi.</b>\n\n👤 ${user.firstName} (<code>${user.telegramId}</code>) endi oddiy foydalanuvchi.`, { parse_mode: 'HTML' });
            try { await ctx.telegram.sendMessage(telegramId, '⚠️ Sizning Admin huquqingiz olib tashlandi.', { parse_mode: 'HTML' }); } catch (e) { }

        } catch (e) {
            logger.error('Remove Admin Error:', e);
            ctx.reply('❌ Xatolik');
        }
    });

    // View Admins List + Management UI
    bot.hears('👮‍♂️ Adminlar', async (ctx) => {
        if (!await adminCheck(ctx)) return;
        try {
            const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
            let msg = '👮‍♂️ <b>Bot Adminlari:</b>\n\n';
            admins.forEach(a => {
                const isSuper = isAdmin(a.telegramId);
                msg += `👤 <b>${a.firstName}</b> ${isSuper ? '👑 (Bosh Admin)' : ''}\n🆔 <code>${a.telegramId}</code>\n\n`;
            });

            // Buttons for actions
            const buttons = [
                [Markup.button.callback('➕ Admin qo\'shish', 'add_admin_info'), Markup.button.callback('🗑 Admin o\'chirish', 'remove_admin_list')]
            ];

            ctx.replyWithHTML(msg, Markup.inlineKeyboard(buttons));
        } catch (e) { ctx.reply('❌ Xatolik'); }
    });

    bot.action('add_admin_info', async (ctx) => {
        ctx.reply('✍️ <b>Admin qo\'shish</b>\n\nFoydalanuvchi IDsini quyidagi buyruq bilan yuboring:\n\n<code>/makeadmin 123456789</code>\n\n<i>Eslatma: Faqat Bosh Admin admin tayinlay oladi!</i>', { parse_mode: 'HTML' });
        ctx.answerCbQuery();
    });

    bot.action('remove_admin_list', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            return ctx.answerCbQuery('❌ Faqat Bosh Admin o\'chira oladi!', { show_alert: true });
        }

        const admins = await User.find({ role: 'admin' }); // Only regular admins, not superadmin
        if (admins.length === 0) return ctx.answerCbQuery('O\'chirish uchun adminlar yo\'q', true);

        const buttons = admins.map(a => [
            Markup.button.callback(`� ${a.firstName} (${a.telegramId})`, `rm_admin_${a.telegramId}`)
        ]);
        buttons.push([Markup.button.callback('❌ Bekor', 'cancel_vip_remove')]);

        ctx.editMessageText('🗑 <b>Adminni o\'chirish uchun tanlang:</b>', {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        });
    });

    bot.action(/rm_admin_(\d+)/, async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        const targetId = parseInt(ctx.match[1]);

        const user = await User.findOne({ telegramId: targetId });
        if (user) {
            user.role = 'user';
            await user.save();
            await AdminLog.create({
                adminId: ctx.from.id,
                action: 'remove_admin',
                targetId: targetId,
                details: 'Removed Admin via UI'
            });
            await ctx.answerCbQuery('✅ Admin o\'chirildi');
            await ctx.editMessageText(`✅ <b>Admin o'chirildi:</b> ${user.firstName}`, { parse_mode: 'HTML' });
        } else {
            ctx.answerCbQuery('Topilmadi');
        }
    });

    // 🛡 Admin Logs (Button Handler)
    bot.hears('🗂 Admin Logs', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        // Reuse the /adminlogs logic
        try {
            const logs = await AdminLog.find().sort({ createdAt: -1 }).limit(15);
            if (logs.length === 0) return ctx.reply('📭 Loglar bo\'sh.');

            let msg = '🛡 <b>Admin Logs (Last 15):</b>\n\n';
            logs.forEach(l => {
                const time = new Date(l.createdAt).toLocaleString();
                msg += `🕒 ${time}\n👤 Admin: <code>${l.adminId}</code>\n📝 Action: <b>${l.action}</b>\n🎯 Target: <code>${l.targetId || 'N/A'}</code>\n📄 ${l.details || ''}\n\n`;
            });

            ctx.replyWithHTML(msg);
        } catch (e) {
            ctx.reply('❌ Error');
        }
    });

    // 🛡 Admin Logs Viewer (Super Admin)
    bot.command('adminlogs', async (ctx) => {
        try {
            if (!isAdmin(ctx.from.id)) return;

            const logs = await AdminLog.find().sort({ createdAt: -1 }).limit(15);
            if (logs.length === 0) return ctx.reply('📭 Loglar bo\'sh.');

            let msg = '🛡 <b>Admin Logs (Last 15):</b>\n\n';
            logs.forEach(l => {
                const date = l.createdAt.toISOString().split('T')[0];
                msg += `📅 ${date} | 👮‍♂️ <code>${l.adminId}</code>\n⚡️ <b>${l.action}</b> -> 🎯 <code>${l.targetId || 'N/A'}</code>\n📝 <i>${l.details}</i>\n\n`;
            });

            await ctx.replyWithHTML(msg);
        } catch (e) {
            ctx.reply('❌ Error fetching logs');
        }
    });

    // 🖥 Server (Button Handler)
    bot.hears('🖥 Server', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        // Reuse /server logic
        try {
            const uptime = process.uptime();
            const uptimeHrs = Math.floor(uptime / 3600);
            const uptimeMins = Math.floor((uptime % 3600) / 60);

            const memoryUsage = process.memoryUsage();
            const ramUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;

            const msg = `🖥 <b>Server Status:</b>\n\n` +
                `🟢 <b>Uptime:</b> ${uptimeHrs}h ${uptimeMins}m\n` +
                `🧠 <b>RAM Usage:</b> ${ramUsed} MB\n` +
                `⚡️ <b>Node Version:</b> ${process.version}\n` +
                `📅 <b>Server Time:</b> ${new Date().toLocaleString()}`;

            ctx.replyWithHTML(msg);
        } catch (e) {
            ctx.reply('❌ Error');
        }
    });

    // 📊 Admin Stats (Super Admin) - Shows activity of all admins
    bot.command('adminstats', async (ctx) => {
        try {
            if (!isAdmin(ctx.from.id)) return;

            const stats = await AdminLog.aggregate([
                {
                    $group: {
                        _id: { adminId: "$adminId", action: "$action" },
                        count: { $sum: 1 }
                    }
                }
            ]);

            if (stats.length === 0) return ctx.reply('📭 Hozircha adminlar faolligi yo\'q.');

            let msg = '📊 <b>Admin Faolligi Hisoboti:</b>\n\n';

            // Group by Admin ID
            const grouped = {};
            stats.forEach(s => {
                if (!grouped[s._id.adminId]) grouped[s._id.adminId] = [];
                grouped[s._id.adminId].push(`${s._id.action}: ${s.count}x`);
            });

            for (const [adminId, actions] of Object.entries(grouped)) {
                let adminName = adminId;
                if (adminId === 'SYSTEM') {
                    adminName = '🤖 SYSTEM (Auto)';
                } else {
                    const user = await User.findOne({ telegramId: adminId });
                    if (user) adminName = `👤 ${user.firstName}`;
                }

                msg += `<b>${adminName}</b> (<code>${adminId}</code>):\n`;
                msg += actions.map(a => `▫️ ${a}`).join('\n');
                msg += '\n\n';
            }

            ctx.replyWithHTML(msg);
        } catch (e) {
            logger.error('Admin Stats Error:', e);
            ctx.reply('❌ Xatolik');
        }
    });

    // 🖥 Server Stats (Modern)
    bot.command('server', async (ctx) => {
        try {
            if (!isAdmin(ctx.from.id)) return;

            const uptime = process.uptime();
            const uptimeHrs = Math.floor(uptime / 3600);
            const uptimeMins = Math.floor((uptime % 3600) / 60);

            const memoryUsage = process.memoryUsage();
            const ramUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;

            const msg = `🖥 <b>Server Status:</b>\n\n` +
                `🟢 <b>Uptime:</b> ${uptimeHrs}h ${uptimeMins}m\n` +
                `🧠 <b>RAM Usage:</b> ${ramUsed} MB\n` +
                `⚡️ <b>Node Version:</b> ${process.version}\n` +
                `📅 <b>Server Time:</b> ${new Date().toLocaleString()}`;

            ctx.replyWithHTML(msg);
        } catch (e) {
            ctx.reply('❌ Xatolik');
        }
    });

    // 📢 Broadcast to Admins (Private)
    bot.command('toadmins', async (ctx) => {
        try {
            if (!isAdmin(ctx.from.id)) return;

            const text = ctx.message.text.replace('/toadmins', '').trim();
            if (!text) return ctx.reply('⚠️ Xabar yozing: /toadmins Salom adminlar!');

            const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
            let count = 0;

            for (const admin of admins) {
                if (admin.telegramId.toString() !== ctx.from.id.toString()) { // Don't send to self
                    try {
                        await ctx.telegram.sendMessage(admin.telegramId, `📢 <b>Bosh Admin Xabari:</b>\n\n${text}`, { parse_mode: 'HTML' });
                        count++;
                    } catch (e) { }
                }
            }

            ctx.reply(`✅ Xabar ${count} ta adminga yuborildi.`);
        } catch (e) {
            ctx.reply('❌ Xatolik');
        }
    });

    // Handle P2P VIP Approvals
    bot.action(/approve_vip_(\d+)_(\d+)/, async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌ Yetarli huquq yo\'q');

            const days = parseInt(ctx.match[1]);
            const targetUserId = ctx.match[2];

            const user = await User.findOne({ telegramId: targetUserId });
            if (!user) return ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');

            const currentVip = user.vipUntil && new Date(user.vipUntil) > new Date() ? new Date(user.vipUntil) : new Date();
            currentVip.setDate(currentVip.getDate() + days);
            user.vipUntil = currentVip;
            await user.save();

            // Notify user
            await ctx.telegram.sendMessage(
                targetUserId,
                `🎉 <b>To'lovingiz tasdiqlandi!</b>\n\nSizga ${days} kunlik so'ralgan VIP obunasi muvaffaqiyatli berildi. \n💎 Yangi tugash muddati: ${currentVip.toISOString().split('T')[0]}`,
                { parse_mode: 'HTML' }
            ).catch(() => { });

            // Update Admin message
            await ctx.editMessageCaption(
                ctx.callbackQuery.message.caption + `\n\n✅ <b>TASDIQLANGAN (${days} kun)</b>`,
                { parse_mode: 'HTML' }
            ).catch(() => { });

            await ctx.answerCbQuery('VIP muvaffaqiyatli berildi!').catch(() => { });
        } catch (e) {
            logger.error('Approve VIP error:', e);
            ctx.answerCbQuery('Xatolik yuz berdi.').catch(() => { });
        }
    });

    bot.action(/reject_vip_(\d+)/, async (ctx) => {
        try {
            if (!await adminCheck(ctx)) return ctx.answerCbQuery('❌ Yetarli huquq yo\'q');
            const targetUserId = ctx.match[1];

            // Notify user
            await ctx.telegram.sendMessage(
                targetUserId,
                `❌ <b>To'lovingiz rad etildi.</b>\n\nKiritilgan chek noto'g'ri, yaroqsiz yoki to'lov yetib kelmagan bo'lishi mumkin. Iltimos adminga murojaat qiling.`,
                { parse_mode: 'HTML' }
            ).catch(() => { });

            // Update Admin message
            await ctx.editMessageCaption(
                ctx.callbackQuery.message.caption + `\n\n❌ <b>RAD ETILDI</b>`,
                { parse_mode: 'HTML' }
            ).catch(() => { });

            await ctx.answerCbQuery('Rad etildi! Mijozga xabar berildi.').catch(() => { });
        } catch (e) {
            logger.error('Reject VIP error:', e);
            ctx.answerCbQuery('Xatolik yuz berdi.').catch(() => { });
        }
    });

    // 💾 Zaxira yaratish (JSON Export)
    bot.action('admin_backup', async (ctx) => {
        try {
            await ctx.answerCbQuery('💾 Zaxira (Backup) yuklanmoqda... Boshqalardan sir saqlang!').catch(() => { });
            const users = await User.find({});
            const movies = await Movie.find({});

            const backupData = {
                generatedAt: new Date().toISOString(),
                stats: { totalUsers: users.length, totalMovies: movies.length },
                users,
                movies
            };

            const buffer = Buffer.from(JSON.stringify(backupData, null, 2));
            await ctx.replyWithDocument(
                { source: buffer, filename: `FilmXBot_Backup_${new Date().toISOString().split('T')[0]}.json` },
                { caption: '✅ <b>Avtomatik Xavfsizlik Zaxirasi</b>\n\nBarcha foydalanuvchi ma\'lumotlari, ochkolar va filmlar to\'liq xavfsiz holatda qopchiqlandi. Buni hech kimga bermang!', parse_mode: 'HTML' }
            );
        } catch (e) {
            logger.error('Backup error:', e);
            ctx.reply('❌ Zaxiralash muammosi.').catch(() => { });
        }
    });

    // 📈 Katta Biznes Statistika
    bot.action('admin_stats_advanced', async (ctx) => {
        try {
            await ctx.answerCbQuery('📈 Tahlil tayyorlanmoqda...').catch(() => { });

            const totalUsers = await User.countDocuments({});
            const totalMovies = await Movie.countDocuments({});
            const totalViewsAggr = await Movie.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]);
            const totalViews = totalViewsAggr.length > 0 ? totalViewsAggr[0].total : 0;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const activeVips = await User.countDocuments({ vipUntil: { $gt: new Date() } });

            let msg = `📈 <b>Katta Biznes-Statistika Tahlili</b>\n\n`;
            msg += `👥 <b>Bazada jami Odmlar:</b> ${totalUsers} ta\n`;
            msg += `👑 <b>Aktiv VIP Xaridorlar:</b> ${activeVips} ta\n\n`;
            msg += `🎬 <b>Bazada jami kinolar:</b> ${totalMovies} ta\n`;
            msg += `👁 <b>Kinolar jami ko'rilgan:</b> ${totalViews} marta\n\n`;
            msg += `<i>💡 Sizning loyihangiz mukammal rejimda ishlamoqda. Avto-to'lovlar asosan VIP obunalar orqali yig'iladi.</i>`;

            await ctx.reply(msg, { parse_mode: 'HTML' });
        } catch (e) {
            logger.error('Advanced stats error:', e);
            ctx.reply('❌ Statistika muammosi.').catch(() => { });
        }
    });

};
