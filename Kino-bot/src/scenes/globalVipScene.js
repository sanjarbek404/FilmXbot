import { Scenes, Markup } from 'telegraf';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { sendMainMenu } from '../utils/menuUtils.js';

const globalVipScene = new Scenes.WizardScene(
    'GLOBAL_VIP_SCENE',
    // 1-qadam: Muddatni so'rash
    async (ctx) => {
        try {
            await ctx.reply('🌐 <b>GLOBAL VIP BERYAPSIZ</b>\n\nBarcha foydalanuvchilarga xizmat ko\'rsatadigan VIP muddatini (KUN hisobida) faqat raqamda kiriting:\n\n<i>Masalan: 3</i>\n<i>Bekor qilish uchun <b>/cancel</b> yozing.</i>', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'cancel_vip')]]) });
            return ctx.wizard.next();
        } catch (e) {
            return ctx.scene.leave();
        }
    },
    // 2-qadam: Xabar, Rasm, Video qabul qilish
    async (ctx) => {
        try {
            if ((ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_vip') || (ctx.message && ctx.message.text === '/cancel')) {
                if(ctx.callbackQuery) await ctx.answerCbQuery().catch(()=>{});
                await ctx.reply('❌ Barchaga VIP berish bekor qilindi.');
                return ctx.scene.leave();
            }

            if(!ctx.message || !ctx.message.text) return;
            const days = parseInt(ctx.message.text);
            if (isNaN(days) || days <= 0) {
                await ctx.reply('❌ Faqat musbat raqam kiriting (masalan: 3). Qaytadan raqam yozing:');
                return; // Wizard kutib turadi
            }
            ctx.wizard.state.days = days;

            await ctx.reply('📸 <b>Tabrik Xabari</b>\n\nFoydalanuvchilarga sovg\'a bilan birga boradigan Rasmli tabrik postini (yoki faqat matnni) yuboring:', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'cancel_vip')]])
            });
            return ctx.wizard.next();
        } catch (e) {
            return ctx.scene.leave();
        }
    },
    // 3-qadam: Tasdiqlash
    async (ctx) => {
        try {
            if ((ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_vip') || (ctx.message && ctx.message.text === '/cancel')) {
                if(ctx.callbackQuery) await ctx.answerCbQuery().catch(()=>{});
                await ctx.reply('❌ Bekor qilindi.');
                return ctx.scene.leave();
            }
            
            if (!ctx.message) return;

            ctx.wizard.state.message = {};
            if (ctx.message.text) {
                ctx.wizard.state.message.type = 'text';
                ctx.wizard.state.message.content = ctx.message.text;
            } else if (ctx.message.photo) {
                ctx.wizard.state.message.type = 'photo';
                ctx.wizard.state.message.fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                ctx.wizard.state.message.caption = ctx.message.caption || '';
            } else if (ctx.message.video) {
                ctx.wizard.state.message.type = 'video';
                ctx.wizard.state.message.fileId = ctx.message.video.file_id;
                ctx.wizard.state.message.caption = ctx.message.caption || '';
            } else {
                return ctx.reply('⚠️ Faqat matn, rasm yoki video yuboring.');
            }

            const count = await User.countDocuments();
            
            await ctx.reply(`📋 <b>Hamma narsa tayyor. Boshlaymizmi?</b>\n\n👥 Qamrov: ${count} ta foydalanuvchi\n💎 Beriladigan VIP: ${ctx.wizard.state.days} KUN\n📧 Xabar turi: ${ctx.wizard.state.message.type}`, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([  
                    [Markup.button.callback('🚀 Barchaga Tarqatish', 'start_global_vip')],
                    [Markup.button.callback('❌ Bekor qilish', 'cancel_vip')]
                ])
            });
            return ctx.wizard.next();
        } catch (e) {
            return ctx.scene.leave();
        }
    },
    // 4-qadam: Tarqatish (Loop)
    async (ctx) => {
        try {
            if (!ctx.callbackQuery) return;
            const action = ctx.callbackQuery.data;

            if (action === 'cancel_vip') {
                await ctx.answerCbQuery().catch(() => {});
                await ctx.editMessageText('❌ Bekor qilindi.').catch(()=>{});
                return ctx.scene.leave();
            }

            if (action === 'start_global_vip') {
                await ctx.answerCbQuery('Jarayon boshlandi...').catch(() => {});
                const msgData = ctx.wizard.state.message;
                const days = ctx.wizard.state.days;
                
                const users = await User.find();
                await ctx.editMessageText(`🚀 <b>VIP va Xabar tarqatilmoqda...</b> 0/${users.length}`, { parse_mode: 'HTML' }).catch(() => {});

                let success = 0;
                let failed = 0;

                const now = new Date();
                const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

                // Background Fire & Forget task
                (async () => {
                    // Tezkor ommaviy update hammaga bittada bazada VIP ni ilib qo'yadi
                    await User.updateMany(
                         {
                             $or: [
                                 { vipUntil: { $exists: false } },
                                 { vipUntil: { $lt: targetDate } },
                                 { vipUntil: null }
                             ]
                         },
                         { $set: { vipUntil: targetDate } }
                    );

                    // Aksiya xotirasini Tizimli Konfiguratsiyaga Start buyrug'i uchun yozamiz
                    await import('../models/Config.js').then(m => m.default.updateOne(
                        { key: 'LATEST_GLOBAL_VIP' },
                        { $set: { value: JSON.stringify({ targetDate: targetDate.getTime(), message: msgData }) } },
                        { upsert: true }
                    )).catch(() => {});

                    // Asta sekinlik bilan xabar jo'natib chiqamiz Rate Limitdan saqlanish (40ms) uchun
                    for (let i = 0; i < users.length; i++) {
                        const userId = users[i].telegramId;
                        try {
                            if (msgData.type === 'text') {
                                await ctx.telegram.sendMessage(userId, `💎 ${msgData.content}`, { parse_mode: 'HTML' });
                            } else if (msgData.type === 'photo') {
                                await ctx.telegram.sendPhoto(userId, msgData.fileId, { caption: msgData.caption ? `💎 ${msgData.caption}` : undefined, parse_mode: 'HTML' });
                            } else if (msgData.type === 'video') {
                                await ctx.telegram.sendVideo(userId, msgData.fileId, { caption: msgData.caption ? `💎 ${msgData.caption}` : undefined, parse_mode: 'HTML' });
                            }
                            success++;
                        } catch (e) {
                            failed++;
                        }
                        
                        // 40ms tanaffus Telegram block qilib qoymasligi uchun
                        await new Promise(resolve => setTimeout(resolve, 40));

                        if (i % 50 === 0 && i > 0) {
                            try { await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, null, `🚀 <b>Yuborilmoqda...</b> ${i}/${users.length}\n✅ ${success} ta bordi`, { parse_mode: 'HTML' }); } catch (e) {}
                        }
                    }

                    try {
                        await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, null, `✅ <b>GLOBAL VIP BARCHAGA YETKAZILDI!</b>\n\n🎯 Berildi: ${days} KUN\n✅ Muvaffaqiyatli bordi: ${success} ta\n❌ Bloklaganlar: ${failed} ta`, { parse_mode: 'HTML' });
                    } catch (e) {}
                })();

                return ctx.scene.leave();
            }
        } catch (e) {
            return ctx.scene.leave();
        }
    }
);

export default globalVipScene;
