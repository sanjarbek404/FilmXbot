import { Scenes, Markup } from 'telegraf';
import Movie from '../models/Movie.js';
import User from '../models/User.js';

const reviewScene = new Scenes.WizardScene(
    'REVIEW_SCENE',
    // Step 1: Rating
    async (ctx) => {
        try {
            const movieCode = ctx.wizard.state.movieCode;
            if (!movieCode) return ctx.scene.leave();

            const buttons = [
                [Markup.button.callback('⭐️ 1', 'rate_1'), Markup.button.callback('⭐️ 2', 'rate_2'), Markup.button.callback('⭐️ 3', 'rate_3')],
                [Markup.button.callback('⭐️ 4', 'rate_4'), Markup.button.callback('⭐️ 5', 'rate_5')],
                [Markup.button.callback(ctx.t('cancel') || '❌ Cancel', 'cancel_review')]
            ];

            await ctx.reply(ctx.t('review_rating_prompt'), {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
            return ctx.wizard.next();
        } catch (e) {
            return ctx.scene.leave();
        }
    },
    // Step 2: Comment
    async (ctx) => {
        try {
            if (ctx.callbackQuery) {
                if (ctx.callbackQuery.data === 'cancel_review') {
                    await ctx.answerCbQuery(ctx.t('cancel') || 'Cancelled');
                    await ctx.editMessageText(ctx.t('review_cancel'));
                    return ctx.scene.leave();
                }

                if (ctx.callbackQuery.data.startsWith('rate_')) {
                    const rating = parseInt(ctx.callbackQuery.data.split('_')[1]);
                    ctx.wizard.state.rating = rating;
                    await ctx.answerCbQuery();
                    await ctx.editMessageText(ctx.t('review_your_rating', { rating }), { parse_mode: 'HTML' });
                    return ctx.wizard.next();
                }
            }
            return; // Wait for valid callback
        } catch (e) {
            return ctx.scene.leave();
        }
    },
    // Step 3: Save
    async (ctx) => {
        try {
            if (!ctx.message || !ctx.message.text) {
                return ctx.reply(ctx.t('review_text_error'));
            }

            const comment = ctx.message.text;
            const rating = ctx.wizard.state.rating;
            const movieCode = ctx.wizard.state.movieCode;
            const userId = ctx.from.id;
            const userName = ctx.from.first_name || 'Foydalanuvchi';

            // Save to DB
            const movie = await Movie.findOne({ code: movieCode });
            if (movie) {
                movie.reviews.push({
                    userId,
                    userName,
                    rating,
                    comment,
                    date: new Date()
                });
                movie.ratingSum = (movie.ratingSum || 0) + rating;
                movie.ratingCount = (movie.ratingCount || 0) + 1;
                await movie.save();

                // Update User stats
                await User.findOneAndUpdate({ telegramId: userId }, { $inc: { totalComments: 1 } });

                await ctx.reply(ctx.t('review_success', { rating, comment }), { parse_mode: 'HTML' });
            } else {
                await ctx.reply(ctx.t('not_found'));
            }
            return ctx.scene.leave();
        } catch (e) {
            logger.error('Review Save error:', e);
            ctx.reply(ctx.t('error_general'));
            return ctx.scene.leave();
        }
    }
);

reviewScene.command('cancel', async (ctx) => {
    await ctx.reply(ctx.t('review_cancel'));
    return ctx.scene.leave();
});

export default reviewScene;
