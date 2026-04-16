import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';
import User from '../models/User.js';

const directMessageScene = new Scenes.WizardScene(
    'DIRECT_MESSAGE_SCENE',
    // Step 0: Ask for Target User
    async (ctx) => {
        try {
            await ctx.reply('👤 <b>Shaxsiy xabar yuborish</b>\n\nFoydalanuvchining ID raqamini (masalan: <code>123456</code>) yoki Username ini (masalan: <code>@username</code>) kiriting:\n\n<i>Yuborishni bekor qilish uchun Bosh menyuga qaytish tugmasini bosing:</i>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'cancel_direct')]])
            });
            return ctx.wizard.next();
        } catch (e) {
            logger.error('directMessageScene step 0:', e);
            return ctx.scene.leave();
        }
    },
    // Step 1: Validate User and Ask for Message
    async (ctx) => {
        try {
            if (ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_direct') {
                await ctx.editMessageText('❌ Bekor qilindi.');
                return ctx.scene.leave();
            }

            if (!ctx.message || !ctx.message.text) {
                return ctx.reply('⚠️ Iltimos, faqat ID yoki Username (matn ko\'rinishida) kiriting.');
            }

            const input = ctx.message.text.trim();
            let targetUser = null;

            if (input.startsWith('@') || isNaN(input)) {
                // By username
                let username = input.startsWith('@') ? input.substring(1) : input;
                username = username.replace(/https?:\/\/t\.me\//, '').trim();
                targetUser = await User.findOne({ 
                    $or: [
                        { username: new RegExp(`^${username}$`, 'i') }, 
                        { username: username }
                    ]
                });
            } else if (!isNaN(input)) {
                // By telegram ID
                targetUser = await User.findOne({ telegramId: parseInt(input) });
            } else {
                 return ctx.reply('⚠️ Noto\'g\'ri format. ID raqam yoki @username yuboring.');
            }

            if (!targetUser) {
                 return ctx.reply('❌ Foydalanuvchi tizimdan topilmadi. Qayta urinib ko\'ring yoki bekor qiling:', Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'cancel_direct')]]));
            }

            ctx.wizard.state.targetId = targetUser.telegramId;
            ctx.wizard.state.targetName = targetUser.firstName || targetUser.username || 'Foydalanuvchi';

            await ctx.reply(`👤 <b>Foydalanuvchi topildi:</b> ${ctx.wizard.state.targetName} (\`${targetUser.telegramId}\`)\n\nEndi unga yubormoqchi bo'lgan xabaringizni yuboring (Matn, Rasm yoki Video jo'natishingiz mumkin):`, {
                parse_mode: 'Markdown',
                 ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'cancel_direct')]])
            });
            return ctx.wizard.next();
        } catch (e) {
            logger.error('directMessageScene step 1:', e);
            return ctx.scene.leave();
        }
    },
    // Step 2: Send Message
    async (ctx) => {
        try {
            if (ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_direct') {
                await ctx.editMessageText('❌ Bekor qilindi.');
                return ctx.scene.leave();
            }

            if (!ctx.message) return;

            const targetId = ctx.wizard.state.targetId;
            let success = false;
            let sentMsg = null;

            try {
                if (ctx.message.text) {
                    sentMsg = await ctx.telegram.sendMessage(targetId, `🔔 <b>Admindan xabar:</b>\n\n${ctx.message.text}`, { parse_mode: 'HTML' });
                    success = true;
                } else if (ctx.message.photo) {
                    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                    sentMsg = await ctx.telegram.sendPhoto(targetId, fileId, { caption: ctx.message.caption ? `🔔 <b>Admindan xabar:</b>\n\n${ctx.message.caption}` : '🔔 Admindan xabar!', parse_mode: 'HTML' });
                     success = true;
                } else if (ctx.message.video) {
                    const fileId = ctx.message.video.file_id;
                     sentMsg = await ctx.telegram.sendVideo(targetId, fileId, { caption: ctx.message.caption ? `🔔 <b>Admindan xabar:</b>\n\n${ctx.message.caption}` : '🔔 Admindan xabar!', parse_mode: 'HTML' });
                     success = true;
                } else {
                     return ctx.reply('⚠️ Xabar faqat Matn, Rasm yoki Video bo\'lishi kerak!');
                }
            } catch (sentErr) {
                 logger.error('Send direct message err', sentErr);
                 await ctx.reply(`❌ Foydalanuvchiga xabar yetib bormadi! Bloklangan bo'lishi mumkin.\nSabab: ${sentErr.message}`);
                 return ctx.scene.leave();
            }

            if (success && sentMsg) {
                 // Save the message id just in case we need to delete later
                 await User.updateOne({ telegramId: targetId }, { lastBroadcastMsgId: sentMsg.message_id });
                 await ctx.reply(`✅ <b>Xabar ${ctx.wizard.state.targetName} ga muvaffaqiyatli yuborildi!</b>`, { parse_mode: 'HTML' });
            }

            return ctx.scene.leave();
        } catch (e) {
            logger.error('directMessageScene step 2:', e);
            await ctx.reply('❌ Xatolik yuz berdi.').catch(()=>{});
            return ctx.scene.leave();
        }
    }
);

directMessageScene.action('cancel_direct', async (ctx) => {
     try {
         await ctx.editMessageText('❌ Shaxsiy xabar bekor qilindi.');
     } catch(e) {}
     return ctx.scene.leave();
});

export default directMessageScene;
