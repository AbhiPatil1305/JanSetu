/**
 * Client-side intelligent parser to extract grievance form fields from OCR / document text.
 * Robustly parses natural narrative prose sentences in English, Kannada, and bilingual government grievance petitions.
 * Produces clean, non-mixed data with dedicated language fields for both English and Kannada.
 */

export interface ParsedPetitionData {
  citizenName: string;
  citizenNameKn?: string;
  citizenPhone: string;
  citizenEmail: string;
  citizenAddress: string;
  citizenAddressKn?: string;
  district: string;
  districtKn?: string;
  taluk: string;
  talukKn?: string;
  villageLocality: string;
  villageLocalityKn?: string;
  complaintTitle: string;
  complaintTitleKn?: string;
  complaintCategory: string;
  complaintCategoryKn?: string;
  incidentDate: string;
  incidentLocation: string;
  incidentLocationKn?: string;
  complaintDesc: string;
  complaintDescKn?: string;
  requestedAction: string;
  requestedActionKn?: string;
  complaintLanguage: 'kannada' | 'english' | 'bilingual';
  englishSummary: string;
  kannadaSummary: string;
  assignmentInstructionsEn?: string;
  assignmentInstructionsKn?: string;
  suggestedDepartment?: string;
  suggestedPriority?: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
  confidenceScores: {
    citizen: 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';
    category: 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';
    location: 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';
    date: 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';
  };
}

export const TALUKS = [
  'Bengaluru South',
  'Bengaluru North',
  'Bengaluru East',
  'Anekal',
  'Yelahanka',
];

export const TALUK_BILINGUAL: Record<string, { en: string; kn: string }> = {
  'Bengaluru South': { en: 'Bengaluru South', kn: 'ಬೆಂಗಳೂರು ದಕ್ಷಿಣ' },
  'Bengaluru North': { en: 'Bengaluru North', kn: 'ಬೆಂಗಳೂರು ಉತ್ತರ' },
  'Bengaluru East': { en: 'Bengaluru East', kn: 'ಬೆಂಗಳೂರು ಪೂರ್ವ' },
  Anekal: { en: 'Anekal', kn: 'ಆನೇಕಲ್' },
  Yelahanka: { en: 'Yelahanka', kn: 'ಯಲಹಂಕ' },
};

interface TalukDetectionRule {
  taluk: string;
  patterns: RegExp[];
}

export const TALUK_DETECTION_RULES: TalukDetectionRule[] = [
  {
    taluk: 'Bengaluru South',
    patterns: [
      /ಬೆಂಗಳೂರು\s*ದಕ್ಷಿಣ/i,
      /ದಕ್ಷಿಣ\s*(?:ತಾಲೂಕು|ತಾಲ್ಲೂಕು|ತಾಲೂಕಿನ|ತಾಲ್ಲೂಕಿನ|ತಾಲೂಕಿಗೆ)/i,
      /Bengaluru\s*South/i,
      /Bangalore\s*South/i,
      /\bSouth\s*(?:Taluk|Tq|Tahsil|Tehsil)\b/i,
      /ಬೆಂಗಳೂರು\s*ಸೌತ್/i,
    ],
  },
  {
    taluk: 'Bengaluru North',
    patterns: [
      /ಬೆಂಗಳೂರು\s*ಉತ್ತರ/i,
      /ಉತ್ತರ\s*(?:ತಾಲೂಕು|ತಾಲ್ಲೂಕು|ತಾಲೂಕಿನ|ತಾಲ್ಲೂಕಿನ|ತಾಲೂಕಿಗೆ)/i,
      /Bengaluru\s*North/i,
      /Bangalore\s*North/i,
      /\bNorth\s*(?:Taluk|Tq|Tahsil|Tehsil)\b/i,
      /ಬೆಂಗಳೂರು\s*ನಾರ್ತ್/i,
    ],
  },
  {
    taluk: 'Bengaluru East',
    patterns: [
      /ಬೆಂಗಳೂರು\s*ಪೂರ್ವ/i,
      /ಪೂರ್ವ\s*(?:ತಾಲೂಕು|ತಾಲ್ಲೂಕು|ತಾಲೂಕಿನ|ತಾಲ್ಲೂಕಿನ|ತಾಲೂಕಿಗೆ)/i,
      /Bengaluru\s*East/i,
      /Bangalore\s*East/i,
      /\bEast\s*(?:Taluk|Tq|Tahsil|Tehsil)\b/i,
      /ಬೆಂಗಳೂರು\s*ಈಸ್ಟ್/i,
    ],
  },
  {
    taluk: 'Anekal',
    patterns: [
      /ಆನೇಕಲ್/i,
      /\bAnekal\b/i,
      /\bAnekal\s*(?:Taluk|Tq|Tahsil|Tehsil)\b/i,
    ],
  },
  {
    taluk: 'Yelahanka',
    patterns: [
      /ಯಲಹಂಕ/i,
      /\bYelahanka\b/i,
      /\bYelahanka\s*(?:Taluk|Tq|Tahsil|Tehsil)\b/i,
    ],
  },
];

export const LOCALITIES_BILINGUAL: Record<
  string,
  { en: string; kn: string; taluk: string }
> = {
  Koramangala: { en: 'Koramangala', kn: 'ಕೋರಮಂಗಲ', taluk: 'Bengaluru South' },
  Indiranagar: { en: 'Indiranagar', kn: 'ಇಂದಿರಾನಗರ', taluk: 'Bengaluru East' },
  Agara: { en: 'Agara', kn: 'ಅಗರ', taluk: 'Bengaluru East' },
  Whitefield: { en: 'Whitefield', kn: 'ವೈಟ್‌ಫೀಲ್ಡ್', taluk: 'Bengaluru East' },
  'HSR Layout': { en: 'HSR Layout', kn: 'ಎಚ್‌ಎಸ್‌ಆರ್ ಲೇಔಟ್', taluk: 'Bengaluru South' },
  Jayanagar: { en: 'Jayanagar', kn: 'ಜಯನಗರ', taluk: 'Bengaluru South' },
  'BTM Layout': { en: 'BTM Layout', kn: 'ಬಿಟಿಎಂ ಲೇಔಟ್', taluk: 'Bengaluru South' },
  'Electronic City': { en: 'Electronic City', kn: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ', taluk: 'Anekal' },
  Bellandur: { en: 'Bellandur', kn: 'ಬೆಳ್ಳಂದೂರು', taluk: 'Bengaluru East' },
  Marathahalli: { en: 'Marathahalli', kn: 'ಮಾರತ್ತಹಳ್ಳಿ', taluk: 'Bengaluru East' },
  Hebbal: { en: 'Hebbal', kn: 'ಹೆಬ್ಬಾಳ', taluk: 'Bengaluru North' },
  Yelahanka: { en: 'Yelahanka', kn: 'ಯಲಹಂಕ', taluk: 'Yelahanka' },
  Malleshwaram: { en: 'Malleshwaram', kn: 'ಮಲ್ಲೇಶ್ವರಂ', taluk: 'Bengaluru North' },
  Rajajinagar: { en: 'Rajajinagar', kn: 'ರಾಜಾಜಿನಗರ', taluk: 'Bengaluru North' },
  Basavanagudi: { en: 'Basavanagudi', kn: 'ಬಸವನಗುಡಿ', taluk: 'Bengaluru South' },
  Banashankari: { en: 'Banashankari', kn: 'ಬನಶಂಕರಿ', taluk: 'Bengaluru South' },
  Shivajinagar: { en: 'Shivajinagar', kn: 'ಶಿವಾಜಿನಗರ', taluk: 'Bengaluru North' },
  'Sarjapur Road': { en: 'Sarjapur Road', kn: 'ಸರ್ಜಾಪುರ ರಸ್ತೆ', taluk: 'Bengaluru East' },
  'MG Road': { en: 'MG Road', kn: 'ಎಂ ಜಿ ರಸ್ತೆ', taluk: 'Bengaluru North' },
  HAL: { en: 'HAL', kn: 'ಎಚ್‌ಎಎಲ್', taluk: 'Bengaluru East' },
  'JP Nagar': { en: 'JP Nagar', kn: 'ಜೆ ಪಿ ನಗರ', taluk: 'Bengaluru South' },
  'KR Puram': { en: 'KR Puram', kn: 'ಕೆ ಆರ್ ಪುರಂ', taluk: 'Bengaluru East' },
  Peenya: { en: 'Peenya', kn: 'ಪೀಣ್ಯ', taluk: 'Bengaluru North' },
};

export const LOCALITIES_MAP: Record<string, string[]> = {
  Koramangala: ['koramangala', 'ಕೋರಮಂಗಲ', '80ft road', 'st bed', '80 ಅಡಿ ರಸ್ತೆ', '80ft'],
  Indiranagar: ['indiranagar', 'ಇಂದಿರಾನಗರ', '100ft road', 'cmh road', '100 ಅಡಿ ರಸ್ತೆ', '100ft'],
  Agara: ['agara', 'ಅಗರ', 'agara village', 'agara lake', 'ಅಗರ ಕೆರೆ'],
  Whitefield: ['whitefield', 'ವೈಟ್‌ಫೀಲ್ಡ್', 'itpb', 'kadugodi', 'ಕಾಡುಗೋಡಿ'],
  'HSR Layout': ['hsr layout', 'hsr', 'ಎಚ್‌ಎಸ್‌ಆರ್', 'ಎಚ್ ಎಸ್ ಆರ್', 'ಹೊಸೂರು ಸರ್ಜಾಪುರ ರಸ್ತೆ'],
  Jayanagar: ['jayanagar', 'ಜಯನಗರ'],
  'BTM Layout': ['btm layout', 'btm', 'ಬಿಟಿಎಂ', 'ಬಿ ಟಿ ಎಂ'],
  'Electronic City': ['electronic city', 'ecity', 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ', 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್ ಸಿಟಿ'],
  Bellandur: ['bellandur', 'ಬೆಳ್ಳಂದೂರು', 'bellandur lake', 'ಬೆಳ್ಳಂದೂರು ಕೆರೆ', 'outer ring road'],
  Marathahalli: ['marathahalli', 'ಮಾರತ್ತಹಳ್ಳಿ', 'ಮಾರತಹಳ್ಳಿ'],
  Hebbal: ['hebbal', 'ಹೆಬ್ಬಾಳ', 'hebbal flyover'],
  Yelahanka: ['yelahanka', 'ಯಲಹಂಕ', 'nes office'],
  Malleshwaram: ['malleshwaram', 'ಮಲ್ಲೇಶ್ವರಂ', 'sampige road'],
  Rajajinagar: ['rajajinagar', 'ರಾಜಾಜಿನಗರ'],
  Basavanagudi: ['basavanagudi', 'ಬಸವನಗುಡಿ', 'gandhi bazaar', 'ಗಾಂಧಿ ಬಜಾರ್'],
  Banashankari: ['banashankari', 'ಬನಶಂಕರಿ', 'bsk'],
  Shivajinagar: ['shivajinagar', 'ಶಿವಾಜಿನಗರ', 'russell market'],
  'Sarjapur Road': ['sarjapur', 'ಸರ್ಜಾಪುರ', 'sarjapur road'],
  'MG Road': ['mg road', 'ಎಂ ಜಿ ರಸ್ತೆ', 'brigade road', 'residency road'],
  HAL: ['hal', 'old airport road', 'ಹಳೆ ವಿಮಾನ ನಿಲ್ದಾಣ ರಸ್ತೆ'],
  'JP Nagar': ['jp nagar', 'ಜೆ ಪಿ ನಗರ', 'ಜೆ.ಪಿ.ನಗರ'],
  'KR Puram': ['kr puram', 'ಕೆ ಆರ್ ಪುರಂ', 'krishnarajapuram'],
  Peenya: ['peenya', 'ಪೀಣ್ಯ'],
};

export const LOCALITY_TALUK_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(LOCALITIES_BILINGUAL).map(([k, v]) => [k, v.taluk])
);

