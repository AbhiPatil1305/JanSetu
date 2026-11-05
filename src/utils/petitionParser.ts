/**
 * Client-side intelligent parser to extract grievance form fields from OCR / document text.
 * Supports English, Kannada, and bilingual government grievance petitions.
 */

export interface ParsedPetitionData {
  citizenName: string;
  citizenPhone: string;
  citizenEmail: string;
  citizenAddress: string;
  district: string;
  taluk: string;
  villageLocality: string;
  complaintTitle: string;
  complaintCategory: string;
  incidentDate: string;
  incidentLocation: string;
  complaintDesc: string;
  requestedAction: string;
  complaintLanguage: 'kannada' | 'english' | 'bilingual';
  englishSummary: string;
  kannadaSummary: string;
  confidenceScores: {
    citizen: 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';
    category: 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';
    location: 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';
    date: 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';
  };
}

const TALUKS = [
  'Bengaluru South',
  'Bengaluru North',
  'Bengaluru East',
  'Anekal',
  'Yelahanka',
];

const LOCALITIES = [
  'Koramangala',
  'Indiranagar',
  'Agara',
  'Whitefield',
  'HSR Layout',
  'Jayanagar',
  'BTM Layout',
  'Electronic City',
  'Bellandur',
  'Marathahalli',
  'Hebbal',
  'Yelahanka',
  'Malleshwaram',
  'Rajajinagar',
  'Basavanagudi',
  'Banashankari',
  'Shivajinagar',
  'Sarjapur Road',
  'MG Road',
  'HAL',
];

