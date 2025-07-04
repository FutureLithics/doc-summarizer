// src/models/Extraction.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IExtraction extends Document {
  userId: mongoose.Types.ObjectId;
  sharedWith: mongoose.Types.ObjectId[];
  status: 'completed' | 'processing' | 'failed';
  fileName: string;
  documentType: string;
  summary?: string;
  originalText?: string;
  createdAt: string;
  updatedAt?: Date;
}

const ExtractionSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['completed', 'processing', 'failed'],
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    required: true
  },
  summary: String,
  originalText: String,
  createdAt: {
    type: String,
    default: () => new Date().toISOString()
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export default mongoose.model<IExtraction>('Extraction', ExtractionSchema);