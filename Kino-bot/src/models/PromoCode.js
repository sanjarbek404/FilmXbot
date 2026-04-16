import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    usageLimit: {
        type: Number,
        required: true,
        default: 1
    },
    usedBy: [{
        type: String // Telegram IDs
    }],
    rewardDays: {
        type: Number,
        default: 1
    },
    expiryDate: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: String, // Admin ID
        required: true
    }
});

// Virtual for is valid
promoCodeSchema.virtual('isValid').get(function () {
    const isExpired = this.expiryDate && new Date() > this.expiryDate;
    const isLimitReached = this.usedBy.length >= this.usageLimit;
    return !isExpired && !isLimitReached;
});

export default mongoose.model('PromoCode', promoCodeSchema);
