import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';
import { createMovie } from '../services/movieService.js';
import Movie from '../models/Movie.js';
import Config from '../models/Config.js';

// Auto-generate unique movie code
const generateMovieCode = async () => {
    try {
        const lastMovie = await Movie.findOne().sort({ code: -1 });
        return lastMovie ? lastMovie.code + 1 : 1001;
    } catch (e) {
        return Math.floor(Math.random() * 9000) + 1000;
    }
};

const addMovieScene = new Scenes.WizardScene(
    'ADD_MOVIE_SCENE',
    // Step 1: Ask for title
    async (ctx) => {
        try {
            const nextCode = await generateMovieCode();
            ctx.wizard.state.autoCode = nextCode;

            await ctx.reply(`🎬 <b>Kino qo'shish</b>\n\n📝 Kino nomini kiriting:\n\n<i>Kino kodi avtomatik: <code>${nextCode}</code></i>`, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('❌ Bekor qilish', 'cancel_add')]
                ])
            });
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Add movie step 1 error:', e);
            await ctx.reply('❌ Xatolik yuz berdi.').catch(() => { });
            return ctx.scene.leave();
        }
    },
    // Step 2: Ask for Year
    async (ctx) => {
        try {
            if (!ctx.message?.text) return ctx.reply('⚠️ Iltimos, matn kiriting.');
            ctx.wizard.state.title = ctx.message.text;
            await ctx.reply('📅 Kino yilini kiriting (masalan: 2024):');
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Add movie step 2 error:', e);
            return ctx.scene.leave();
        }
    },
    // Step 3: Ask for Genre
    async (ctx) => {
        try {
            if (!ctx.message?.text) return ctx.reply('⚠️ Iltimos, yilni kiriting.');
            const year = parseInt(ctx.message.text);
            if (isNaN(year) || year < 1900 || year > 2030) {
                return ctx.reply('⚠️ Noto\'g\'ri yil. Qaytadan kiriting (1900-2030):');
            }
            ctx.wizard.state.year = year;

            await ctx.reply('🎭 Janrni tanlang:', Markup.inlineKeyboard([
                [Markup.button.callback('🥋 Jangari', 'genre_Jangari'), Markup.button.callback('😂 Komediya', 'genre_Komediya')],
                [Markup.button.callback('🎭 Drama', 'genre_Drama'), Markup.button.callback('🚀 Fantastika', 'genre_Fantastika')],
                [Markup.button.callback('👻 Dahshatli', 'genre_Dahshatli'), Markup.button.callback('🌍 Sarguzasht', 'genre_Sarguzasht')],
                [Markup.button.callback('💕 Romantik', 'genre_Romantik'), Markup.button.callback('🎬 Boshqa', 'genre_Boshqa')]
            ]));
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Add movie step 3 error:', e);
            return ctx.scene.leave();
        }
    },
    // Step 4: Wait for genre selection
    async (ctx) => {
        try {
            if (ctx.message?.text) {
                ctx.wizard.state.genre = ctx.message.text;
                await ctx.reply('📝 Kino haqida qisqacha tavsif kiriting:');
                return ctx.wizard.next();
            }
        } catch (e) {
            logger.error('Add movie step 4 error:', e);
        }
    },
    // Step 5: Ask for video
    async (ctx) => {
        try {
            if (!ctx.message?.text) return ctx.reply('⚠️ Iltimos, tavsif kiriting.');
            ctx.wizard.state.description = ctx.message.text;
            await ctx.reply('📥 Kino videosini yuboring:\n\n<i>Video fayl yoki havola yuborishingiz mumkin</i>', { parse_mode: 'HTML' });
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Add movie step 5 error:', e);
            return ctx.scene.leave();
        }
    },
    // Step 6: Ask for poster
    async (ctx) => {
        try {
            if (ctx.message?.video) {
                ctx.wizard.state.fileId = ctx.message.video.file_id;
            } else if (ctx.message?.document) {
                ctx.wizard.state.fileId = ctx.message.document.file_id;
            } else if (ctx.message?.text) {
                ctx.wizard.state.link = ctx.message.text;
            } else {
                return ctx.reply('⚠️ Iltimos, video yoki havola yuboring.');
            }

            await ctx.reply('🖼️ Kino posterini (rasm) yuboring:');
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Add movie step 6 error:', e);
            return ctx.scene.leave();
        }
    },
    // Step 7: Ask for Restriction
    async (ctx) => {
        try {
            if (!ctx.message?.photo) {
                return ctx.reply('⚠️ Iltimos, rasm yuboring.');
            }

            // Get highest resolution photo
            ctx.wizard.state.poster = ctx.message.photo[ctx.message.photo.length - 1].file_id;

            await ctx.reply('🔒 <b>VIP Himoyasi:</b>\n\nBu kino VIP foydalanuvchilar tomonidan yuklab olinishi mumkinmi, yoki qat\'iy himoyalansinmi (hech kim yuklay olmaydi)?', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔓 Standart (VIP yuklay oladi)', 'restrict_false')],
                    [Markup.button.callback('🔐 Qat\'iy himoya (Faqat ko\'rish)', 'restrict_true')],
                    [Markup.button.callback('❌ Bekor qilish', 'cancel_add')]
                ])
            });
            return ctx.wizard.next();

        } catch (e) {
            logger.error('Add movie step 7 error:', e);
            return ctx.scene.leave();
        }
    },
    // Step 8: Save
    async (ctx) => {
        try {
            if (ctx.callbackQuery) {
                ctx.wizard.state.isRestricted = ctx.callbackQuery.data === 'restrict_true';
                await ctx.answerCbQuery().catch(() => { });
            }

            const movieData = {
                title: ctx.wizard.state.title,
                code: ctx.wizard.state.autoCode,
                year: ctx.wizard.state.year,
                genre: ctx.wizard.state.genre || 'Boshqa',
                description: ctx.wizard.state.description,
                fileId: ctx.wizard.state.fileId,
                link: ctx.wizard.state.link,
                poster: ctx.wizard.state.poster,
                isRestricted: ctx.wizard.state.isRestricted || false
            };

            const movie = await createMovie(movieData);

            // Success msg to Admin with looping button
            await ctx.replyWithPhoto(movie.poster, {
                caption: `✅ <b>Kino muvaffaqiyatli saqlandi!</b>\n\n🎬 Nom: ${movie.title}\n📅 Yil: ${movie.year}\n🎭 Janr: ${movie.genre}\n🔢 Kod: <code>${movie.code}</code>\n🔒 VIP Himoya: ${movie.isRestricted ? "Qat'iy" : "Standart"}\n\n<i>Kino kanalga va barcha foydalanuvchilarga yuborilmoqda...</i>`,
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('➕ Yana Kino Qo\'shish', 'add_another_movie')],
                    [Markup.button.callback('🏠 Menyuga qaytish', 'cancel_add')]
                ])
            });

            // 🚀 AUTO BROADCAST TO ALL USERS
            const users = await import('../models/User.js').then(m => m.default.find({ isBanned: false }));
            if (users) {
                const userCaption = `✨ <b>Bazamizga yangi kino qo'shildi!</b>\n\n🎬 <b>Nomi:</b> ${movie.title}\n📅 <b>Yili:</b> ${movie.year}\n🎭 <b>Janri:</b> ${movie.genre}\n\n📝 <b>Tavsif:</b> ${movie.description}\n\n📥 <b>Ko'rish siri (Kino kodi):</b> <code>${movie.code}</code>`;
                
                (async () => {
                    for (let i = 0; i < users.length; i++) {
                        const uid = users[i].telegramId;
                        try {
                            await ctx.telegram.sendPhoto(uid, movie.poster, {
                                caption: userCaption,
                                parse_mode: 'HTML',
                                ...Markup.inlineKeyboard([[Markup.button.url('📥 Kinoni Ko\'rish', `https://t.me/${ctx.botInfo.username}?start=${movie.code}`)]])
                            });
                        } catch (e) { }
                        await new Promise(r => setTimeout(r, 40));
                    }
                })();
            }

            // 📡 AUTO POST TO CHANNEL
            const autoPostConfig = await Config.findOne({ key: 'AUTO_POST_ENABLED' });
            const channelIdConfig = await Config.findOne({ key: 'CHANNEL_ID' });

            const isAutoPostEnabled = autoPostConfig ? autoPostConfig.value : false;
            const targetChannelId = (channelIdConfig && channelIdConfig.value) ? channelIdConfig.value : process.env.CHANNEL_ID;

            if (isAutoPostEnabled && targetChannelId) {
                try {
                    const channelCaption = `🎬 <b>${movie.title}</b>\n\n📅 <b>Yili:</b> ${movie.year}\n🎭 <b>Janri:</b> ${movie.genre}\n💿 <b>Sifati:</b> 720p HD\n\n📝 <b>Tavsif:</b> ${movie.description}\n\n📥 <b>Kino kodi:</b> <code>${movie.code}</code>\n\n🤖 <b>Botga o'tish:</b> @${ctx.botInfo.username}`;

                    await ctx.telegram.sendPhoto(targetChannelId, movie.poster, {
                        caption: channelCaption,
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard([[Markup.button.url('📥 Kinoni Yuklash', `https://t.me/${ctx.botInfo.username}?start=${movie.code}`)]])
                    });
                    await ctx.reply('✅ <b>Kanalga avto-post joylandi!</b>', { parse_mode: 'HTML' });
                } catch (chErr) {
                    await ctx.reply('⚠️ Kanalga post joylashda xatolik: ' + chErr.message);
                }
            }

            return; // Wait for admin action
        } catch (err) {
            logger.error('Save movie error:', err);
            await ctx.reply('❌ Saqlashda xatolik yuz berdi.').catch(() => { });
            return ctx.scene.leave();
        }
    }
);

