import { Scenes, Markup } from 'telegraf';
import { getMovieByCode } from '../services/movieService.js';
import { getUserByTelegramId } from '../services/userService.js';
import Favorite from '../models/Favorite.js';

const addFavCodeScene = new Scenes.WizardScene(
    'ADD_FAV_CODE_SCENE',
    async (ctx) => {
        await ctx.reply('❤️ <b>Saqlanganlarga qo\'shish</b>\n\nIltimos, sizga yoqqan kinoning kodini yuboring (masalan: 1040):', {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'cancel_fav')]])
        });
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_fav') {
            await ctx.editMessageText('❌ Bekor qilindi.').catch(()=>{});
            return ctx.scene.leave();
        }
        
        if (!ctx.message || !ctx.message.text) return;
        
        const code = parseInt(ctx.message.text);
        if (isNaN(code)) {
            await ctx.reply('⚠️ Noto\'g\'ri kod. Raqam qatnashgan kod kiriting, yoki bekor qiling:');
            return;
        }

        const movie = await getMovieByCode(code);
        if (!movie) {
            await ctx.reply('📭 Bunday kodli kino topilmadi. Boshqa kod kiriting yoki bekor qiling:');
            return;
        }

        const dbUser = await getUserByTelegramId(ctx.from.id);
        const isVip = dbUser && dbUser.vipUntil && new Date(dbUser.vipUntil) > new Date();
        
        if (!isVip) {
            await ctx.reply('🔒 <b>Kinolarni saqlanganlarga (Sevimlilar) yig\'ish xizmati faqat VIP obunachilar uchun ruxsat etilgan!</b>\n\nIltimos VIP do\'konidan foydalaning.', { parse_mode: 'HTML' });
            return ctx.scene.leave();
        }

        const exists = await Favorite.findOne({ user: dbUser._id, movie: movie._id });
        if (exists) {
            await ctx.reply('ℹ️ Bu kino allaqachon saqlanganlaringiz qatorida bor.');
            return ctx.scene.leave();
        }

        await Favorite.create({ user: dbUser._id, movie: movie._id });
        await ctx.reply(`✅ <b>"${movie.title}"</b> saqlanganlarga muvaffaqiyatli qo'shildi! Shaxsiy kabinetga kirib ko'rishingiz mumkin.`, { parse_mode: 'HTML' });
        return ctx.scene.leave();
    }
);

addFavCodeScene.action('cancel_fav', async (ctx) => {
    await ctx.editMessageText('❌ Bekor qilindi.').catch(()=>{});
    return ctx.scene.leave();
});

export default addFavCodeScene;
