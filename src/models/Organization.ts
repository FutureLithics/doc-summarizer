// src/models/Organization.ts
import mongoose, { Document, Schema } from 'mongoose';

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
    unique: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);

export default Organization;