function normalizeDate(rawDateStr: string): string {
  const cleaned = rawDateStr.trim().replace(/[-.]/g, '/');
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

      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
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

export function parsePetitionText(text: string): ParsedPetitionData {
  const today = new Date().toISOString().split('T')[0];
  if (!text || !text.trim()) {
    return {
      citizenName: '',
      citizenPhone: '',
      citizenEmail: '',
      citizenAddress: '',
      district: 'Bengaluru Urban',
      taluk: 'Bengaluru South',
      villageLocality: '',
      complaintTitle: '',
      complaintCategory: 'General Grievance',
      incidentDate: today,
      incidentLocation: '',
      complaintDesc: '',
      requestedAction: '',
      complaintLanguage: 'english',
      englishSummary: '',
      kannadaSummary: '',
      confidenceScores: {
        citizen: 'MISSING',
        category: 'NEEDS_REVIEW',
        location: 'MISSING',
        date: 'NEEDS_REVIEW',
      },
    };
  }

  const cleanText = text.trim();

  // 1. Detect language
  const kannadaChars = (cleanText.match(/[\u0C80-\u0CFF]/g) || []).length;
  const englishChars = (cleanText.match(/[A-Za-z]/g) || []).length;
  let complaintLanguage: 'kannada' | 'english' | 'bilingual' = 'english';
  if (kannadaChars > 30 && englishChars > 30) {
    complaintLanguage = 'bilingual';
  } else if (kannadaChars > 30) {
    complaintLanguage = 'kannada';
  }

  // 2. Extract Phone Number
  let citizenPhone = '';
  const phoneRegex = /(?:(?:Mob(?:ile)?|Phone|Tel|ದೂರವಾಣಿ|ಮೊಬೈಲ್|Cell)\s*[:\-]?\s*)?(?:\+91[\s\-]?)?([6-9]\d{4}[\s\-]?\d{5}|[6-9]\d{9})\b/;
  const phoneMatch = cleanText.match(phoneRegex);
  if (phoneMatch) {
    const rawDigits = phoneMatch[1].replace(/[\s\-]/g, '');
    if (rawDigits.length === 10) {
      citizenPhone = `+91 ${rawDigits.slice(0, 5)} ${rawDigits.slice(5)}`;
    } else {
      citizenPhone = phoneMatch[0].trim();
    }
  }

  // 3. Extract Email
  let citizenEmail = '';
  const emailMatch = cleanText.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (emailMatch) {
    citizenEmail = emailMatch[1].toLowerCase();
  }

  // 4. Extract Citizen Name
  let citizenName = '';
  const namePatterns = [
    /(?:From|Applicant|Petitioner|Complainant|Name)\s*[:\-]\s*([A-Za-z\s.]{2,40})(?=\n|,|Address|Mobile|Phone|Email|No\.)/i,
    /(?:ಅರ್ಜಿದಾರರು|ಹೆಸರು)\s*[:\-]\s*([^\n,]{2,40})/i,
    /From\s*\n\s*([A-Za-z\s.]{3,40})\n/i,
  ];
  for (const pat of namePatterns) {
    const m = cleanText.match(pat);
    if (m && m[1]) {
      let candidate = m[1].trim();
      candidate = candidate.replace(/^(Sri|Smt|Mr|Mrs|Dr|Shri)\.?\s+/i, '').trim();
      if (
        candidate &&
        !/^(Deputy|Commissioner|Police|Inspector|Department|District|Superintendent|Officer|Respected)/i.test(candidate)
      ) {
        citizenName = candidate;
        break;
      }
    }
  }

  // 5. Extract Incident / Petition Date
  let incidentDate = today;
  let dateFound = false;
  const dateMatch = cleanText.match(
    /(?:Date|Dated|ದಿನಾಂಕ|on)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i
  );
  if (dateMatch && dateMatch[1]) {
    incidentDate = normalizeDate(dateMatch[1]);
    dateFound = true;
  }

  // 6. Extract Category
  let complaintCategory = 'General Grievance';
  if (/noise|loudspeaker|amplified|music|sound|decibel|ಶಬ್ದ|ಧ್ವನಿ/i.test(cleanText)) {
    complaintCategory = 'Public Nuisance & Noise Pollution';
  } else if (/cyber|telegram|fraud|trading|crypto|upi|online investment|scam|ಖಾತೆ|ವಂಚನೆ/i.test(cleanText)) {
    complaintCategory = 'Cyber Financial Fraud';
  } else if (/encroachment|gomal|survey\s*no|fencing|land|ಕಬಳಿಕೆ|ಒತ್ತುವರಿ|ಜಮೀನು|ಸರ್ವೆ/i.test(cleanText)) {
    complaintCategory = 'Land Encroachment & Illegal Occupation';
  } else if (/theft|stolen|robbery|burglary|snatching|ಕಳ್ಳತನ|ದರೋಡೆ/i.test(cleanText)) {
    complaintCategory = 'Theft & Burglary';
  } else if (/threat|intimidation|harassment|extortion|abusive|ಬೆದರಿಕೆ|ಕಿರುಕುಳ/i.test(cleanText)) {
    complaintCategory = 'Threat & Harassment';
  } else if (/traffic|parking|footpath|pedestrian|obstruction|ರಸ್ತೆ|ವಾಹನ|ಸಂಚಾರ/i.test(cleanText)) {
    complaintCategory = 'Traffic & Road Obstruction';
  } else if (/drainage|sewage|garbage|sanitation|drinking water|ನೀರು|ತ್ಯಾಜ್ಯ|ಕಸ|ಚರಂಡಿ/i.test(cleanText)) {
    complaintCategory = 'Civic Amenities & Sanitation';
  }

  // 7. Extract Subject / Title
  let complaintTitle = '';
  const subMatch = cleanText.match(/(?:Subject|Sub|ವಿಷಯ|ಕುರಿತು)\s*[:\-]\s*([^\n]+)/i);
  if (subMatch && subMatch[1]) {
    complaintTitle = subMatch[1].trim().replace(/^["'\s]+|["'\s.]+$/g, '');
  }
  if (!complaintTitle) {
    complaintTitle = `Petition regarding ${complaintCategory.toLowerCase()}`;
  }

  // 8. Extract Taluk & Locality
  let taluk = 'Bengaluru South';
  for (const t of TALUKS) {
    if (new RegExp(`\\b${t}\\b`, 'i').test(cleanText)) {
      taluk = t;
      break;
    }
  }
  if (/ಬೆಂಗಳೂರು\s*ಉತ್ತರ/i.test(cleanText)) taluk = 'Bengaluru North';
  else if (/ಬೆಂಗಳೂರು\s*ಪೂರ್ವ/i.test(cleanText)) taluk = 'Bengaluru East';
  else if (/ಆನೇಕಲ್/i.test(cleanText)) taluk = 'Anekal';
  else if (/ಬೆಂಗಳೂರು\s*ದಕ್ಷಿಣ/i.test(cleanText)) taluk = 'Bengaluru South';

  let villageLocality = '';
  for (const loc of LOCALITIES) {
    if (new RegExp(`\\b${loc}\\b`, 'i').test(cleanText)) {
      villageLocality = loc;
      break;
    }
  }

  // 9. Extract Address
  let citizenAddress = '';
  const addrMatch = cleanText.match(
    /(?:Address|Residing at|ವಿಳಾಸ)\s*[:\-]\s*([^\n]+(?:\n[^\n]+)?)(?=\n|Mobile|Phone|Email|Cell|$)/i
  );
  if (addrMatch && addrMatch[1]) {
    citizenAddress = addrMatch[1].replace(/\s+/g, ' ').trim();
  } else if (villageLocality) {
    citizenAddress = `${villageLocality}, ${taluk}, Bengaluru Urban`;
  }

  // 10. Extract Incident Location
  let incidentLocation = '';
  const locRegex = /(?:at|near|location|ಸ್ಥಳ)\s*[:\-]?\s*([A-Za-z0-9\u0C80-\u0CFF\s,\-]{3,45})(?=\.|\n|, on|, dated)/i;
  const locMatch = cleanText.match(locRegex);
  if (locMatch && locMatch[1] && !/^(the|deputy|respected|sir|madam|ಮಾನ್ಯ)/i.test(locMatch[1].trim())) {
    incidentLocation = locMatch[1].trim();
  } else if (villageLocality) {
    incidentLocation = `${villageLocality}, ${taluk}`;
  }

  // 11. Extract Relief / Requested Action
  let requestedAction = '';
  const actionMatch = cleanText.match(
    /(?:Prayer|Relief|Request|ಮನವಿ|ಕೋರಿಕೆ)\s*[:\-]\s*([^\n]+(?:\n[^\n]+)?)/i
  );
  if (actionMatch && actionMatch[1]) {
    requestedAction = actionMatch[1].replace(/\s+/g, ' ').trim();
  } else {
    const reqLine = cleanText.match(/(?:request(?: you| the authorities)? to [^.\n]+|take necessary action[^.\n]+|ಸೂಕ್ತ ಕ್ರಮ ಕೈಗೊಳ್ಳಬೇಕಾಗಿ[^.\n]+)/i);
    if (reqLine) {
      requestedAction = reqLine[0].trim();
    } else {
      requestedAction = `Immediate inquiry and statutory action regarding ${complaintCategory.toLowerCase()}.`;
    }
  }

  // 12. Extracted Summaries
  const complaintDesc = cleanText.slice(0, 1000).trim();
  const locationDesc = incidentLocation || villageLocality || 'Bengaluru Urban';

  const englishSummary = `${
    citizenName ? `Petition from ${citizenName}` : 'Citizen petition'
  } regarding ${complaintCategory.toLowerCase()} at ${locationDesc}. Relief sought: ${requestedAction || 'Immediate site inspection and inquiry'}.`;

  // Kannada Summary is left to be translated directly by the translation module
  const kannadaSummary = '';

  // 13. Confidence Scores
  const citizenConf = citizenName && citizenPhone ? 'HIGH' : citizenName || citizenPhone ? 'NEEDS_REVIEW' : 'MISSING';
  const catConf = complaintCategory !== 'General Grievance' ? 'HIGH' : 'NEEDS_REVIEW';
  const locConf = incidentLocation || villageLocality ? 'HIGH' : 'MISSING';
  const dateConf = dateFound ? 'HIGH' : 'NEEDS_REVIEW';

  return {
    citizenName,
    citizenPhone,
    citizenEmail,
    citizenAddress,
    district: 'Bengaluru Urban',
    taluk,
    villageLocality,
    complaintTitle,
    complaintCategory,
    incidentDate,
    incidentLocation,
    complaintDesc,
    requestedAction,
    complaintLanguage,
    englishSummary,
    kannadaSummary,
    confidenceScores: {
      citizen: citizenConf,
      category: catConf,
      location: locConf,
      date: dateConf,
    },
  };
}
