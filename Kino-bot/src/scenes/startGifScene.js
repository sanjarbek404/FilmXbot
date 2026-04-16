import { Scenes, Markup } from 'telegraf';
import Config from '../models/Config.js';

const startGifScene = new Scenes.BaseScene('START_GIF_SCENE');

startGifScene.enter(async (ctx) => {
    await ctx.reply(
        '🎬 <b>Start GIF va Xabar o\'rnatish</b>\n\n' +
        'Yangi foydalanuvchilar /start bossa, shu xabar (rasm/gif/video bilan) yuboriladi.\n\n' +
        '1️⃣ Avval biron rasm, GIF yoki video yuboring.\n' +
        '2️⃣ Pastiga izoh (caption) o\'rnida foydalanuvchiga boradigan /start xabarini yozib jo\'nating.\n\n' +
        'O\'chirish uchun /delete deb yozing.', {
        parse_mode: 'HTML',
        ...Markup.keyboard([['❌ Bekor qilish']]).resize()
    });
});

startGifScene.hears('❌ Bekor qilish', async (ctx) => {
    await ctx.reply('❌ Bekor qilindi.', Markup.removeKeyboard());
    return ctx.scene.leave();
});

startGifScene.command('delete', async (ctx) => {
    await Config.deleteOne({ key: 'START_GIF' });
    await ctx.reply('🗑 Start GIF/Xabar muvaffaqiyatli o\'chirildi!', Markup.removeKeyboard());
    return ctx.scene.leave();
});

startGifScene.on(['animation', 'photo', 'video'], async (ctx) => {
    try {
        let fileId;
        let type;
        if (ctx.message.animation) {
            fileId = ctx.message.animation.file_id;
            type = 'animation';
        } else if (ctx.message.photo) {
            fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            type = 'photo';
        } else if (ctx.message.video) {
            fileId = ctx.message.video.file_id;
            type = 'video';
        }

        const caption = ctx.message.caption || ''; 

        await Config.findOneAndUpdate(
            { key: 'START_GIF' },
            { value: JSON.stringify({ fileId, type, caption }) },
            { upsert: true }
        );

        await ctx.reply('✅ Start xabari muvaffaqiyatli saqlandi!', Markup.removeKeyboard());
        return ctx.scene.leave();
    } catch (e) {
        console.error('Start GIF save error:', e);
        await ctx.reply('❌ Xatolik yuz berdi. Boshqadan urinib ko\'ring.');
    }
});

startGifScene.on('text', async (ctx) => {
    await ctx.reply('Iltimos, rasm, GIF yoki video yuboring va izoh o\'rnida matn yozing. Bekor qilish uchun "❌ Bekor qilish" tugmasini bosing.');
});

export default startGifScene;
