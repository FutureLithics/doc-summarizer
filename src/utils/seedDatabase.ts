import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

// Load environment variables
dotenv.config();

export const seedAdminUser = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return existingAdmin;
    }

    // Create admin user
    const adminUser = new User({
      email: 'admin@docextract.com',
      password: 'admin123', // This will be hashed automatically
      role: 'admin'
    });

    await adminUser.save();
    console.log('Admin user created successfully:', adminUser.email);
    console.log('Admin credentials:');
    console.log('Email: admin@docextract.com');
    console.log('Password: admin123');
    console.log('Please change the password after first login!');
    
    return adminUser;
  } catch (error) {
    console.error('Error seeding admin user:', error);
    throw error;
  }
};

const connectToDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/document-extraction';
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');
    
    // Connect to database
    await connectToDatabase();
    
    // Seed admin user
    await seedAdminUser();
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seeder if this file is executed directly
if (require.main === module) {
  seedDatabase().then(() => {
    mongoose.connection.close();
    process.exit(0);
  });
} 