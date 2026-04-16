import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';
import Config from '../models/Config.js';

const autoPostSettingsScene = new Scenes.WizardScene(
    'AUTO_POST_SETTINGS_SCENE',
    // Step 1: Show Current Status & Menu
    async (ctx) => {
        const channelIdConfig = await Config.findOne({ key: 'CHANNEL_ID' });
        const isEnabledConfig = await Config.findOne({ key: 'AUTO_POST_ENABLED' });

        const channelId = channelIdConfig ? channelIdConfig.value : 'Mavjud emas';
        const isEnabled = isEnabledConfig ? isEnabledConfig.value : false;

        ctx.wizard.state.channelId = channelId;
        ctx.wizard.state.isEnabled = isEnabled;

        const statusIcon = isEnabled ? '✅ Yoqilgan' : '🔴 O\'chirilgan';
        const msg = `📢 <b>Avto-Post Sozlamalari</b>\n\n` +
            `📊 Holat: <b>${statusIcon}</b>\n` +
            `🆔 Kanal: <b>${channelId}</b>\n\n` +
            `<i>O'zgartirish uchun tugmalardan foydalaning:</i>`;

        await ctx.reply(msg, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(isEnabled ? '🔴 O\'chirish' : '✅ Yoqish', 'toggle_autopost')],
                [Markup.button.callback('📝 Kanalni o\'zgartirish', 'set_channel')],
                [Markup.button.callback('❌ Chiqish', 'exit_settings')]
            ])
        });
        return ctx.wizard.next();
    },
    // Step 2: Handle Actions
    async (ctx) => {
        // Router for callbacks. Logic is in action handlers.
        // If user sends text instead of clicking, ignore or guide.
        if (ctx.message) {
            // Check if we are waiting for channel input (set via state in action)
            if (ctx.wizard.state.waitingForChannel) {
                let input = ctx.message.text.trim();

                // 1. Extract username from link if present
                // Matches t.me/username or telegram.me/username
                const linkMatch = input.match(/(?:t|telegram)\.me\/([a-zA-Z0-9_]+)/);
                if (linkMatch) {
                    input = '@' + linkMatch[1];
                } else if (!input.startsWith('-100') && !input.startsWith('@')) {
                    // Try to assume username if valid chars
                    if (/^[a-zA-Z0-9_]{5,}$/.test(input)) {
                        input = '@' + input;
                    } else {
                        return ctx.reply('⚠️ Noto\'g\'ri format. Kanal ID (-100...), Username (@...) yoki Link (t.me/...) kiriting.');
                    }
                }

                // 2. Verify Channel Access
                try {
                    const chat = await ctx.telegram.getChat(input);
                    // Check if it's a channel or group
                    if (chat.type !== 'channel' && chat.type !== 'supergroup') {
                        return ctx.reply('⚠️ Bu kanal yoki guruh emas.');
                    }

                    const finalId = chat.id.toString();

                    await Config.findOneAndUpdate({ key: 'CHANNEL_ID' }, { value: finalId }, { upsert: true });
                    process.env.CHANNEL_ID = finalId;

                    await ctx.reply(`✅ <b>Kanal muvaffaqiyatli ulandi!</b>\n\n🆔 ID: <code>${finalId}</code>\n📝 Nomi: ${chat.title}\n\n<i>Bot kanalga admin ekanligiga ishonch hosil qiling!</i>`, { parse_mode: 'HTML' });

                    ctx.wizard.state.waitingForChannel = false;
                    ctx.wizard.selectStep(0);
                    return ctx.wizard.steps[0](ctx);

                } catch (e) {
                    logger.error('Channel verify error:', e);
                    return ctx.reply('❌ <b>Kanal topilmadi yoki bot admin emas.</b>\n\n1. Kanal usernamesini to\'g\'ri yozing.\n2. Botni kanalga ADMIN qiling.\n3. Qayta urinib ko\'ring.', { parse_mode: 'HTML' });
                }
            }
        }
    }
);

// ACTIONS

autoPostSettingsScene.action('toggle_autopost', async (ctx) => {
    try {
        const current = ctx.wizard.state.isEnabled;
        const newState = !current;

        await Config.findOneAndUpdate({ key: 'AUTO_POST_ENABLED' }, { value: newState }, { upsert: true });
        ctx.wizard.state.isEnabled = newState; // Update local state for next render

        await ctx.answerCbQuery(newState ? '✅ Yoqildi' : '🔴 O\'chirildi');

        // Refresh menu
        ctx.wizard.selectStep(0);
        return ctx.wizard.steps[0](ctx);
    } catch (e) {
        logger.error('Auto post settings error:', e);
        ctx.scene.leave();
    }
});

autoPostSettingsScene.action('set_channel', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('📝 <b>Yangi Kanal Linki, IDsi yoki Usernameni kiriting:</b>\n\nMasalan:\n• <code>t.me/meningkanalim</code>\n• <code>@meningkanalim</code>\n• <code>-1001234567890</code>', { parse_mode: 'HTML' });
    ctx.wizard.state.waitingForChannel = true;
    // Stay in Step 2 to receive text
});

autoPostSettingsScene.action('exit_settings', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('✅ Sozlamalar saqlandi.');
    return ctx.scene.leave();
});

export default autoPostSettingsScene;
