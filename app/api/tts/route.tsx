export const runtime = 'nodejs';
const doctorIdToVoiceMapping: Record<number, string> = {
  1: "en-US-marcus",   // General Physician - Male
  2: "en-US-arnold",   // Pediatrician - Male
  3: "en-US-terrell",  // Dermatologist - Male
  4: "en-US-natalie",  // Psychologist - Female
  5: "en-US-sarah",    // Nutritionist - Female
  6: "en-US-eliza",    // Cardiologist - Female
  7: "en-US-grace",    // ENT Specialist - Female
  8: "en-US-ken",      // Orthopedic - Male
  9: "en-US-amara",    // Gynecologist - Female
  10: "en-US-james",   // Dentist - Male
};

const voiceIdMapping: Record<string, string> = {
  "marcus":  "en-US-marcus",
  "arnold":  "en-US-arnold",
  "terrell": "en-US-terrell",
  "natalie": "en-US-natalie",
  "sarah":   "en-US-sarah",
  "eliza":   "en-US-eliza",
  "grace":   "en-US-grace",
  "ken":     "en-US-ken",
  "amara":   "en-US-amara",
  "james":   "en-US-james",
};