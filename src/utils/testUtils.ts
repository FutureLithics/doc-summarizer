import { Server } from 'http';
import mongoose from 'mongoose';
import { Express } from 'express';

export class TestServer {
  private server: Server | null = null;

  async start(app: Express): Promise<void> {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test-db');
    await new Promise<void>((resolve) => {
      this.server = app.listen(0, () => resolve());
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server?.close(() => resolve());
      });
      await mongoose.connection.close();
    }
  }
} 