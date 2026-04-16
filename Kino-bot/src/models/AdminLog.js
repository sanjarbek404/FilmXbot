import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema({
    adminId: {
        type: String,
        required: true
    },
    action: {
        type: String, // e.g., 'ban_user', 'add_vip', 'delete_movie'
        required: true
    },
    targetId: {
        type: String // Affected user ID or movie code
    },
    details: {
        type: String // Extra info, e.g., duration of VIP, reason
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const AdminLog = mongoose.model('AdminLog', adminLogSchema);

export default AdminLog;
