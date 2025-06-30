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
    
    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    
    if (existingSuperAdmin) {
      console.log(`✅ Superadmin already exists: ${existingSuperAdmin.email}`);
    } else {
      // Create superadmin user
      const superAdmin = new User({
        email: 'superadmin@docextract.com',
        password: 'superadmin123',
        role: 'superadmin'
      });

      await superAdmin.save();
      console.log('✅ Created superadmin user: superadmin@docextract.com');
      console.log('   Default password: superadmin123');
      console.log('   ⚠️  Change password after first login!');
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log(`✅ Admin already exists: ${existingAdmin.email}`);
    } else {
      // Create admin user
      const admin = new User({
        email: 'admin@docextract.com',
        password: 'admin123',
        role: 'admin'
      });

      await admin.save();
      console.log('✅ Created admin user: admin@docextract.com');
      console.log('   Default password: admin123');
      console.log('   ⚠️  Change password after first login!');
    }

    // Check if regular user already exists
    const existingUser = await User.findOne({ role: 'user' });
    
    if (existingUser) {
      console.log(`✅ Regular user already exists: ${existingUser.email}`);
    } else {
      // Create regular user
      const user = new User({
        email: 'user@docextract.com',
        password: 'user123',
        role: 'user'
      });

      await user.save();
      console.log('✅ Created regular user: user@docextract.com');
      console.log('   Default password: user123');
      console.log('   ⚠️  Change password after first login!');
    }

    const userCount = await User.countDocuments();
    console.log(`\n📊 Total users in database: ${userCount}`);
    console.log('\n🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
};

// Run seeder if this file is executed directly
if (require.main === module) {
  seedDatabase().then(() => {
    mongoose.connection.close();
    process.exit(0);
  });
} 