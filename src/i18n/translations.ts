export type Language = 'en' | 'kn';

export interface Translations {
  appName: string;
  tagline: string;
  login: {
    welcome: string;
    signInSubtitle: string;
    employeeId: string;
    password: string;
    rememberMe: string;
    forgotPassword: string;
    signInButton: string;
    demoAccess: string;
    demoNote: string;
    adminRole: string;
    paRole: string;
    officerRole: string;
    securityNotice: string;
    invalidCredentials: string;
  };
  navigation: {
    dashboard: string;
    complaints: string;
    registerComplaint: string;
    departments: string;
    policeStations: string;
    officers: string;
    followups: string;
    escalations: string;
    communications: string;
    reports: string;
    userManagement: string;
    reminderSettings: string;
    auditLogs: string;
    settings: string;
    myCases: string;
    notifications: string;
    profile: string;
    logout: string;
  };
  statuses: {
    REGISTERED: string;
    AWAITING_ASSIGNMENT: string;
    ASSIGNED: string;
    UNDER_INVESTIGATION: string;
    AWAITING_INFORMATION: string;
    RESOLUTION_SUBMITTED: string;
    CLOSED: string;
  };
  flags: {
    OVERDUE: string;
    ESCALATED: string;
    NO_RECENT_UPDATE: string;
  };
  priorities: {
    LOW: string;
    MEDIUM: string;
    HIGH: string;
    CRITICAL: string;
  };
  common: {
    search: string;
    filter: string;
    status: string;
    priority: string;
    department: string;
    station: string;
    officer: string;
    date: string;
    actions: string;
    viewDetails: string;
    exportCsv: string;
    clearFilters: string;
    noResults: string;
    loading: string;
    save: string;
    cancel: string;
    submit: string;
    confirm: string;
    back: string;
    next: string;
    edit: string;
    delete: string;
    active: string;
    inactive: string;
    success: string;
    error: string;
    daysOverdue: string;
    caseId: string;
    citizen: string;
    title: string;
    followupDate: string;
    lastUpdated: string;
    resetDemoData: string;
  };
  dashboard: {
    adminGreeting: string;
    adminSubtitle: string;
    paGreeting: string;
    paSubtitle: string;
    officerGreeting: string;
    officerSubtitle: string;
    kpis: {
      totalComplaints: string;
      openCases: string;
      assignedCases: string;
      awaitingAssignment: string;
      dueToday: string;
      overdueCases: string;
      escalatedCases: string;
      closedCases: string;
      newAssignments: string;
      inProgress: string;
      resolutionSubmitted: string;
      awaitingOfficerResponse: string;
    };
    charts: {
      complaintTrend: string;
      departmentDistribution: string;
      statusDistribution: string;
      recentComplaints: string;
      recentActivity: string;
      departmentPerformance: string;
      attentionRequired: string;
    };
  };
  registration: {
    stage1Title: string;
    stage1Desc: string;
    stage2Title: string;
    stage2Desc: string;
    stage3Title: string;
    stage3Desc: string;
    stage4Title: string;
    stage4Desc: string;
    dragDropText: string;
    browseFiles: string;
    samplePresets: string;
    privacyNotice: string;
    rawOcr: string;
    reviewedOcr: string;
    kannadaSummary: string;
    englishSummary: string;
    confidenceHigh: string;
    confidenceReview: string;
    confidenceMissing: string;
    citizenInfo: string;
    complaintInfo: string;
    assignmentInfo: string;
    registerAndAssign: string;
    awaitingAssignment: string;
    successTitle: string;
    successMessage: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'JanSetu',
    tagline: 'Connecting Citizens. Ensuring Accountability.',
    login: {
      welcome: 'Welcome back',
      signInSubtitle: 'Sign in to the Government Grievance Tracking & Follow-up Platform',
      employeeId: 'Employee ID / Official Email',
      password: 'Password',
      rememberMe: 'Remember me on this workstation',
      forgotPassword: 'Forgot password?',
      signInButton: 'Sign In to Portal',
      demoAccess: 'Quick Demo Access',
      demoNote: 'Click any role below to pre-fill credentials for local demonstration:',
      adminRole: 'DC Main Admin',
      paRole: 'DC Personal Assistant (PA)',
      officerRole: 'Police Officer (Investigating Officer)',
      securityNotice: 'Official Government of Karnataka Grievance Management System. Unauthorized access is strictly prohibited and subject to legal prosecution under the IT Act.',
      invalidCredentials: 'Invalid Employee ID or Password. For demonstration, use the quick demo accounts above.',
    },
    navigation: {
      dashboard: 'Dashboard',
      complaints: 'All Grievances',
      registerComplaint: 'Register Grievance',
      departments: 'Departments',
      policeStations: 'Police Stations',
      officers: 'Officers & Staff',
      followups: 'Follow-up Monitoring',
      escalations: 'Escalations',
      communications: 'Communication Log',
      reports: 'Reports & Analytics',
      userManagement: 'User Management',
      reminderSettings: 'Reminder Rules',
      auditLogs: 'Audit Trail',
      settings: 'System Settings',
      myCases: 'My Assigned Cases',
      notifications: 'Notification Centre',
      profile: 'Officer Profile',
      logout: 'Sign Out',
    },
    statuses: {
      REGISTERED: 'Registered',
      AWAITING_ASSIGNMENT: 'Awaiting Assignment',
      ASSIGNED: 'Assigned',
      UNDER_INVESTIGATION: 'Under Investigation',
      AWAITING_INFORMATION: 'Awaiting Information',
      RESOLUTION_SUBMITTED: 'Resolution Submitted',
      CLOSED: 'Closed',
    },
    flags: {
      OVERDUE: 'Overdue',
      ESCALATED: 'Escalated',
      NO_RECENT_UPDATE: 'No Recent Update',
    },
    priorities: {
      LOW: 'Low',
      MEDIUM: 'Medium',
      HIGH: 'High',
      CRITICAL: 'Critical',
    },
    common: {
      search: 'Search cases, citizen names, mobile...',
      filter: 'Filter',
      status: 'Status',
      priority: 'Priority',
      department: 'Department',
      station: 'Police Station',
      officer: 'Assigned Officer',
      date: 'Date',
      actions: 'Actions',
      viewDetails: 'View Details',
      exportCsv: 'Export CSV',
      clearFilters: 'Clear Filters',
      noResults: 'No records found matching criteria',
      loading: 'Loading data...',
      save: 'Save Changes',
      cancel: 'Cancel',
      submit: 'Submit',
      confirm: 'Confirm Action',
      back: 'Previous',
      next: 'Next',
      edit: 'Edit',
      delete: 'Delete',
      active: 'Active',
      inactive: 'Inactive',
      success: 'Operation Successful',
      error: 'An error occurred',
      daysOverdue: 'Days Overdue',
      caseId: 'Case ID',
      citizen: 'Citizen Name',
      title: 'Complaint Title',
      followupDate: 'Follow-up Date',
      lastUpdated: 'Last Updated',
      resetDemoData: 'Reset Demo Data to Initial State',
    },
    dashboard: {
      adminGreeting: 'Good morning, Administrator',
      adminSubtitle: 'District-wide grievance management, departmental compliance, and follow-up oversight.',
      paGreeting: 'Welcome back, DC PA',
      paSubtitle: 'Process citizen petitions, review AI extractions, dispatch officer follow-ups, and monitor overdue cases.',
      officerGreeting: 'Welcome back, Officer',
      officerSubtitle: 'Review assigned grievances, record investigation progress, update follow-up dates, and submit resolutions.',
      kpis: {
        totalComplaints: 'Total Complaints',
        openCases: 'Open Cases',
        assignedCases: 'Assigned Cases',
        awaitingAssignment: 'Awaiting Assignment',
        dueToday: 'Follow-ups Due Today',
        overdueCases: 'Overdue Cases',
        escalatedCases: 'Escalated Cases',
        closedCases: 'Resolved & Closed',
        newAssignments: 'New Assignments',
        inProgress: 'In Progress',
        resolutionSubmitted: 'Resolution Submitted',
        awaitingOfficerResponse: 'Awaiting Officer Response',
      },
      charts: {
        complaintTrend: 'Grievance Inflow & Resolution Trend',
        departmentDistribution: 'Department-wise Grievances',
        statusDistribution: 'Case Status Distribution',
        recentComplaints: 'Recently Registered Grievances',
        recentActivity: 'Live Officer Activity Stream',
        departmentPerformance: 'Departmental Compliance Matrix',
        attentionRequired: 'Critical Attention Required',
      },
    },
    registration: {
      stage1Title: 'Document Ingestion',
      stage1Desc: 'Upload scanned complaint PDF, image, or petition letter in Kannada, English, or bilingual format.',
      stage2Title: 'OCR & AI Extraction Review',
      stage2Desc: 'Inspect extracted document text, bilingual summaries, and AI-suggested fields with confidence scores.',
      stage3Title: 'Case Completion & Assignment',
      stage3Desc: 'Verify citizen contact information, jurisdiction, priority, and assign the responsible investigating officer.',
      stage4Title: 'Verification & Dispatch',
      stage4Desc: 'Review verified grievance summary and register case with scheduled initial follow-up.',
      dragDropText: 'Drag & drop petition document here, or browse files',
      browseFiles: 'Browse Local File',
      samplePresets: 'Or test with pre-loaded official petitions:',
      privacyNotice: 'Complaint documents are classified government records. Original petitions are immutably archived and only accessible to authorized district personnel.',
      rawOcr: 'Raw OCR Extracted Text',
      reviewedOcr: 'Verified Text & Corrections',
      kannadaSummary: 'Kannada Grievance Summary (ಸಾರಾಂಶ)',
      englishSummary: 'English Grievance Summary',
      confidenceHigh: 'High Confidence',
      confidenceReview: 'Needs Human Review',
      confidenceMissing: 'Not Provided in Document',
      citizenInfo: 'Citizen Contact & Jurisdiction',
      complaintInfo: 'Grievance Specifics & Classification',
      assignmentInfo: 'Department & Officer Assignment',
      registerAndAssign: 'Register & Assign Case',
      awaitingAssignment: 'Save as Awaiting Assignment',
      successTitle: 'Grievance Successfully Registered & Dispatched',
      successMessage: 'The complaint has been catalogued in the district registry and assigned to the selected officer with an active follow-up timeline.',
    },
  },
  kn: {
    appName: 'ಜನಸೇತು',
    tagline: 'ನಾಗರಿಕರನ್ನು ಬೆಸೆಯುವುದು. ಹೊಣೆಗಾರಿಕೆಯನ್ನು ಖಚಿತಪಡಿಸುವುದು.',
    login: {
      welcome: 'ಸ್ವಾಗತ',
      signInSubtitle: 'ಸರ್ಕಾರಿ ಕುಂದುಕೊರತೆ ಟ್ರ್ಯಾಕಿಂಗ್ ಮತ್ತು ಅನುಸರಣಾ ವೇದಿಕೆಗೆ ಲಾಗಿನ್ ಮಾಡಿ',
      employeeId: 'ಉದ್ಯೋಗಿ ಐಡಿ / ಅಧಿಕೃತ ಇಮೇಲ್',
      password: 'ಪಾಸ್‌ವರ್ಡ್',
      rememberMe: 'ನನ್ನನ್ನು ನೆನಪಿಡಿ',
      forgotPassword: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?',
      signInButton: 'ಪೋರ್ಟಲ್‌ಗೆ ಪ್ರವೇಶಿಸಿ',
      demoAccess: 'ಡೆಮೊ ಖಾತೆಗಳು',
      demoNote: 'ಸ್ಥಳೀಯ ಪ್ರಾತ್ಯಕ್ಷಿಕೆಗಾಗಿ ರುಜುವಾತುಗಳನ್ನು ಸ್ವಯಂ ಭರ್ತಿ ಮಾಡಲು ಕೆಳಗಿನ ಪಾತ್ರವನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ:',
      adminRole: 'ಡಿಸಿ ಮುಖ್ಯ ಆಡಳಿತಾಧಿಕಾರಿ',
      paRole: 'ಡಿಸಿ ಆಪ್ತ ಸಹಾಯಕ (PA)',
      officerRole: 'ಪೊಲೀಸ್ ಅಧಿಕಾರಿ (ತನಿಖಾಧಿಕಾರಿ)',
      securityNotice: 'ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಅಧಿಕೃತ ಕುಂದುಕೊರತೆ ನಿರ್ವಹಣಾ ವ್ಯವಸ್ಥೆ. ಅನಧಿಕೃತ ಪ್ರವೇಶವನ್ನು ಕಟ್ಟುನಿಟ್ಟಾಗಿ ನಿಷೇಧಿಸಲಾಗಿದೆ.',
      invalidCredentials: 'ಅಮಾನ್ಯ ಉದ್ಯೋಗಿ ಐಡಿ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್. ಪ್ರಾತ್ಯಕ್ಷಿಕೆಗಾಗಿ ಮೇಲಿನ ಡೆಮೊ ಖಾತೆಗಳನ್ನು ಬಳಸಿ.',
    },
    navigation: {
      dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      complaints: 'ಎಲ್ಲಾ ಕುಂದುಕೊರತೆಗಳು',
      registerComplaint: 'ಹೊಸ ದೂರು ನೋಂದಣಿ',
      departments: 'ಇಲಾಖೆಗಳು',
      policeStations: 'ಪೊಲೀಸ್ ಠಾಣೆಗಳು',
      officers: 'ಅಧಿಕಾರಿಗಳು ಮತ್ತು ಸಿಬ್ಬಂದಿ',
      followups: 'ಅನುಸರಣಾ ಮೇಲ್ವಿಚಾರಣೆ',
      escalations: 'ಮೇಲ್ಮನವಿ / ತೀವ್ರ ಪ್ರಕರಣಗಳು',
      communications: 'ಸಂವಹನ ದಾಖಲೆ',
      reports: 'ವರದಿಗಳು ಮತ್ತು ವಿಶ್ಲೇಷಣೆ',
      userManagement: 'ಬಳಕೆದಾರರ ನಿರ್ವಹಣೆ',
      reminderSettings: 'ಜ್ಞಾಪನೆ ನಿಯಮಗಳು',
      auditLogs: 'ಆಡಿಟ್ ಇತಿಹಾಸ',
      settings: 'ವ್ಯವಸ್ಥೆಯ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      myCases: 'ನನಗೆ ನಿಯೋಜಿಸಲಾದ ಪ್ರಕರಣಗಳು',
      notifications: 'ಅಧಿಸೂಚನೆ ಕೇಂದ್ರ',
      profile: 'ಅಧಿಕಾರಿಯ ವಿವರ',
      logout: 'ನಿರ್ಗಮಿಸಿ',
    },
    statuses: {
      REGISTERED: 'ನೋಂದಾಯಿಸಲಾಗಿದೆ',
      AWAITING_ASSIGNMENT: 'ನಿಯೋಜನೆಗೆ ಬಾಕಿ ಇದೆ',
      ASSIGNED: 'ನಿಯೋಜಿಸಲಾಗಿದೆ',
      UNDER_INVESTIGATION: 'ತನಿಖೆಯಲ್ಲಿದೆ',
      AWAITING_INFORMATION: 'ಮಾಹಿತಿಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ',
      RESOLUTION_SUBMITTED: 'ಪರಿಹಾರ ಸಲ್ಲಿಕೆಯಾಗಿದೆ',
      CLOSED: 'ಮುಕ್ತಾಯಗೊಂಡಿದೆ',
    },
    flags: {
      OVERDUE: 'ವಿಳಂಬವಾಗಿದೆ',
      ESCALATED: 'ಮೇಲ್ಮನವಿ ಮಾಡಲಾಗಿದೆ',
      NO_RECENT_UPDATE: 'ಇತ್ತೀಚಿನ ನವೀಕರಣವಿಲ್ಲ',
    },
    priorities: {
      LOW: 'ಕಡಿಮೆ',
      MEDIUM: 'ಮಧ್ಯಮ',
      HIGH: 'ಹೆಚ್ಚು',
      CRITICAL: 'ಅತ್ಯಂತ ತುರ್ತು',
    },
    common: {
      search: 'ಪ್ರಕರಣ ಐಡಿ, ನಾಗರಿಕರ ಹೆಸರು, ಮೊಬೈಲ್ ಹುಡುಕಿ...',
      filter: 'ಫಿಲ್ಟರ್',
      status: 'ಸ್ಥಿತಿ',
      priority: 'ಆದ್ಯತೆ',
      department: 'ಇಲಾಖೆ',
      station: 'ಪೊಲೀಸ್ ಠಾಣೆ',
      officer: 'ನಿಯೋಜಿತ ಅಧಿಕಾರಿ',
      date: 'ದಿನಾಂಕ',
      actions: 'ಕ್ರಮಗಳು',
      viewDetails: 'ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
      exportCsv: 'CSV ರಫ್ತು ಮಾಡಿ',
      clearFilters: 'ಫಿಲ್ಟರ್ ತೆರವುಗೊಳಿಸಿ',
      noResults: 'ಯಾವುದೇ ದಾಖಲೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ',
      loading: 'ಡೇಟಾ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
      save: 'ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ',
      cancel: 'ರದ್ದುಮಾಡಿ',
      submit: 'ಸಲ್ಲಿಸಿ',
      confirm: 'ಖಚಿತಪಡಿಸಿ',
      back: 'ಹಿಂದೆ',
      next: 'ಮುಂದೆ',
      edit: 'ತಿದ್ದುಪಡಿ',
      delete: 'ಅಳಿಸಿ',
      active: 'ಸಕ್ರಿಯ',
      inactive: 'ನಿಷ್ಕ್ರಿಯ',
      success: 'ಕಾರ್ಯಾಚರಣೆ ಯಶಸ್ವಿಯಾಗಿದೆ',
      error: 'ದೋಷ ಸಂಭವಿಸಿದೆ',
      daysOverdue: 'ವಿಳಂಬವಾದ ದಿನಗಳು',
      caseId: 'ಪ್ರಕರಣ ಐಡಿ',
      citizen: 'ನಾಗರಿಕರ ಹೆಸರು',
      title: 'ದೂರಿನ ಶೀರ್ಷಿಕೆ',
      followupDate: 'ಅನುಸರಣಾ ದಿನಾಂಕ',
      lastUpdated: 'ಕೊನೆಯ ನವೀಕರಣ',
      resetDemoData: 'ಡೆಮೊ ಡೇಟಾವನ್ನು ಮರುಹೊಂದಿಸಿ',
    },
    dashboard: {
      adminGreeting: 'ಶುಭೋದಯ, ಆಡಳಿತಾಧಿಕಾರಿಗಳೇ',
      adminSubtitle: 'ಜಿಲ್ಲಾ ಮಟ್ಟದ ಕುಂದುಕೊರತೆಗಳ ನಿರ್ವಹಣೆ, ಇಲಾಖಾ ಕಾರ್ಯಕ್ಷಮತೆ ಮತ್ತು ಅನುಸರಣಾ ಪರಿಶೀಲನೆ.',
      paGreeting: 'ಮತ್ತೆ ಸ್ವಾಗತ, ಡಿಸಿ ಪಿಎ',
      paSubtitle: 'ನಾಗರಿಕ ಅರ್ಜಿಗಳನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಿ, AI ಸಾರಾಂಶವನ್ನು ಪರಿಶೀಲಿಸಿ, ಮತ್ತು ಅಧಿಕಾರಿಗಳಿಗೆ ನಿಯೋಜಿಸಿ.',
      officerGreeting: 'ಸ್ವಾಗತ, ಅಧಿಕಾರಿಗಳೇ',
      officerSubtitle: 'ನಿಮಗೆ ವಹಿಸಲಾದ ದೂರುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ತನಿಖೆಯ ಪ್ರಗತಿಯನ್ನು ದಾಖಲಿಸಿ, ಪರಿಹಾರವನ್ನು ಸಲ್ಲಿಸಿ.',
      kpis: {
        totalComplaints: 'ಒಟ್ಟು ದೂರುಗಳು',
        openCases: 'ಬಾಕಿ ಇರುವ ಪ್ರಕರಣಗಳು',
        assignedCases: 'ನಿಯೋಜಿಸಲಾದ ಪ್ರಕರಣಗಳು',
        awaitingAssignment: 'ನಿಯೋಜನೆಗೆ ಬಾಕಿ',
        dueToday: 'ಇಂದಿನ ಅನುಸರಣೆಗಳು',
        overdueCases: 'ವಿಳಂಬವಾದ ಪ್ರಕರಣಗಳು',
        escalatedCases: 'ಮೇಲ್ಮನವಿ ಪ್ರಕರಣಗಳು',
        closedCases: 'ಪರಿಹರಿಸಲಾದ ಪ್ರಕರಣಗಳು',
        newAssignments: 'ಹೊಸ ನಿಯೋಜನೆಗಳು',
        inProgress: 'ಪ್ರಗತಿಯಲ್ಲಿದೆ',
        resolutionSubmitted: 'ಪರಿಹಾರ ಸಲ್ಲಿಕೆಯಾಗಿದೆ',
        awaitingOfficerResponse: 'ಅಧಿಕಾರಿಯ ಪ್ರತಿಕ್ರಿಯೆಗೆ ಬಾಕಿ',
      },
      charts: {
        complaintTrend: 'ಕುಂದುಕೊರತೆಗಳ ನೋಂದಣಿ ಮತ್ತು ವಿಲೇವಾರಿ ಪ್ರವೃತ್ತಿ',
        departmentDistribution: 'ಇಲಾಖಾವಾರು ದೂರುಗಳು',
        statusDistribution: 'ಪ್ರಕರಣದ ಸ್ಥಿತಿ ವಿತರಣೆ',
        recentComplaints: 'ಇತ್ತೀಚೆಗೆ ನೋಂದಾಯಿಸಲಾದ ದೂರುಗಳು',
        recentActivity: 'ಲೈವ್ ಅಧಿಕಾರಿ ಚಟುವಟಿಕೆ',
        departmentPerformance: 'ಇಲಾಖಾವಾರು ಕಾರ್ಯಕ್ಷಮತೆ',
        attentionRequired: 'ತುರ್ತು ಗಮನ ಅಗತ್ಯವಿರುವ ಪ್ರಕರಣಗಳು',
      },
    },
    registration: {
      stage1Title: 'ದಾಖಲೆ ಅಪ್‌ಲೋಡ್',
      stage1Desc: 'ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿರುವ ಅರ್ಜಿಯ PDF ಅಥವಾ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.',
      stage2Title: 'OCR ಮತ್ತು AI ಸಾರಾಂಶ ಪರಿಶೀಲನೆ',
      stage2Desc: 'ದಾಖಲೆಯಿಂದ ಹೊರತೆಗೆಯಲಾದ ಪಠ್ಯ, ದ್ವಿಭಾಷಾ ಸಾರಾಂಶ ಮತ್ತು AI ಸೂಚಿಸಿದ ಕ್ಷೇತ್ರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.',
      stage3Title: 'ಪ್ರಕರಣ ಮಾಹಿತಿ ಭರ್ತಿ ಮತ್ತು ನಿಯೋಜನೆ',
      stage3Desc: 'ನಾಗರಿಕರ ಮಾಹಿತಿ, ದೂರಿನ ವಿವರಗಳು ಮತ್ತು ಜವಾಬ್ದಾರಿಯುತ ತನಿಖಾಧಿಕಾರಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
      stage4Title: 'ಅಂತಿಮ ಪರಿಶೀಲನೆ ಮತ್ತು ನಿಯೋಜನೆ',
      stage4Desc: 'ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಪ್ರಕರಣವನ್ನು ಅಧಿಕೃತವಾಗಿ ನೋಂದಾಯಿಸಿ ನಿಯೋಜಿಸಿ.',
      dragDropText: 'ಅರ್ಜಿ ದಾಖಲೆಯನ್ನು ಇಲ್ಲಿಗೆ ಎಳೆಯಿರಿ, ಅಥವಾ ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ',
      browseFiles: 'ಫೈಲ್ ಹುಡುಕಿ',
      samplePresets: 'ಅಥವಾ ಪೂರ್ವಭಾವಿ ಮಾದರಿ ಅರ್ಜಿಗಳನ್ನು ಬಳಸಿ:',
      privacyNotice: 'ದೂರು ದಾಖಲೆಗಳು ಸೂಕ್ಷ್ಮ ಸರ್ಕಾರಿ ದಾಖಲೆಗಳಾಗಿವೆ. ಮೂಲ ಪ್ರತಿಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಸಂರಕ್ಷಿಸಲಾಗುತ್ತದೆ.',
      rawOcr: 'ಮೂಲ OCR ಪಠ್ಯ',
      reviewedOcr: 'ಪರಿಶೀಲಿಸಿದ ಮತ್ತು ತಿದ್ದಿದ ಪಠ್ಯ',
      kannadaSummary: 'ಕನ್ನಡ ಸಾರಾಂಶ',
      englishSummary: 'ಇಂಗ್ಲಿಷ್ ಸಾರಾಂಶ',
      confidenceHigh: 'ಹೆಚ್ಚಿನ ವಿಶ್ವಾಸಾರ್ಹತೆ',
      confidenceReview: 'ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ',
      confidenceMissing: 'ದಾಖಲೆಯಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ',
      citizenInfo: 'ನಾಗರಿಕರ ಸಂಪರ್ಕ ಮತ್ತು ವಿವರ',
      complaintInfo: 'ದೂರಿನ ವಿವರಗಳು',
      assignmentInfo: 'ಇಲಾಖೆ ಮತ್ತು ಅಧಿಕಾರಿಯ ನಿಯೋಜನೆ',
      registerAndAssign: 'ನೋಂದಾಯಿಸಿ ಮತ್ತು ನಿಯೋಜಿಸಿ',
      awaitingAssignment: 'ನಿಯೋಜನೆಗೆ ಬಾಕಿ ಎಂದು ಉಳಿಸಿ',
      successTitle: 'ದೂರು ಯಶಸ್ವಿಯಾಗಿ ನೋಂದಾಯಿಸಿ ನಿಯೋಜಿಸಲಾಗಿದೆ',
      successMessage: 'ದೂರನ್ನು ಜಿಲ್ಲಾ ನೋಂದಣಿಯಲ್ಲಿ ಸೇರಿಸಲಾಗಿದೆ ಮತ್ತು ಅಧಿಕಾರಿಗೆ ಮೊದಲ ಅನುಸರಣಾ ದಿನಾಂಕದೊಂದಿಗೆ ನೀಡಲಾಗಿದೆ.',
    },
  },
};
