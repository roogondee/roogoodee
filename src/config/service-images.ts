// Photos for the pillar landing heroes and any homepage card that has no
// generated image in homepage-images.ts. Unsplash (free commercial use, no
// attribution required), served through next/image — images.unsplash.com is
// already in next.config.mjs remotePatterns.
//
// Swap any entry for a real W Medical photo (Supabase storage URL) when one
// is available — nothing else needs to change.
//
// Chosen to stay inside the health ad policies the pillars already follow:
// glp1 shows food, never a body / before-after; std, ckd and dna show the lab
// or family rather than anything explicit; mind shows calm, not distress.

const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=75`

export const SERVICE_IMAGES = {
  glp1:    u('1512621776951-a57141f2eefd'), // healthy bowl
  std:     u('1582719471384-894fbb16e074'), // lab scientist at microscope
  ckd:     u('1532187863486-abf9dbad1b69'), // pipette into sample plate
  foreign: u('1504307651254-35680f356dfd'), // workers on a construction site
  mens:    u('1507003211169-0a1dd7228f2d'), // smiling man
  women:   u('1559839734-2b71ea197ec2'),    // smiling female doctor
  mind:    u('1506126613408-eca07ce68773'), // meditation at sunrise
  dna:     u('1609220136736-443140cffec6'), // father with his children
  advice:  u('1576091160550-2173dba999ef'), // laptop + stethoscope (telehealth)
  care:    u('1631217868264-e5b90bb7e133'), // doctor talking with a patient
  hospital: u('1519494026892-80bbd2d6fd0d'), // hospital reception
} as const

export type ServiceImageKey = keyof typeof SERVICE_IMAGES
