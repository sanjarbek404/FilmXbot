import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    telegramId: {
        type: Number,
        required: true,
        unique: true,
    },
    firstName: String,
    username: String,
    isBanned: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    vipUntil: {
        type: Date,
        default: null,
    },
    vipAddedBy: {
        type: String, // Admin ID or 'admin'
        default: null,
    },
    vipAddedAt: {
        type: Date,
        default: null,
    },
    moviesWatched: {
        type: Number,
        default: 0
    },
    totalComments: {
        type: Number,
        default: 0
    },
    downloadsCount: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'superadmin'],
        default: 'user'
    },
    language: {
        type: String,
        enum: ['uz', 'ru', 'en'],
        default: null
    },
    dailyMovieCount: {
        type: Number,
        default: 0
    },
    lastMovieDate: {
        type: Date,
        default: null
    },
    watchHistory: [{
        movie: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Movie'
        },
        watchedAt: {
            type: Date,
            default: Date.now
        }
    }],
    points: {
        type: Number,
        default: 0
    },
    lastDailyBonus: {
        type: Date,
        default: null
    },
    referralCount: {
        type: Number,
        default: 0
    },
    invitedBy: {
        type: String, // Telegram ID of referrer
        default: null
    },
    lastBroadcastMsgId: {
        type: Number,
        default: null
    }
});

const User = mongoose.model('User', userSchema);

User.collection.createIndex({ telegramId: 1 }).catch(()=>{});
User.collection.createIndex({ points: -1 }).catch(()=>{});
User.collection.createIndex({ moviesWatched: -1 }).catch(()=>{});

export default User;
