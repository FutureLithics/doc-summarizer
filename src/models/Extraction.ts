import mongoose, { Schema, Document } from 'mongoose';

export interface IExtraction extends Document {
  status: 'completed' | 'processing' | 'failed';
  fileName: string;
  documentType: string;
  summary?: string;
  originalText?: string;
  createdAt: string;
}

const ExtractionSchema: Schema = new Schema({
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