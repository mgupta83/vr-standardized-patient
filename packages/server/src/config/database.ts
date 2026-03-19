import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { seedScenarios } from './seed.js';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('✅ MongoDB connected:', config.mongodbUri);
    await seedScenarios();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});
