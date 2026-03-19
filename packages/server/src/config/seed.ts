import { Scenario } from '../models/Scenario.js';

// ─── Sample scenarios ─────────────────────────────────────────────────────────

const SEED_SCENARIOS = [
  {
    title: 'Chest Pain – Acute Coronary Syndrome',
    description:
      '55-year-old male presenting with crushing chest pain radiating to the left arm. ' +
      'Practice cardiac assessment, 12-lead ECG interpretation, and initial ACS management.',
    difficulty: 'beginner' as const,
    durationMinutes: 15,
    tags: ['cardiology', 'emergency', 'acs', 'chest-pain'],
    patientProfile: {
      name: 'Robert Mitchell',
      age: 55,
      gender: 'Male',
      chiefComplaint: 'Crushing chest pain radiating to my left arm — started about 45 minutes ago.',
      history:
        'Hypertension (on lisinopril), hyperlipidemia, 20-pack-year smoker. ' +
        'Father had an MI at age 58. No prior cardiac events. Denies drug use.',
      vitalSigns: {
        heartRate: 98,
        bloodPressure: { systolic: 158, diastolic: 94 },
        respiratoryRate: 20,
        temperature: 37.1,
        oxygenSaturation: 96,
      },
    },
  },
  {
    title: 'Shortness of Breath – COPD Exacerbation',
    description:
      '68-year-old female with known COPD presenting with worsening dyspnea and productive cough ' +
      'for 3 days. Evaluate, initiate bronchodilators, and decide on escalation of care.',
    difficulty: 'intermediate' as const,
    durationMinutes: 20,
    tags: ['pulmonology', 'emergency', 'copd', 'dyspnea'],
    patientProfile: {
      name: 'Dorothy Evans',
      age: 68,
      gender: 'Female',
      chiefComplaint: "I can't catch my breath at all — it's been getting worse for 3 days and my sputum is yellow.",
      history:
        'COPD (GOLD Stage III), 40-pack-year smoking history, on home O₂ at 2 L/min and tiotropium inhaler. ' +
        'Prior intubation in 2019 during a severe exacerbation. Mild cor pulmonale on echo.',
      vitalSigns: {
        heartRate: 112,
        bloodPressure: { systolic: 142, diastolic: 88 },
        respiratoryRate: 28,
        temperature: 38.4,
        oxygenSaturation: 86,
      },
    },
  },
  {
    title: 'Abdominal Pain – Suspected Appendicitis',
    description:
      '22-year-old male with 18 hours of progressive right lower quadrant pain, nausea, and anorexia. ' +
      'Perform a focused abdominal exam, order appropriate imaging, and manage this surgical emergency.',
    difficulty: 'intermediate' as const,
    durationMinutes: 20,
    tags: ['surgery', 'emergency', 'abdominal', 'appendicitis'],
    patientProfile: {
      name: 'Marcus Johnson',
      age: 22,
      gender: 'Male',
      chiefComplaint:
        'Severe pain in my lower right abdomen that started around my belly button yesterday — I feel sick to my stomach.',
      history:
        'No significant past medical history. No prior abdominal surgeries. ' +
        'Last meal was about 20 hours ago. Rates pain 8/10, worse with movement.',
      vitalSigns: {
        heartRate: 102,
        bloodPressure: { systolic: 118, diastolic: 76 },
        respiratoryRate: 18,
        temperature: 38.2,
        oxygenSaturation: 99,
      },
    },
  },
  {
    title: 'Altered Mental Status – Acute Ischaemic Stroke',
    description:
      '72-year-old female brought by EMS with sudden onset right facial droop, left arm weakness, ' +
      'and slurred speech ~90 minutes ago. Conduct a NIHSS, determine tPA eligibility, and coordinate care.',
    difficulty: 'advanced' as const,
    durationMinutes: 25,
    tags: ['neurology', 'stroke', 'emergency', 'tpa'],
    patientProfile: {
      name: 'Helen Park',
      age: 72,
      gender: 'Female',
      chiefComplaint:
        'Patient unable to give history. Bystander reports sudden onset of facial droop and arm weakness about 90 minutes ago.',
      history:
        'Hypertension, atrial fibrillation (on warfarin — last INR 2.1 one week ago). ' +
        'Type 2 DM, prior TIA 3 years ago. Last known well approximately 90 minutes before arrival.',
      vitalSigns: {
        heartRate: 88,
        bloodPressure: { systolic: 188, diastolic: 104 },
        respiratoryRate: 16,
        temperature: 37.0,
        oxygenSaturation: 94,
      },
    },
  },
];

// ─── Seed function ────────────────────────────────────────────────────────────

export async function seedScenarios(): Promise<void> {
  const count = await Scenario.countDocuments();
  if (count > 0) {
    console.log(`ℹ️  Scenarios already seeded (${count} found) — skipping.`);
    return;
  }
  await Scenario.insertMany(SEED_SCENARIOS);
  console.log(`🌱 Seeded ${SEED_SCENARIOS.length} sample medical scenarios.`);
}
