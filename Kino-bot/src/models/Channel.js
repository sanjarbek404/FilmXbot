import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
    channelId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    inviteLink: {
        type: String,
        required: true
    },
    addedBy: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Channel = mongoose.model('Channel', channelSchema);
export default Channel;