export const CATEGORY_BILINGUAL: Record<
  string,
  {
    en: string;
    kn: string;
    dept: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
    reliefEn: string;
    reliefKn: string;
    directivesEn: string;
    directivesKn: string;
  }
> = {
  'Public Nuisance & Noise Pollution': {
    en: 'Public Nuisance & Noise Pollution',
    kn: 'ಸಾರ್ವಜನಿಕ ಶಾಂತಿ ಭಂಗ ಮತ್ತು ಶಬ್ದ ಮಾಲಿನ್ಯ',
    dept: 'Home & Police Department',
    priority: 'HIGH',
    reliefEn:
      'Immediate spot inspection, seizure of unauthorized amplifiers, and statutory action against violators.',
    reliefKn:
      'ಕೂಡಲೇ ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ, ಅನಧಿಕೃತ ಧ್ವನಿವರ್ಧಕಗಳನ್ನು ವಶಪಡಿಸಿಕೊಂಡು ತಪ್ಪಿತಸ್ಥರ ವಿರುದ್ಧ ಸೂಕ್ತ ಕಾನೂನು ಕ್ರಮ ಕೈಗೊಳ್ಳುವುದು.',
    directivesEn:
      'Urgent field inquiry regarding Public Nuisance & Noise Pollution at {loc}. Verify complainant statements, inspect locus, and submit statutory Action Taken Report (ATR) within follow-up timeline.',
    directivesKn:
      '{loc} ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಸಾರ್ವಜನಿಕ ಶಾಂತಿ ಭಂಗ ಮತ್ತು ಶಬ್ದ ಮಾಲಿನ್ಯ ಕುರಿತು ತುರ್ತು ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ, ದೂರುದಾರರ ಹೇಳಿಕೆಯನ್ನು ಪಡೆದು, ನಿಗದಿತ ದಿನಾಂಕದೊಳಗೆ ಕ್ರಮ ಕೈಗೊಂಡ ವರದಿ (ATR) ಸಲ್ಲಿಸುವುದು.',
  },
  'Cyber Financial Fraud': {
    en: 'Cyber Financial Fraud',
    kn: 'ಸೈಬರ್ ಹಣಕಾಸು ವಂಚನೆ',
    dept: 'Home & Police Department',
    priority: 'CRITICAL',
    reliefEn:
      'Immediate lien marking and freezing of beneficiary accounts, and statutory cyber crime registration.',
    reliefKn:
      'ಫಲಾನುಭವಿಯ ಬ್ಯಾಂಕ್ ಖಾತೆಗಳನ್ನು ತಕ್ಷಣ ಸ್ಥಗಿತಗೊಳಿಸಿ (ಫ್ರೀಜ್ ಮಾಡಿ) ಸೈಬರ್ ಅಪರಾಧ ಪ್ರಕರಣ ದಾಖಲಿಸುವುದು.',
    directivesEn:
      'Urgent cyber investigation regarding Cyber Financial Fraud in {loc}. Coordinate with Cyber Crime Cell, initiate bank account freezes, and submit preliminary inquiry report.',
    directivesKn:
      '{loc} ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಸೈಬರ್ ಹಣಕಾಸು ವಂಚನೆ ಕುರಿತು ತುರ್ತು ಸೈಬರ್ ತನಿಖೆ ನಡೆಸಿ, ಬ್ಯಾಂಕ್ ಖಾತೆಗಳನ್ನು ಸ್ಥಗಿತಗೊಳಿಸಿ ಪ್ರಾಥಮಿಕ ತನಿಖಾ ವರದಿ ಸಲ್ಲಿಸುವುದು.',
  },
  'Land Encroachment & Illegal Occupation': {
    en: 'Land Encroachment & Illegal Occupation',
    kn: 'ಸರ್ಕಾರಿ ಜಮೀನು ಒತ್ತುವರಿ ಮತ್ತು ಅಕ್ರಮ ಕಬಳಿಕೆ',
    dept: 'Revenue Department',
    priority: 'HIGH',
    reliefEn:
      'Demarcation survey, removal of unauthorized fencing and structures, and restoration of public land.',
    reliefKn:
      'ಸರ್ವೆ ನಡೆಸಿ ಗಡಿ ಗುರುತಿಸುವುದು, ಅಕ್ರಮ ಬೇಲಿ ಮತ್ತು ಕಟ್ಟಡಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ ಸರ್ಕಾರಿ ಜಮೀನು ಮರುಸ್ಥಾಪಿಸುವುದು.',
    directivesEn:
      'Field demarcation and site inspection regarding Land Encroachment at {loc}. Verify revenue survey maps, coordinate with Revenue Inspector, and submit Action Taken Report (ATR).',
    directivesKn:
      '{loc} ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಸರ್ಕಾರಿ ಜಮೀನು ಒತ್ತುವರಿ ಕುರಿತು ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ, ಕಂದಾಯ ನಕ್ಷೆಗಳನ್ನು ತಾಳೆನೋಡಿ, ನಿಗದಿತ ಅವಧಿಯೊಳಗೆ ಕ್ರಮ ಕೈಗೊಂಡ ವರದಿ ಸಲ್ಲಿಸುವುದು.',
  },
  'Theft & Burglary': {
    en: 'Theft & Burglary',
    kn: 'ಕಳ್ಳತನ ಮತ್ತು ದರೋಡೆ',
    dept: 'Home & Police Department',
    priority: 'HIGH',
    reliefEn:
      'Registration of FIR, examination of CCTV footage, and speedy recovery of stolen property.',
    reliefKn:
      'ಪ್ರಥಮ ಮಾಹಿತಿ ವರದಿ (ಎಫ್‌ಐಆರ್) ದಾಖಲಿಸಿ, ಸಿಸಿಟಿವಿ ದೃಶ್ಯಾವಳಿ ಪರಿಶೀಲಿಸಿ ಕಳುವಾದ ಸಾಮಗ್ರಿಗಳನ್ನು ಪತ್ತೆಹಚ್ಚುವುದು.',
    directivesEn:
      'Urgent investigation regarding Theft & Burglary reported at {loc}. Examine surveillance feeds, track suspects, and submit interim investigation progress report.',
    directivesKn:
      '{loc} ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ವರದಿಯಾದ ಕಳ್ಳತನ ಪ್ರಕರಣದ ತನಿಖೆ ನಡೆಸಿ, ಸಿಸಿಟಿವಿ ಪರಿಶೀಲಿಸಿ, ಆರೋಪಿಗಳನ್ನು ಪತ್ತೆಹಚ್ಚಿ ಮಧ್ಯಂತರ ವರದಿ ಸಲ್ಲಿಸುವುದು.',
  },
  'Threat & Harassment': {
    en: 'Threat & Harassment',
    kn: 'ಬೆದರಿಕೆ ಮತ್ತು ಕಿರುಕುಳ',
    dept: 'Home & Police Department',
    priority: 'CRITICAL',
    reliefEn:
      'Immediate police protection for complainant and stern statutory action against perpetrators.',
    reliefKn:
      'ದೂರುದಾರರಿಗೆ ತಕ್ಷಣ ಪೊಲೀಸ್ ರಕ್ಷಣೆ ನೀಡುವುದು ಹಾಗೂ ಆರೋಪಿಗಳ ವಿರುದ್ಧ ಕಠಿಣ ಕಾನೂನು ಕ್ರಮ ಕೈಗೊಳ್ಳುವುದು.',
    directivesEn:
      'Priority personal safety assessment regarding Threat & Harassment at {loc}. Contact complainant immediately, issue binding warnings to accused, and provide adequate protection.',
    directivesKn:
      '{loc} ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಬೆದರಿಕೆ ಹಾಗೂ ಕಿರುಕುಳ ಕುರಿತು ದೂರುದಾರರಿಗೆ ತಕ್ಷಣ ರಕ್ಷಣೆ ನೀಡಿ, ಆರೋಪಿಗಳ ವಿರುದ್ಧ ಕಟ್ಟುನಿಟ್ಟಿನ ಕ್ರಮ ಜರುಗಿಸಿ ವರದಿ ಸಲ್ಲಿಸುವುದು.',
  },
  'Traffic & Road Obstruction': {
    en: 'Traffic & Road Obstruction',
    kn: 'ಸಂಚಾರ ದಟ್ಟಣೆ ಮತ್ತು ರಸ್ತೆ ಅಡಚಣೆ',
    dept: 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
    priority: 'MEDIUM',
    reliefEn:
      'Removal of illegal parking and footpath obstructions, and restoration of smooth traffic movement.',
    reliefKn:
      'ಅಕ್ರಮ ಪಾರ್ಕಿಂಗ್ ಮತ್ತು ಪಾದಚಾರಿ ಮಾರ್ಗದ ಅಡಚಣೆಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ ಸುಗಮ ಸಂಚಾರಕ್ಕೆ ಅನುವು ಮಾಡಿಕೊಡುವುದು.',
    directivesEn:
      'Field inspection and clearance of Road Obstruction at {loc}. Coordinate with Traffic Police, tow unauthorized vehicles, and restore pedestrian access.',
    directivesKn:
      '{loc} ರಸ್ತೆ ಅಡಚಣೆ ತೆರವುಗೊಳಿಸಲು ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ, ಸಂಚಾರ ಪೊಲೀಸರೊಂದಿಗೆ ಸಮನ್ವಯ ಸಾಧಿಸಿ ಸುಗಮ ಸಂಚಾರ ಪುನಃಸ್ಥಾಪಿಸುವುದು.',
  },
  'Civic Amenities & Sanitation': {
    en: 'Civic Amenities & Sanitation',
    kn: 'ನಾಗರಿಕ ಸೌಲಭ್ಯಗಳು ಮತ್ತು ಒಳಚರಂಡಿ ನೈರ್ಮಲ್ಯ',
    dept: 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
    priority: 'MEDIUM',
    reliefEn:
      'Emergency repair of drainage pipeline, clearing sewage overflow, and removal of garbage black spots.',
    reliefKn:
      'ಚರಂಡಿ ಪೈಪ್‌ಲೈನ್ ದುರಸ್ತಿ, ಕೊಳಚೆ ನೀರು ಉಕ್ಕಿ ಹರಿಯುವುದನ್ನು ತಡೆಗಟ್ಟುವುದು ಮತ್ತು ಕಸದ ರಾಶಿಯನ್ನು ತೆರವುಗೊಳಿಸುವುದು.',
    directivesEn:
      'Inspect Civic Amenities and drainage lines at {loc}. Direct BBMP engineering and health staff for emergency de-silting and repair within 48 hours.',
    directivesKn:
      '{loc} ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಒಳಚರಂಡಿ ಮತ್ತು ನೈರ್ಮಲ್ಯ ಸಮಸ್ಯೆ ಪರಿಶೀಲಿಸಿ, ೪೮ ಗಂಟೆಗಳ ಒಳಗೆ ದುರಸ್ತಿ ಕಾರ್ಯ ಕೈಗೊಂಡು ವರದಿ ಸಲ್ಲಿಸುವುದು.',
  },
  'Women Safety & Domestic Issues': {
    en: 'Women Safety & Domestic Issues',
    kn: 'ಮಹಿಳಾ ಸುರಕ್ಷತೆ ಮತ್ತು ಕೌಟುಂಬಿಕ ಸಮಸ್ಯೆಗಳು',
    dept: 'Home & Police Department',
    priority: 'CRITICAL',
    reliefEn:
      'Immediate safety intervention, counseling assistance, and legal protection under the law.',
    reliefKn:
      'ತಕ್ಷಣದ ಸುರಕ್ಷತಾ ಕ್ರಮ, ಕೌನ್ಸಿಲಿಂಗ್ ನೆರವು ಮತ್ತು ಕಾನೂನು ಪ್ರಕಾರ ಸೂಕ್ತ ರಕ್ಷಣೆ ಒದಗಿಸುವುದು.',
    directivesEn:
      'Sensitive and urgent intervention regarding Women Safety at {loc}. Deploy designated Women Helpdesk officer, assess immediate safety, and ensure statutory counseling.',
    directivesKn:
      '{loc} ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಮಹಿಳಾ ಸುರಕ್ಷತೆ ಕುರಿತು ತಕ್ಷಣ ಮಹಿಳಾ ಪೊಲೀಸ್ ಅಧಿಕಾರಿಯವರ ಮೂಲಕ ರಕ್ಷಣೆ ಮತ್ತು ಕಾನೂನು ನೆರವು ಒದಗಿಸುವುದು.',
  },
  'General Grievance': {
    en: 'General Grievance',
    kn: 'ಸಾಮಾನ್ಯ ನಾಗರಿಕ ಅಹವಾಲು',
    dept: 'Home & Police Department',
    priority: 'HIGH',
    reliefEn: 'Prompt departmental inquiry and redressal of citizen grievance.',
    reliefKn:
      'ಇಲಾಖಾ ಮಟ್ಟದಲ್ಲಿ ತ್ವರಿತ ವಿಚಾರಣೆ ನಡೆಸಿ ನಾಗರಿಕ ಅಹವಾಲನ್ನು ಸೂಕ್ತವಾಗಿ ಪರಿಹರಿಸುವುದು.',
    directivesEn:
      'Field inquiry and statement verification regarding grievance at {loc}. Submit Action Taken Report (ATR) within follow-up timeline.',
    directivesKn:
      '{loc} ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಅಹವಾಲು ಕುರಿತು ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ ಕ್ರಮ ಕೈಗೊಂಡ ವರದಿ (ATR) ಸಲ್ಲಿಸುವುದು.',
  },
};

