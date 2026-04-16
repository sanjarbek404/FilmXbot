import { Telegraf, Scenes, session } from 'telegraf';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { authMiddleware } from './middleware.js';
import addMovieScene from '../scenes/addMovieScene.js';
import bulkAddMovieScene from '../scenes/bulkAddMovieScene.js';
import broadcastScene from '../scenes/broadcastScene.js';
import vipScene from '../scenes/vipScene.js';
import reviewScene from '../scenes/reviewScene.js';
import requestScene from '../scenes/requestScene.js';
import reportScene from '../scenes/reportScene.js';
import promoWizard from '../scenes/promoScene.js';
import redeemSchema from '../scenes/promoRedeemScene.js';
import editMovieScene from '../scenes/editMovieScene.js';
import autoPostSettingsScene from '../scenes/autoPostSettingsScene.js';
import mandatorySubscriptionScene from '../scenes/mandatorySubscriptionScene.js';
import userProfileScene from '../scenes/userProfileScene.js';
import globalVipScene from '../scenes/globalVipScene.js';
import directMessageScene from '../scenes/directMessageScene.js';
import startGifScene from '../scenes/startGifScene.js';
import addFavCodeScene from '../scenes/addFavCodeScene.js';
import paymentReceiptScene from '../scenes/paymentReceiptScene.js';
import { setupAdminCommands } from '../commands/admin.js';
import { setupStartCommand } from '../commands/start.js';
import { setupUserCommands } from '../commands/user.js';
import { setupCategoryCommands, setupInlineSearch } from '../commands/category.js';
import { setupChannelGuard } from '../handlers/channelGuard.js';
import { initVipScheduler } from '../services/vipScheduler.js';

// Setup Scenes
const stage = new Scenes.Stage([
    addMovieScene, 
    bulkAddMovieScene,
    broadcastScene, 
    vipScene, 
    reviewScene, 
    requestScene, 
    reportScene, 
    promoWizard, 
    redeemSchema, 
    editMovieScene, 
    autoPostSettingsScene, 
    mandatorySubscriptionScene,
    userProfileScene,
    globalVipScene,
    directMessageScene,
    startGifScene,
    addFavCodeScene,
    paymentReceiptScene
]);

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session());
// Custom middleware
bot.use(authMiddleware);

bot.use(stage.middleware());

// Setup Commands
setupAdminCommands(bot);
setupStartCommand(bot);
setupCategoryCommands(bot);
setupUserCommands(bot); // User commands should be last (has text handler)
setupInlineSearch(bot);
setupChannelGuard(bot);

// Initialize VIP Expiration Scheduler
initVipScheduler(bot);

    // Check Subscription moved exclusively to start.js to run with proper Delete Message!

// Error handling
bot.catch((err, ctx) => {
    logger.error(`Ooops, encountered an error for ${ctx.updateType}`, err);
    ctx.reply("❌ Xatolik yuz berdi. Iltimos keyinroq urinib ko'ring.");
});

export default bot;
