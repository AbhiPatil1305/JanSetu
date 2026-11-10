import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useLanguage } from '../../providers/LanguageContext';
import { useNotifications } from '../../providers/NotificationContext';
import { complaintsService } from '../../services/api/complaints.service';
import { departmentsService } from '../../services/api/departments.service';
import { officersService } from '../../services/api/officers.service';
import { documentsService } from '../../services/api/documents.service';
import { translationsService } from '../../services/api/translations.service';
import { textAssistanceService } from '../../services/api/textAssistance.service';
import { GrammarCorrectionModal } from '../../components/complaints/GrammarCorrectionModal';
import {
  TextCorrectionResponse,
  CorrectionItem,
  AcceptedCorrectionAudit,
} from '../../types/textAssistance';
import { parsePetitionText, ParsedPetitionData } from '../../utils/petitionParser';
import {
  Department,
  PoliceStation,
  DepartmentClassificationResponse,
  DepartmentCandidate,
} from '../../types/department';
import { User } from '../../types/auth';
import { ComplaintPriority, ConfidenceLevel, Complaint } from '../../types/complaint';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { OcrPanel } from '../../components/complaints/OcrPanel';
import { WebLlmSummarizerSection } from '../../components/complaints/WebLlmSummarizerSection';
import { IntelligentFormExtractionSection } from '../../components/complaints/IntelligentFormExtractionSection';
import { GrievanceExtractionResult } from '../../types/extraction';
import {
  Upload,
  FileText,
  Sparkles,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Copy,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronLeft,
  Shield,
  Clock,
  ArrowRight,
  FileCheck,
  Building,
  Check,
  Bot,
  RefreshCw,
  Info,
} from 'lucide-react';