const KN_TO_EN_NAMES: Record<string, string> = {
  'ರಮೇಶ್ ಕುಮಾರ್': 'Ramesh Kumar',
  'ರಮೇಶ್': 'Ramesh',
  'ಚಂದ್ರಶೇಖರ್ ಮೂರ್ತಿ': 'Chandrashekar Murthy',
  'ಚಂದ್ರಶೇಖರ್': 'Chandrashekar',
  'ಸುಮಿತ್ರಾಬಾಯಿ': 'Sumithrabai',
  'ಸುಮಿತ್ರ': 'Sumitra',
  'ರಾಜೇಶ್ವರಿ ದೇವಿ': 'Rajeshwari Devi',
  'ರಾಜೇಶ್ವರಿ': 'Rajeshwari',
  'ವೆಂಕಟೇಶ್ ರಾವ್': 'Venkatesh Rao',
  'ವೆಂಕಟೇಶ್': 'Venkatesh',
  'ಸುರೇಶ್ ಬಾಬು': 'Suresh Babu',
  'ಸುರೇಶ್': 'Suresh',
  'ಆನಂದ್ ಕುಮಾರ್': 'Anand Kumar',
  'ಆನಂದ್': 'Anand',
  'ಮಂಜುನಾಥ್': 'Manjunath',
  'ಮಹೇಶ್': 'Mahesh',
  'ಗೋಪಾಲಕೃಷ್ಣ': 'Gopalakrishna',
  'ಲಕ್ಷ್ಮೀ ದೇವಿ': 'Lakshmi Devi',
  'ಲಕ್ಷ್ಮಿ': 'Lakshmi',
  'ಪ್ರಶಾಂತ್': 'Prashanth',
  'ರವಿ ಕುಮಾರ್': 'Ravi Kumar',
  'ಸವಿತಾ': 'Savitha',
};

const EN_TO_KN_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(KN_TO_EN_NAMES).map(([kn, en]) => [en.toLowerCase(), kn])
);

/**
 * Converts Kannada Unicode digits (೦-೯) to standard Arabic digits (0-9).
 */
export function convertKannadaDigits(input: string): string {
  if (!input) return '';
  return input.replace(/[\u0CE6-\u0CEF]/g, (ch) =>
    String(ch.charCodeAt(0) - 0x0ce6)
  );
}

/**
 * Phonetic Kannada-to-Latin transliteration fallback for names.
 */
