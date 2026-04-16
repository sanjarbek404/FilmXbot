import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';
import Movie from '../models/Movie.js';

const editMovieScene = new Scenes.WizardScene(
    'EDIT_MOVIE_SCENE',
    // Step 0: Ask for Movie Code
    async (ctx) => {
        await ctx.reply('✏️ <b>Kino Tahrirlash</b>\n\nTahrirlamoqchi bo\'lgan kinongiz kodini yuboring (masalan: 1001):', {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('❌ Bekor qilish', 'cancel_edit')]
            ])
        });
        return ctx.wizard.next();
    },
    // Step 1: Validate Code & Show Menu
    async (ctx) => {
        if (ctx.message?.text) {
            const code = parseInt(ctx.message.text);
            if (isNaN(code)) return ctx.reply('⚠️ Raqam yuboring.');

            const movie = await Movie.findOne({ code });
            if (!movie) return ctx.reply('❌ Bunday kodli kino topilmadi. Qaytadan yuboring:');

            ctx.wizard.state.movieCode = code;
            ctx.wizard.state.movie = movie;

            const msg = `📝 <b>Tahrirlash:</b> ${movie.title}\n\n` +
                `1. 🏷 Nomini o'zgartirish\n` +
                `2. 🖼 Posterni o'zgartirish\n` +
                `3. 📝 Tavsifni o'zgartirish\n` +
                `4. 🔒 VIP Himoyasi o'rnatish/yechish\n` +
                `5. ❌ Tugatish\n\n` +
                `Hozirgi himoya: ${movie.isRestricted ? "🔐 Qat'iy (VIP ham yuklay olmaydi)" : "🔓 Standart (VIP yuklay oladi)"}`;

            await ctx.replyWithPhoto(movie.poster, {
                caption: msg,
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🏷 Nomi', 'edit_title'), Markup.button.callback('🖼 Poster', 'edit_poster')],
                    [Markup.button.callback('📝 Tavsif', 'edit_desc'), Markup.button.callback(movie.isRestricted ? '🔓 Yechish' : '🔐 Qulflash', 'toggle_restrict')],
                    [Markup.button.callback('❌ Chiqish', 'cancel_edit')]
                ])
            });
            return ctx.wizard.next();
        }
    },
    // Step 2: Handle Selection (Wait state)
    async (ctx) => {
        // Just waiting for actions
    },
    // Step 3: Input Handler
    async (ctx) => {
        const movieCode = ctx.wizard.state.movieCode;
        const mode = ctx.wizard.state.editMode;

        if (!mode) return;

        try {
            let update = {};

            if (mode === 'title' && ctx.message?.text) {
                update.title = ctx.message.text;
            } else if (mode === 'desc' && ctx.message?.text) {
                update.description = ctx.message.text;
            } else if (mode === 'poster' && ctx.message?.photo) {
                update.poster = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            } else {
                return ctx.reply('⚠️ Noto\'g\'ri format. Qaytadan urinib ko\'ring yoki /cancel.');
            }

            await Movie.findOneAndUpdate({ code: movieCode }, update);
            await ctx.reply('✅ <b>Muvaffaqiyatli saqlandi!</b>', { parse_mode: 'HTML' });

            // Re-fetch and show menu
            const movie = await Movie.findOne({ code: movieCode });
            const msg = `📝 <b>Tahrirlash:</b> ${movie.title}\n\n` +
                `1. 🏷 Nomini o'zgartirish\n` +
                `2. 🖼 Posterni o'zgartirish\n` +
                `3. 📝 Tavsifni o'zgartirish\n` +
                `4. 🔒 VIP Himoyasi o'rnatish/yechish\n` +
                `5. ❌ Tugatish\n\n` +
                `Hozirgi himoya: ${movie.isRestricted ? "🔐 Qat'iy (VIP ham yuklay olmaydi)" : "🔓 Standart (VIP yuklay oladi)"}`;

            await ctx.replyWithPhoto(movie.poster, {
                caption: msg,
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🏷 Nomi', 'edit_title'), Markup.button.callback('🖼 Poster', 'edit_poster')],
                    [Markup.button.callback('📝 Tavsif', 'edit_desc'), Markup.button.callback(movie.isRestricted ? '🔓 Yechish' : '🔐 Qulflash', 'toggle_restrict')],
                    [Markup.button.callback('❌ Chiqish', 'cancel_edit')]
                ])
            });

            // Go back to Step 2 (Wait state)
            return ctx.wizard.selectStep(2);

        } catch (e) {
            logger.error('Edit movie scene error:', e);
            ctx.reply('❌ Xatolik yuz berdi.');
            ctx.scene.leave();
        }
    }
);

// ACTIONS

editMovieScene.action('edit_title', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('📝 Yangi nomni yuboring:');
    ctx.wizard.state.editMode = 'title';
    ctx.wizard.selectStep(3);
});

editMovieScene.action('edit_poster', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🖼 Yangi posterni (rasm) yuboring:');
    ctx.wizard.state.editMode = 'poster';
    ctx.wizard.selectStep(3);
});

editMovieScene.action('edit_desc', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('📝 Yangi tavsifni yuboring:');
    ctx.wizard.state.editMode = 'desc';
    ctx.wizard.selectStep(3);
});

editMovieScene.action('toggle_restrict', async (ctx) => {
    try {
        const movieCode = ctx.wizard.state.movieCode;
        const movie = await Movie.findOne({ code: movieCode });
        if (movie) {
            movie.isRestricted = !movie.isRestricted;
            await movie.save();
            await ctx.answerCbQuery(movie.isRestricted ? '🔐 Qat\'iy himoyalandi' : '🔓 Himoya olib tashlandi');

            // Re-render menu
            const msg = `📝 <b>Tahrirlash:</b> ${movie.title}\n\n` +
                `1. 🏷 Nomini o'zgartirish\n` +
                `2. 🖼 Posterni o'zgartirish\n` +
                `3. 📝 Tavsifni o'zgartirish\n` +
                `4. 🔒 VIP Himoyasi o'rnatish/yechish\n` +
                `5. ❌ Tugatish\n\n` +
                `Hozirgi himoya: ${movie.isRestricted ? "🔐 Qat'iy (VIP ham yuklay olmaydi)" : "🔓 Standart (VIP yuklay oladi)"}`;

            await ctx.editMessageCaption(msg, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🏷 Nomi', 'edit_title'), Markup.button.callback('🖼 Poster', 'edit_poster')],
                    [Markup.button.callback('📝 Tavsif', 'edit_desc'), Markup.button.callback(movie.isRestricted ? '🔓 Yechish' : '🔐 Qulflash', 'toggle_restrict')],
                    [Markup.button.callback('❌ Chiqish', 'cancel_edit')]
                ])
            });
        }
    } catch (e) {
        logger.error('Toggle restrict error:', e);
        await ctx.answerCbQuery('❌ Xato').catch(() => { });
    }
});

editMovieScene.action('cancel_edit', async (ctx) => {
    await ctx.deleteMessage().catch(() => { });
    await ctx.reply('✅ Tahrirlash yakunlandi.');
    return ctx.scene.leave();
});

export default editMovieScene;