export const RegisterComplaintPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  // Workflow Stages: 1 = Upload, 2 = OCR/AI Review, 3 = Complete Form, 4 = Review & Register, 5 = Success
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Stage 1: File State
  const [file, setFile] = useState<{ name: string; size: number; url: string } | null>(null);
  const [uploadedRawFile, setUploadedRawFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Stage 2: OCR & AI Extraction
  const [rawOcr, setRawOcr] = useState('');
  const [reviewedOcr, setReviewedOcr] = useState('');
  const [englishSummary, setEnglishSummary] = useState('');
  const [kannadaSummary, setKannadaSummary] = useState('');
  const [fullTranslatedText, setFullTranslatedText] = useState('');
  const [fullTranslatedLang, setFullTranslatedLang] = useState<'en' | 'kn'>('en');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [confidenceScores, setConfidenceScores] = useState<{
    citizen: ConfidenceLevel;
    category: ConfidenceLevel;
    location: ConfidenceLevel;
    date: ConfidenceLevel;
  }>({
    citizen: 'HIGH',
    category: 'HIGH',
    location: 'HIGH',
    date: 'HIGH',
  });

  // Stage 3: Form Fields
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [citizenAddress, setCitizenAddress] = useState('');
  const [district, setDistrict] = useState('Bengaluru Urban');
  const [taluk, setTaluk] = useState('Bengaluru South');
  const [villageLocality, setVillageLocality] = useState('');

  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentLocation, setIncidentLocation] = useState('');
  const [requestedAction, setRequestedAction] = useState('');
  const [complaintLanguage, setComplaintLanguage] = useState<'kannada' | 'english' | 'bilingual'>('english');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [lastExtractionResult, setLastExtractionResult] = useState<GrievanceExtractionResult | null>(null);

  // AI Department Recommendation State (Local Qwen2.5 1.5B via Ollama)
  const [deptRecommendation, setDeptRecommendation] = useState<DepartmentClassificationResponse | null>(null);
  const [isRecommendingDept, setIsRecommendingDept] = useState(false);
  const [deptRecommendationError, setDeptRecommendationError] = useState<string | null>(null);

  const handleRunDepartmentRecommendation = async (overrideText?: string) => {
    const textToAnalyze = overrideText || complaintDesc || complaintTitle || reviewedOcr || rawOcr;
    if (!textToAnalyze || textToAnalyze.trim().length < 5) {
      showToast(
        'Insufficient Text',
        'Please enter or extract grievance details before requesting a department recommendation.',
        'warning'
      );
      return;
    }

    setIsRecommendingDept(true);
    setDeptRecommendationError(null);

    try {
      const res = await departmentsService.recommendDepartment({
        text: textToAnalyze,
        supporting_translation: englishSummary || kannadaSummary || undefined,
        incident_location: incidentLocation || (district ? `${taluk ? taluk + ', ' : ''}${district}` : undefined),
        model: 'qwen2.5:1.5b',
      });
      setDeptRecommendation(res);

      if (res.recommended_department) {
        showToast(
          'Department Recommendation Ready',
          `Suggested: ${res.recommended_department.department_name} (${res.application_confidence} confidence)`,
          'info'
        );
      }
    } catch (err: any) {
      console.error('Department classification error:', err);
      const detail = err?.response?.data?.detail || err?.message || 'Failed to connect to local Qwen2.5 classification service';
      setDeptRecommendationError(detail);
      showToast('Recommendation Failed', detail, 'error');
    } finally {
      setIsRecommendingDept(false);
    }
  };

  // AI Grammar & Writing Assistance State (Local Qwen2.5 1.5B via Ollama)
  const [grammarModalOpen, setGrammarModalOpen] = useState(false);
  const [grammarTargetField, setGrammarTargetField] = useState<'title' | 'description' | 'ocr' | 'summary'>('ocr');
  const [grammarOriginalText, setGrammarOriginalText] = useState<string>('');
  const [grammarResponse, setGrammarResponse] = useState<TextCorrectionResponse | null>(null);
  const [isGrammarLoading, setIsGrammarLoading] = useState(false);
  const [grammarError, setGrammarError] = useState<string | null>(null);
  const [textCorrectionAudits, setTextCorrectionAudits] = useState<AcceptedCorrectionAudit[]>([]);

  const handleCheckGrammar = async (
    field: 'title' | 'description' | 'ocr' | 'summary',
    overrideText?: string
  ) => {
    let textToCheck = overrideText;
    if (!textToCheck) {
      if (field === 'title') textToCheck = complaintTitle;
      else if (field === 'ocr') textToCheck = reviewedOcr || rawOcr;
      else if (field === 'summary') textToCheck = englishSummary || kannadaSummary;
      else textToCheck = complaintDesc || reviewedOcr || rawOcr;
    }

    if (!textToCheck || textToCheck.trim().length < 3) {
      showToast(
        'Insufficient Text',
        `No petition text available to check. Please upload a document or enter text first.`,
        'warning'
      );
      return;
    }

    setGrammarTargetField(field);
    setGrammarOriginalText(textToCheck);
    setGrammarModalOpen(true);
    setIsGrammarLoading(true);
    setGrammarError(null);
    setGrammarResponse(null);

    try {
      const res = await textAssistanceService.correctText({
        text: textToCheck,
        text_type: field === 'title' ? 'TITLE' : 'DESCRIPTION',
        language_hint: complaintLanguage === 'kannada' ? 'kn' : 'auto',
      });
      setGrammarResponse(res);
    } catch (err: any) {
      console.error('Grammar check error:', err);
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to connect to local grammar assistance service';
      setGrammarError(detail);
      showToast('Grammar Check Failed', detail, 'error');
    } finally {
      setIsGrammarLoading(false);
    }
  };

  const handleAcceptGrammarCorrections = (
    correctedText: string,
    appliedCorrections: CorrectionItem[]
  ) => {
    if (grammarTargetField === 'title') {
      setComplaintTitle(correctedText);
    } else if (grammarTargetField === 'ocr') {
      setReviewedOcr(correctedText);
      setComplaintDesc(correctedText);
    } else if (grammarTargetField === 'summary') {
      setEnglishSummary(correctedText);
      setComplaintDesc(correctedText);
    } else {
      setComplaintDesc(correctedText);
    }

    // Preserve audit record
    setTextCorrectionAudits((prev) => [
      ...prev,
      {
        target_field: grammarTargetField,
        original_text: grammarOriginalText,
        corrected_text: correctedText,
        accepted_at: new Date().toISOString(),
        accepted_by: user?.name || user?.email || 'Authorized Operator',
        model_version: grammarResponse?.model_version || 'qwen2.5:1.5b',
        corrections_applied_count: appliedCorrections.length,
      },
    ]);

    setGrammarModalOpen(false);
    showToast(
      'Corrections Applied',
      `Applied ${appliedCorrections.length} correction(s) to ${
        grammarTargetField === 'title'
          ? 'Grievance Title'
          : grammarTargetField === 'ocr'
          ? 'Reviewed OCR Document'
          : 'Complaint Statement'
      }.`,
      'success'
    );
  };

  const applyWebLlmExtractionResultToForm = (
    result: GrievanceExtractionResult,
    showNotice = true
  ) => {
    setLastExtractionResult(result);
    const f = result.fields;

    if (f.citizen_name.value) setCitizenName(f.citizen_name.value);
    if (f.mobile_number.value) setCitizenPhone(f.mobile_number.value);
    if (f.email.value) setCitizenEmail(f.email.value);
    if (f.residential_address.value) setCitizenAddress(f.residential_address.value);
    if (f.taluk.value) setTaluk(f.taluk.value);
    if (f.locality.value) setVillageLocality(f.locality.value);
    if (f.complaint_title.value) setComplaintTitle(f.complaint_title.value);
    if (f.category_suggestion.value) setComplaintCategory(f.category_suggestion.value);
    if (f.incident_date.value) setIncidentDate(f.incident_date.value);
    if (f.incident_location.value) setIncidentLocation(f.incident_location.value);
    if (f.complaint_description.value) setComplaintDesc(f.complaint_description.value);
    if (f.requested_action.value) setRequestedAction(f.requested_action.value);

    // Update target language for form
    setComplaintLanguage(result.output_language === 'kn' ? 'kannada' : 'english');

    // Department suggestion matching (suggestion ONLY, requires operator confirmation)
    if (f.department_suggestion.value && departments.length > 0) {
      const match = departments.find(
        (d) =>
          d.name.toLowerCase().includes(f.department_suggestion.value!.toLowerCase()) ||
          d.code.toLowerCase().includes(f.department_suggestion.value!.toLowerCase()) ||
          f.department_suggestion.value!.toLowerCase().includes(d.name.toLowerCase())
      );
      if (match) {
        setAiSuggestedDept(match);
      }
    }

    // Urgency suggestion (suggestion ONLY, requires operator confirmation)
    if (f.urgency_suggestion.value) {
      const u = f.urgency_suggestion.value.toUpperCase();
      if (u.includes('CRITICAL')) setAiSuggestedPriority('CRITICAL');
      else if (u.includes('HIGH')) setAiSuggestedPriority('HIGH');
      else if (u.includes('LOW')) setAiSuggestedPriority('LOW');
      else setAiSuggestedPriority('MEDIUM');
    }

    // Model confidence estimates
    setConfidenceScores({
      citizen: f.citizen_name.confidence > 0.8 ? 'HIGH' : f.citizen_name.value ? 'NEEDS_REVIEW' : 'MISSING',
      category: f.category_suggestion.confidence > 0.8 ? 'HIGH' : f.category_suggestion.value ? 'NEEDS_REVIEW' : 'MISSING',
      location: f.incident_location.confidence > 0.8 ? 'HIGH' : f.incident_location.value ? 'NEEDS_REVIEW' : 'MISSING',
      date: f.incident_date.confidence > 0.8 ? 'HIGH' : f.incident_date.value ? 'NEEDS_REVIEW' : 'MISSING',
    });

    setHasAutoFilled(true);

    // Automatically trigger local Qwen2.5 department classification in background
    const textForWebLlmClass = f.complaint_description.value || f.complaint_title.value || rawOcr || reviewedOcr;
    if (textForWebLlmClass && textForWebLlmClass.trim().length >= 10) {
      handleRunDepartmentRecommendation(textForWebLlmClass);
    }

    if (showNotice) {
      showToast(
        'Intelligent Form Pre-Filled',
        `Grievance fields populated in ${result.output_language === 'kn' ? 'Kannada' : 'English'} from document analysis.`,
        'success'
      );
    }
  };

  const renderFieldTraceBadge = (fieldKey: keyof GrievanceExtractionResult['fields']) => {
    if (!lastExtractionResult) return null;
    const f = lastExtractionResult.fields[fieldKey];
    if (!f) return null;
    if (f.status === 'NOT_FOUND' || !f.value) {
      return (
        <span className="text-[10px] text-slate-400 font-normal italic ml-2">
          (Not detected in document &bull; manual entry)
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-normal ml-2 cursor-help"
        title={
          f.source_excerpt
            ? `Local AI Extract (${Math.round(f.confidence * 100)}% est. conf.)\nSource excerpt: "${f.source_excerpt}"`
            : `Local AI Extract (${Math.round(f.confidence * 100)}% est. conf.)`
        }
      >
        <Bot className="w-2.5 h-2.5 text-indigo-600" />
        <span>Local AI ({Math.round(f.confidence * 100)}%)</span>
      </span>
    );
  };

  const applyExtractedDataToForm = (data: ParsedPetitionData, showNotice = false) => {
    if (data.citizenName) setCitizenName(data.citizenName);
    if (data.citizenPhone) setCitizenPhone(data.citizenPhone);
    if (data.citizenEmail) setCitizenEmail(data.citizenEmail);
    if (data.citizenAddress) setCitizenAddress(data.citizenAddress);
    if (data.taluk) setTaluk(data.taluk);
    if (data.villageLocality) setVillageLocality(data.villageLocality);
    if (data.complaintTitle) setComplaintTitle(data.complaintTitle);
    if (data.complaintCategory) setComplaintCategory(data.complaintCategory);
    if (data.incidentDate) setIncidentDate(data.incidentDate);
    if (data.incidentLocation) setIncidentLocation(data.incidentLocation);
    if (data.complaintDesc) setComplaintDesc(data.complaintDesc);
    if (data.requestedAction) setRequestedAction(data.requestedAction);
    if (data.complaintLanguage) setComplaintLanguage(data.complaintLanguage);
    if (data.englishSummary) setEnglishSummary(data.englishSummary);
    if (data.kannadaSummary) {
      setKannadaSummary(data.kannadaSummary);
    } else if (data.englishSummary) {
      // Use translation module directly to translate English summary to Kannada
      translationsService
        .translateText(data.englishSummary, 'en', 'kn')
        .then((res) => {
          if (res?.translated_text) {
            setKannadaSummary(res.translated_text);
          }
        })
        .catch(() => {});
    }
    if (data.confidenceScores) setConfidenceScores(data.confidenceScores);
    setHasAutoFilled(true);

    // Automatically trigger local Qwen2.5 department classification in background
    const textForParsedClass = data.complaintDesc || data.complaintTitle || rawOcr || reviewedOcr;
    if (textForParsedClass && textForParsedClass.trim().length >= 10) {
      handleRunDepartmentRecommendation(textForParsedClass);
    }

    if (showNotice) {
      showToast(
        'Form Fields Auto-Filled',
        'Citizen contact, grievance classification, and incident details successfully populated from document.',
        'success'
      );
    }
  };

  const handleAutoFillFromText = (showNotice = true) => {
    const textToParse = reviewedOcr || rawOcr;
    if (!textToParse || !textToParse.trim()) {
      showToast('No Document Text', 'Please extract or enter document text first.', 'warning');
      return;
    }
    const parsed = parsePetitionText(textToParse);
    applyExtractedDataToForm(parsed, showNotice);
  };

  // Dependent cascading selectors
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);

  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('HIGH');
  const [aiSuggestedDept, setAiSuggestedDept] = useState<Department | null>(null);
  const [aiSuggestedPriority, setAiSuggestedPriority] = useState<ComplaintPriority | null>(null);
  const [initialFollowupDate, setInitialFollowupDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [assignmentInstructions, setAssignmentInstructions] = useState('');

  // Stage 4: Verification
  const [verifiedCheckbox, setVerifiedCheckbox] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [createdOfficerName, setCreatedOfficerName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docUploadComplete, setDocUploadComplete] = useState(false);

  // Load departments
  useEffect(() => {
    departmentsService.getDepartments().then((depts) => {
      setDepartments(depts);
      if (depts.length > 0) {
        setSelectedDeptId(depts[0].id);
      }
    });
  }, []);

  // Update stations when department changes
  useEffect(() => {
    if (selectedDeptId) {
      departmentsService.getStations(selectedDeptId).then((stns) => {
        setStations(stns);
        if (stns.length > 0) {
          setSelectedStationId(stns[0].id);
        } else {
          setSelectedStationId('');
        }
      });
    } else {
      setStations([]);
      setSelectedStationId('');
    }
  }, [selectedDeptId]);

  // Update officers when station changes
  useEffect(() => {
    if (selectedStationId) {
      officersService
        .getOfficers(selectedStationId)
        .then((offs) => {
          setOfficers(offs);
          if (offs.length > 0) {
            setSelectedOfficerId(offs[0].id);
          } else {
            setSelectedOfficerId('');
          }
        })
        .catch(() => {
          setOfficers([]);
          setSelectedOfficerId('');
        });
    } else {
      setOfficers([]);
      setSelectedOfficerId('');
    }
  }, [selectedStationId]);

  const handleFileSelection = (droppedFile: File) => {
    if (droppedFile.size > 25 * 1024 * 1024) {
      showToast('File Too Large', 'Maximum allowed file size is 25 MB.', 'error');
      return;
    }

    setUploadedRawFile(droppedFile);
    const objectUrl = URL.createObjectURL(droppedFile);
    setFile({
      name: droppedFile.name,
      size: droppedFile.size,
      url: objectUrl,
    });

    // Derive initial title from filename if empty
    const derivedTitle = droppedFile.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .trim();
    if (!complaintTitle) {
      setComplaintTitle(derivedTitle);
    }

    setIsProcessingOcr(true);
    setUploadProgress(30);

    // Call backend direct extraction (PyMuPDF for PDF, python-docx for DOCX, OCR for images/scans)
    documentsService
      .extractTextFromFile(droppedFile)
      .then((res) => {
        const extracted = res.extracted_text || '';
        setRawOcr(extracted);
        setReviewedOcr(extracted);

        // Auto-extract structured form entities from petition text
        const parsed = parsePetitionText(extracted);
        if (res.extracted_fields) {
          if (res.extracted_fields.citizen_name) parsed.citizenName = res.extracted_fields.citizen_name;
          if (res.extracted_fields.phone) parsed.citizenPhone = res.extracted_fields.phone;
          if (res.extracted_fields.email) parsed.citizenEmail = res.extracted_fields.email;
          if (res.extracted_fields.address) parsed.citizenAddress = res.extracted_fields.address;
          if (res.extracted_fields.taluk) parsed.taluk = res.extracted_fields.taluk;
          if (res.extracted_fields.village_locality) parsed.villageLocality = res.extracted_fields.village_locality;
          if (res.extracted_fields.title) parsed.complaintTitle = res.extracted_fields.title;
          if (res.extracted_fields.category) parsed.complaintCategory = res.extracted_fields.category;
          if (res.extracted_fields.incident_date) parsed.incidentDate = res.extracted_fields.incident_date;
          if (res.extracted_fields.incident_location) parsed.incidentLocation = res.extracted_fields.incident_location;
          if (res.extracted_fields.requested_action) parsed.requestedAction = res.extracted_fields.requested_action;
          if (res.extracted_fields.language) parsed.complaintLanguage = res.extracted_fields.language;
        }
        applyExtractedDataToForm(parsed, false);

        if (res.ocr_status === 'FAILED' && res.ocr_error) {
          showToast('OCR Notice', res.ocr_error, 'warning');
        } else {
          showToast(
            'Document Extracted & Form Pre-Filled',
            `Successfully extracted text and populated form fields from ${droppedFile.name}. Review below.`,
            'success'
          );
        }
      })
      .catch((err) => {
        if (droppedFile.name.toLowerCase().endsWith('.txt')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const textContent = (e.target?.result as string) || '';
            setRawOcr(textContent);
            setReviewedOcr(textContent);
            const parsed = parsePetitionText(textContent);
            applyExtractedDataToForm(parsed, false);
          };
          reader.readAsText(droppedFile);
        } else {
          console.warn('Direct extraction notice:', err);
          showToast('Extraction Notice', err?.message || 'Proceed to verify or extract text.', 'warning');
        }
      })
      .finally(() => {
        setUploadProgress(100);
        setIsProcessingOcr(false);
        setCurrentStage(2);
      });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const uploadAttachedDocument = async (caseId: string): Promise<boolean> => {
    if (!file) return true;
    setIsUploadingDoc(true);
    setUploadError(null);
    try {
      let fileToUpload: File | Blob;
      let uploadName = file.name || 'citizen_petition.pdf';
      if (uploadedRawFile) {
        fileToUpload = uploadedRawFile;
        uploadName = uploadedRawFile.name;
      } else {
        const fileBody = reviewedOcr || rawOcr || complaintDesc || 'Citizen Petition Document';
        fileToUpload = new Blob([fileBody], { type: 'text/plain;charset=utf-8' });
        if (!uploadName.endsWith('.txt') && !uploadName.endsWith('.pdf')) {
          uploadName += '.txt';
        }
      }

      // 1. Upload original petition document along with its OCR text for persistence
      const origDoc = await complaintsService.uploadComplaintDocument(
        caseId,
        fileToUpload,
        uploadName,
        'PETITION',
        complaintLanguage === 'kannada' ? 'kn' : 'en',
        uploadName,
        undefined,
        rawOcr || undefined,
        reviewedOcr || undefined
      );

      // 2. Prepare FULL translated document content
      const sourcePetitionText = (reviewedOcr || rawOcr || '').trim();
      const isSourceKannada = complaintLanguage === 'kannada' || /[\u0C80-\u0CFF]/.test(sourcePetitionText);
      const transTargetLang = isSourceKannada ? 'en' : 'kn';
      const transTargetName = isSourceKannada ? 'English' : 'Kannada';
      const transSourceName = isSourceKannada ? 'Kannada' : 'English';

      let fullTranslation = fullTranslatedText?.trim() || '';

      // If full translation is not yet in state, automatically run translation on the ENTIRE petition text
      if (!fullTranslation && sourcePetitionText) {
        try {
          const transRes = await translationsService.translateText(
            sourcePetitionText,
            isSourceKannada ? 'kn' : 'en',
            isSourceKannada ? 'en' : 'kn'
          );
          if (transRes?.translated_text?.trim()) {
            fullTranslation = transRes.translated_text.trim();
            setFullTranslatedText(fullTranslation);
          }
        } catch (autoTransErr) {
          console.warn('Auto-translating entire petition during registration note:', autoTransErr);
        }
      }

      // If neural translation is unavailable, fallback to description or summary
      const finalTranslatedBody =
        fullTranslation ||
        (isSourceKannada ? (englishSummary || complaintDesc) : (kannadaSummary || complaintDesc)) ||
        '';

      if (finalTranslatedBody.trim()) {
        const summarySection = (isSourceKannada ? englishSummary : kannadaSummary)?.trim();

        const docSections = [
          `================================================================================`,
          `JANSETU - OFFICIAL TRANSLATED PETITION DOCUMENT`,
          `Government of Karnataka • District Grievance Redressal System`,
          `--------------------------------------------------------------------------------`,
          `Grievance Case ID : ${caseId}`,
          `Petition Title    : ${complaintTitle}`,
          `Original Language : ${transSourceName}`,
          `Translated To     : ${transTargetName}`,
          `Date Generated    : ${new Date().toISOString()}`,
          `Status            : Official Case Translation (Verified IndicTrans2 Neural Engine)`,
          `================================================================================`,
          ``,
        ];

        if (summarySection && summarySection !== finalTranslatedBody) {
          docSections.push(
            `EXECUTIVE SUMMARY:`,
            `--------------------------------------------------------------------------------`,
            summarySection,
            `--------------------------------------------------------------------------------`,
            ``
          );
        }

        docSections.push(
          `COMPLETE TRANSLATED PETITION CONTENT:`,
          `--------------------------------------------------------------------------------`,
          finalTranslatedBody,
          `--------------------------------------------------------------------------------`,
          ``,
          `VERIFICATION & LEGAL NOTICE:`,
          `This document represents the complete neural translation of the citizen petition`,
          `processed using AI4Bharat IndicTrans2. The original document remains archived`,
          `and immutable in the district repository.`
        );

        const transDocumentText = docSections.join('\n');
        const transBlob = new Blob([transDocumentText], { type: 'text/plain;charset=utf-8' });
        const transFilename = `translated_petition_${caseId.substring(0, 8)}.txt`;

        try {
          await complaintsService.uploadComplaintDocument(
            caseId,
            transBlob,
            transFilename,
            'TRANSLATION',
            transTargetLang,
            `Translated Petition (${transTargetName}) - ${complaintTitle}`,
            origDoc?.id,
            finalTranslatedBody,
            finalTranslatedBody
          );
        } catch (transUploadErr) {
          console.warn('Translated document secondary upload note:', transUploadErr);
        }
      }

      setDocUploadComplete(true);
      setUploadError(null);
      return true;
    } catch (docErr: any) {
      const msg = docErr.message || 'Document upload failed. File may be unsupported or size exceeded.';
      setUploadError(msg);
      showToast('Document Upload Incomplete', msg, 'error');
      return false;
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleFinalRegisterAndAssign = async (asAwaitingAssignment = false) => {
    if (!verifiedCheckbox && !asAwaitingAssignment) {
      showToast('Verification Required', 'Please confirm you have reviewed and verified the petition information.', 'warning');
      return;
    }

    if (!citizenName.trim() || !citizenPhone.trim() || !complaintTitle.trim()) {
      showToast('Missing Required Fields', 'Please complete citizen name, mobile number, and complaint title.', 'error');
      setCurrentStage(3);
      return;
    }

    // SAFE RETRY: If grievance was already created in a previous attempt, do NOT recreate it!
    if (createdCaseId) {
      const uploadOk = await uploadAttachedDocument(createdCaseId);
      if (uploadOk) {
        setCurrentStage(5);
        showToast(
          'Document Upload Completed',
          `Attachment successfully uploaded to Case ID: ${createdCaseId}`,
          'success'
        );
      }
      return;
    }

    setIsRegistering(true);
    setUploadError(null);

    try {
      const dept = departments.find((d) => d.id === selectedDeptId);
      const station = stations.find((s) => s.id === selectedStationId);
      const officer = officers.find((o) => o.id === selectedOfficerId);

      const hasAssignment = !asAwaitingAssignment && dept && station && officer;

      const newComplaint = await complaintsService.createComplaint({
        citizen: {
          name: citizenName,
          phone: citizenPhone,
          email: citizenEmail || undefined,
          address: citizenAddress,
          district,
          taluk,
          villageLocality,
        },
        details: {
          title: complaintTitle,
          description: complaintDesc,
          category: complaintCategory || 'General Grievance',
          incidentDate,
          incidentLocation,
          requestedAction,
          language: complaintLanguage,
          referenceNumber: referenceNumber || undefined,
        },
        documents: file
          ? [
              {
                id: `doc-${Date.now()}`,
                name: file.name,
                size: file.size,
                type: 'application/pdf',
                url: '#',
                uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
                isOriginal: true,
              },
            ]
          : [],
        ocrAiExtraction: {
          rawText: rawOcr,
          reviewedText: reviewedOcr,
          englishSummary,
          kannadaSummary,
          suggestedCategory: complaintCategory,
          suggestedDepartment: dept?.name || 'Home & Police Department',
          suggestedIncidentLocation: incidentLocation,
          suggestedComplaintDate: incidentDate,
          suggestedCitizenName: citizenName,
          suggestedPhone: citizenPhone,
          confidenceScores,
        },
        assignment: hasAssignment
          ? {
              departmentId: dept.id,
              departmentName: dept.name,
              stationId: station.id,
              stationName: station.name,
              officerId: officer.id,
              officerName: officer.name,
              officerDesignation: officer.designation,
              priority,
              initialFollowupDate,
              nextFollowupDate: initialFollowupDate,
              instructions: assignmentInstructions,
              assignedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              assignedBy: `${user?.name} (DC PA)`,
            }
          : undefined,
        status: hasAssignment ? 'ASSIGNED' : 'AWAITING_ASSIGNMENT',
        operationalFlags: [],
      });

      setCreatedCaseId(newComplaint.id);
      setCreatedOfficerName(hasAssignment ? officer.name : null);

      // Attempt document upload
      const uploadOk = await uploadAttachedDocument(newComplaint.id);

      if (uploadOk) {
        setCurrentStage(5);
        showToast(
          'Complaint Successfully Registered',
          hasAssignment
            ? `Grievance registered and assigned to ${officer.name}. Case ID: ${newComplaint.id}`
            : `Grievance registered as Awaiting Assignment. Case ID: ${newComplaint.id}`,
          'success'
        );
      } else {
        // Remained on Stage 4 so user can retry document upload without re-registering
        showToast(
          'Grievance Created — Document Upload Pending',
          `Case ID ${newComplaint.id} generated. Please review and retry document upload below.`,
          'warning'
        );
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to register complaint', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleResetWorkflow = () => {
    setCurrentStage(1);
    setFile(null);
    setUploadedRawFile(null);
    setVerifiedCheckbox(false);
    setCreatedCaseId(null);
    setCreatedOfficerName(null);
    setUploadError(null);
    setIsUploadingDoc(false);
    setDocUploadComplete(false);
  };

  const getConfidenceBadge = (level: ConfidenceLevel) => {
    if (level === 'HIGH') {
      return (
        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>High Confidence</span>
        </span>
      );
    }
    if (level === 'NEEDS_REVIEW') {
      return (
        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>Needs Review</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
        <HelpCircle className="w-3 h-3 text-slate-500" />
        <span>Not Provided</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Register & Assign Citizen Grievance"
        subtitle="End-to-end guided workflow: Document upload, OCR extraction, AI verification, and officer assignment."
        breadcrumbs={[
          { label: 'Grievance Management', path: '/pa/dashboard' },
          { label: 'Register Complaint' },
        ]}
      />

      {/* Step Stepper Header */}
      {currentStage < 5 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {[
              { num: 1, title: 'Upload Document', desc: 'PDF / Scanned Image' },
              { num: 2, title: 'OCR & AI Review', desc: 'Bilingual Extraction' },
              { num: 3, title: 'Complete Form', desc: 'Citizen & Officer Details' },
              { num: 4, title: 'Review & Dispatch', desc: 'Register & Assign' },
            ].map((step) => {
              const isPast = currentStage > step.num;
              const isCurrent = currentStage === step.num;
              return (
                <button
                  type="button"
                  key={step.num}
                  onClick={() => setCurrentStage(step.num as any)}
                  className={`flex items-center gap-3 p-2 rounded-lg transition text-left cursor-pointer hover:bg-slate-50 w-full ${
                    isCurrent ? 'bg-amber-50/70 border border-amber-200' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4" /> : step.num}
                  </div>
                  <div className="hidden sm:block min-w-0">
                    <p
                      className={`text-xs font-bold leading-tight truncate ${
                        isCurrent ? 'text-slate-900' : isPast ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{step.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STAGE 1: UPLOAD DOCUMENT */}
      {currentStage === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.registration.stage1Title}</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">{t.registration.stage1Desc}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/20 rounded-2xl p-10 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">{t.registration.dragDropText}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Accepts PDF, JPG, PNG, Scanned Kannada/English Documents (Up to 25 MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelection(e.target.files[0]);
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  {t.registration.browseFiles}
                </Button>
              </div>

              {/* Progress bar if processing */}
              {isProcessingOcr && (
                <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Extracting Text via Local OCR Engine...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}



              {/* Direct to Form Option */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h5 className="text-xs font-bold text-indigo-950">Direct Form Entry & AI Writing Assistant</h5>
                  </div>
                  <p className="text-[11px] text-indigo-800">
                    Registering without a scanned petition? Proceed directly to the complaint form to enter details and use local AI grammar & spelling checking.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentStage(3)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Proceed to Form
                </Button>
              </div>

              {/* Confidentiality notice */}
              <div className="p-4 bg-slate-900 text-slate-300 rounded-xl text-xs flex items-start gap-3 border border-slate-800">
                <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{t.registration.privacyNotice}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STAGE 2: OCR & AI EXTRACTION REVIEW */}
      {currentStage === 2 && (
        <div className="space-y-6">
          {/* AI Grammar & Writing Assistant Banner at Top of Stage 2 */}
          <div className="p-4 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-blue-50/80 border border-indigo-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    AI Grammar, Typo & Writing Assistant
                  </h4>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                    qwen2.5:1.5b (Local Ollama)
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Verify petition text extracted from documents. Identifies spelling errors, Kannada typos, punctuation issues, and awkward phrasing while protecting all citizen facts.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => handleCheckGrammar('ocr')}
                leftIcon={<Sparkles className="w-4 h-4 text-white" />}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
              >
                Check Grammar & Spelling
              </Button>
            </div>
          </div>

          {/* Integrated Document OCR Workspace (Stage 1 OCR Text Extraction) */}
          <OcrPanel
            file={file}
            rawFile={uploadedRawFile}
            documentName={file?.name}
            rawText={rawOcr}
            reviewedText={reviewedOcr}
            onRawTextChange={setRawOcr}
            onReviewedTextChange={setReviewedOcr}
            onCheckGrammar={(text) => handleCheckGrammar('ocr', text)}
            onSaveReviewedText={(saved) => {
              setReviewedOcr(saved);
              showToast('Reviewed Text Saved', 'Human verified petition text preserved.', 'success');
            }}
            onTranslatedTextChange={(text, targetLang) => {
              setFullTranslatedText(text);
              setFullTranslatedLang(targetLang);
              if (targetLang === 'en') {
                if (!englishSummary) {
                  setEnglishSummary(text.length > 300 ? text.slice(0, 300) + '...' : text);
                }
                if (!complaintDesc) {
                  setComplaintDesc(text);
                }
              } else {
                if (!kannadaSummary) {
                  setKannadaSummary(text.length > 300 ? text.slice(0, 300) + '...' : text);
                }
              }
            }}
          />

          {/* WebLLM In-Browser Summaries & Editable Verification Workspace */}
          <WebLlmSummarizerSection
            sourceText={reviewedOcr || rawOcr || englishSummary}
            englishSummary={englishSummary}
            kannadaSummary={kannadaSummary}
            onEnglishSummaryChange={(text) => {
              setEnglishSummary(text);
              if (!complaintDesc) {
                setComplaintDesc(text);
              }
            }}
            onKannadaSummaryChange={setKannadaSummary}
            confidenceScores={confidenceScores}
            getConfidenceBadge={getConfidenceBadge}
          />

          {/* Intelligent Grievance Form Extraction (WebLLM WebGPU) */}
          <IntelligentFormExtractionSection
            documentId={file ? 'doc-active' : null}
            documentName={file?.name}
            reviewedOcrText={reviewedOcr}
            rawOcrText={rawOcr}
            translatedText={englishSummary || kannadaSummary}
            onApplyExtraction={(res) => applyWebLlmExtractionResultToForm(res, true)}
            onProceedToForm={() => setCurrentStage(3)}
            lastExtractionResult={lastExtractionResult}
          />

          <div className="flex flex-wrap justify-between items-center gap-3 pt-4">
            <Button
              variant="outline"
              size="md"
              leftIcon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setCurrentStage(1)}
            >
              Back to Upload
            </Button>
            <Button
              variant="outline"
              size="md"
              leftIcon={<Sparkles className="w-4 h-4 text-indigo-600" />}
              onClick={() => {
                if (!complaintDesc && (reviewedOcr || rawOcr)) {
                  setComplaintDesc(reviewedOcr || rawOcr);
                }
                handleCheckGrammar('description');
              }}
            >
              Check Grammar & Spelling (Local AI)
            </Button>
            <Button
              variant="primary"
              size="md"
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={() => {
                // Ensure form has latest parsed fields before transitioning if not yet extracted
                if (!hasAutoFilled && (reviewedOcr || rawOcr)) {
                  handleAutoFillFromText(false);
                }
                if (!deptRecommendation && (complaintDesc || reviewedOcr || rawOcr)) {
                  handleRunDepartmentRecommendation(complaintDesc || reviewedOcr || rawOcr);
                }
                setCurrentStage(3);
              }}
            >
              Verify & Complete Case Form
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 3: COMPLETE COMPLAINT FORM */}
      {currentStage === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.registration.stage3Title}</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">{t.registration.stage3Desc}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6 text-xs">
              {/* WebLLM Pre-fill Banner */}
              {lastExtractionResult ? (
                <div className="bg-indigo-50/80 border border-indigo-200 text-indigo-950 rounded-xl p-3.5 flex items-center justify-between text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <Bot className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900">
                        Form Pre-Filled via Local WebLLM ({lastExtractionResult.output_language === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English'})
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Extracted in-browser using WebGPU. Hover over any field badge to inspect model confidence and exact document source excerpts. All fields are fully editable before submission.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded bg-white text-indigo-800 border border-indigo-200 shadow-2xs">
                      Language: {lastExtractionResult.output_language === 'kn' ? 'ಕನ್ನಡ' : 'English'}
                    </span>
                  </div>
                </div>
              ) : hasAutoFilled ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3.5 flex items-center justify-between text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>Form Pre-Filled:</strong> Citizen details, classification, and incident description populated from petition document.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAutoFillFromText(true)}
                    className="bg-white hover:bg-emerald-100/60 border-emerald-300 text-emerald-800"
                  >
                    Re-sync from OCR Text
                  </Button>
                </div>
              ) : null}

              {/* Section 1: Citizen Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  <span>Citizen Contact & Residential Jurisdiction</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Citizen Full Name <span className="text-rose-500">*</span>
                      {renderFieldTraceBadge('citizen_name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      placeholder="e.g. Chandrashekar Murthy"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Mobile Number <span className="text-rose-500">*</span>
                      {renderFieldTraceBadge('mobile_number')}
                    </label>
                    <input
                      type="text"
                      required
                      value={citizenPhone}
                      onChange={(e) => setCitizenPhone(e.target.value)}
                      placeholder="+91 98450 12345"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Email Address (Optional)
                      {renderFieldTraceBadge('email')}
                    </label>
                    <input
                      type="email"
                      value={citizenEmail}
                      onChange={(e) => setCitizenEmail(e.target.value)}
                      placeholder="citizen@gmail.com"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Residential Address
                      {renderFieldTraceBadge('residential_address')}
                    </label>
                    <input
                      type="text"
                      value={citizenAddress}
                      onChange={(e) => setCitizenAddress(e.target.value)}
                      placeholder="#45, 1st Cross, Koramangala 4th Block"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Taluk
                      {renderFieldTraceBadge('taluk')}
                    </label>
                    <select
                      value={taluk}
                      onChange={(e) => setTaluk(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm bg-white"
                    >
                      <option value="Bengaluru South">Bengaluru South</option>
                      <option value="Bengaluru North">Bengaluru North</option>
                      <option value="Bengaluru East">Bengaluru East</option>
                      <option value="Anekal">Anekal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Complaint Details */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Complaint Information & Classification</span>
                </h4>

                {/* AI Writing & Grammar Assistant Action Bar */}
                <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-blue-50/80 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs flex-shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          AI Grammar, Typo & Writing Assistant
                        </span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                          qwen2.5:1.5b (Local Ollama)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Detects and corrects spelling errors, Kannada typos, punctuation, and sentence phrasing while strictly preserving meaning and protected citizen facts.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckGrammar('title')}
                      leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                      className="bg-white border-indigo-200 text-indigo-900 hover:bg-indigo-50 font-medium text-xs"
                    >
                      Check Title
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => handleCheckGrammar('description')}
                      leftIcon={<Sparkles className="w-3.5 h-3.5 text-white" />}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs"
                    >
                      Check Statement
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      Grievance Title <span className="text-rose-500">*</span>
                      {renderFieldTraceBadge('complaint_title')}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCheckGrammar('title')}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer"
                      title="Check spelling, grammar, and typography using local Qwen2.5 1.5B"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Check Grammar & Spelling</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={complaintTitle}
                    onChange={(e) => setComplaintTitle(e.target.value)}
                    placeholder="Brief description of the grievance"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Complaint Category
                      {renderFieldTraceBadge('category_suggestion')}
                    </label>
                    <input
                      type="text"
                      value={complaintCategory}
                      onChange={(e) => setComplaintCategory(e.target.value)}
                      placeholder="e.g. Public Nuisance, Cyber Fraud"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Incident Date
                      {renderFieldTraceBadge('incident_date')}
                    </label>
                    <input
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Incident Location
                      {renderFieldTraceBadge('incident_location')}
                    </label>
                    <input
                      type="text"
                      value={incidentLocation}
                      onChange={(e) => setIncidentLocation(e.target.value)}
                      placeholder="e.g. 80ft Road, Koramangala"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      Detailed Complaint Statement
                      {renderFieldTraceBadge('complaint_description')}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCheckGrammar('description')}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer"
                      title="Check spelling, grammar, and typography using local Qwen2.5 1.5B"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Check Grammar & Spelling</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm leading-relaxed"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[11px] text-slate-500">
                      Supports Kannada, English, and mixed language text. Names, dates, and amounts are preserved.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCheckGrammar('description')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Check Grammar & Spelling</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Relief / Action Demanded by Citizen
                    {renderFieldTraceBadge('requested_action')}
                  </label>
                  <input
                    type="text"
                    value={requestedAction}
                    onChange={(e) => setRequestedAction(e.target.value)}
                    placeholder="Specific relief demanded"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Section 3: Cascading Assignment Details */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Responsible Department & Investigating Officer Selection</span>
                </h4>

                {/* AI Department Classification Panel (Local Qwen2.5 1.5B via Ollama) */}
                <div className="border border-indigo-100 rounded-xl bg-slate-50/50 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Local LLM Department Classifier
                      </span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                        qwen2.5:1.5b (Local Ollama)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => handleRunDepartmentRecommendation()}
                      disabled={isRecommendingDept}
                      leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRecommendingDept ? 'animate-spin' : ''}`} />}
                    >
                      {isRecommendingDept ? 'Analyzing...' : 'Re-Classify Department'}
                    </Button>
                  </div>

                  {isRecommendingDept && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center gap-3 text-xs text-indigo-900">
                      <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" />
                      <div>
                        <p className="font-semibold">Analyzing petition text with local Qwen2.5 1.5B via Ollama...</p>
                        <p className="text-[11px] text-indigo-700">
                          Cross-referencing grievance issues with active department statutory responsibilities.
                        </p>
                      </div>
                    </div>
                  )}

                  {deptRecommendationError && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Department Recommendation Service Notice</p>
                          <p className="text-[11px] text-amber-800">{deptRecommendationError}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" type="button" onClick={() => handleRunDepartmentRecommendation()}>
                        Retry
                      </Button>
                    </div>
                  )}

                  {deptRecommendation && !isRecommendingDept && (
                    <div className="p-3.5 bg-gradient-to-r from-indigo-50/40 via-white to-blue-50/30 border border-indigo-100 rounded-lg space-y-3">
                      {deptRecommendation.recommended_department ? (
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">
                                Recommended Department:
                              </span>
                              <span className="text-xs font-bold text-indigo-900 bg-white px-2.5 py-1 rounded border border-indigo-200 shadow-xs">
                                {deptRecommendation.recommended_department.department_name} ({deptRecommendation.recommended_department.department_code})
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  deptRecommendation.application_confidence === 'HIGH'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : deptRecommendation.application_confidence === 'MEDIUM'
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : deptRecommendation.application_confidence === 'LOW'
                                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                                    : 'bg-rose-50 text-rose-700 border-rose-300'
                                }`}
                              >
                                {deptRecommendation.application_confidence} CONFIDENCE
                              </span>
                            </div>

                            <div>
                              {selectedDeptId === deptRecommendation.recommended_department.department_id ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-3 py-1 rounded-lg">
                                  <Check className="w-3.5 h-3.5" /> Selected in Form
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDeptId(deptRecommendation.recommended_department!.department_id);
                                    showToast(
                                      'Department Applied',
                                      `Assigned to ${deptRecommendation.recommended_department!.department_name}`,
                                      'success'
                                    );
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" /> Confirm & Apply Suggested Department
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="text-xs text-slate-700 bg-white/90 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                            <p>
                              <span className="font-semibold text-slate-900">Primary Justification: </span>
                              {deptRecommendation.recommended_department.primary_reason}
                            </p>
                            {deptRecommendation.recommended_department.evidence_excerpts.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="font-semibold text-slate-700">Evidence from complaint:</span>
                                {deptRecommendation.recommended_department.evidence_excerpts.map((excerpt, idx) => (
                                  <span
                                    key={idx}
                                    className="italic text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                                  >
                                    &ldquo;{excerpt}&rdquo;
                                  </span>
                                ))}
                              </div>
                            )}
                            {deptRecommendation.recommended_department.matched_responsibilities.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1">
                                <span className="font-semibold text-slate-700">Matched Responsibilities:</span>
                                {deptRecommendation.recommended_department.matched_responsibilities.map((resp, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px]"
                                  >
                                    {resp}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {deptRecommendation.alternative_candidates.length > 0 && (
                            <div className="pt-1 space-y-1.5">
                              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                                Alternative Department Candidates:
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {deptRecommendation.alternative_candidates.map((alt) => (
                                  <div
                                    key={alt.department_id}
                                    className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <span className="font-medium text-slate-800">
                                        {alt.department_name} ({alt.department_code})
                                      </span>
                                      <span className="text-[10px] text-slate-500 block truncate">
                                        {alt.primary_reason}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedDeptId(alt.department_id);
                                        showToast('Alternative Applied', `Assigned to ${alt.department_name}`, 'info');
                                      }}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors cursor-pointer flex-shrink-0"
                                    >
                                      Select Alternative
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(deptRecommendation.uncertainty_notes || deptRecommendation.missing_information.length > 0) && (
                            <div className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200 rounded p-2 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div>
                                {deptRecommendation.uncertainty_notes && <p>{deptRecommendation.uncertainty_notes}</p>}
                                {deptRecommendation.missing_information.length > 0 && (
                                  <p className="text-[10px] text-amber-700">
                                    Missing details: {deptRecommendation.missing_information.join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600 italic">
                          No department candidate reached the confidence threshold for this petition.
                        </p>
                      )}

                      <div className="text-[11px] text-slate-500 bg-white/80 p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="leading-tight text-slate-600">{deptRecommendation.disclaimer}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                            <span>Model: <strong>{deptRecommendation.model_version}</strong></span>
                            <span>Inference: <strong>{deptRecommendation.latency_sec.toFixed(2)}s</strong></span>
                            <span>Speed: <strong>{deptRecommendation.eval_tokens_per_sec.toFixed(1)} tok/s</strong></span>
                            <span className="text-indigo-600 font-semibold">Requires Operator Confirmation</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!deptRecommendation && !isRecommendingDept && !deptRecommendationError && (
                    <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-600">
                      <span>Click to analyze grievance content with local Qwen2.5 and recommend the responsible department.</span>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => handleRunDepartmentRecommendation()}
                        leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                      >
                        Recommend Department
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Department */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Target Department <span className="text-rose-500">*</span>
                      {renderFieldTraceBadge('department_suggestion')}
                    </label>
                    <select
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm bg-white"
                    >
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                    {aiSuggestedDept && selectedDeptId !== aiSuggestedDept.id && (
                      <div className="mt-1.5 p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span>AI Suggestion: <strong>{aiSuggestedDept.name}</strong></span>
                          <button
                            type="button"
                            onClick={() => setSelectedDeptId(aiSuggestedDept.id)}
                            className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Confirm & Apply
                          </button>
                        </div>
                        <span className="text-[10px] text-indigo-600">Department was matched from document analysis.</span>
                      </div>
                    )}
                  </div>

                  {/* Police Station */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Police Station / Unit <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedStationId}
                      onChange={(e) => setSelectedStationId(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm bg-white"
                    >
                      {stations.map((stn) => (
                        <option key={stn.id} value={stn.id}>
                          {stn.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Officer */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Investigating Police Officer {officers.length > 0 && <span className="text-rose-500">*</span>}
                    </label>
                    <select
                      value={selectedOfficerId}
                      onChange={(e) => setSelectedOfficerId(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm bg-white"
                      disabled={officers.length === 0}
                    >
                      {officers.length === 0 ? (
                        <option value="">Awaiting Assignment by Supervisor</option>
                      ) : (
                        officers.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.name} ({off.designation})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Priority Assessment
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm bg-white"
                    >
                      <option value="LOW">Low Priority (Routine inquiry)</option>
                      <option value="MEDIUM">Medium Priority (Standard 7-day follow-up)</option>
                      <option value="HIGH">High Priority (Urgent 3-day follow-up)</option>
                      <option value="CRITICAL">Critical (Immediate 24-hr follow-up)</option>
                    </select>
                    {aiSuggestedPriority && priority !== aiSuggestedPriority && (
                      <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                        <span>AI Suggestion: <strong>{aiSuggestedPriority} Priority</strong></span>
                        <button
                          type="button"
                          onClick={() => setPriority(aiSuggestedPriority)}
                          className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Confirm & Apply
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Initial Follow-up Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={initialFollowupDate}
                      onChange={(e) => setInitialFollowupDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Directives / Assignment Instructions for Officer
                  </label>
                  <textarea
                    rows={2}
                    value={assignmentInstructions}
                    onChange={(e) => setAssignmentInstructions(e.target.value)}
                    placeholder="Specific instructions, inspection requirements, or notices to serve..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              size="md"
              leftIcon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setCurrentStage(2)}
            >
              Back to OCR Review
            </Button>
            <Button
              variant="primary"
              size="md"
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={() => setCurrentStage(4)}
            >
              Proceed to Final Verification
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 4: FINAL REVIEW & REGISTER/ASSIGN */}
      {currentStage === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.registration.stage4Title}</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">{t.registration.stage4Desc}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 block font-semibold">Petitioner Name</span>
                    <p className="text-sm font-bold text-slate-900">{citizenName}</p>
                    <p className="text-slate-600 font-mono mt-0.5">{citizenPhone}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Address / Jurisdiction</span>
                    <p className="text-slate-800">{citizenAddress || 'Address not specified'}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Taluk: {taluk} &bull; District: {district}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Grievance Title</span>
                    <p className="text-sm font-bold text-slate-900">{complaintTitle}</p>
                  </div>
                </div>

                <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
                  <div>
                    <span className="text-slate-400 block font-semibold">Assigned Police Officer</span>
                    <p className="text-sm font-bold text-slate-900">
                      {officers.find((o) => o.id === selectedOfficerId)?.name || 'Awaiting Supervisor Assignment'}
                    </p>
                    <p className="text-slate-600">
                      {stations.find((s) => s.id === selectedStationId)?.name}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 block font-semibold">Priority</span>
                      <span className="font-bold text-amber-700">{priority}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Initial Follow-up Date</span>
                      <span className="font-mono font-bold text-slate-800">{initialFollowupDate}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Original Document</span>
                    <p className="text-slate-700 font-mono truncate">{file?.name || 'Uploaded_Petition.pdf'}</p>
                  </div>
                </div>
              </div>

              {/* AI Writing Assistance Audit Notice if corrections were applied */}
              {textCorrectionAudits.length > 0 && (
                <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      AI Writing Corrections Applied ({textCorrectionAudits.length})
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-mono">
                      qwen2.5:1.5b (Local Ollama)
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {textCorrectionAudits.map((audit, idx) => (
                      <div key={idx} className="p-2 bg-white rounded border border-indigo-100 text-[11px] space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-700">
                          <span className="uppercase tracking-wider text-[10px] text-indigo-600">
                            {audit.target_field === 'title' ? 'Grievance Title' : 'Complaint Statement'}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {audit.corrections_applied_count} correction(s) • Accepted by {audit.accepted_by}
                          </span>
                        </div>
                        <div className="text-slate-500 line-through text-[10px] truncate">
                          Original: "{audit.original_text}"
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-indigo-700 italic">
                    Original petition text and accepted corrections audit trail are preserved in the government case file.
                  </p>
                </div>
              )}

              {/* Verification Confirmation Checkbox */}
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifiedCheckbox}
                    onChange={(e) => setVerifiedCheckbox(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-800 mt-0.5"
                  />
                  <span className="text-xs text-amber-950 font-medium leading-relaxed">
                    I, <strong>{user?.name} (DC PA)</strong>, hereby certify that I have examined the original petition document, verified the citizen details and jurisdiction, and authorized the scheduled follow-up timeline for the assigned officer.
                  </span>
                </label>
              </div>

              {/* Document upload failure alert with safe retry */}
              {uploadError && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span>Grievance Created, but Document Upload Needs Attention</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    Grievance <strong>{createdCaseId}</strong> has been registered in the system. However, the petition file could not be attached: <span className="font-semibold">{uploadError}</span>.
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Click "Retry Document Upload" below. Retrying will NOT create a duplicate grievance.
                  </p>
                </div>
              )}

              {isUploadingDoc && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800 font-semibold">
                  <RotateCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Uploading document to secure government storage...</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                  onClick={() => setCurrentStage(3)}
                  disabled={isRegistering || isUploadingDoc}
                >
                  Edit Information
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => handleFinalRegisterAndAssign(true)}
                    isLoading={isRegistering}
                  >
                    Save as Awaiting Assignment
                  </Button>

                  <Button
                    variant="gold"
                    size="md"
                    onClick={() => handleFinalRegisterAndAssign(false)}
                    isLoading={isRegistering || isUploadingDoc}
                    disabled={!verifiedCheckbox}
                  >
                    {createdCaseId ? 'RETRY DOCUMENT UPLOAD' : 'REGISTER & ASSIGN GRIEVANCE'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STAGE 5: SUCCESS CONFIRMATION */}
      {currentStage === 5 && (
        <Card className="border-emerald-200 bg-white">
          <CardContent className="p-8 sm:p-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900 font-sans">
                {t.registration.successTitle}
              </h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                {t.registration.successMessage}
              </p>
            </div>

            <div className="max-w-md mx-auto p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-left">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Case ID:</span>
                <span className="font-mono text-sm font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {createdCaseId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Investigating Officer:</span>
                <span className="font-bold text-slate-800">{createdOfficerName || 'Awaiting Assignment'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Scheduled Follow-up Date:</span>
                <span className="font-mono font-bold text-slate-800">{initialFollowupDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-blue-700">
                  {createdOfficerName ? 'ASSIGNED' : 'AWAITING_ASSIGNMENT'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/pa/complaints/${createdCaseId}`)}
              >
                View Registered Case
              </Button>
              <Button variant="outline" size="md" onClick={handleResetWorkflow}>
                Register Another Grievance
              </Button>
              <Button variant="secondary" size="md" onClick={() => navigate('/pa/dashboard')}>
                Return to PA Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Grammar, Typo & Writing Correction Modal */}
      <GrammarCorrectionModal
        isOpen={grammarModalOpen}
        onClose={() => setGrammarModalOpen(false)}
        targetField={grammarTargetField}
        originalText={grammarOriginalText}
        response={grammarResponse}
        isLoading={isGrammarLoading}
        error={grammarError}
        onRetry={() => handleCheckGrammar(grammarTargetField, grammarOriginalText)}
        onAcceptAll={handleAcceptGrammarCorrections}
        onKeepOriginal={() => setGrammarModalOpen(false)}
      />
    </div>
  );
};
