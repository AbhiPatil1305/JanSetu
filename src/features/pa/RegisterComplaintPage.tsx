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
import { parsePetitionText, ParsedPetitionData } from '../../utils/petitionParser';
import { Department, PoliceStation } from '../../types/department';
import { User } from '../../types/auth';
import { ComplaintPriority, ConfidenceLevel, Complaint } from '../../types/complaint';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { OcrPanel } from '../../components/complaints/OcrPanel';
import { WebLlmSummarizerSection } from '../../components/complaints/WebLlmSummarizerSection';
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
  FileEdit,
  Languages,
  Globe,
  Loader2,
  Phone,
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
  const [formLanguageMode, setFormLanguageMode] = useState<'en' | 'kn'>('en');
  const [bilingualData, setBilingualData] = useState<ParsedPetitionData | null>(null);
  const [fieldTranslating, setFieldTranslating] = useState<Record<string, boolean>>({});

  // Dependent cascading selectors
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);

  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('HIGH');
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

  const applyExtractedDataToForm = (
    data: ParsedPetitionData,
    showNotice = false,
    langMode: 'en' | 'kn' = formLanguageMode
  ) => {
    setBilingualData(data);

    if (langMode === 'kn') {
      setCitizenName(data.citizenNameKn || data.citizenName || '');
      setCitizenAddress(data.citizenAddressKn || data.citizenAddress || '');
      setTaluk(data.taluk || 'Bengaluru South');
      setVillageLocality(data.villageLocalityKn || data.villageLocality || '');
      setComplaintTitle(data.complaintTitleKn || data.complaintTitle || '');
      setComplaintCategory(data.complaintCategoryKn || data.complaintCategory || 'ಸಾಮಾನ್ಯ ನಾಗರಿಕ ಅಹವಾಲು');
      setIncidentLocation(data.incidentLocationKn || data.incidentLocation || '');
      setRequestedAction(data.requestedActionKn || data.requestedAction || '');
      setComplaintDesc(data.complaintDescKn || data.complaintDesc || '');
      if (data.assignmentInstructionsKn) {
        setAssignmentInstructions(data.assignmentInstructionsKn);
      }
    } else {
      setCitizenName(data.citizenName || '');
      setCitizenAddress(data.citizenAddress || '');
      setTaluk(data.taluk || 'Bengaluru South');
      setVillageLocality(data.villageLocality || '');
      setComplaintTitle(data.complaintTitle || '');
      setComplaintCategory(data.complaintCategory || 'General Grievance');
      setIncidentLocation(data.incidentLocation || '');
      setRequestedAction(data.requestedAction || '');
      setComplaintDesc(data.complaintDesc || '');
      if (data.assignmentInstructionsEn) {
        setAssignmentInstructions(data.assignmentInstructionsEn);
      }
    }

    if (data.citizenPhone) setCitizenPhone(data.citizenPhone);
    if (data.citizenEmail) setCitizenEmail(data.citizenEmail);
    if (data.incidentDate) setIncidentDate(data.incidentDate);
    if (data.complaintLanguage) setComplaintLanguage(data.complaintLanguage);
    if (data.englishSummary) setEnglishSummary(data.englishSummary);
    if (data.kannadaSummary) setKannadaSummary(data.kannadaSummary);
    if (data.confidenceScores) setConfidenceScores(data.confidenceScores);
    if (data.suggestedPriority) setPriority(data.suggestedPriority as ComplaintPriority);

    // Auto-match department if suggested
    if (data.suggestedDepartment && departments.length > 0) {
      const norm = data.suggestedDepartment.toLowerCase();
      const matchedDept = departments.find((d) => {
        const dName = d.name.toLowerCase();
        const dCode = d.code.toLowerCase();
        return (
          norm.includes(dName) ||
          dName.includes(norm) ||
          (norm.includes('police') && (dName.includes('police') || dCode.includes('pol'))) ||
          (norm.includes('revenue') && (dName.includes('revenue') || dCode.includes('rev'))) ||
          (norm.includes('bbmp') && (dName.includes('bbmp') || dCode.includes('bbmp'))) ||
          (norm.includes('women') && (dName.includes('women') || dCode.includes('wcd'))) ||
          (norm.includes('public works') && (dName.includes('public works') || dCode.includes('pwd')))
        );
      });
      if (matchedDept && matchedDept.id !== selectedDeptId) {
        setSelectedDeptId(matchedDept.id);
      }
    }

    // Auto-match police station if locality is detected
    const locTarget = (data.villageLocality || data.incidentLocation || '').toLowerCase();
    if (locTarget && stations.length > 0) {
      const matchedStation = stations.find((s) => {
        const sName = s.name.toLowerCase();
        return (
          locTarget.includes(sName) ||
          sName.includes(locTarget) ||
          (s.location && s.location.toLowerCase().includes(locTarget))
        );
      });
      if (matchedStation) {
        setSelectedStationId(matchedStation.id);
      }
    }

    // Pre-fill assignment directives if not already set
    if (
      !assignmentInstructions &&
      !data.assignmentInstructionsEn &&
      !data.assignmentInstructionsKn &&
      (data.complaintCategory || data.requestedAction)
    ) {
      const cat = langMode === 'kn' ? (data.complaintCategoryKn || 'ಅಹವಾಲು') : (data.complaintCategory || 'grievance');
      const loc = langMode === 'kn' ? (data.incidentLocationKn || data.villageLocalityKn || 'ವ್ಯಾಪ್ತಿಯಲ್ಲಿ') : (data.incidentLocation || data.villageLocality || 'jurisdiction area');
      const rel = langMode === 'kn'
        ? (data.requestedActionKn ? `ಕೋರಿದ ಪರಿಹಾರ: "${data.requestedActionKn}".` : '')
        : (data.requestedAction ? `Citizen relief sought: "${data.requestedAction}".` : '');
      setAssignmentInstructions(
        langMode === 'kn'
          ? `${loc} ಸಂಬಂಧಿಸಿದಂತೆ ${cat} ಕುರಿತು ತುರ್ತು ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ ಕ್ರಮ ಕೈಗೊಂಡ ವರದಿ ಸಲ್ಲಿಸುವುದು. ${rel}`.trim()
          : `Urgent field inquiry regarding ${cat} at ${loc}. Verify complainant statements, inspect locus, and submit statutory Action Taken Report (ATR). ${rel}`.trim()
      );
    }

    setHasAutoFilled(true);

    if (showNotice) {
      showToast(
        'Form Fields Auto-Filled',
        langMode === 'kn'
          ? 'ಅರ್ಜಿಯ ವಿವರಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಕನ್ನಡದಲ್ಲಿ ಭರ್ತಿ ಮಾಡಲಾಗಿದೆ.'
          : 'Citizen contact, grievance classification, and incident details successfully populated from document.',
        'success'
      );
    }
  };

  const handleSwitchFormLanguage = (targetMode: 'en' | 'kn') => {
    if (targetMode === formLanguageMode) return;
    setFormLanguageMode(targetMode);
    if (bilingualData) {
      applyExtractedDataToForm(bilingualData, false, targetMode);
      showToast(
        targetMode === 'kn' ? 'ಭಾಷೆ ಬದಲಾಯಿಸಲಾಗಿದೆ' : 'Language Switched',
        targetMode === 'kn'
          ? 'ನಮೂನೆಯ ವಿವರಗಳನ್ನು ಅಧಿಕೃತ ಕನ್ನಡ ರೂಪಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.'
          : 'Form field values switched to English official record mode.',
        'info'
      );
    }
  };

  const handleTranslateField = async (
    fieldKey: string,
    currentVal: string,
    setter: (val: string) => void
  ) => {
    if (!currentVal || !currentVal.trim()) return;
    setFieldTranslating((prev) => ({ ...prev, [fieldKey]: true }));
    try {
      const hasKannada = /[\u0C80-\u0CFF]/.test(currentVal);
      const src = hasKannada ? 'kn' : 'en';
      const tgt = hasKannada ? 'en' : 'kn';
      const res = await translationsService.translateText(currentVal.trim(), src, tgt);
      if (res?.translated_text) {
        setter(res.translated_text);
        showToast(
          'Field Translated',
          `Translated from ${src === 'kn' ? 'Kannada' : 'English'} to ${tgt === 'kn' ? 'Kannada' : 'English'}.`,
          'success'
        );
      }
    } catch (err: any) {
      showToast('Translation Notice', err?.message || 'Could not translate field at this time.', 'warning');
    } finally {
      setFieldTranslating((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleAutoFillFromText = (showNotice = true) => {
    const textToParse = reviewedOcr || rawOcr;
    if (!textToParse || !textToParse.trim()) {
      showToast('No Document Text', 'Please extract or enter document text first.', 'warning');
      return;
    }
    const parsed = parsePetitionText(textToParse, englishSummary);
    setBilingualData(parsed);
    applyExtractedDataToForm(parsed, showNotice, formLanguageMode);
  };

  const handleProceedToCompleteForm = () => {
    const textToParse = reviewedOcr || rawOcr;
    if (textToParse && textToParse.trim()) {
      const parsed = parsePetitionText(textToParse, englishSummary);
      setBilingualData(parsed);
      applyExtractedDataToForm(parsed, true, formLanguageMode);
    }
    setCurrentStage(3);
  };

  const handleSkipToManualEntry = () => {
    setFile(null);
    setUploadedRawFile(null);
    setRawOcr('');
    setReviewedOcr('');
    setEnglishSummary('');
    setKannadaSummary('');
    setHasAutoFilled(false);
    setCurrentStage(3);
    showToast(
      'Manual Entry Mode',
      'Proceeding directly to grievance case form. Please enter citizen and case details manually.',
      'info'
    );
  };

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
          const locTarget = (villageLocality || incidentLocation || '').toLowerCase();
          const matched = locTarget
            ? stns.find((s) => {
                const sName = s.name.toLowerCase();
                return (
                  locTarget.includes(sName) ||
                  sName.includes(locTarget) ||
                  (s.location && s.location.toLowerCase().includes(locTarget))
                );
              })
            : null;
          setSelectedStationId(matched ? matched.id : stns[0].id);
        } else {
          setSelectedStationId('');
        }
      });
    } else {
      setStations([]);
      setSelectedStationId('');
    }
  }, [selectedDeptId, villageLocality, incidentLocation]);

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
          const ef = res.extracted_fields;
          if (ef.citizen_name) parsed.citizenName = ef.citizen_name;
          if (ef.citizen_name_kn) parsed.citizenNameKn = ef.citizen_name_kn;
          if (ef.phone) parsed.citizenPhone = ef.phone;
          if (ef.email) parsed.citizenEmail = ef.email;
          if (ef.address) parsed.citizenAddress = ef.address;
          if (ef.address_kn) parsed.citizenAddressKn = ef.address_kn;
          if (ef.district) parsed.district = ef.district;
          if (ef.district_kn) parsed.districtKn = ef.district_kn;
          if (ef.taluk) parsed.taluk = ef.taluk;
          if (ef.taluk_kn) parsed.talukKn = ef.taluk_kn;
          if (ef.village_locality) parsed.villageLocality = ef.village_locality;
          if (ef.village_locality_kn) parsed.villageLocalityKn = ef.village_locality_kn;
          if (ef.title) parsed.complaintTitle = ef.title;
          if (ef.title_kn) parsed.complaintTitleKn = ef.title_kn;
          if (ef.category) parsed.complaintCategory = ef.category;
          if (ef.category_kn) parsed.complaintCategoryKn = ef.category_kn;
          if (ef.incident_date) parsed.incidentDate = ef.incident_date;
          if (ef.incident_location) parsed.incidentLocation = ef.incident_location;
          if (ef.incident_location_kn) parsed.incidentLocationKn = ef.incident_location_kn;
          if (ef.description) parsed.complaintDesc = ef.description;
          if (ef.description_kn) parsed.complaintDescKn = ef.description_kn;
          if (ef.requested_action) parsed.requestedAction = ef.requested_action;
          if (ef.requested_action_kn) parsed.requestedActionKn = ef.requested_action_kn;
          if (ef.assignment_instructions_en) parsed.assignmentInstructionsEn = ef.assignment_instructions_en;
          if (ef.assignment_instructions_kn) parsed.assignmentInstructionsKn = ef.assignment_instructions_kn;
          if (ef.language) parsed.complaintLanguage = ef.language;
        }
        setBilingualData(parsed);
        applyExtractedDataToForm(parsed, false, formLanguageMode);

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
            setBilingualData(parsed);
            applyExtractedDataToForm(parsed, false, formLanguageMode);
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

      await complaintsService.uploadComplaintDocument(
        caseId,
        fileToUpload,
        uploadName,
        'PETITION',
        complaintLanguage === 'kannada' ? 'kn' : 'en',
        complaintTitle
      );
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

  const handleProceedToVerification = () => {
    if (!citizenName.trim()) {
      showToast('Citizen Name Required', 'Please enter citizen full name before proceeding.', 'warning');
      return;
    }
    if (!citizenPhone.trim()) {
      showToast('Mobile Number Required', 'Please enter a contact mobile number before proceeding.', 'warning');
      return;
    }
    if (!complaintTitle.trim()) {
      showToast('Grievance Title Required', 'Please provide a grievance title or brief subject before proceeding.', 'warning');
      return;
    }
    setVerifiedCheckbox(true);
    setCurrentStage(4);
  };

  const handleFinalRegisterAndAssign = async (asAwaitingAssignment = false) => {
    if (!verifiedCheckbox && !asAwaitingAssignment) {
      setVerifiedCheckbox(true);
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
              {
                num: 1,
                title: 'Upload Document',
                desc: !file && currentStage >= 3 ? 'Manual Entry Selected' : 'PDF / Scanned Image',
              },
              {
                num: 2,
                title: 'OCR & AI Review',
                desc: !file && currentStage >= 3 ? 'Skipped (Direct Form)' : 'Bilingual Extraction',
              },
              { num: 3, title: 'Complete Form', desc: 'Citizen & Officer Details' },
              { num: 4, title: 'Review & Dispatch', desc: 'Register & Assign' },
            ].map((step) => {
              const isSkipped = !file && currentStage >= 3 && step.num === 2;
              const isPast = currentStage > step.num;
              const isCurrent = currentStage === step.num;
              return (
                <div
                  key={step.num}
                  className={`flex items-center gap-3 p-2 rounded-lg transition ${
                    isCurrent ? 'bg-amber-50/70 border border-amber-200' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      isSkipped
                        ? 'bg-slate-100 text-slate-400 border border-dashed border-slate-300'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isSkipped ? '—' : isPast ? <Check className="w-4 h-4" /> : step.num}
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
                </div>
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

              {/* OR Divider & Direct Manual Entry Option */}
              <div className="relative my-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                  OR
                </span>
              </div>

              <div className="bg-slate-50 hover:bg-amber-50/40 border border-slate-200/90 hover:border-amber-300 rounded-2xl p-5 sm:p-6 transition flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 shadow-xs">
                    <FileEdit className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      No Case Document? Enter Details Manually
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Skip document upload and OCR extraction to directly fill citizen contact, incident details, and officer assignment.
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  className="whitespace-nowrap shadow-sm flex-shrink-0 font-semibold"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  onClick={handleSkipToManualEntry}
                >
                  Enter Manually (Skip to Form)
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
          {/* Integrated Document OCR Workspace (Stage 1 OCR Text Extraction) */}
          <OcrPanel
            file={file}
            rawFile={uploadedRawFile}
            documentName={file?.name}
            rawText={rawOcr}
            reviewedText={reviewedOcr}
            onRawTextChange={setRawOcr}
            onReviewedTextChange={setReviewedOcr}
            onSaveReviewedText={(saved) => {
              setReviewedOcr(saved);
              showToast('Reviewed Text Saved', 'Human verified petition text preserved.', 'success');
            }}
            onTranslatedTextChange={(text, targetLang) => {
              if (targetLang === 'en') {
                setEnglishSummary(text);
                if (!complaintDesc) {
                  setComplaintDesc(text);
                }
              } else {
                setKannadaSummary(text);
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

          {/* Form Auto-Fill Preview & Action Card */}
          <Card className="border-amber-200 bg-amber-50/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Detected Form Fields (Ready to Pre-Fill)</span>
                </CardTitle>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleAutoFillFromText(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Re-extract & Fill Form</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-2 text-xs">
              <p className="text-slate-600">
                The platform analyzes the extracted petition text to detect citizen identity, phone number, grievance classification, dates, and demanded relief. Click below to proceed to the form.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Citizen Name</span>
                  <p className="font-semibold text-slate-800 truncate">{citizenName || <span className="text-slate-400 italic">Not detected</span>}</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Mobile Number</span>
                  <p className="font-semibold text-slate-800 font-mono truncate">{citizenPhone || <span className="text-slate-400 italic">Not detected</span>}</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Category</span>
                  <p className="font-semibold text-slate-800 truncate">{complaintCategory || 'General Grievance'}</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Jurisdiction Taluk</span>
                  <p className="font-semibold text-slate-800 truncate">{taluk || 'Bengaluru South'}</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Residential Address</span>
                  <p className="font-semibold text-slate-800 truncate">{citizenAddress || <span className="text-slate-400 italic">Not detected</span>}</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Incident Date</span>
                  <p className="font-semibold text-slate-800 font-mono truncate">{incidentDate || <span className="text-slate-400 italic">Not detected</span>}</p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Incident Location</span>
                  <p className="font-semibold text-slate-800 truncate">{incidentLocation || (villageLocality ? `${villageLocality}, ${taluk}` : taluk) || <span className="text-slate-400 italic">Not detected</span>}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              size="md"
              leftIcon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setCurrentStage(1)}
            >
              Back to Upload
            </Button>
            <Button
              variant="primary"
              size="md"
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={handleProceedToCompleteForm}
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
              {/* Notice that fields have been auto-filled */}
              {hasAutoFilled ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3.5 flex items-center justify-between text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>Form Pre-Filled:</strong> Citizen details, classification, and incident description have been extracted from the petition document. Please verify or edit each field below.
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
              ) : !file ? (
                <div className="bg-amber-50/70 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex items-center gap-2.5 text-xs shadow-2xs">
                  <FileEdit className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Manual Registration Mode:</strong> No petition document attached. Please fill in citizen contact, incident classification, and officer assignment details below.
                  </span>
                </div>
              ) : null}

              {/* Form Language Toggle Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-slate-50 via-amber-50/30 to-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Languages className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      Form Language Mode: <span className="text-amber-800">{formLanguageMode === 'en' ? 'English (Official Record)' : 'ಕನ್ನಡ (Original Kannada)'}</span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Toggle to fill all fields with unmixed English or original Kannada representations.
                    </p>
                  </div>
                </div>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleSwitchFormLanguage('en')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      formLanguageMode === 'en'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>English Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchFormLanguage('kn')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      formLanguageMode === 'kn'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>ಕನ್ನಡ ಮೋಡ್</span>
                  </button>
                </div>
              </div>

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
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 block">Residential Address</label>
                      {citizenAddress && (
                        <button
                          type="button"
                          disabled={fieldTranslating['address']}
                          onClick={() => handleTranslateField('address', citizenAddress, setCitizenAddress)}
                          className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-medium"
                          title="Translate address between Kannada and English"
                        >
                          {fieldTranslating['address'] ? (
                            <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                          ) : (
                            <Globe className="w-3 h-3" />
                          )}
                          <span>Translate EN/KN</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={citizenAddress}
                      onChange={(e) => setCitizenAddress(e.target.value)}
                      placeholder="#45, 1st Cross, Koramangala 4th Block"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Taluk</label>
                    <select
                      value={taluk}
                      onChange={(e) => setTaluk(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm bg-white"
                    >
                      <option value="Bengaluru South">Bengaluru South (ಬೆಂಗಳೂರು ದಕ್ಷಿಣ)</option>
                      <option value="Bengaluru North">Bengaluru North (ಬೆಂಗಳೂರು ಉತ್ತರ)</option>
                      <option value="Bengaluru East">Bengaluru East (ಬೆಂಗಳೂರು ಪೂರ್ವ)</option>
                      <option value="Anekal">Anekal (ಆನೇಕಲ್)</option>
                      <option value="Yelahanka">Yelahanka (ಯಲಹಂಕ)</option>
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 block">
                      Grievance Title <span className="text-rose-500">*</span>
                    </label>
                    {complaintTitle && (
                      <button
                        type="button"
                        disabled={fieldTranslating['title']}
                        onClick={() => handleTranslateField('title', complaintTitle, setComplaintTitle)}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-medium"
                        title="Translate title between Kannada and English"
                      >
                        {fieldTranslating['title'] ? (
                          <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
                        <span>Translate EN/KN</span>
                      </button>
                    )}
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
                    <label className="font-semibold text-slate-700 block mb-1">Complaint Category</label>
                    <input
                      type="text"
                      value={complaintCategory}
                      onChange={(e) => setComplaintCategory(e.target.value)}
                      placeholder="e.g. Public Nuisance, Cyber Fraud"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Incident Date</label>
                    <input
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 block">Incident Location</label>
                      {incidentLocation && (
                        <button
                          type="button"
                          disabled={fieldTranslating['location']}
                          onClick={() => handleTranslateField('location', incidentLocation, setIncidentLocation)}
                          className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-medium"
                          title="Translate location between Kannada and English"
                        >
                          {fieldTranslating['location'] ? (
                            <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                          ) : (
                            <Globe className="w-3 h-3" />
                          )}
                          <span>Translate EN/KN</span>
                        </button>
                      )}
                    </div>
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
                    <label className="font-semibold text-slate-700 block">
                      Detailed Complaint Statement
                    </label>
                    {complaintDesc && (
                      <button
                        type="button"
                        disabled={fieldTranslating['desc']}
                        onClick={() => handleTranslateField('desc', complaintDesc, setComplaintDesc)}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-medium"
                        title="Translate statement between Kannada and English"
                      >
                        {fieldTranslating['desc'] ? (
                          <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
                        <span>Translate EN/KN</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm leading-relaxed"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 block">
                      Relief / Action Demanded by Citizen
                    </label>
                    {requestedAction && (
                      <button
                        type="button"
                        disabled={fieldTranslating['relief']}
                        onClick={() => handleTranslateField('relief', requestedAction, setRequestedAction)}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-medium"
                        title="Translate relief demand between Kannada and English"
                      >
                        {fieldTranslating['relief'] ? (
                          <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
                        <span>Translate EN/KN</span>
                      </button>
                    )}
                  </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Department */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Target Department <span className="text-rose-500">*</span>
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
                            {off.name} ({off.designation}{off.phone ? ` • ${off.phone}` : ''})
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 block">
                      Directives / Assignment Instructions for Officer
                    </label>
                    {assignmentInstructions && (
                      <button
                        type="button"
                        disabled={fieldTranslating['directives']}
                        onClick={() => handleTranslateField('directives', assignmentInstructions, setAssignmentInstructions)}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-medium"
                        title="Translate directives between Kannada and English"
                      >
                        {fieldTranslating['directives'] ? (
                          <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
                        <span>Translate EN/KN</span>
                      </button>
                    )}
                  </div>
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
              onClick={() => setCurrentStage(file ? 2 : 1)}
            >
              {file ? 'Back to OCR Review' : 'Back to Document Upload'}
            </Button>
            <Button
              variant="primary"
              size="md"
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={handleProceedToVerification}
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
                    {officers.find((o) => o.id === selectedOfficerId)?.phone && (
                      <p className="text-xs font-mono text-emerald-700 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {officers.find((o) => o.id === selectedOfficerId)?.phone}
                      </p>
                    )}
                    <p className="text-slate-600 text-xs mt-0.5">
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
                    <p className="text-slate-700 font-mono truncate">{file?.name || 'No document attached (Direct manual registration)'}</p>
                  </div>
                </div>
              </div>

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
                    {file ? (
                      <>
                        I, <strong>{user?.name || 'Smt. Lakshmi Devi, KAS (DC PA)'}</strong>, hereby certify that I have examined the original petition document, verified citizen details and jurisdiction, and authorized the scheduled follow-up timeline for the assigned officer.
                      </>
                    ) : (
                      <>
                        I, <strong>{user?.name || 'Smt. Lakshmi Devi, KAS (DC PA)'}</strong>, hereby certify that I have verified the citizen grievance details and jurisdiction, and authorized the scheduled follow-up timeline for the assigned officer.
                      </>
                    )}
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
                onClick={() => navigate('/pa/complaints')}
              >
                View in Complaints Table
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
    </div>
  );
};
