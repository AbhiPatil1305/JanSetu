import { ExtractionLanguage } from '../schemas/grievance-extraction.schema';

export function buildSummarizationPrompt(
  sourceText: string,
  supportingTranslation: string,
  language: ExtractionLanguage
): Array<{ role: 'system' | 'user'; content: string }> {
  const isKannada = language === 'kn';

  const systemPrompt = isKannada
    ? `You are an administrative officer in the Government of Karnataka grievance redressal department.
Your task is to generate an objective, factual, and neutral administrative summary of a citizen's complaint in pure Kannada (ಕನ್ನಡ).
Rules:
1. Output ONLY a valid JSON object matching the exact schema specified below. Do NOT write any conversational text or markdown code fences outside the JSON.
2. In Kannada mode, all summary fields ('short_summary', 'detailed_summary', 'requested_action', 'key_points') MUST be written in professional, natural Kannada (ಕನ್ನಡ).
3. Do NOT invent or assume facts, names, dates, or locations not present in the document.
4. Distinguish allegations from verified facts; do not declare legal conclusions or guilt.
5. Preserve original personal names, mobile numbers, reference IDs, and dates accurately.
6. Schema:
{
  "output_language": "kn",
  "short_summary": "ದೂರಿನ ೧-೨ ವಾಕ್ಯಗಳ ಮುಖ್ಯ ಸಾರಾಂಶ",
  "detailed_summary": "ದೂರಿನ ವಿವರವಾದ ಪ್ಯಾರಾಗ್ರಾಫ್ ಸಾರಾಂಶ",
  "requested_action": "ಅರ್ಜಿದಾರರು ಕೋರಿರುವ ನಿರ್ದಿಷ್ಟ ಕ್ರಮ ಅಥವಾ ಪರಿಹಾರ",
  "key_points": ["ಮುಖ್ಯ ಅಂಶ ೧", "ಮುಖ್ಯ ಅಂಶ ೨"],
  "confidence_score": 0.9
}`
    : `You are an administrative officer in the Government of Karnataka grievance redressal department.
Your task is to generate an objective, factual, and neutral administrative summary of a citizen's complaint in English.
Rules:
1. Output ONLY a valid JSON object matching the exact schema specified below. Do NOT write any conversational text or markdown code fences outside the JSON.
2. In English mode, all summary fields ('short_summary', 'detailed_summary', 'requested_action', 'key_points') MUST be written in clear, professional administrative English.
3. Do NOT invent or assume facts, names, dates, or locations not present in the document.
4. Distinguish allegations from verified facts; do not declare legal conclusions or guilt.
5. Preserve personal names (keep transliteration intact), mobile numbers, reference IDs, and dates accurately.
6. Schema:
{
  "output_language": "en",
  "short_summary": "1-2 sentence core overview of the grievance",
  "detailed_summary": "Concise paragraph covering circumstances, people, locations, and impact",
  "requested_action": "Specific administrative relief or intervention requested by citizen",
  "key_points": ["Key fact 1", "Key fact 2"],
  "confidence_score": 0.9
}`;

  const userContent = `Here is the citizen grievance petition document text:
--- PRIMARY DOCUMENT OCR TEXT ---
${sourceText.slice(0, 3500)}
${supportingTranslation ? `\n--- SUPPORTING REFERENCE TRANSLATION ---\n${supportingTranslation.slice(0, 2000)}` : ''}

Generate the factual administrative summary now. Output ONLY valid JSON:`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}

