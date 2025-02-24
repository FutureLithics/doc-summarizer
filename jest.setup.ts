import mongoose from 'mongoose';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  await mongoose.connection.close();
}); 