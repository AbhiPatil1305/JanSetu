import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useLanguage } from '../../providers/LanguageContext';
import { useNotifications } from '../../providers/NotificationContext';
import { complaintsService } from '../../services/api/complaints.service';
import { departmentsService } from '../../services/api/departments.service';
import { officersService } from '../../services/api/officers.service';
import { Department, PoliceStation } from '../../types/department';
import { User } from '../../types/auth';
import { ComplaintPriority, ConfidenceLevel, Complaint } from '../../types/complaint';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
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
} from 'lucide-react';

interface ExtractedPreset {
  name: string;
  docName: string;
  docSize: number;
  language: 'kannada' | 'english' | 'bilingual';
  rawOcr: string;
  reviewedText: string;
  englishSummary: string;
  kannadaSummary: string;
  citizenName: string;
  phone: string;
  email: string;
  address: string;
  taluk: string;
  locality: string;
  title: string;
  description: string;
  category: string;
  incidentLocation: string;
  incidentDate: string;
  requestedAction: string;
  confidence: {
    citizen: ConfidenceLevel;
    category: ConfidenceLevel;
    location: ConfidenceLevel;
    date: ConfidenceLevel;
  };
}

const PRESET_PETITIONS: ExtractedPreset[] = [
  {
    name: 'Kannada Land Encroachment Petition (ಅಗರ ಗೋಮಾಳ)',
    docName: 'Gowramma_Agara_Land_Encroachment_Kannada.pdf',
    docSize: 2150000,
    language: 'kannada',
    rawOcr: `ಮಾನ್ಯ ಜಿಲ್ಲಾಧಿಕಾರಿಗಳಿಗೆ, ಬೆಂಗಳೂರು ನಗರ ಜಿಲ್ಲೆ, ಬೆಂಗಳೂರು.
ಅರ್ಜಿದಾರರು: ಗೌರಮ್ಮ ಕೋಂ ಲೇಟ್ ಸಿದ್ದರಾಮಯ್ಯ, ಅಗರ ಗ್ರಾಮ, ಬೆಂಗಳೂರು ದಕ್ಷಿಣ ತಾಲೂಕು.
ವಿಷಯ: ಅಗರ ಗ್ರಾಮದ ಸರ್ವೆ ನಂ. ೪೪ ರ ಸರ್ಕಾರಿ ಗೋಮಾಳ ಜಮೀನು ಒತ್ತುವರಿ ತೆರವುಗೊಳಿಸಲು ಹಾಗೂ ಬೆದರಿಕೆ ಹಾಕುತ್ತಿರುವ ಕಿಡಿಗೇಡಿಗಳ ವಿರುದ್ಧ ಕ್ರಮ ಕೈಗೊಳ್ಳಲು ಮನವಿ.
ದೂರಿನ ಸಾರಾಂಶ: ಸದರಿ ಜಮೀನನ್ನು ಹಳ್ಳಿಯ ದನಕರುಗಳ ಮೇಯಿಸಲು ಮೀಸಲಿಡಲಾಗಿದ್ದು, ಸ್ಥಳೀಯ ಭೂಮಾಫಿಯಾದವರು ಅಕ್ರಮವಾಗಿ ರಾತ್ರೋರಾತ್ರಿ ತಂತಿಬೇಲಿ ನಿರ್ಮಿಸಿ ಒತ್ತುವರಿ ಮಾಡಿಕೊಂಡಿದ್ದಾರೆ. ಗ್ರಾಮಸ್ಥರು ಪ್ರಶ್ನಿಸಿದಾಗ ಪ್ರಾಣಬೆದರಿಕೆ ಹಾಕಿದ್ದಾರೆ.
ಕ್ರಮ ಕೋರಿಕೆ: ತಕ್ಷಣ ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ ತಂತಿಬೇಲಿ ತೆರವುಗೊಳಿಸುವುದು ಮತ್ತು ಪೊಲೀಸ್ ರಕ್ಷಣೆ ನೀಡುವುದು.`,
    reviewedText: `ಮಾನ್ಯ ಜಿಲ್ಲಾಧಿಕಾರಿಗಳಿಗೆ, ಬೆಂಗಳೂರು ನಗರ ಜಿಲ್ಲೆ. ಅರ್ಜಿದಾರರು: ಗೌರಮ್ಮ ಕೋಂ ಲೇಟ್ ಸಿದ್ದರಾಮಯ್ಯ. ಅಗರ ಗ್ರಾಮದ ಸರ್ವೆ ನಂ. ೪೪ ರ ಸರ್ಕಾರಿ ಗೋಮಾಳ ಜಮೀನು ಅಕ್ರಮ ಒತ್ತುವರಿ ಮತ್ತು ಬೆದರಿಕೆ ಕುರಿತು ತುರ್ತು ಕ್ರಮ.`,
    englishSummary: `Petition by resident Gowramma alleging illegal encroachment and fencing of Government Gomal Land (Survey No. 44) in Agara village with criminal intimidation by local elements.`,
    kannadaSummary: `ಅಗರ ಗ್ರಾಮದ ಸರ್ವೆ ನಂ. ೪೪ ರ ಸರ್ಕಾರಿ ಗೋಮಾಳ ಜಮೀನನ್ನು ಅಕ್ರಮವಾಗಿ ಒತ್ತುವರಿ ಮಾಡಿಕೊಂಡು ಗ್ರಾಮಸ್ಥರಿಗೆ ಬೆದರಿಕೆ ಹಾಕುತ್ತಿರುವ ಕುರಿತು ಮನವಿ.`,
    citizenName: 'ಗೌರಮ್ಮ (Gowramma)',
    phone: '+91 94482 99120',
    email: '',
    address: 'Near Anjaneya Temple, Agara Village, HSR Post',
    taluk: 'Bengaluru South',
    locality: 'Agara Village',
    title: 'ಸರ್ಕಾರಿ ಗೋಮಾಳ ಜಮೀನು ಅಕ್ರಮ ಒತ್ತುವರಿ ಮತ್ತು ಬೆದರಿಕೆ (Government Land Encroachment)',
    description: `ಅಗರ ಗ್ರಾಮದ ಸರ್ವೆ ನಂ. ೪೪ ರ ಸರ್ಕಾರಿ ಗೋಮಾಳ ಜಮೀನನ್ನು ಸ್ಥಳೀಯ ಕಿಡಿಗೇಡಿಗಳು ಅಕ್ರಮವಾಗಿ ಒತ್ತುವರಿ ಮಾಡಿ ತಂತಿಬೇಲಿ ಹಾಕುತ್ತಿದ್ದು, ಪ್ರಶ್ನಿಸಿದ ಗ್ರಾಮಸ್ಥರಿಗೆ ಪ್ರಾಣಬೆದರಿಕೆ ಹಾಕುತ್ತಿದ್ದಾರೆ.`,
    category: 'Land Encroachment & Threat',
    incidentLocation: 'Survey No. 44, Agara Village',
    incidentDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    requestedAction: 'ಅಕ್ರಮ ತಂತಿಬೇಲಿ ತೆರವುಗೊಳಿಸುವುದು ಮತ್ತು ಬೆದರಿಕೆ ಹಾಕಿದವರ ವಿರುದ್ಧ ಕಾನೂನು ಕ್ರಮ ಕೈಗೊಳ್ಳುವುದು.',
    confidence: {
      citizen: 'HIGH',
      category: 'HIGH',
      location: 'HIGH',
      date: 'HIGH',
    },
  },
  {
    name: 'English Cyber Financial Fraud Grievance (Telegram ₹4.8L)',
    docName: 'Cyber_Fraud_Complaint_SunitaMehra.pdf',
    docSize: 1840000,
    language: 'english',
    rawOcr: `TO: THE SUPERINTENDENT OF POLICE / DEPUTY COMMISSIONER
COMPLAINANT: Sunita Mehra, #112, 12th Main, HAL 2nd Stage, Indiranagar. Phone: +91 98860 44556.
SUBJECT: Online Investment Cyber Fraud of Rs 4,80,000 via Telegram Trading Group.
INCIDENT DETAILS: On 28th October, I was added to a Telegram investment channel promising 30% daily returns. Transferred Rs 4.8 Lakhs across 3 transactions (SBI A/C 2049182741). Admin blocked my number upon requesting withdrawal.
REQUESTED RELIEF: Direct Cyber Crime Unit to freeze mule accounts immediately and recover defrauded funds.`,
    reviewedText: `To: The Deputy Commissioner & Cyber Crime Division. Complainant: Sunita Mehra. Loss of Rs 4,80,000 via fraudulent Telegram trading scheme. Immediate debit freeze requested.`,
    englishSummary: `Citizen Sunita Mehra defrauded of ₹4,80,000 across 3 bank transactions via fraudulent Telegram trading investment scheme. Immediate debit freeze needed.`,
    kannadaSummary: `ಟೆಲಿಗ್ರಾಂ ಹೂಡಿಕೆ ವಂಚನೆಯ ಮೂಲಕ ₹೪,೮೦,೦೦೦ ಹಣ ಕಳೆದುಕೊಂಡಿರುವ ಬಗ್ಗೆ ಸೈಬರ್ ಕ್ರೈಮ್ ದೂರು. ಖಾತೆಗಳನ್ನು ತಕ್ಷಣ ಸ್ಥಗಿತಗೊಳಿಸಲು ಮನವಿ.`,
    citizenName: 'Sunita Mehra',
    phone: '+91 98860 44556',
    email: 'sunita.mehra@outlook.com',
    address: '#112, 12th Main, HAL 2nd Stage, Indiranagar',
    taluk: 'Bengaluru East',
    locality: 'Indiranagar',
    title: 'Online Investment Cyber Fraud of ₹4,80,000 via Telegram Scheme',
    description: `Defrauded into transferring ₹4.8 Lakhs to multiple mule bank accounts through a fraudulent crypto/stock trading Telegram group. Group admins subsequently severed contact.`,
    category: 'Cyber Financial Fraud',
    incidentLocation: 'Indiranagar, Bengaluru',
    incidentDate: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
    requestedAction: 'Liaise with Cyber Crime nodal officer to place debit freeze on beneficiary accounts and initiate FIR under IT Act Sec 66D.',
    confidence: {
      citizen: 'HIGH',
      category: 'HIGH',
      location: 'HIGH',
      date: 'HIGH',
    },
  },
  {
    name: 'Bilingual Public Nuisance & Noise Violation (Koramangala 80ft)',
    docName: 'Resident_Association_Noise_Petition.pdf',
    docSize: 1320000,
    language: 'bilingual',
    rawOcr: `RESIDENTS WELFARE ASSOCIATION, 4TH BLOCK KORAMANGALA
PETITION TO DEPUTY COMMISSIONER, BENGALURU URBAN
SUBJECT: Severe High-Decibel Noise and Illegal Rooftop Pub Operations on 80 Feet Road.
ಅನಧಿಕೃತ ಪಬ್ ಮತ್ತು ಧ್ವನಿವರ್ಧಕಗಳ ಹಾವಳಿ: ರಾತ್ರಿ ೧೨ ಗಂಟೆಯ ನಂತರವೂ ಅಕ್ರಮವಾಗಿ ಧ್ವನಿವರ್ಧಕಗಳನ್ನು ಬಳಸಿ ವೃದ್ಧರಿಗೆ ಮತ್ತು ಮಕ್ಕಳಿಗೆ ನಿದ್ರಾಭಂಗ ಉಂಟುಮಾಡಲಾಗುತ್ತಿದೆ.
Citizen Rep: Chandrashekar S. Murthy. Mobile: +91 98450 12345.
Relief: Conduct decibel measurement, enforce 11:30 PM curfew, verify license.`,
    reviewedText: `Residents Welfare Association petition regarding illegal outdoor amplified music and commercial noise on 80ft Road Koramangala exceeding permissible noise standards after midnight.`,
    englishSummary: `Resident petition regarding persistent midnight amplified music and street obstruction by rooftop lounge on 80ft Road Koramangala.`,
    kannadaSummary: `ಕೋರಮಂಗಲ 80 ಅಡಿ ರಸ್ತೆಯಲ್ಲಿ ರಾತ್ರಿ ವೇಳೆ ನಿರಂತರವಾಗಿ ಜೋರು ಧ್ವನಿವರ್ಧಕ ಬಳಕೆ ಮತ್ತು ಸಂಚಾರ ಅಡಚಣೆ ಕುರಿತು ನಿವಾಸಿಗಳ ದೂರು.`,
    citizenName: 'Chandrashekar S. Murthy',
    phone: '+91 98450 12345',
    email: 'c.murthy@gmail.com',
    address: '#45, 1st Cross, Koramangala 4th Block',
    taluk: 'Bengaluru South',
    locality: 'Koramangala 4th Block',
    title: 'Commercial Noise Violation & Illegal Night Pub Operation',
    description: `Persistent amplified music beyond midnight and illegal outdoor seating causing severe disturbance to senior citizens and children on 80ft road Koramangala.`,
    category: 'Public Nuisance & Noise Pollution',
    incidentLocation: '80ft Road, 4th Block, Koramangala',
    incidentDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    requestedAction: 'Enforce legal noise decibel limits, restrict operation past 11:30 PM, verify municipal bar license under Karnataka Police Act.',
    confidence: {
      citizen: 'HIGH',
      category: 'HIGH',
      location: 'HIGH',
      date: 'HIGH',
    },
  },
];

