import { Scenes, Markup } from 'telegraf';
import PromoCode from '../models/PromoCode.js';

const promoWizard = new Scenes.WizardScene(
    'PROMO_WIZARD_SCENE',
    // Step 1: Ask for Code Name
    (ctx) => {
        ctx.reply('🎫 <b>Promokod nomini kiriting:</b>\n\nMasalan: <code>YANGIYIL2025</code>', {
            parse_mode: 'HTML',
            ...Markup.keyboard([['❌ Bekor qilish']]).resize()
        });
        return ctx.wizard.next();
    },
    // Step 2: Ask for Usage Limit
    (ctx) => {
        if (ctx.message.text === '❌ Bekor qilish') {
            ctx.reply('Bekor qilindi.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.code = ctx.message.text.toUpperCase().trim();
        ctx.reply('🔢 <b>Nechta odam ishlata oladi?</b>\n\nMasalan: <code>50</code>', { parse_mode: 'HTML' });
        return ctx.wizard.next();
    },
    // Step 3: Ask for Reward Days
    (ctx) => {
        if (ctx.message.text === '❌ Bekor qilish') return ctx.scene.leave();

        const limit = parseInt(ctx.message.text);
        if (isNaN(limit) || limit <= 0) {
            return ctx.reply('⚠️ Iltimos, to\'g\'ri raqam kiriting.');
        }

        ctx.wizard.state.limit = limit;
        ctx.reply('💎 <b>Necha kunlik VIP berilsin?</b>\n\nMasalan: <code>3</code> (kun)', { parse_mode: 'HTML' });
        return ctx.wizard.next();
    },
    // Step 4: Finalize
    async (ctx) => {
        if (ctx.message.text === '❌ Bekor qilish') return ctx.scene.leave();

        const days = parseInt(ctx.message.text);
             if (isNaN(days) || days <= 0) {
                return ctx.reply('⚠️ Iltimos, to\'g\'ri raqam kiriting.');
             }

        try {
            await PromoCode.create({
                code: ctx.wizard.state.code,
                usageLimit: ctx.wizard.state.limit,
                rewardDays: days,
                createdBy: ctx.from.id.toString()
            });

            const msg = `✅ <b>Promokod yaratildi!</b>\n\n` +
                `🎫 Kod: <code>${ctx.wizard.state.code}</code>\n` +
                `👥 Limit: <b>${ctx.wizard.state.limit} ta</b>\n` +
                `💎 Mukofot: <b>${days} kun VIP</b>`;

            await ctx.reply(msg, { parse_mode: 'HTML', ...Markup.removeKeyboard() });
        } catch (e) {
            if (e.code === 11000) {
                ctx.reply('⚠️ Bu kod allaqachon mavjud!');
            } else {
                ctx.reply('❌ Xatolik yuz berdi.');
            }
        }
        return ctx.scene.leave();
    }
);

export default promoWizard;
