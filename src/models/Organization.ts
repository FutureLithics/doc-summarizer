// src/models/Organization.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

export default mongoose.model<IOrganization>('Organization', organizationSchema);