export const RegisterComplaintPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  // Workflow Stages: 1 = Upload, 2 = OCR/AI Review, 3 = Complete Form, 4 = Review & Register, 5 = Success
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Stage 1: File State
  const [file, setFile] = useState<{ name: string; size: number; url: string } | null>(null);
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
      officersService.getOfficers(selectedStationId).then((offs) => {
        setOfficers(offs);
        if (offs.length > 0) {
          setSelectedOfficerId(offs[0].id);
        } else {
          setSelectedOfficerId('');
        }
      });
    } else {
      setOfficers([]);
      setSelectedOfficerId('');
    }
  }, [selectedStationId]);

  // Apply a preset petition
  const applyPreset = (preset: ExtractedPreset) => {
    setFile({
      name: preset.docName,
      size: preset.docSize,
      url: '#',
    });
    setRawOcr(preset.rawOcr);
    setReviewedOcr(preset.reviewedText);
    setEnglishSummary(preset.englishSummary);
    setKannadaSummary(preset.kannadaSummary);
    setCitizenName(preset.citizenName);
    setCitizenPhone(preset.phone);
    setCitizenEmail(preset.email);
    setCitizenAddress(preset.address);
    setTaluk(preset.taluk);
    setVillageLocality(preset.locality);
    setComplaintTitle(preset.title);
    setComplaintDesc(preset.description);
    setComplaintCategory(preset.category);
    setIncidentLocation(preset.incidentLocation);
    setIncidentDate(preset.incidentDate);
    setRequestedAction(preset.requestedAction);
    setComplaintLanguage(preset.language);
    setConfidenceScores(preset.confidence);

    setAssignmentInstructions(
      `Conduct spot enquiry regarding ${preset.category} at ${preset.incidentLocation}. Issue notice if required and report back within 3 working days.`
    );
  };

  const handleSimulateUpload = (selectedPreset?: ExtractedPreset) => {
    const preset = selectedPreset || PRESET_PETITIONS[0];
    applyPreset(preset);

    setIsProcessingOcr(true);
    setUploadProgress(20);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessingOcr(false);
          setCurrentStage(2);
          showToast('OCR & AI Ingestion Complete', 'Document text extracted and summarized.', 'success');
          return 100;
        }
        return prev + 30;
      });
    }, 150);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile({
        name: droppedFile.name,
        size: droppedFile.size,
        url: '#',
      });
      // Pick random preset for realistic extraction
      const preset = PRESET_PETITIONS[Math.floor(Math.random() * PRESET_PETITIONS.length)];
      handleSimulateUpload(preset);
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

    setIsRegistering(true);

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
      setCurrentStage(5);
      showToast(
        'Complaint Successfully Registered',
        hasAssignment
          ? `Grievance registered and assigned to ${officer.name}. Case ID: ${newComplaint.id}`
          : `Grievance registered as Awaiting Assignment. Case ID: ${newComplaint.id}`,
        'success'
      );
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to register complaint', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleResetWorkflow = () => {
    setCurrentStage(1);
    setFile(null);
    setVerifiedCheckbox(false);
    setCreatedCaseId(null);
    setCreatedOfficerName(null);
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
                <div
                  key={step.num}
                  className={`flex items-center gap-3 p-2 rounded-lg transition ${
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
                onClick={() => handleSimulateUpload(PRESET_PETITIONS[0])}
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
                <Button variant="secondary" size="sm" className="mt-2">
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

              {/* Preset Testing Shortcuts */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-3">
                  {t.registration.samplePresets}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {PRESET_PETITIONS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSimulateUpload(preset)}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-amber-50/70 hover:border-amber-300 text-left transition space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-slate-400 group-hover:text-amber-700">
                          Preset #{idx + 1}
                        </span>
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {preset.language}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-amber-900 line-clamp-2">
                        {preset.name}
                      </p>
                      <span className="text-[11px] text-blue-600 font-medium group-hover:underline block">
                        Ingest & Extract &rarr;
                      </span>
                    </button>
                  ))}
                </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Document Viewer Simulation */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Original Document Preview</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(60, z - 20))}
                    className="p-1 rounded hover:bg-slate-200 text-slate-600"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] w-10 text-center">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(180, z + 20))}
                    className="p-1 rounded hover:bg-slate-200 text-slate-600"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="h-[520px] bg-slate-900/95 text-slate-200 rounded-xl p-5 overflow-y-auto border border-slate-800 font-serif leading-relaxed text-xs shadow-inner">
                <div
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
                  className="space-y-3"
                >
                  <div className="text-center pb-2 border-b border-slate-700 text-slate-400 uppercase text-[10px] tracking-widest font-mono">
                    Scanned Petition Document &bull; District Archive
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300">
                    {rawOcr}
                  </pre>
                </div>
              </div>
            </div>

            {/* Right: AI Summaries & Verification Workspace */}
            <div className="lg:col-span-7 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>AI Extracted Summaries & Verified Text</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-5 text-xs">
                  {/* Confidence Indicators Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Citizen Identity</span>
                      {getConfidenceBadge(confidenceScores.citizen)}
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Classification</span>
                      {getConfidenceBadge(confidenceScores.category)}
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Location</span>
                      {getConfidenceBadge(confidenceScores.location)}
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Incident Date</span>
                      {getConfidenceBadge(confidenceScores.date)}
                    </div>
                  </div>

                  {/* English Summary */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      English Summary (Editable):
                    </label>
                    <textarea
                      rows={3}
                      value={englishSummary}
                      onChange={(e) => setEnglishSummary(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-slate-800 outline-none leading-relaxed"
                    />
                  </div>

                  {/* Kannada Summary */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 font-kannada">
                      ಕನ್ನಡ ಸಾರಾಂಶ (Kannada Summary - Editable):
                    </label>
                    <textarea
                      rows={3}
                      value={kannadaSummary}
                      onChange={(e) => setKannadaSummary(e.target.value)}
                      className="w-full p-2.5 bg-amber-50/40 border border-amber-200 rounded-lg text-slate-800 focus:bg-white focus:border-amber-600 outline-none leading-relaxed font-kannada"
                    />
                  </div>

                  {/* Reviewed Text */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Reviewed Clean Text:
                    </label>
                    <textarea
                      rows={3}
                      value={reviewedOcr}
                      onChange={(e) => setReviewedOcr(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-slate-800 outline-none leading-relaxed"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

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
              onClick={() => setCurrentStage(3)}
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
                    <label className="font-semibold text-slate-700 block mb-1">Residential Address</label>
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

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Grievance Title <span className="text-rose-500">*</span>
                  </label>
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
                    <label className="font-semibold text-slate-700 block mb-1">Incident Location</label>
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
                  <label className="font-semibold text-slate-700 block mb-1">
                    Detailed Complaint Statement
                  </label>
                  <textarea
                    rows={3}
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm leading-relaxed"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Relief / Action Demanded by Citizen
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
                      Investigating Police Officer <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedOfficerId}
                      onChange={(e) => setSelectedOfficerId(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 focus:border-slate-800 outline-none text-sm bg-white"
                    >
                      {officers.map((off) => (
                        <option key={off.id} value={off.id}>
                          {off.name} ({off.designation})
                        </option>
                      ))}
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
                      {officers.find((o) => o.id === selectedOfficerId)?.name || 'None Selected'}
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

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                  onClick={() => setCurrentStage(3)}
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
                    isLoading={isRegistering}
                    disabled={!verifiedCheckbox}
                  >
                    REGISTER & ASSIGN GRIEVANCE
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
    </div>
  );
};