// Genre selection handler
addMovieScene.action(/genre_(.+)/, async (ctx) => {
    try {
        const genre = ctx.match[1];
        ctx.wizard.state.genre = genre;
        await ctx.answerCbQuery(`${genre} tanlandi`);
        await ctx.editMessageText(`🎭 Janr: ${genre}\n\n📝 Kino haqida qisqacha tavsif kiriting:`);
        ctx.wizard.selectStep(4);
    } catch (e) {
        logger.error('Genre action error:', e);
    }
});

// Auto Add Another handler
addMovieScene.action('add_another_movie', async (ctx) => {
    try {
        await ctx.answerCbQuery().catch(()=>{});
        
        ctx.wizard.state = {}; // Tizimni tozalash
        
        // Random raqamni topish
        let nextCode;
        try {
            const lastMovie = await import('../models/Movie.js').then(m => m.default.findOne().sort({ code: -1 }));
            nextCode = lastMovie ? lastMovie.code + 1 : 1001;
        } catch (e) {
            nextCode = Math.floor(Math.random() * 9000) + 1000;
        }
        ctx.wizard.state.autoCode = nextCode;
        
        await ctx.reply(`🎬 <b>Kino qo'shish jarayoni yana davom etmoqda:</b>\n\n📝 Navbatdagi kino nomini kiriting:\n\n<i>Kino kodi avtomatik: <code>${nextCode}</code></i>`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('❌ Bekor qilish', 'cancel_add')]
            ])
        });
        
        ctx.wizard.selectStep(1); 
    } catch (e) {
        logger.error('add_another action:', e);
    }
});

addMovieScene.action('cancel_add', async (ctx) => {
    try {
        await ctx.editMessageText('❌ Kino qo\'shish bekor qilindi.');
        return ctx.scene.leave();
    } catch (e) {
        return ctx.scene.leave();
    }
});

addMovieScene.command('cancel', async (ctx) => {
    try {
        await ctx.reply('❌ Kino qo\'shish bekor qilindi.');
        return ctx.scene.leave();
    } catch (e) {
        return ctx.scene.leave();
    }
});

export default addMovieScene;
