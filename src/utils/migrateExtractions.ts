import mongoose from 'mongoose';
import Extraction from '../models/Extraction';
import User from '../models/User';
import { config } from 'dotenv';

config();

async function migrateExtractions() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/docextract');
    console.log('Connected to MongoDB');

    // Find extractions without userId
    const extractionsWithoutUser = await Extraction.find({ userId: { $exists: false } });
    console.log(`Found ${extractionsWithoutUser.length} extractions without userId`);

    if (extractionsWithoutUser.length === 0) {
      console.log('No extractions need migration');
      return;
    }

    // Find or create a default superadmin user for these extractions
    let defaultUser = await User.findOne({ role: 'superadmin' });
    
    if (!defaultUser) {
      // Try to find an admin user instead
      defaultUser = await User.findOne({ role: 'admin' });
      
      if (!defaultUser) {
        console.log('No admin/superadmin user found, creating default superadmin...');
        defaultUser = new User({
          email: 'superadmin@docextract.com',
          password: 'superadmin123',
          role: 'superadmin'
        });
        await defaultUser.save();
        console.log('Created default superadmin user');
      } else {
        console.log('Using existing admin user for legacy extractions');
      }
    } else {
      console.log('Using existing superadmin user for legacy extractions');
    }

    // Update all extractions without userId to use the default admin user
    const result = await Extraction.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: defaultUser._id } }
    );

    console.log(`Updated ${result.modifiedCount} extractions with default userId`);
    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateExtractions();
}

export default migrateExtractions; 