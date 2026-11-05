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
  suggestedDepartment?: string;
  suggestedPriority?: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
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

const LOCALITIES_MAP: Record<string, string[]> = {
  Koramangala: ['koramangala', 'ಕೋರಮಂಗಲ', '80ft road', 'st bed'],
  Indiranagar: ['indiranagar', 'ಇಂದಿರಾನಗರ', '100ft road', 'cmh road'],
  Agara: ['agara', 'ಅಗರ', 'agara village', 'agara lake'],
  Whitefield: ['whitefield', 'ವೈಟ್‌ಫೀಲ್ಡ್', 'itpb', 'kadugodi'],
  'HSR Layout': ['hsr layout', 'hsr', 'ಎಚ್‌ಎಸ್‌ಆರ್'],
  Jayanagar: ['jayanagar', 'ಜಯನಗರ'],
  'BTM Layout': ['btm layout', 'btm', 'ಬಿಟಿಎಂ'],
  'Electronic City': ['electronic city', 'ecity', 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ'],
  Bellandur: ['bellandur', 'ಬೆಳ್ಳಂದೂರು', 'bellandur lake', 'outer ring road'],
  Marathahalli: ['marathahalli', 'ಮಾರತ್ತಹಳ್ಳಿ'],
  Hebbal: ['hebbal', 'ಹೆಬ್ಬಾಳ'],
  Yelahanka: ['yelahanka', 'ಯಲಹಂಕ', 'nes office'],
  Malleshwaram: ['malleshwaram', 'ಮಲ್ಲೇಶ್ವರಂ', 'sampige road'],
  Rajajinagar: ['rajajinagar', 'ರಾಜಾಜಿನಗರ'],
  Basavanagudi: ['basavanagudi', 'ಬಸವನಗುಡಿ', 'd absurdity', 'gandhi bazaar'],
  Banashankari: ['banashankari', 'ಬನಶಂಕರಿ', 'bsk'],
  Shivajinagar: ['shivajinagar', 'ಶಿವಾಜಿನಗರ', 'russell market'],
  'Sarjapur Road': ['sarjapur', 'ಸರ್ಜಾಪುರ', 'sarjapur road'],
  'MG Road': ['mg road', 'brigade road', 'residency road'],
  HAL: ['hal', 'old airport road'],
};

/**
 * Converts Kannada Unicode digits (೦-೯) to standard Arabic digits (0-9).
 */
export function convertKannadaDigits(input: string): string {
  if (!input) return '';
  return input.replace(/[\u0CE6-\u0CEF]/g, (ch) =>
    String(ch.charCodeAt(0) - 0x0ce6)
  );
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
        // YYYY/MM/DD
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else {
        // DD/MM/YYYY
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
 * Intelligent grievance text parser. Accepts primary document text and optional
 * secondary text (such as English neural translation or WebLLM summary) to maximize
 * entity extraction fidelity.
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

  // 1. Detect language
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
  const phoneRegex = /(?:(?:Mob(?:ile)?|Phone|Tel|Cell|Contact|ಸಂಪರ್ಕ|ದೂರವಾಣಿ|ಮೊಬೈಲ್|Ph)\s*[:\-.]?\s*)?(?:\+91[\s\-]?)?([6-9]\d{4}[\s\-]?\d{5}|[6-9]\d{9})\b/i;
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
    // Fallback: Standalone 10-digit Indian mobile number
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

  // 4. Extract Citizen Name
  let citizenName = '';
  const namePatterns = [
    /(?:Applicant|Petitioner|Complainant)\s+Name\s*[:\-]?\s*([^\n,]{2,40})/i,
    /(?:From|Applicant|Petitioner|Complainant|Name|ಅರ್ಜಿದಾರರು|ದೂರುದಾರರು|ಹೆಸರು)\s*[:\-]?\s*([^\n,]{2,40})/i,
    /(?:From|ಇಂದ)\s*[:\-]?\s*\n\s*([^\n,]{3,40})/i,
    /(?:ನನ್ನ ಹೆಸರು|My name is|I,?\s+)\s*([A-Za-z\u0C80-\u0CFF\s.]{3,35})(?=\s*,\s*(?:residing|ವಾಸವಾಗಿರುವ|ಇವರು|aged|s\/o|w\/o|d\/o))/i,
    /(?:ಅರ್ಜಿದಾರರಾದ|ದೂರುದಾರರಾದ)\s*([A-Za-z\u0C80-\u0CFF\s.]{3,35})/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?=\s*,\s*(?:residing|citizen|petitioner|applicant))/i,
  ];

  for (const pat of namePatterns) {
    const m = cleanText.match(pat) || combinedText.match(pat);
    if (m && m[1]) {
      let candidate = m[1].trim();
      candidate = candidate
        .replace(/^(Sri|Smt|Mr|Mrs|Dr|Shri|Kumari|Miss|ಶ್ರೀ|ಶ್ರೀಮತಿ|ಕುಮಾರಿ)\.?\s+/i, '')
        .replace(/[\n\r]+/g, ' ')
        .trim();
      if (
        candidate &&
        candidate.length >= 3 &&
        !/^(Deputy|Commissioner|Police|Inspector|Department|District|Superintendent|Officer|Station|The\s+Class|ಅಧಿಕಾರಿ|ಠಾಣಾಧಿಕಾರಿ|To\b|Hon|Respected)/i.test(
          candidate
        )
      ) {
        citizenName = candidate;
        break;
      }
    }
  }

  // 5. Extract Incident / Petition Date
  let incidentDate = today;
  let dateFound = false;
  const dateMatch =
    normalizedCombined.match(
      /(?:Date|Dated|ದಿನಾಂಕ|on)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i
    ) ||
    normalizedPrimary.match(
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/
    );

  if (dateMatch && dateMatch[1]) {
    incidentDate = normalizeDate(dateMatch[1]);
    dateFound = true;
  }

  // 6. Extract Subject / Title
  let complaintTitle = '';
  const subMatch =
    cleanText.match(/(?:Subject|Sub|Re|Regarding|ವಿಷಯ|ಕುರಿತು)\s*[:\-]\s*([^\n]+)/i) ||
    (secondaryText ? secondaryText.match(/(?:Subject|Sub|Regarding)\s*[:\-]\s*([^\n]+)/i) : null) ||
    cleanText.match(/(?:Complaint|Petition)\s+(?:against|regarding|for)\s*[:\-]?\s*([^\n]+)/i);

  if (subMatch && subMatch[1]) {
    complaintTitle = subMatch[1].trim().replace(/^["'\s\-:]+|["'\s.]+$/g, '');
  }

  // 7. Extract Category, Department & Priority
  let complaintCategory = 'General Grievance';
  let suggestedDepartment = 'Home & Police Department';
  let suggestedPriority: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL' = 'HIGH';

  const lowerAll = combinedText.toLowerCase();

  if (
    /noise|loudspeaker|amplified|music|sound|decibel|ಧ್ವನಿ|ಶಬ್ದ|ಅಡಚಣೆ/i.test(lowerAll)
  ) {
    complaintCategory = 'Public Nuisance & Noise Pollution';
    suggestedDepartment = 'Home & Police Department';
    suggestedPriority = 'HIGH';
  } else if (
    /cyber|telegram|fraud|trading|crypto|upi|online investment|scam|financial fraud|ಖಾತೆ|ವಂಚನೆ|ಸೈಬರ್/i.test(
      lowerAll
    )
  ) {
    complaintCategory = 'Cyber Financial Fraud';
    suggestedDepartment = 'Home & Police Department';
    suggestedPriority = 'CRITICAL';
  } else if (
    /encroachment|gomal|survey\s*no|fencing|land dispute|mutation|rtc|khata|ಕಬಳಿಕೆ|ಒತ್ತುವರಿ|ಜಮೀನು|ಖಾತಾ|ಪಹಣಿ/i.test(
      lowerAll
    )
  ) {
    complaintCategory = 'Land Encroachment & Illegal Occupation';
    suggestedDepartment = 'Revenue Department';
    suggestedPriority = 'HIGH';
  } else if (
    /theft|stolen|robbery|burglary|snatching|vehicle stolen|ಕಳ್ಳತನ|ದರೋಡೆ/i.test(lowerAll)
  ) {
    complaintCategory = 'Theft & Burglary';
    suggestedDepartment = 'Home & Police Department';
    suggestedPriority = 'HIGH';
  } else if (
    /threat|intimidation|harassment|extortion|abusive|assault|ಬೆದರಿಕೆ|ಕಿರುಕುಳ|ಹಲ್ಲೆ/i.test(
      lowerAll
    )
  ) {
    complaintCategory = 'Threat & Harassment';
    suggestedDepartment = 'Home & Police Department';
    suggestedPriority = 'CRITICAL';
  } else if (
    /traffic|parking|footpath|pedestrian|obstruction|pothole|ರಸ್ತೆ|ವಾಹನ|ಗುಂಡಿ/i.test(lowerAll)
  ) {
    complaintCategory = 'Traffic & Road Obstruction';
    suggestedDepartment = 'Bruhat Bengaluru Mahanagara Palike (BBMP)';
    suggestedPriority = 'MEDIUM';
  } else if (
    /drainage|sewage|garbage|sanitation|drinking water|pipeline|water supply|ನೀರು|ತ್ಯಾಜ್ಯ|ಒಳಚರಂಡಿ/i.test(
      lowerAll
    )
  ) {
    complaintCategory = 'Civic Amenities & Sanitation';
    suggestedDepartment = 'Bruhat Bengaluru Mahanagara Palike (BBMP)';
    suggestedPriority = 'MEDIUM';
  }

  if (!complaintTitle) {
    complaintTitle = `Petition regarding ${complaintCategory.toLowerCase()}`;
  }

  // 8. Extract Taluk & Locality
  let taluk = 'Bengaluru South';
  for (const t of TALUKS) {
    if (new RegExp(`\\b${t}\\b`, 'i').test(combinedText)) {
      taluk = t;
      break;
    }
  }

  let villageLocality = '';
  for (const [canonicalLoc, aliases] of Object.entries(LOCALITIES_MAP)) {
    for (const alias of aliases) {
      if (lowerAll.includes(alias.toLowerCase())) {
        villageLocality = canonicalLoc;
        break;
      }
    }
    if (villageLocality) break;
  }

  // 9. Extract Address
  let citizenAddress = '';
  const addrMatch = combinedText.match(
    /(?:Address|Residing at|ವಿಳಾಸ|ವಾಸವಿರುವ)\s*[:\-]\s*([^\n]+(?:\n[^\n]+)?)(?=\n|Mobile|Phone|Email|Cell|$)/i
  );
  if (addrMatch && addrMatch[1]) {
    citizenAddress = addrMatch[1].replace(/\s+/g, ' ').trim();
  } else if (villageLocality) {
    citizenAddress = `${villageLocality}, ${taluk}, Bengaluru Urban`;
  }

  // 10. Extract Incident Location
  let incidentLocation = '';
  const locRegex = /(?:at|near|location|ಸ್ಥಳ|place of incident)\s*[:\-]?\s*([A-Za-z0-9\u0C80-\u0CFF\s,\-]{3,50})(?=\.|\n|, on|, dated)/i;
  const locMatch = combinedText.match(locRegex);
  if (
    locMatch &&
    locMatch[1] &&
    !/^(the|deputy|respected|sir|madam|ಮಾನ್ಯರೆ)/i.test(locMatch[1].trim())
  ) {
    incidentLocation = locMatch[1].trim();
  } else if (villageLocality) {
    incidentLocation = `${villageLocality}, ${taluk}`;
  }

  // 11. Extract Relief / Requested Action
  let requestedAction = '';
  const actionMatch = combinedText.match(
    /(?:Prayer|Relief|Request|ಮನವಿ|ಕೋರಿಕೆ|ಪರಿಹಾರ)\s*[:\-]\s*([^\n]+(?:\n[^\n]+)?)/i
  );
  if (actionMatch && actionMatch[1]) {
    requestedAction = actionMatch[1].replace(/\s+/g, ' ').trim();
  } else {
    const reqLine = combinedText.match(
      /(?:request(?: you| the authorities)? to [^.\n]+|take necessary action[^.\n]+|ಕೂಡಲೇ [^.\n]+ ಕ್ರಮ|ಪರಿಶೀಲಿಸಿ [^.\n]+)/i
    );
    if (reqLine) {
      requestedAction = reqLine[0].trim();
    } else {
      requestedAction = `Immediate inquiry and statutory administrative action regarding ${complaintCategory.toLowerCase()}.`;
    }
  }

  // 12. Description & Summaries
  const complaintDesc =
    secondaryText && secondaryText.length > 50
      ? secondaryText.slice(0, 1000).trim()
      : cleanText.slice(0, 1000).trim();

  const englishSummary = `${citizenName ? `Petition from ${citizenName}` : 'Citizen petition'} regarding ${complaintCategory.toLowerCase()} at ${incidentLocation || villageLocality || 'Bengaluru Urban'}. Relief sought: ${requestedAction.slice(0, 120)}.`;
  const kannadaSummary =
    complaintLanguage === 'kannada' || complaintLanguage === 'bilingual'
      ? `${complaintTitle} ವಿಷಯವಾಗಿ ತುರ್ತು ವಿಚಾರಣೆ ಮತ್ತು ಕ್ರಮ ಕೈಗೊಳ್ಳುವಂತೆ ಕೋರಿ ಸಲ್ಲಿಕೆಯಾದ ಅರ್ಜಿ.`
      : `ದೂರು ಸಾರಾಂಶ: ${complaintCategory} ಕುರಿತು ಕ್ರಮಕ್ಕಾಗಿ ಸಲ್ಲಿಕೆಯಾದ ನಾಗರಿಕ ಅರ್ಜಿ.`;

  // 13. Confidence Scores
  const citizenConf =
    citizenName && citizenPhone
      ? 'HIGH'
      : citizenName || citizenPhone
      ? 'NEEDS_REVIEW'
      : 'MISSING';
  const catConf =
    complaintCategory !== 'General Grievance' ? 'HIGH' : 'NEEDS_REVIEW';
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
