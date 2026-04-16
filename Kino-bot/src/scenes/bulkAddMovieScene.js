import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';
import { createMovie } from '../services/movieService.js';
import Movie from '../models/Movie.js';

const generateMovieCode = async () => {
    try {
        const lastMovie = await Movie.findOne().sort({ code: -1 });
        return lastMovie ? lastMovie.code + 1 : 1001;
    } catch (e) {
        return Math.floor(Math.random() * 9000) + 1000;
    }
};

const bulkAddMovieScene = new Scenes.WizardScene(
    'BULK_ADD_MOVIE_SCENE',
    async (ctx) => {
        try {
            await ctx.reply(
                `📚 <b>Ommaviy kino qo'shish!</b>\n\n` +
                `Istalgancha video yoki fayllarni menga ketma-ket yuboring (yoki forward qiling).\n` +
                `Har biriga avtomatik tarzda maxsus kod berib saqlayman.\n\n` +
                `<i>Ishni to'xtatish uchun pastdagi tugmani yoki /stop ni bosing.</i>`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('❌ Bekor qilish', 'cancel_bulk_add')]
                    ])
                }
            );
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Bulk add step 1 error:', e);
            await ctx.reply('❌ Xatolik yuz berdi.').catch(() => { });
            return ctx.scene.leave();
        }
    },
    async (ctx) => {
        try {
            if (ctx.message?.text === '/stop' || ctx.message?.text === '/cancel') {
                await ctx.reply('✅ Ommaviy kino qo\\'shish to\\'xtatildi.');
                return ctx.scene.leave();
            }

            let fileId;
            let fileName;

            if (ctx.message?.video) {
                fileId = ctx.message.video.file_id;
                fileName = ctx.message.video.file_name;
            } else if (ctx.message?.document) {
                fileId = ctx.message.document.file_id;
                fileName = ctx.message.document.file_name;
            }

            if (!fileId) {
                return ctx.reply('⚠️ Iltimos, faqat video fayl yuboring yoki to\\'xtatish uchun /stop bosing.');
            }

            const nextCode = await generateMovieCode();
            const defaultTitle = fileName ? fileName.replace(/\.[^/.]+$/, "") : `Kino #${nextCode}`;
            const placeholderPoster = 'https://via.placeholder.com/600x800.png?text=Kino+Poster';

            const movieData = {
                title: defaultTitle,
                code: nextCode,
                year: new Date().getFullYear(),
                genre: 'Boshqa',
                description: 'Tezkor kiritilgan kino. Tahrirlash bo\\'limi orqali ma\\'lumotlarini o\\'zgartiring.',
                fileId: fileId,
                poster: placeholderPoster,
                isRestricted: false
            };

            await createMovie(movieData);

            await ctx.reply(
                `✅ <b>Saqlandi!</b>\n\n` +
                `🎬 Nom: ${defaultTitle}\n` +
                `🔢 Kod: <code>${nextCode}</code>\n\n` +
                `<i>Keyingi videoni yuboring...</i>`,
                { parse_mode: 'HTML' }
            );

            return;
        } catch (e) {
            logger.error('Bulk add step 2 error:', e);
            await ctx.reply('❌ Saqlashda xatolik yuz berdi. Yana davom etishingiz mumkin.');
        }
    }
);

bulkAddMovieScene.action('cancel_bulk_add', async (ctx) => {
    try {
        await ctx.editMessageText('✅ Ommaviy kino qo\\'shish yakunlandi.');
        return ctx.scene.leave();
    } catch (e) {
        return ctx.scene.leave();
    }
});

bulkAddMovieScene.command('stop', async (ctx) => {
    try {
        await ctx.reply('✅ Ommaviy kino qo\\'shish yakunlandi.');
        return ctx.scene.leave();
    } catch (e) {
        return ctx.scene.leave();
    }
});

export default bulkAddMovieScene;
