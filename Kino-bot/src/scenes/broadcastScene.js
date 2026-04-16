import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';
import User from '../models/User.js';

const broadcastScene = new Scenes.WizardScene(
    'BROADCAST_SCENE',
    // Step 0: Ask for message
    async (ctx) => {
        try {
            await ctx.reply('📢 <b>Reklama yuborish</b>\n\nYuboriladigan xabar, rasm yoki videoni yuboring:', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('❌ Bekor qilish', 'cancel_broadcast')]
                ])
            });
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Broadcast Stats Error:', e);
            await ctx.reply('❌ Xatolik: ' + e.message);
            return ctx.scene.leave();
        }
    },
    // Step 1: Handle Input & Ask Audience
    async (ctx) => {
        try {
            if (ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_broadcast') {
                await ctx.answerCbQuery('Bekor qilindi').catch(() => { });
                await ctx.editMessageText('❌ Bekor qilindi.').catch(() => { });
                return ctx.scene.leave();
            }

            if (!ctx.message) return; // Ignore if not message

            // Save message details
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

            await ctx.reply('🎯 <b>Kimlarga yuborilsin?</b>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('👥 Barchaga', 'target_all')],
                    [Markup.button.callback('💎 Faqat VIP larga', 'target_vip')],
                    [Markup.button.callback('❌ Bekor qilish', 'cancel_broadcast')]
                ])
            });
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Broadcast step 1 error:', e);
            return ctx.scene.leave();
        }
    },
    // Step 2: Handle Target Selection
    async (ctx) => {
        try {
            if (!ctx.callbackQuery) return; // Ignore text inputs here

            const target = ctx.callbackQuery.data;
            if (target === 'cancel_broadcast') {
                await ctx.answerCbQuery('Bekor qilindi').catch(() => { });
                await ctx.editMessageText('❌ Bekor qilindi.').catch(() => { });
                return ctx.scene.leave();
            }

            if (target !== 'target_all' && target !== 'target_vip') {
                return; // Ignore any other button clicks here
            }

            await ctx.answerCbQuery().catch(() => { });
            ctx.wizard.state.target = target;

            let filter = { isBanned: false };
            let targetName = 'Barcha foydalanuvchilar';

            if (target === 'target_vip') {
                filter.vipUntil = { $gt: new Date() };
                targetName = '💎 VIP Foydalanuvchilar';
            }

            const count = await User.countDocuments(filter).catch(() => 0);
            ctx.wizard.state.filter = filter;

            await ctx.editMessageText(`📋 <b>Tasdiqlash:</b>\n\n🎯 Auditoriya: ${targetName}\n👥 Soni: ${count} ta\n\nXabar turi: ${ctx.wizard.state.message.type}`, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Yuborish', 'confirm_send')],
                    [Markup.button.callback('❌ Bekor qilish', 'cancel_broadcast')]
                ])
            });
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Broadcast step 2 error:', e);
            return ctx.scene.leave();
        }
    },
    // Step 3: Final Sender
    async (ctx) => {
        try {
            if (!ctx.callbackQuery) return; // Ignore text

            const action = ctx.callbackQuery.data;

            if (action === 'cancel_broadcast') {
                await ctx.answerCbQuery('Bekor qilindi').catch(() => { });
                await ctx.editMessageText('❌ Bekor qilindi.').catch(() => { });
                return ctx.scene.leave();
            }

            if (action === 'confirm_send') {
                const filter = ctx.wizard.state.filter;
                const msgData = ctx.wizard.state.message;
                const users = await User.find(filter);

                await ctx.answerCbQuery('Yuborilmoqda...').catch(() => { });
                await ctx.editMessageText(`🚀 Xabar yuborish boshlandi... 0/${users.length}`).catch(() => { });

                let success = 0;
                let failed = 0;

                // Fire and forget so we don't block the Wizard
                (async () => {
                    for (let i = 0; i < users.length; i++) {
                        const userId = users[i].telegramId;
                        try {
                            let sentMsg;
                            if (msgData.type === 'text') {
                                sentMsg = await ctx.telegram.sendMessage(userId, `📢 ${msgData.content}`, { parse_mode: 'HTML' });
                            } else if (msgData.type === 'photo') {
                                sentMsg = await ctx.telegram.sendPhoto(userId, msgData.fileId, { caption: msgData.caption ? `📢 ${msgData.caption}` : undefined, parse_mode: 'HTML' });
                            } else if (msgData.type === 'video') {
                                sentMsg = await ctx.telegram.sendVideo(userId, msgData.fileId, { caption: msgData.caption ? `📢 ${msgData.caption}` : undefined, parse_mode: 'HTML' });
                            }
                            if (sentMsg) {
                                users[i].lastBroadcastMsgId = sentMsg.message_id;
                                await users[i].save();
                            }
                            success++;
                        } catch (e) {
                            failed++;
                        }
                        
                        // Add small 40ms delay to avoid Telegram 429 Too Many Requests error
                        await new Promise(r => setTimeout(r, 40));

                        // Update progress every 50 users to avoid Telegram Too Many Requests on editMessageText
                        if (i % 50 === 0 && i > 0) {
                            try { await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, null, `🚀 Yuborilmoqda... ${i}/${users.length}`); } catch (e) { }
                        }
                    }

                    try {
                        await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, null, `✅ <b>Tugatildi!</b>\n\n✅ Muvaffaqiyatli: ${success}\n❌ Xatolik: ${failed}`, { parse_mode: 'HTML' });
                    } catch (e) { }
                })();

                return ctx.scene.leave();
            }
        } catch (e) {
            logger.error('Broadcast execute error:', e);
            ctx.reply('❌ Xatolik yuz berdi.').catch(() => { });
            return ctx.scene.leave();
        }
    }
);

export default broadcastScene;
