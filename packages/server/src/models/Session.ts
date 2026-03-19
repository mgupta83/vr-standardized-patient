import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  scenarioId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  feedback?: string;
}

const sessionSchema = new Schema<ISession>(
  {
    scenarioId: { type: Schema.Types.ObjectId, ref: 'Scenario', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    score: { type: Number, min: 0, max: 100 },
    feedback: { type: String },
  },
  { timestamps: true },
);

sessionSchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Session = mongoose.model<ISession>('Session', sessionSchema);