export function transliterateKannadaToEnglish(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (KN_TO_EN_NAMES[trimmed]) return KN_TO_EN_NAMES[trimmed];

  const vowels: Record<string, string> = {
    'ಅ': 'a', 'ಆ': 'aa', 'ಇ': 'i', 'ಈ': 'ee', 'ಉ': 'u', 'ಊ': 'oo', 'ಋ': 'ru',
    'ಎ': 'e', 'ಏ': 'e', 'ಐ': 'ai', 'ಒ': 'o', 'ಓ': 'o', 'ಔ': 'au', 'ಅಂ': 'am', 'ಅಃ': 'ah',
  };
  const cons: Record<string, string> = {
    'ಕ': 'k', 'ಖ': 'kh', 'ಗ': 'g', 'ಘ': 'gh', 'ಙ': 'ng',
    'ಚ': 'ch', 'ಛ': 'chh', 'ಜ': 'j', 'ಝ': 'jh', 'ಞ': 'ny',
    'ಟ': 't', 'ಠ': 'th', 'ಡ': 'd', 'ಢ': 'dh', 'ಣ': 'n',
    'ತ': 't', 'ಥ': 'th', 'ದ': 'd', 'ಧ': 'dh', 'ನ': 'n',
    'ಪ': 'p', 'ಫ': 'ph', 'ಬ': 'b', 'ಭ': 'bh', 'ಮ': 'm',
    'ಯ': 'y', 'ರ': 'r', 'ಲ': 'l', 'ವ': 'v', 'ಶ': 'sh', 'ಷ': 'sh', 'ಸ': 's', 'ಹ': 'h', 'ಳ': 'l',
  };
  const matras: Record<string, string> = {
    'ಾ': 'a', 'ಿ': 'i', 'ೀ': 'ee', 'ು': 'u', 'ೂ': 'oo', 'ೃ': 'ru',
    'ೆ': 'e', 'ೇ': 'e', 'ೈ': 'ai', 'ೊ': 'o', 'ೋ': 'o', 'ೌ': 'au', '್': '', 'ಂ': 'm', 'ಃ': 'h',
  };

  const words = trimmed.split(/\s+/);
  const outWords = words.map((w) => {
    let out = '';
    let i = 0;
    while (i < w.length) {
      const ch = w[i];
      if (vowels[ch]) {
        out += vowels[ch];
        i++;
      } else if (cons[ch]) {
        const c = cons[ch];
        if (i + 1 < w.length && matras[w[i + 1]] !== undefined) {
          out += c + matras[w[i + 1]];
          i += 2;
        } else {
          out += c + 'a';
          i++;
        }
      } else {
        out += ch;
        i++;
      }
    }
    return out ? out.charAt(0).toUpperCase() + out.slice(1) : '';
  });

  return outWords.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Converts Kannada street address to clean English administrative address.
 */
export function convertKannadaAddressToEnglish(addr: string): string {
  if (!addr) return '';
  let s = convertKannadaDigits(addr);
  s = s.replace(/ಮನೆ\s*ನಂ\.?/gi, 'House No. ');
  s = s.replace(/ಫ್ಲ್ಯಾಟ್\s*ನಂ\.?/gi, 'Flat No. ');
  s = s.replace(/ಡೋರ್\s*ನಂ\.?/gi, 'Door No. ');
  s = s.replace(/ಸೈಟ್\s*ನಂ\.?/gi, 'Site No. ');
  s = s.replace(/ಖಾತಾ\s*ನಂ\.?/gi, 'Khata No. ');
  s = s.replace(/80\s*(?:ಅಡಿ|ft|feet)?\s*ರಸ್ತೆ/gi, '80ft Road');
  s = s.replace(/100\s*(?:ಅಡಿ|ft|feet)?\s*ರಸ್ತೆ/gi, '100ft Road');
  s = s.replace(/(\d+)\s*ನೇ\s*ಮುಖ್ಯರಸ್ತೆ/gi, '$1th Main Road');
  s = s.replace(/(\d+)\s*ನೇ\s*ಕ್ರಾಸ್/gi, '$1th Cross');
  s = s.replace(/(\d+)\s*ನೇ\s*ಬ್ಲಾಕ್/gi, '$1th Block');
  s = s.replace(/ಮುಖ್ಯರಸ್ತೆ/gi, 'Main Road');
  s = s.replace(/ಕ್ರಾಸ್/gi, 'Cross');
  s = s.replace(/ಬ್ಲಾಕ್/gi, 'Block');
  s = s.replace(/ಬಡಾವಣೆ|ಲೇಔಟ್/gi, 'Layout');
  s = s.replace(/ರಸ್ತೆ/gi, 'Road');
  s = s.replace(/ನಗರ/gi, 'Nagar');
  s = s.replace(/ಕೋರಮಂಗಲ/gi, 'Koramangala');
  s = s.replace(/ಇಂದಿರಾನಗರ/gi, 'Indiranagar');
  s = s.replace(/ಬೆಳ್ಳಂದೂರು/gi, 'Bellandur');
  s = s.replace(/ವೈಟ್‌ಫೀಲ್ಡ್/gi, 'Whitefield');
  s = s.replace(/ಜಯನಗರ/gi, 'Jayanagar');
  s = s.replace(/ಮಲ್ಲೇಶ್ವರಂ/gi, 'Malleshwaram');
  s = s.replace(/ರಾಜಾಜಿನಗರ/gi, 'Rajajinagar');
  s = s.replace(/ಯಲಹಂಕ/gi, 'Yelahanka');
  s = s.replace(/ಆನೇಕಲ್/gi, 'Anekal');
  s = s.replace(/ಬಸವನಗುಡಿ/gi, 'Basavanagudi');
  s = s.replace(/ಬನಶಂಕರಿ/gi, 'Banashankari');
  s = s.replace(/ಶಿವಾಜಿನಗರ/gi, 'Shivajinagar');
  s = s.replace(/ಸರ್ಜಾಪುರ/gi, 'Sarjapur');
  s = s.replace(/ಹೆಬ್ಬಾಳ/gi, 'Hebbal');
  s = s.replace(/ಎಚ್‌ಎಸ್‌ಆರ್/gi, 'HSR Layout');
  s = s.replace(/ಬಿಟಿಎಂ/gi, 'BTM Layout');
  s = s.replace(/ಎಲೆಕ್ಟ್ರಾನಿಕ್\s*ಸಿಟಿ/gi, 'Electronic City');
  s = s.replace(/ಕೆರೆ/gi, 'Lake');
  s = s.replace(/ವೃತ್ತ/gi, 'Circle');
  s = s.replace(/ಜಂಕ್ಷನ್/gi, 'Junction');
  s = s.replace(/ಬಳಿ|ಹತ್ತಿರ|ಸಮೀಪ/gi, 'Near');
  s = s.replace(/ಮುಂಭಾಗ|ಎದುರು/gi, 'Opposite');
  s = s.replace(/ಹಿಂದೆ/gi, 'Behind');
  s = s.replace(/ಪಕ್ಕದಲ್ಲಿ/gi, 'Beside');
  s = s.replace(/ಪಬ್|ಬಾರ್/gi, 'Pub');
  s = s.replace(/ಕಟ್ಟಡ/gi, 'Building');
  s = s.replace(/ಮಾರುಕಟ್ಟೆ/gi, 'Market');
  s = s.replace(/ಶಾಲೆ/gi, 'School');
  s = s.replace(/ಕಾಲೇಜು/gi, 'College');
  s = s.replace(/ಆಸ್ಪತ್ರೆ/gi, 'Hospital');
  s = s.replace(/ದೇವಸ್ಥಾನ|ದೇವಾಲಯ|ಗುಡಿ/gi, 'Temple');
  s = s.replace(/ಉದ್ಯಾನ|ಪಾರ್ಕ್/gi, 'Park');
  s = s.replace(/ಫ್ಲೈಓವರ್/gi, 'Flyover');
  s = s.replace(/ಸೇತುವೆ|ಬ್ರಿಡ್ಜ್/gi, 'Bridge');
  s = s.replace(/ರಾಜಕಾಲುವೆ|ಕಾಲುವೆ/gi, 'Rajakaluve');
  s = s.replace(/ವ್ಯಾಪ್ತಿಯಲ್ಲಿ|ವ್ಯಾಪ್ತಿ/gi, 'Jurisdiction');
  s = s.replace(/ಬೆಂಗಳೂರು\s*ದಕ್ಷಿಣ\s*(?:ತಾಲೂಕಿನ|ತಾಲೂಕು|ತಾಲ್ಲೂಕು|ತಾಲೂಕ)/gi, 'Bengaluru South Taluk');
  s = s.replace(/ಬೆಂಗಳೂರು\s*ಉತ್ತರ\s*(?:ತಾಲೂಕಿನ|ತಾಲೂಕು|ತಾಲ್ಲೂಕು|ತಾಲೂಕ)/gi, 'Bengaluru North Taluk');
  s = s.replace(/ಬೆಂಗಳೂರು\s*ಪೂರ್ವ\s*(?:ತಾಲೂಕಿನ|ತಾಲೂಕು|ತಾಲ್ಲೂಕು|ತಾಲೂಕ)/gi, 'Bengaluru East Taluk');
  s = s.replace(/ಬೆಂಗಳೂರು/gi, 'Bengaluru');
  s = s.replace(/ತಾಲೂಕಿನ|ತಾಲೂಕು|ತಾಲ್ಲೂಕು/gi, 'Taluk');
  s = s.replace(/ಜಿಲ್ಲೆ/gi, 'District');
  s = s.replace(/ಕರ್ನಾಟಕ/gi, 'Karnataka');
  s = s.replace(/\bಎ\b/g, 'A').replace(/\bಬಿ\b/g, 'B').replace(/\bಸಿ\b/g, 'C').replace(/\bಡಿ\b/g, 'D');

  // Transliterate or strip any remaining unmapped Kannada glyphs
  if (/[\u0C80-\u0CFF]/.test(s)) {
    s = s.replace(/[\u0C80-\u0CFF]+/g, (match) => transliterateKannadaToEnglish(match) || '');
  }
  s = s.replace(/\s+/g, ' ').replace(/^[,\s\-:]+|[,\s\-:]+$/g, '').trim();
  return s;
}

/**
 * Converts English address to clean Kannada address.
 */
export function convertEnglishAddressToKannada(addr: string): string {
  if (!addr) return '';
  let s = addr;
  s = s.replace(/House\s*No\.?/gi, 'ಮನೆ ನಂ. ');
  s = s.replace(/Flat\s*No\.?/gi, 'ಫ್ಲ್ಯಾಟ್ ನಂ. ');
  s = s.replace(/Door\s*No\.?/gi, 'ಡೋರ್ ನಂ. ');
  s = s.replace(/80ft\s*Road|80\s*feet\s*road/gi, '೮೦ ಅಡಿ ರಸ್ತೆ');
  s = s.replace(/100ft\s*Road|100\s*feet\s*road/gi, '೧೦೦ ಅಡಿ ರಸ್ತೆ');
  s = s.replace(/(\d+)(?:st|nd|rd|th)?\s*Main(?:\s*Road)?/gi, '$1ನೇ ಮುಖ್ಯರಸ್ತೆ');
  s = s.replace(/(\d+)(?:st|nd|rd|th)?\s*Cross(?:\s*Road)?/gi, '$1ನೇ ಕ್ರಾಸ್');
  s = s.replace(/(\d+)(?:st|nd|rd|th)?\s*Block/gi, '$1ನೇ ಬ್ಲಾಕ್');
  s = s.replace(/Main\s*Road/gi, 'ಮುಖ್ಯರಸ್ತೆ');
  s = s.replace(/Cross\s*Road|Cross/gi, 'ಕ್ರಾಸ್');
  s = s.replace(/Block/gi, 'ಬ್ಲಾಕ್');
  s = s.replace(/Layout/gi, 'ಬಡಾವಣೆ');
  s = s.replace(/Road/gi, 'ರಸ್ತೆ');
  s = s.replace(/Koramangala/gi, 'ಕೋರಮಂಗಲ');
  s = s.replace(/Indiranagar/gi, 'ಇಂದಿರಾನಗರ');
  s = s.replace(/Bellandur/gi, 'ಬೆಳ್ಳಂದೂರು');
  s = s.replace(/Whitefield/gi, 'ವೈಟ್‌ಫೀಲ್ಡ್');
  s = s.replace(/Jayanagar/gi, 'ಜಯನಗರ');
  s = s.replace(/Malleshwaram/gi, 'ಮಲ್ಲೇಶ್ವರಂ');
  s = s.replace(/Rajajinagar/gi, 'ರಾಜಾಜಿನಗರ');
  s = s.replace(/Yelahanka/gi, 'ಯಲಹಂಕ');
  s = s.replace(/Anekal/gi, 'ಆನೇಕಲ್');
  s = s.replace(/Lake/gi, 'ಕೆರೆ');
  s = s.replace(/Circle/gi, 'ವೃತ್ತ');
  s = s.replace(/Junction/gi, 'ಜಂಕ್ಷನ್');
  s = s.replace(/Near/gi, 'ಬಳಿ');
  s = s.replace(/Opposite/gi, 'ಮುಂಭಾಗ');
  s = s.replace(/Behind/gi, 'ಹಿಂದೆ');
  s = s.replace(/Beside/gi, 'ಪಕ್ಕದಲ್ಲಿ');
  s = s.replace(/Pub/gi, 'ಪಬ್');
  s = s.replace(/Bar/gi, 'ಬಾರ್');
  s = s.replace(/Building/gi, 'ಕಟ್ಟಡ');
  s = s.replace(/Market/gi, 'ಮಾರುಕಟ್ಟೆ');
  s = s.replace(/School/gi, 'ಶಾಲೆ');
  s = s.replace(/College/gi, 'ಕಾಲೇಜು');
  s = s.replace(/Hospital/gi, 'ಆಸ್ಪತ್ರೆ');
  s = s.replace(/Temple/gi, 'ದೇವಸ್ಥಾನ');
  s = s.replace(/Park/gi, 'ಉದ್ಯಾನ');
  s = s.replace(/Flyover/gi, 'ಫ್ಲೈಓವರ್');
  s = s.replace(/Bridge/gi, 'ಸೇತುವೆ');
  s = s.replace(/Rajakaluve/gi, 'ರಾಜಕಾಲುವೆ');
  s = s.replace(/Bengaluru\s*South\s*Taluk/gi, 'ಬೆಂಗಳೂರು ದಕ್ಷಿಣ ತಾಲೂಕು');
  s = s.replace(/Bengaluru\s*North\s*Taluk/gi, 'ಬೆಂಗಳೂರು ಉತ್ತರ ತಾಲೂಕು');
  s = s.replace(/Bengaluru\s*East\s*Taluk/gi, 'ಬೆಂಗಳೂರು ಪೂರ್ವ ತಾಲೂಕು');
  s = s.replace(/Bengaluru\s*Urban/gi, 'ಬೆಂಗಳೂರು ನಗರ');
  s = s.replace(/Bengaluru|Bangalore/gi, 'ಬೆಂಗಳೂರು');
  s = s.replace(/Taluk/gi, 'ತಾಲೂಕು');
  return s.replace(/\s+/g, ' ').replace(/^[,\s\-:]+|[,\s\-:]+$/g, '').trim();
}

function normalizeDate(rawDateStr: string): string {
  const normalizedDigits = convertKannadaDigits(rawDateStr);
  const cleaned = normalizedDigits.trim().replace(/[-.]/g, '/');
  const parts = cleaned.split('/');
  if (parts.length === 3) {
    try {
      let year: number;
      let month: number;
      let day: number;

      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
      }

      if (
        !isNaN(year) &&
        !isNaN(month) &&
        !isNaN(day) &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31
      ) {
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
      }
    } catch {
      // Fallback
    }
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Intelligent grievance text parser.
 * Extracts clean, non-mixed bilingual entities from continuous narrative sentences.
 */
export function parsePetitionText(
  primaryText: string,
  secondaryText?: string
): ParsedPetitionData {
  const today = new Date().toISOString().split('T')[0];
  const combinedText = [primaryText, secondaryText].filter(Boolean).join('\n\n').trim();

  if (!combinedText) {
    return {
      citizenName: '',
      citizenNameKn: '',
      citizenPhone: '',
      citizenEmail: '',
      citizenAddress: '',
      citizenAddressKn: '',
      district: 'Bengaluru Urban',
      districtKn: 'ಬೆಂಗಳೂರು ನಗರ',
      taluk: 'Bengaluru South',
      talukKn: 'ಬೆಂಗಳೂರು ದಕ್ಷಿಣ',
      villageLocality: '',
      villageLocalityKn: '',
      complaintTitle: '',
      complaintTitleKn: '',
      complaintCategory: 'General Grievance',
      complaintCategoryKn: 'ಸಾಮಾನ್ಯ ನಾಗರಿಕ ಅಹವಾಲು',
      incidentDate: today,
      incidentLocation: '',
      incidentLocationKn: '',
      complaintDesc: '',
      complaintDescKn: '',
      requestedAction: '',
      requestedActionKn: '',
      complaintLanguage: 'english',
      englishSummary: '',
      kannadaSummary: '',
      assignmentInstructionsEn: '',
      assignmentInstructionsKn: '',
      suggestedDepartment: 'Home & Police Department',
      suggestedPriority: 'HIGH',
      confidenceScores: {
        citizen: 'MISSING',
        category: 'NEEDS_REVIEW',
        location: 'MISSING',
        date: 'NEEDS_REVIEW',
      },
    };
  }

  const cleanText = primaryText.trim() || combinedText;
  const normalizedPrimary = convertKannadaDigits(cleanText);
  const normalizedCombined = convertKannadaDigits(combinedText);
  const lowerCombined = normalizedCombined.toLowerCase();

  // 1. Language Detection
  const kannadaChars = (cleanText.match(/[\u0C80-\u0CFF]/g) || []).length;
  const englishChars = (cleanText.match(/[A-Za-z]/g) || []).length;
  let complaintLanguage: 'kannada' | 'english' | 'bilingual' = 'english';
  if (kannadaChars > 25 && englishChars > 25) {
    complaintLanguage = 'bilingual';
  } else if (kannadaChars > 25) {
    complaintLanguage = 'kannada';
  }

  // 2. Extract Phone Number
  let citizenPhone = '';
  const phoneRegex =
    /(?:(?:Mob(?:ile)?|Phone|Tel|Cell|Contact|ಸಂಪರ್ಕ|ದೂರವಾಣಿ|ಮೊಬೈಲ್|Ph)\s*[:\-.]?\s*)?(?:\+91[\s\-]?)?([6-9]\d{4}[\s\-]?\d{5}|[6-9]\d{9})\b/i;
  const phoneMatch =
    normalizedCombined.match(phoneRegex) || normalizedPrimary.match(phoneRegex);
  if (phoneMatch) {
    const rawDigits = phoneMatch[1].replace(/[\s\-]/g, '');
    if (rawDigits.length === 10) {
      citizenPhone = `+91 ${rawDigits.slice(0, 5)} ${rawDigits.slice(5)}`;
    } else {
      citizenPhone = phoneMatch[0].trim();
    }
  } else {
    const standalonePhone = normalizedCombined.match(/\b([6-9]\d{9})\b/);
    if (standalonePhone) {
      const d = standalonePhone[1];
      citizenPhone = `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
    }
  }

  // 3. Extract Email
  let citizenEmail = '';
  const emailMatch = combinedText.match(
    /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/
  );
  if (emailMatch) {
    citizenEmail = emailMatch[1].toLowerCase();
  }

  // 4. Extract Citizen Name from narrative sentences
  let rawCitizenName = '';
  const namePatterns: RegExp[] = [
    // Kannada narrative: ನಾನು ರಮೇಶ್ ಕುಮಾರ್, ತಂದೆ/ಗಂಡ/ಕೋಂ/ತಾಯಿ...
    /ನಾನು\s+([A-Za-z\u0C80-\u0CFF\s.]{2,35}?)(?=\s*,\s*(?:ತಂದೆ|ಗಂಡ|ಕೋಂ|ತಾಯಿ|ರವರ|ಇವರು|ವಾಸ|ನಿವಾಸಿ|ಕಳೆದ|\d|ರಲ್ಲಿ|ನಲ್ಲಿ))/i,
    // Kannada formal/police: ದೂರುದಾರರಾದ ಶ್ರೀಮತಿ ಸುಮಿತ್ರಾಬಾಯಿ, ಕೋಂ...
    /(?:ದೂರುದಾರರಾದ|ಅರ್ಜಿದಾರರಾದ|ದೂರುದಾರನಾದ|ಅರ್ಜಿದಾರನಾದ)\s+(?:ಶ್ರೀಮತಿ|ಶ್ರೀ|ಕುಮಾರಿ|ಡಾ[\.॥])?\s*([A-Za-z\u0C80-\u0CFF\s.]{2,35}?)(?=\s*,\s*(?:ಕೋಂ|ತಂದೆ|ಗಂಡ|ತಾಯಿ|ಬಿನ್|ವಾಸ|ನಿವಾಸಿ|ಮೊಬೈಲ್|ವಿಳಾಸ|\d))/i,
    // English narrative: I, Chandrashekar Murthy, aged... or S/o...
    /\bI,?\s+(?:am\s+)?(?:Mr\.|Mrs\.|Ms\.|Dr\.|Shri|Smt\.)?\s*([A-Za-z\s.]{3,35}?)(?=\s*,\s*(?:aged|s\/o|w\/o|d\/o|son of|wife of|daughter of|residing|resident|living))/i,
    // English statement: My name is John Doe, ...
    /\bMy\s+name\s+is\s+(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s*([A-Za-z\s.]{3,35}?)(?=[,\.\n])/i,
    // Explicit form labels
    /(?:Applicant|Petitioner|Complainant|Citizen)\s+Name\s*[:\-]?\s*([^\n,]{2,40})/i,
    /(?:From|Applicant|Petitioner|Complainant|Name|ಅರ್ಜಿದಾರರು|ದೂರುದಾರರು|ಹೆಸರು)\s*[:\-]\s*([^\n,]{2,40})/i,
    /(?:From|ಇಂದ)\s*[:\-]?\s*\n\s*([^\n,]{3,40})/i,
    // End signature blocks
    /(?:ಇಂತಿ\s*ತಮ್ಮ\s*ವಿಶ್ವಾಸಿ|ತಮ್ಮ\s*ವಿಶ್ವಾಸಿ|ಇಂತಿ|Yours\s+faithfully|Yours\s+sincerely)\s*[,:\-]?\s*\n\s*([A-Za-z\u0C80-\u0CFF\s.]{2,35})/i,
  ];

  for (const pat of namePatterns) {
    const m = normalizedPrimary.match(pat) || normalizedCombined.match(pat);
    if (m && m[1]) {
      let candidate = m[1].trim();
      candidate = candidate
        .replace(
          /^(?:Shri|Smt|Sri|Mrs|Mr|Dr|Kumari|Miss|ಶ್ರೀಮತಿ|ಶ್ರೀ|ಕುಮಾರಿ|ಡಾ[\.॥])\.?\s+/i,
          ''
        )
        .replace(/[\n\r]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (
        candidate &&
        candidate.length >= 3 &&
        !/^(Deputy|Commissioner|Police|Inspector|Department|District|Superintendent|Officer|Station|The\s+Class|ಅಧಿಕಾರಿ|ಠಾಣಾಧಿಕಾರಿ|To\b|Hon|Respected|ಮಾನ್ಯ)/i.test(
          candidate
        )
      ) {
        rawCitizenName = candidate;
        break;
      }
    }
  }

  // Bilingual name separation
  let citizenName = '';
  let citizenNameKn = '';
  if (/[\u0C80-\u0CFF]/.test(rawCitizenName)) {
    citizenNameKn = rawCitizenName;
    citizenName = transliterateKannadaToEnglish(rawCitizenName);
  } else {
    citizenName = rawCitizenName;
    const lower = rawCitizenName.toLowerCase();
    citizenNameKn = EN_TO_KN_NAMES[lower] || rawCitizenName;
  }

  // 5. Extract Taluk & Locality
  let taluk = '';
  for (const rule of TALUK_DETECTION_RULES) {
    for (const pat of rule.patterns) {
      if (pat.test(normalizedCombined)) {
        taluk = rule.taluk;
        break;
      }
    }
    if (taluk) break;
  }

  let villageLocality = '';
  for (const [canonicalLoc, aliases] of Object.entries(LOCALITIES_MAP)) {
    for (const alias of aliases) {
      if (lowerCombined.includes(alias.toLowerCase())) {
        villageLocality = canonicalLoc;
        break;
      }
    }
    if (villageLocality) break;
  }

  if (!taluk && villageLocality && LOCALITY_TALUK_MAP[villageLocality]) {
    taluk = LOCALITY_TALUK_MAP[villageLocality];
  }
  if (!taluk) {
    taluk = 'Bengaluru South';
  }

  const talukKn = TALUK_BILINGUAL[taluk]?.kn || 'ಬೆಂಗಳೂರು ದಕ್ಷಿಣ';
  const villageLocalityKn =
    LOCALITIES_BILINGUAL[villageLocality]?.kn || villageLocality;

  // 6. Extract Residential Address from continuous sentences
  let rawAddress = '';

  // Pattern A: Kannada structured sentence
  const mKnIntro = normalizedCombined.match(
    /ನಾನು\s+[^,]+,\s*(?:(?:ತಂದೆ|ಗಂಡ|ಕೋಂ|ತಾಯಿ|ರವರ|ಇವರು)[^,]+,\s*)?([A-Za-z0-9\u0C80-\u0CFF\s,/#\.\-]+?)\s*(?:ದಲ್ಲಿ|ರಲ್ಲಿ|ನಲ್ಲಿ)\s*(?:ಕಳೆದ\s*[\d]+\s*ವರ್ಷಗಳಿಂದ\s*)?(?:ವಾಸವಾಗಿದ್ದು|ವಾಸವಿರುವ|ನಿವಾಸಿಯಾದ|ವಾಸ)/i
  );
  if (mKnIntro && mKnIntro[1]) {
    const cand = mKnIntro[1].replace(/^[,\s\-:]+|[,\s\-:]+$/g, '').trim();
    if (cand.length >= 10) {
      rawAddress = cand;
    }
  }

  // Pattern B: English narrative sentence
  if (!rawAddress) {
    const mEnIntro = normalizedCombined.match(
      /\b(?:residing\s+at|resident\s+of|living\s+at)\s+([A-Za-z0-9\s,/#\.\-]+?)(?=\s*(?:\(Phone|\(Mobile|\(Contact|,\s*(?:contact|phone|mobile|email)|\bPhone\b|\bMobile\b|\bEmail\b|,\s*wish\s+to|,\s*hereby|,\s*do\s+hereby|,\s*for\s+the\s+past|,\s*since|\.(?:\s+[A-Z]|\s*$)|;|\n|$))/i
    );
    if (mEnIntro && mEnIntro[1]) {
      const cand = mEnIntro[1].replace(/^[,\s\-:]+|[,\s\-:]+$/g, '').trim();
      if (cand.length >= 10) {
        rawAddress = cand;
      }
    }
  }

  // Pattern C: Police / complaint header: ವಾಸ #12, 3rd cross...
  if (!rawAddress) {
    const mShortKn = normalizedCombined.match(
      /(?:ವಾಸವಾಗಿರುವ|ವಾಸವಿರುವ|ನಿವಾಸಿಯಾದ|ವಾಸ|ವಿಳಾಸ)\s*[:\-]?\s*([A-Za-z0-9\u0C80-\u0CFF\s,/#\.\-]+?)(?=\s*(?:,\s*(?:ಮೊಬೈಲ್|ದೂರವಾಣಿ|ಸಂಪರ್ಕ|ದಿನಾಂಕ|ಇಮೇಲ್)|\bಮೊಬೈಲ್\b|\bದೂರವಾಣಿ\b|\bಸಂಪರ್ಕ\b|\.(?:\s+[A-Z\u0C80-\u0CFF]|\s*$)|;|\n|$))/i
    );
    if (mShortKn && mShortKn[1]) {
      const cand = mShortKn[1].replace(/^[,\s\-:]+|[,\s\-:]+$/g, '').trim();
      if (cand.length >= 8) {
        rawAddress = cand;
      }
    }
  }

  // Pattern D: Explicit key-value labels
  if (!rawAddress) {
    const addrMatch = normalizedCombined.match(
      /(?:Residential\s*Address|Permanent\s*Address|Address|Postal\s*Address|ವಿಳಾಸ|ವಾಸವಿರುವ\s*ವಿಳಾಸ|ವಾಸಸ್ಥಳ|ಮನೆ\s*ವಿಳಾಸ)\s*[:\-]\s*([^\n]+(?:\n\s*[^\n]+)?)/i
    );
    if (addrMatch && addrMatch[1]) {
      let cand = addrMatch[1].replace(/[\n\r]+/g, ', ').replace(/\s+/g, ' ').trim();
      cand = cand.replace(/^[,\s\-:]+|[,\s\-:]+$/g, '');
      cand = cand
        .replace(/(?:Phone|Mobile|Email|Mob|ಸಂಪರ್ಕ|ದೂರವಾಣಿ)[:\-]?\s*[\d\w@.]+/gi, '')
        .trim();
      if (cand.length >= 8 && !/^(To|ಇವರಿಗೆ|Deputy|Commissioner|Sir|ಮಾನ್ಯರೆ)/i.test(cand)) {
        rawAddress = cand;
      }
    }
  }

  // Pattern E: House / Flat / Site / Door No pattern anywhere in text
  if (!rawAddress) {
    const hfMatch = normalizedCombined.match(
      /((?:(?:House|Flat|Door|Site|Plot|Khata|ಮನೆ|ಫ್ಲ್ಯಾಟ್|ಡೋರ್|ಖಾತಾ)\s*(?:No\.?|Number|ನಂ\.?)|#\s*\d+)[A-Za-z0-9\u0C80-\u0CFF\s,/#\.\-]+?(?:Bengaluru|Bangalore|Karnataka|\d{6}|Taluk|ತಾಲೂಕು|Layout|ಲೇಔಟ್|Road|ರಸ್ತೆ|Cross|ಕ್ರಾಸ್|Main|ಮುಖ್ಯರಸ್ತೆ|Block|ಬ್ಲಾಕ್|Nagar|ನಗರ|Colony|ಬಡಾವಣೆ))/i
    );
    if (hfMatch && hfMatch[1]) {
      const cand = hfMatch[1].replace(/^[,\s\-:]+|[,\s\-:]+$/g, '').trim();
      if (cand.length >= 10) {
        rawAddress = cand;
      }
    }
  }

  // Clean raw address
  if (rawAddress) {
    rawAddress = rawAddress
      .replace(/\s+/g, ' ')
      .replace(/^[,\s\-:]+|[,\s\-:]+$/g, '')
      .replace(/(?:Phone|Mobile|Email|Mob|ಸಂಪರ್ಕ|ದೂರವಾಣಿ)[:\-]?\s*[\d\w@.]+/gi, '')
      .replace(/^[,\s\-:]+|[,\s\-:]+$/g, '')
      .trim();
  }

  // Bilingual address separation: Zero language mixing!
  let citizenAddress = '';
  let citizenAddressKn = '';
  if (/[\u0C80-\u0CFF]/.test(rawAddress)) {
    citizenAddressKn = rawAddress;
    citizenAddress = convertKannadaAddressToEnglish(rawAddress);
  } else if (rawAddress) {
    citizenAddress = rawAddress;
    citizenAddressKn = convertEnglishAddressToKannada(rawAddress);
  } else {
    citizenAddress = villageLocality
      ? `${villageLocality}, ${taluk}, Bengaluru Urban`
      : `${taluk}, Bengaluru Urban`;
    citizenAddressKn = villageLocalityKn
      ? `${villageLocalityKn}, ${talukKn}, ಬೆಂಗಳೂರು ನಗರ`
      : `${talukKn}, ಬೆಂಗಳೂರು ನಗರ`;
  }

  // 7. Extract Incident Date
  let incidentDate = today;
  let dateFound = false;
  const datePatterns: RegExp[] = [
    /(?:ದಿನಾಂಕ|on|dated|occurred on|happened on)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s*(?:ರಂದು|on)/i,
    /(?:Date|Dated)\s*[:\-]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
  ];

  for (const pat of datePatterns) {
    const dm = normalizedCombined.match(pat) || normalizedPrimary.match(pat);
    if (dm && dm[1]) {
      incidentDate = normalizeDate(dm[1]);
      dateFound = true;
      break;
    }
  }

  // 8. Extract Category & Department
  let detectedCatKey = 'General Grievance';
  if (
    /noise|loudspeaker|amplified|music|sound|decibel|pub|party|ಧ್ವನಿ|ಶಬ್ದ|ಅಡಚಣೆ|ಧ್ವನಿವರ್ಧಕ/i.test(
      lowerCombined
    )
  ) {
    detectedCatKey = 'Public Nuisance & Noise Pollution';
  } else if (
    /cyber|telegram|fraud|trading|crypto|upi|online investment|scam|financial fraud|phishing|frozen|ಖಾತೆ|ವಂಚನೆ|ಸೈಬರ್/i.test(
      lowerCombined
    )
  ) {
    detectedCatKey = 'Cyber Financial Fraud';
  } else if (
    /encroachment|gomal|survey\s*no|fencing|land dispute|mutation|rtc|khata|rajakaluve|lake buffer|ಕಬಳಿಕೆ|ಒತ್ತುವರಿ|ಜಮೀನು|ಖಾತಾ|ಪಹಣಿ|ರಾಜಕಾಲುವೆ|ಗೋಮಾಳ/i.test(
      lowerCombined
    )
  ) {
    detectedCatKey = 'Land Encroachment & Illegal Occupation';
  } else if (
    /theft|stolen|robbery|burglary|snatching|vehicle stolen|break-in|chain snatching|ಕಳ್ಳತನ|ದರೋಡೆ|ಸರಗಳ್ಳತನ/i.test(
      lowerCombined
    )
  ) {
    detectedCatKey = 'Theft & Burglary';
  } else if (
    /threat|intimidation|harassment|extortion|abusive|assault|blackmail|rowdyism|ಬೆದರಿಕೆ|ಕಿರುಕುಳ|ಹಲ್ಲೆ|ಪ್ರಾಣ ಬೆದರಿಕೆ|ಸುಲಿಗೆ/i.test(
      lowerCombined
    )
  ) {
    detectedCatKey = 'Threat & Harassment';
  } else if (
    /traffic|parking|footpath|pedestrian|obstruction|pothole|signal|ವಾಹನ ಸಂಚಾರ|ಪಾರ್ಕಿಂಗ್|ರಸ್ತೆ ಗುಂಡಿ|ಫುಟ್‌ಪಾತ್/i.test(
      lowerCombined
    )
  ) {
    detectedCatKey = 'Traffic & Road Obstruction';
  } else if (
    /drainage|sewage|garbage|sanitation|drinking water|pipeline|water supply|manhole|ನೀರು|ತ್ಯಾಜ್ಯ|ಒಳಚರಂಡಿ|ಕಸ/i.test(
      lowerCombined
    )
  ) {
    detectedCatKey = 'Civic Amenities & Sanitation';
  } else if (
    /domestic violence|dowry|women safety|ಗೃಹಹಿಂಸೆ|ವರದಕ್ಷಿಣೆ|ಮಹಿಳಾ ಸುರಕ್ಷತೆ/i.test(
      lowerCombined
    )
  ) {
    detectedCatKey = 'Women Safety & Domestic Issues';
  }

  const catMeta = CATEGORY_BILINGUAL[detectedCatKey] || CATEGORY_BILINGUAL['General Grievance'];
  const complaintCategory = catMeta.en;
  const complaintCategoryKn = catMeta.kn;
  const suggestedDepartment = catMeta.dept;
  const suggestedPriority = catMeta.priority;

  // 9. Extract Subject / Title
  let rawTitle = '';
  const subMatch =
    normalizedCombined.match(
      /(?:Subject|Sub|Re|Regarding|ವಿಷಯ|ಕುರಿತು)\s*[:\-]\s*([^\n.]+?)(?=\.(?:\s+[A-Z\u0C80-\u0CFF]|\s*$)|;|\n|$)/i
    ) ||
    normalizedCombined.match(
      /(?:Subject|Sub|Re|Regarding|ವಿಷಯ|ಕುರಿತು)\s*[:\-]\s*([^\n]+)/i
    ) ||
    (secondaryText
      ? secondaryText.match(
          /(?:Subject|Sub|Regarding)\s*[:\-]\s*([^\n.]+?)(?=\.(?:\s+[A-Z]|\s*$)|;|\n|$)/i
        )
      : null) ||
    normalizedCombined.match(
      /(?:Complaint|Petition)\s+(?:against|regarding|for)\s*[:\-]?\s*([^\n.]+?)(?=\.(?:\s+[A-Z]|\s*$)|;|\n|$)/i
    ) ||
    normalizedCombined.match(
      /([A-Za-z0-9\u0C80-\u0CFF\s,]+?(?:ಬಗ್ಗೆ\s*ದೂರು|ಕುರಿತು\s*ಅರ್ಜಿ|ಕುರಿತು\s*ಮನವಿ))/i
    );

  if (subMatch && subMatch[1]) {
    rawTitle = subMatch[1].trim().replace(/^[“\"\'\s\-:]+|[”\"\'\s\.]+/g, '');
  }

  let complaintTitle = '';
  let complaintTitleKn = '';
  if (/[\u0C80-\u0CFF]/.test(rawTitle)) {
    complaintTitleKn = rawTitle;
    complaintTitle = `Petition regarding ${complaintCategory.toLowerCase()} at ${villageLocality || taluk}`;
  } else if (rawTitle) {
    complaintTitle = rawTitle;
    complaintTitleKn = `${villageLocalityKn || talukKn} ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ${complaintCategoryKn} ಕುರಿತು ದೂರು`;
  } else {
    complaintTitle = `Petition regarding ${complaintCategory.toLowerCase()} at ${villageLocality || taluk}`;
    complaintTitleKn = `${villageLocalityKn || talukKn} ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ${complaintCategoryKn} ಕುರಿತು ದೂರು`;
  }

  // 10. Extract Incident Location (Pure English and Pure Kannada - No Mixing!)
  let rawLoc = '';
  const locPatterns: RegExp[] = [
    /(?:Place\s+of\s+incident|Incident\s+location|Location|ಘಟನಾ\s*ಸ್ಥಳ)\s*[:\-]?\s*([^\n.,]+)/i,
    /(?:ಸ್ಥಳ|ಘಟನಾ\s*ಸ್ಥಳ)\s*[:\-]\s*([^\n.,]+)/i,
    /\b(?:on|near|around|opposite|adjacent to|in front of)\s+([A-Za-z0-9\s,\-]{4,60}?(?:Lake|Junction|Road|Cross|Main|Block|Street|Layout|Gate|Circle|Bridge|Flyover|Park|Hospital|Station|Market|Hall|Drain|Rajakaluve|Building|Shop|Pub|Cafe|Bar|Restaurant|Area|zone))\b/i,
    /\b(?:near|opposite|adjacent to)\s+([A-Za-z0-9\s,\-]{4,40}?)(?=\s+(?:on|dated|at around|\d|\.|\n|$))/i,
    /([A-Za-z0-9\u0C80-\u0CFF\s,/#\-]{3,50}?(?:ರಸ್ತೆ|ಮುಖ್ಯರಸ್ತೆ|ಕೆರೆ|ಜಂಕ್ಷನ್|ವೃತ್ತ|ಪಬ್|ಬಡಾವಣೆ|ಲೇಔಟ್|ಕಟ್ಟಡ|ಮಾರುಕಟ್ಟೆ|ಕಾಮಗಾರಿ))\s*(?:ಯಲ್ಲಿ|ಯ\s*ಪಬ್‌ನಲ್ಲಿ|ಬಳಿ|ಹತ್ತಿರ|ಸಮೀಪ|ಮುಂಭಾಗ|ವ್ಯಾಪ್ತಿಯಲ್ಲಿ)/i,
  ];

  for (const pat of locPatterns) {
    const lm = normalizedCombined.match(pat);
    if (lm && lm[1]) {
      let cand = lm[1].trim();
      cand = cand
        .replace(
          /^(?:(?:ದಿನಾಂಕ|on|dated)?\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\s*(?:ರಂದು|on)?|(?:\d{1,2}[:.]\d{2})\s*(?:ರ\s*ಸುಮಾರಿಗೆ|ಗಂಟೆಗೆ|am|pm)?|(?:\d{1,2})\s*(?:ಗಂಟೆಗೆ|ರ\s*ಸುಮಾರಿಗೆ)|ರಾತ್ರಿ|ಬೆಳಗ್ಗೆ|ಮಧ್ಯಾಹ್ನ|ಸಂಜೆ|ನಮ್ಮ\s*ಮನೆಯ|ಸಮೀಪವಿರುವ|ಬಳಿ\s*ಇರುವ|\s)+/i,
          ''
        )
        .replace(/^[,\s\-:]+|[,\s\-:]+$/g, '')
        .trim();
      if (
        cand.length >= 3 &&
        !/^(the|deputy|respected|sir|madam|ಮಾನ್ಯರೆ|ನಮ್ಮ|ಸ್ಥಳೀಯ|ಕಳೆದ)/i.test(cand) &&
        !rawAddress.toLowerCase().includes(cand.toLowerCase())
      ) {
        rawLoc = cand;
        break;
      }
    }
  }

  // Bilingual incident location separation: Zero mixing of Kannada and English!
  let incidentLocation = '';
  let incidentLocationKn = '';
  if (/[\u0C80-\u0CFF]/.test(rawLoc)) {
    // Kannada primary
    incidentLocationKn = villageLocalityKn && !rawLoc.includes(villageLocalityKn)
      ? `${rawLoc}, ${villageLocalityKn}`
      : rawLoc;
    const convertedLocEn = convertKannadaAddressToEnglish(rawLoc);
    incidentLocation = villageLocality && !convertedLocEn.toLowerCase().includes(villageLocality.toLowerCase())
      ? `${convertedLocEn || villageLocality}, ${villageLocality}`
      : convertedLocEn || villageLocality;
  } else if (rawLoc) {
    // English primary
    incidentLocation = villageLocality && !rawLoc.toLowerCase().includes(villageLocality.toLowerCase())
      ? `${rawLoc}, ${villageLocality}`
      : rawLoc;
    incidentLocationKn = convertEnglishAddressToKannada(incidentLocation);
  } else {
    // Default by category / locality
    if (detectedCatKey === 'Cyber Financial Fraud') {
      incidentLocation = `Online / Digital Transaction (${villageLocality || taluk})`;
      incidentLocationKn = `ಆನ್‌ಲೈನ್ / ಡಿಜಿಟಲ್ ಹಣ ವರ್ಗಾವಣೆ (${villageLocalityKn || talukKn})`;
    } else {
      incidentLocation = villageLocality ? `${villageLocality}, ${taluk}` : taluk;
      incidentLocationKn = villageLocalityKn ? `${villageLocalityKn}, ${talukKn}` : talukKn;
    }
  }

  // 11. Extract Relief / Requested Action
  let rawAction = '';
  const actionPatterns: RegExp[] = [
    /(?:Prayer|Relief|Request|Relief\s*sought|ಮನವಿ|ಕೋರಿಕೆ|ಪ್ರಾರ್ಥನೆ|ಪರಿಹಾರ)\s*[:\-]\s*([^\n]+(?:\n[^\n]+)?)/i,
    /(?:ಆದ್ದರಿಂದ|ದಯವಿಟ್ಟು|ಕೂಡಲೇ|ಸೂಕ್ತ)\s+([^\n.]+?(?:ಕ್ರಮ\s*(?:ಕೈಗೊಳ್ಳಬೇಕಾಗಿ|ಜರುಗಿಸಬೇಕಾಗಿ|ಕೈಗೊಳ್ಳಲು)|ಕೋರುತ್ತೇನೆ|ಪ್ರಾರ್ಥನೆ|ವಿನಂತಿ|ಆದೇಶಿಸಬೇಕಾಗಿ|ಪರಿಶೀಲಿಸಿ)[^\n.]*)/i,
    /(?:Therefore,?\s+)?(?:I|we)\s+(?:earnestly\s+)?(?:request|pray|urge|appeal|seek|implore)\s+(?:(?:to|you|the\s+(?:concerned\s+)?authorities|the\s+cyber\s+crime\s+cell|the\s+police)\s+to)?\s*([^\n.]+)/i,
  ];

  for (const pat of actionPatterns) {
    const am = normalizedCombined.match(pat);
    if (am && am[1]) {
      let cand = am[1].trim().replace(/\s+/g, ' ').replace(/^[,\s\-:]+|[,\s\-:]+$/g, '');
      if (cand.length >= 10) {
        rawAction = cand;
        break;
      }
    }
  }

  let requestedAction = '';
  let requestedActionKn = '';
  if (/[\u0C80-\u0CFF]/.test(rawAction)) {
    requestedActionKn = rawAction;
    requestedAction = catMeta.reliefEn;
  } else if (rawAction) {
    requestedAction = rawAction;
    requestedActionKn = catMeta.reliefKn;
  } else {
    requestedAction = catMeta.reliefEn;
    requestedActionKn = catMeta.reliefKn;
  }

  // 12. Description & Statements (Pure English & Pure Kannada - No Mixed Text)
  let complaintDesc = '';
  let complaintDescKn = '';
  if (/[\u0C80-\u0CFF]/.test(cleanText)) {
    complaintDescKn = cleanText.slice(0, 1000).trim();
    if (secondaryText && secondaryText.length > 30 && !/[\u0C80-\u0CFF]/.test(secondaryText)) {
      complaintDesc = secondaryText.slice(0, 1000).trim();
    } else {
      complaintDesc = `Grievance petition submitted by ${citizenName || 'citizen'} residing at ${citizenAddress}. Incident occurred on ${incidentDate} at ${incidentLocation}. Grievance classification: ${complaintCategory}. Demanded relief: ${requestedAction}.`;
    }
  } else {
    complaintDesc = cleanText.slice(0, 1000).trim();
    complaintDescKn = `${citizenNameKn || citizenName} ಅವರು ಸಲ್ಲಿಸಿದ ದೂರು ಅರ್ಜಿ. ವಾಸಸ್ಥಳ: ${citizenAddressKn}. ಘಟನೆ ನಡೆದ ದಿನಾಂಕ: ${incidentDate}, ಸ್ಥಳ: ${incidentLocationKn}. ವಿಷಯ: ${complaintCategoryKn}. ಕೋರಿದ ಪರಿಹಾರ: ${requestedActionKn}.`;
  }

  // 13. Directives / Assignment Instructions (Pure English & Pure Kannada)
  const assignmentInstructionsEn = catMeta.directivesEn
    .replace('{loc}', incidentLocation || villageLocality || taluk);
  const assignmentInstructionsKn = catMeta.directivesKn
    .replace('{loc}', incidentLocationKn || villageLocalityKn || talukKn);

  // 14. Clean, Unmixed Summaries for Stage 2
  const englishSummary = `Citizen petition regarding ${complaintCategory} at ${incidentLocation || villageLocality || taluk}, ${taluk} Taluk. Demanded relief: ${requestedAction}`;
  const kannadaSummary = `${incidentLocationKn || villageLocalityKn || talukKn} ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ${complaintCategoryKn} ಕುರಿತು ಸಲ್ಲಿಕೆಯಾದ ನಾಗರಿಕ ಅರ್ಜಿ. ಕೋರಿದ ಪರಿಹಾರ: ${requestedActionKn}`;

  // 15. Confidence Scores
  const citizenConf =
    rawCitizenName && citizenPhone
      ? 'HIGH'
      : rawCitizenName || citizenPhone
      ? 'NEEDS_REVIEW'
      : 'MISSING';
  const catConf =
    detectedCatKey !== 'General Grievance' ? 'HIGH' : 'NEEDS_REVIEW';
  const locConf = rawLoc || villageLocality ? 'HIGH' : 'MISSING';
  const dateConf = dateFound ? 'HIGH' : 'NEEDS_REVIEW';

  return {
    citizenName,
    citizenNameKn,
    citizenPhone,
    citizenEmail,
    citizenAddress,
    citizenAddressKn,
    district: 'Bengaluru Urban',
    districtKn: 'ಬೆಂಗಳೂರು ನಗರ',
    taluk,
    talukKn,
    villageLocality,
    villageLocalityKn,
    complaintTitle,
    complaintTitleKn,
    complaintCategory,
    complaintCategoryKn,
    incidentDate,
    incidentLocation,
    incidentLocationKn,
    complaintDesc,
    complaintDescKn,
    requestedAction,
    requestedActionKn,
    complaintLanguage,
    englishSummary,
    kannadaSummary,
    assignmentInstructionsEn,
    assignmentInstructionsKn,
    suggestedDepartment,
    suggestedPriority,
    confidenceScores: {
      citizen: citizenConf,
      category: catConf,
      location: locConf,
      date: dateConf,
    },
  };
}
