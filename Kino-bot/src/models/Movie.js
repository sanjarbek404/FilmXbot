import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
    code: {
        type: Number,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: String,
    genre: String,
    year: Number,
    fileId: String, // Telegram file ID for video
    link: String,   // Optional download link
    poster: String, // Telegram file ID or URL for poster
    views: {
        type: Number,
        default: 0,
    },
    isRestricted: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // Review & Rating System
    reviews: [{
        userId: Number,
        userName: String,
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        date: { type: Date, default: Date.now }
    }],
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
});

// Indekslar ALBATTA model() dan OLDIN!
movieSchema.index({ title: 'text' });
movieSchema.index({ views: -1 });
movieSchema.index({ year: -1 });

// Virtual for average rating
movieSchema.virtual('averageRating').get(function () {
    if (this.ratingCount === 0) return 0;
    return (this.ratingSum / this.ratingCount).toFixed(1);
});

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;
