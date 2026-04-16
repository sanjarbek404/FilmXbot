import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import dns from 'dns';

// Bazi mahalliy internet provayderlar (masalan Uztelecom) MongoDB domenlarini to'sishi oqibatida 
// kelib chiquvchi DNS (ENOTFOUND) xatosini mutlaqo aylanib o'tish uchun Google DNS dan foydalanamiz
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    logger.info(`MongoDB Connected`);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    throw error;
  }
};

export default connectDB;
