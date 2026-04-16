import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';
import Channel from '../models/Channel.js';

const mandatorySubscriptionScene = new Scenes.WizardScene(
    'MANDATORY_SUBSCRIPTION_SCENE',
    // Step 1: Show current channels and ask for new link
    async (ctx) => {
        try {
            const channels = await Channel.find({});

            let msg = '📢 <b>Majburiy Obuna Sozlamalari</b>\n\n';

            if (channels.length > 0) {
                msg += '<b>Hozirgi kanallar:</b>\n';
                channels.forEach((ch, i) => {
                    msg += `${i + 1}. ${ch.name} (${ch.channelId})\n`;
                });
                msg += '\n';
            } else {
                msg += '⚠️ Hozircha hech qanday kanal qo\'shilmagan.\n\n';
            }

            msg += '<i>Yangi kanal qo\'shish uchun kanal linkini yuboring:</i>\n';
            msg += 'Masalan: <code>t.me/meningkanalim</code> yoki <code>@meningkanalim</code>';

            await ctx.reply(msg, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🗑 Barcha kanallarni o\'chirish', 'clear_channels')],
                    [Markup.button.callback('❌ Chiqish', 'exit_subscription')]
                ])
            });
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Manda sub scene error:', e);
            ctx.reply('❌ Xatolik yuz berdi.');
            return ctx.scene.leave();
        }
    },
    // Step 2: Handle channel link input
    async (ctx) => {
        if (!ctx.message?.text) return;

        let input = ctx.message.text.trim();

        // Extract username from link if present
        const linkMatch = input.match(/(?:t|telegram)\.me\/([a-zA-Z0-9_]+)/);
        if (linkMatch) {
            input = '@' + linkMatch[1];
        } else if (!input.startsWith('-100') && !input.startsWith('@')) {
            // Try to assume username if valid chars
            if (/^[a-zA-Z0-9_]{5,}$/.test(input)) {
                input = '@' + input;
            } else {
                return ctx.reply('⚠️ Noto\'g\'ri format. Kanal linki, ID yoki Username kiriting.');
            }
        }

        // Verify Channel Access
        try {
            const chat = await ctx.telegram.getChat(input);

            if (chat.type !== 'channel' && chat.type !== 'supergroup') {
                return ctx.reply('⚠️ Bu kanal yoki guruh emas. Qaytadan urinib ko\'ring.');
            }

            const channelId = chat.id.toString();

            // Check if already exists
            const existing = await Channel.findOne({ channelId });
            if (existing) {
                return ctx.reply('⚠️ Bu kanal allaqachon qo\'shilgan.');
            }

            // Get invite link if public, or use provided link
            let inviteLink = '';
            if (chat.username) {
                inviteLink = `https://t.me/${chat.username}`;
            } else {
                // For private channels, try to get invite link (bot must be admin)
                try {
                    inviteLink = await ctx.telegram.exportChatInviteLink(channelId);
                } catch {
                    inviteLink = 'Private Channel';
                }
            }

            // Save to database
            await Channel.create({
                channelId: channelId,
                name: chat.title,
                inviteLink: inviteLink,
                addedBy: ctx.from.id.toString()
            });

            await ctx.reply(`✅ <b>Kanal muvaffaqiyatli qo'shildi!</b>\n\n📛 Nomi: ${chat.title}\n🆔 ID: <code>${channelId}</code>\n🔗 Link: ${inviteLink}\n\n<i>Endi foydalanuvchilar botdan foydalanish uchun bu kanalga obuna bo'lishlari kerak.</i>`, { parse_mode: 'HTML' });

            // Return to step 1 to show updated list
            ctx.wizard.selectStep(0);
            return ctx.wizard.steps[0](ctx);

        } catch (e) {
            logger.error('Channel add error:', e);
            return ctx.reply('❌ <b>Kanal topilmadi yoki bot admin emas.</b>\n\n1. Kanal usernamesini to\'g\'ri yozing.\n2. Botni kanalga ADMIN qiling.\n3. Qayta urinib ko\'ring.', { parse_mode: 'HTML' });
        }
    }
);

// ACTIONS

mandatorySubscriptionScene.action('clear_channels', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        await Channel.deleteMany({});
        await ctx.editMessageText('✅ Barcha kanallar o\'chirildi. Majburiy obuna o\'chirildi.');
        return ctx.scene.leave();
    } catch (e) {
        logger.error('Clear channels error:', e);
        ctx.reply('❌ Xatolik');
    }
});

mandatorySubscriptionScene.action('exit_subscription', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('✅ Sozlamalar saqlandi.');
    return ctx.scene.leave();
});

export default mandatorySubscriptionScene;
