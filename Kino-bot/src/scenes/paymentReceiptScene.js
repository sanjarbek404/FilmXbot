import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';

const paymentReceiptScene = new Scenes.WizardScene(
    'PAYMENT_RECEIPT_SCENE',
    async (ctx) => {
        let msg = `💳 <b>Karta orqali VIP xarid qilish!</b>\n\n`;
        msg += `<i>Iltimos, o'zingizga kerakli VIP muddatini tanlang:</i>`;
        
        await ctx.reply(msg, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('💎 1 Oylik VIP', 'plan_30'), Markup.button.callback('👑 1 Yillik VIP', 'plan_365')],
                [Markup.button.callback('❌ Bekor qilish', 'cancel_pay')]
            ])
        });
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.callbackQuery) {
            if (ctx.callbackQuery.data === 'cancel_pay') {
                await ctx.editMessageText('❌ Bekor qilindi.').catch(()=>{});
                return ctx.scene.leave();
            }

            if (ctx.callbackQuery.data.startsWith('plan_')) {
                ctx.wizard.state.days = parseInt(ctx.callbackQuery.data.split('_')[1]);
                const price = ctx.wizard.state.days === 30 ? '30,000 so\'m' : '150,000 so\'m'; // Default illustrative prices
                
                await ctx.answerCbQuery().catch(()=>{});
                
                let msg = `💳 <b>To'lovni amalga oshirish:</b>\n\n`;
                msg += `💰 <b>Summa:</b> ${price}\n`;
                msg += `💳 <b>Karta raqam:</b> <code>Hozircha karta orqali to'lov qabul qilinmaydi Admin bilan Bog'laning</code>\n`; 
                msg += `👤 <b>Qabul qiluvchi:</b> Admin\n\n`;
                msg += `📸 <i>To'lov qilganingizdan so'ng, chekni (skrinshot) shu yerga yuboring! Faqat rasm qabul qilinadi.</i>`;

                await ctx.editMessageText(msg, {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'cancel_pay')]])
                });
                return ctx.wizard.next();
            }
        }
        return;
    },
    async (ctx) => {
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_pay') {
             await ctx.editMessageText('❌ Bekor qilindi.').catch(()=>{});
             return ctx.scene.leave();
        }

        if (ctx.message && ctx.message.photo) {
            // Receipt received
            const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            const adminId = process.env.ADMIN_ID ? process.env.ADMIN_ID.split(',')[0].trim() : null;
            
            if (!adminId) {
                await ctx.reply("System error: Admin is not configured. Payment feature is disabled.");
                return ctx.scene.leave();
            }

            const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
            const userId = ctx.from.id;
            const days = ctx.wizard.state.days;

            let caption = `💰 <b>Yangi to'lov cheki (Karta)</b>\n\n`;
            caption += `👤 Fodyalanuvchi: ${username} (ID: <code>${userId}</code>)\n`;
            caption += `⏳ So'ralgan muddat: <b>${days} kunlik VIP</b>\n\n`;
            caption += `<i>Iltimos, to'lovni tasdiqlab tegishli tugmani bosing:</i>`;

            const adminButtons = [
                [Markup.button.callback(`✅ Tasdiqlash (${days} kun)`, `approve_vip_${days}_${userId}`)],
                [Markup.button.callback('❌ Rad etish', `reject_vip_${userId}`)]
            ];

            try {
                await ctx.telegram.sendPhoto(adminId, photoId, {
                    caption: caption,
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard(adminButtons)
                });
                
                await ctx.reply("✅ <b>Chek adminga yuborildi!</b>\n\nTasdiqlangandan so'ng sizga xabar beriladi va botingizdagi VIP ochiladi. Kuting...", { parse_mode: 'HTML' });
            } catch (e) {
                logger.error("Error sending receipt to admin", e);
                await ctx.reply("❌ Xatolik yuz berdi. Iltimos adminga to'g'ridan-to'g'ri murojaat qiling.");
            }
            
            return ctx.scene.leave();
        } else if (ctx.message && ctx.message.text) {
             await ctx.reply("⚠️ Iltimos faqat rasmli chek (screenshot) yuboring!");
             return;
        }
    }
);

export default paymentReceiptScene;
