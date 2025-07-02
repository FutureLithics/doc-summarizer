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

// Add indexes for better query performance
organizationSchema.index({ name: 1 });
organizationSchema.index({ createdAt: -1 });

const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);

export default Organization;