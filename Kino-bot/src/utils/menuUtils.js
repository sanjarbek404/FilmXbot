import { Markup } from 'telegraf';
import { getUserByTelegramId } from '../services/userService.js';
import logger from './logger.js';

export const sendMainMenu = async (ctx) => {
    try {
        // Fetch fresh user data from CACHE (drastically faster)
        const user = await getUserByTelegramId(ctx.from.id);
        const isVip = user && user.vipUntil && new Date(user.vipUntil) > new Date();

        // Store fresh user in session
        if (user) ctx.session.user = user;

        // Define simple and professional buttons
        const defaultWebAppUrl = 'https://filmxbot-demo.onrender.com/webapp'; // Default public facing url for local tests
        const webAppUrl = process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/webapp` : defaultWebAppUrl;
        
        let menu = [
            [Markup.button.webApp('🌐 Kinolar Katalogi', webAppUrl)],
            [ctx.t('menu_search'), ctx.t('menu_cabinet')],
            [ctx.t('menu_random')]
        ];

        // Welcome message with VIP status
        let welcomeMsg = ctx.t('welcome', { name: ctx.from.first_name });
        if (isVip) {
            const daysLeft = Math.ceil((new Date(user.vipUntil) - new Date()) / (1000 * 60 * 60 * 24));
            welcomeMsg += `\n\n💎 <b>VIP Status:</b> Aktiv (${daysLeft} kun qoldi)`;
        }

        await ctx.reply(welcomeMsg, {
            parse_mode: 'HTML',
            ...Markup.keyboard(menu).resize()
        });
    } catch (error) {
        logger.error('Send Main Menu Error:', error);
        ctx.reply(ctx.t('error_general'));
    }
};
