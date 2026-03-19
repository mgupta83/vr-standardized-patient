import mongoose, { Document, Schema } from 'mongoose';

export interface IScenario extends Document {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes: number;
  tags: string[];
  patientProfile: {
    name: string;
    age: number;
    gender: string;
    chiefComplaint: string;
    history: string;
    vitalSigns: {
      heartRate: number;
      bloodPressure: { systolic: number; diastolic: number };
      respiratoryRate: number;
      temperature: number;
      oxygenSaturation: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const scenarioSchema = new Schema<IScenario>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    durationMinutes: { type: Number, required: true, min: 1 },
    tags: [{ type: String }],
    patientProfile: {
      name: { type: String, required: true },
      age: { type: Number, required: true },
      gender: { type: String, required: true },
      chiefComplaint: { type: String, required: true },
      history: { type: String, required: true },
      vitalSigns: {
        heartRate: { type: Number, required: true },
        bloodPressure: {
          systolic: { type: Number, required: true },
          diastolic: { type: Number, required: true },
        },
        respiratoryRate: { type: Number, required: true },
        temperature: { type: Number, required: true },
        oxygenSaturation: { type: Number, required: true },
      },
    },
  },
  { timestamps: true },
);

scenarioSchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Scenario = mongoose.model<IScenario>('Scenario', scenarioSchema);
