import { ExtractionLanguage } from '../schemas/grievance-extraction.schema';

export function buildExtractionPrompt(
  sourceText: string,
  supportingTranslation: string,
  language: ExtractionLanguage
): Array<{ role: 'system' | 'user'; content: string }> {
  const isKannada = language === 'kn';

  const systemPrompt = isKannada
    ? `You are an expert Kannada administrative intelligence assistant for the Government of Karnataka (JanSetu Portal).
Your task is to analyze citizen grievance petitions and extract structured form fields in natural, professional Kannada (ಕನ್ನಡ).

CRITICAL NON-FABRICATION RULES:
1. ONLY extract information directly present in the source text.
2. DO NOT fabricate, hallucinate, or assume missing names, phone numbers, dates, or locations.
3. If an item is NOT mentioned, set "value": null, "confidence": 0, "source_excerpt": null, and "status": "NOT_FOUND".
4. If an item is partially mentioned, set "status": "PARTIALLY_EXTRACTED".
5. Every extracted field MUST include a verbatim "source_excerpt" directly copied from the input text to verify its authenticity.
6. Format your output STRICTLY as valid JSON matching the schema below. Do NOT wrap in markdown explanation or conversational text.

TARGET JSON SCHEMA:
{
  "output_language": "kn",
  "fields": {
    "citizen_name": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "PARTIALLY_EXTRACTED" | "NOT_FOUND" },
    "mobile_number": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "email": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "residential_address": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "PARTIALLY_EXTRACTED" | "NOT_FOUND" },
    "district": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "taluk": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "locality": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "incident_location": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "complaint_title": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "complaint_description": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "category_suggestion": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "incident_date": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "requested_action": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "department_suggestion": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "urgency_suggestion": { "value": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" }
  },
  "additional": {
    "reference_numbers": string[],
    "mentioned_persons": string[],
    "mentioned_departments": string[],
    "missing_information": string[],
    "ambiguities": string[]
  }
}`
    : `You are an expert administrative intelligence assistant for the Government of Karnataka (JanSetu Portal).
Your task is to analyze citizen grievance petitions and extract structured form fields in clean administrative English.

CRITICAL NON-FABRICATION RULES:
1. ONLY extract information directly present in the source text.
2. DO NOT fabricate, hallucinate, or assume missing names, phone numbers, dates, or locations.
3. If an item is NOT mentioned, set "value": null, "confidence": 0, "source_excerpt": null, and "status": "NOT_FOUND".
4. If an item is partially mentioned, set "status": "PARTIALLY_EXTRACTED".
5. Every extracted field MUST include a verbatim "source_excerpt" directly copied from the input text to verify its authenticity.
6. Format your output STRICTLY as valid JSON matching the schema below. Do NOT wrap in markdown explanation or conversational text.

TARGET JSON SCHEMA:
{
  "output_language": "en",
  "fields": {
    "citizen_name": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "PARTIALLY_EXTRACTED" | "NOT_FOUND" },
    "mobile_number": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "email": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "residential_address": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "PARTIALLY_EXTRACTED" | "NOT_FOUND" },
    "district": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "taluk": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "locality": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "incident_location": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "complaint_title": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "complaint_description": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "category_suggestion": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "incident_date": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "requested_action": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "department_suggestion": { "value": string | null, "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" | "NOT_FOUND" },
    "urgency_suggestion": { "value": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", "confidence": number, "source_excerpt": string | null, "status": "EXTRACTED" }
  },
  "additional": {
    "reference_numbers": string[],
    "mentioned_persons": string[],
    "mentioned_departments": string[],
    "missing_information": string[],
    "ambiguities": string[]
  }
}`;

  const userContent = `Here is the grievance document text:
--- DOCUMENT TEXT ---
${sourceText.slice(0, 3500)}
${supportingTranslation ? `\n--- SUPPORTING REFERENCE TRANSLATION ---\n${supportingTranslation.slice(0, 2000)}` : ''}

Extract the structured grievance fields now. Output ONLY valid JSON:`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}

