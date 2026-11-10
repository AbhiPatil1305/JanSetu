import React, { useState, useEffect } from 'react';
import {
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  X,
  FileText,
  Languages,
  Shield,
  CheckCircle2,
  Calendar,
  Eye,
  FileCode,
} from 'lucide-react';
import { ComplaintDocument } from '../../types/complaint';
import { documentsService } from '../../services/api/documents.service';
import { Button } from '../common/Button';

interface PdfDocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: ComplaintDocument | null;
  grievanceId: string;
  grievanceNumber?: string;
  grievanceTitle?: string;
}

export const PdfDocumentViewer: React.FC<PdfDocumentViewerProps> = ({
  isOpen,
  onClose,
  document: doc,
  grievanceId,
  grievanceNumber,
  grievanceTitle,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [docMimeType, setDocMimeType] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');
  const [isTextFile, setIsTextFile] = useState<boolean>(false);
  const [isImageFile, setIsImageFile] = useState<boolean>(false);
  const [isPdfFile, setIsPdfFile] = useState<boolean>(false);
  const [isDocxFile, setIsDocxFile] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Viewer controls
  const [zoom, setZoom] = useState<number>(100);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'sheet' | 'raw'>('sheet');

  useEffect(() => {
    if (!isOpen || !doc) {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setDocMimeType('');
      setTextContent('');
      setIsTextFile(false);
      setIsImageFile(false);
      setIsPdfFile(false);
      setIsDocxFile(false);
      setLoadError(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setLoadError(null);
    setZoom(100);

    const loadDoc = async () => {
      try {
        const res = await documentsService.getDocumentBlobUrl(doc.id);
        if (!active) return;
        setBlobUrl(res.url);
        setDocMimeType(res.mimeType || '');
        setIsTextFile(res.isText);
        setIsImageFile(res.isImage);
        setIsPdfFile(res.isPdf);
        setIsDocxFile(res.isDocx);
        if (res.isText && res.text) {
          setTextContent(res.text);
        }
      } catch (err: any) {
        if (!active) return;
        setLoadError(err?.message || 'Could not load document into viewer.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadDoc();

    return () => {
      active = false;
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, doc?.id]);

  if (!isOpen || !doc) return null;

  const filename = (doc.originalFilename || doc.name || '').toLowerCase();
  const displayName = doc.originalFilename || doc.name;
  const isTranslation = doc.documentType === 'TRANSLATION' || !doc.isOriginal;

  // Format determination combining MIME from backend with filename extensions
  const isPdf = isPdfFile || (docMimeType ? docMimeType.includes('pdf') : false) || doc.type.includes('pdf') || filename.endsWith('.pdf');
  const isImage = isImageFile || (docMimeType ? docMimeType.startsWith('image/') : false) || doc.type.includes('image') || /\.(png|jpe?g|webp|gif|bmp|tiff)$/i.test(filename);
  const isDocx = isDocxFile || (docMimeType ? docMimeType.includes('word') || docMimeType.includes('openxmlformats') : false) || filename.endsWith('.docx') || filename.endsWith('.doc');
  const isText = isTextFile && !isPdf && !isImage && !isDocx;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60));
  const handleZoomReset = () => setZoom(100);

  const handlePrint = () => {
    if (isPdf && blobUrl) {
      const iframe = window.frames['pdf-print-frame' as any];
      if (iframe) {
        iframe.focus();
        iframe.print();
        return;
      }
    }
    window.print();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await documentsService.downloadDocument(doc.id, displayName);
    } catch {
      // Fallback to blob url
      if (blobUrl) {
        const a = window.document.createElement('a');
        a.href = blobUrl;
        a.download = displayName;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Top Application Header / PDF Viewer Toolbar */}
      <header className="flex-shrink-0 bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-2.5 flex items-center justify-between gap-4 select-none shadow-md">
        {/* Document Metadata & Status Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-2 rounded-lg flex-shrink-0 ${
              isTranslation ? 'bg-indigo-900/60 text-indigo-300' : 'bg-amber-900/60 text-amber-300'
            }`}
          >
            {isTranslation ? <Languages className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white truncate max-w-sm" title={displayName}>
                {displayName}
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isTranslation
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-700/50'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700/50'
                }`}
              >
                {isTranslation ? 'Official Translation' : 'Original Petition Record'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                {doc.language ? doc.language.toUpperCase() : 'EN'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Case Ref: <span className="font-mono text-slate-300">{grievanceNumber || grievanceId.substring(0, 8)}</span> &bull;{' '}
              {(doc.size / 1024).toFixed(1)} KB &bull; Archived {doc.uploadedAt || 'Recently'}
            </p>
          </div>
        </div>

        {/* Center: Viewer Controls (Zoom & Layout) */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-40"
            title="Zoom Out (-15%)"
            disabled={zoom <= 60}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomReset}
            className="px-2 py-1 rounded hover:bg-slate-700 text-slate-200 font-mono text-[11px] min-w-[50px] text-center"
            title="Reset Zoom to 100%"
          >
            {zoom}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-40"
            title="Zoom In (+15%)"
            disabled={zoom >= 200}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomReset}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Fit to Window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {isTextFile && (
            <div className="flex items-center border-l border-slate-700 ml-1 pl-1 gap-1">
              <button
                onClick={() => setViewMode('sheet')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                  viewMode === 'sheet'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
                title="View as Official Formatted A4 Document Sheet"
              >
                A4 Document Sheet
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                  viewMode === 'raw'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
                title="View as Raw Text Monospace"
              >
                Raw Text
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Document Actions & Close */}
        <div className="flex items-center gap-2">
          {textContent && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={
                isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                )
              }
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              onClick={handleCopy}
              title="Copy Document Text"
            >
              {isCopied ? 'Copied' : 'Copy'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Printer className="w-3.5 h-3.5 text-slate-300" />}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            onClick={handlePrint}
            title="Print Official Document"
          >
            Print
          </Button>

          <Button
            variant="primary"
            size="sm"
            isLoading={isDownloading}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleDownload}
            title="Download Original File to Device"
          >
            Download
          </Button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
            title="Close Viewer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Document Reading Canvas */}
      <main className="flex-1 overflow-auto bg-slate-900/95 flex items-start justify-center p-6 relative select-text">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium">Loading document into secure viewer...</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md p-6 bg-slate-800/80 border border-slate-700 rounded-xl">
            <Shield className="w-8 h-8 text-amber-500 mb-2" />
            <h3 className="text-sm font-bold text-white mb-1">Failed to Preview Document</h3>
            <p className="text-xs text-slate-400 mb-4">{loadError}</p>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              Download Document Directly
            </Button>
          </div>
        ) : isPdf && blobUrl ? (
          /* Native Embedded PDF Document Viewer */
          <div
            className="w-full max-w-5xl h-[88vh] rounded-lg overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 transition-transform origin-top"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            <iframe
              id="pdf-print-frame"
              src={`${blobUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0"
              title={displayName}
            />
          </div>
        ) : isImage && blobUrl ? (
          /* Scanned Image Petition Viewer */
          <div
            className="transition-transform duration-150 origin-top mb-12 shadow-2xl rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-4 max-w-5xl flex items-center justify-center"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            <img src={blobUrl} alt={displayName} className="max-w-full max-h-[85vh] object-contain rounded" />
          </div>
        ) : isText && textContent && !textContent.trim().toLowerCase().startsWith('<!doctype html') ? (
          /* Formatted Official A4 Government Document Sheet or Monospace */
          <div
            className="transition-transform duration-150 origin-top mb-12"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {viewMode === 'sheet' ? (
              /* Official A4 Government Sheet Representation */
              <div
                className="w-[794px] min-h-[1123px] bg-white text-slate-900 p-12 shadow-2xl rounded-sm border border-slate-300 relative flex flex-col justify-between"
                style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", "Noto Sans Kannada", serif' }}
              >
                {/* Official Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none rotate-[-35deg]">
                  <span className="text-8xl font-black text-slate-900 tracking-widest text-center">
                    JANSETU OFFICIAL ARCHIVE
                  </span>
                </div>

                {/* Document Top Header */}
                <div className="border-b-2 border-slate-900 pb-4 mb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
                        Government of Karnataka &bull; District Grievance Redressal
                      </p>
                      <h1 className="text-lg font-bold text-slate-950 mt-1 uppercase tracking-tight">
                        {isTranslation ? 'Official Translated Grievance Record' : 'Original Grievance Petition Record'}
                      </h1>
                      <p className="text-xs text-slate-600 mt-0.5">
                        JanSetu District Administrative Case Repository
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${
                          isTranslation ? 'bg-indigo-100 text-indigo-900' : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {isTranslation ? 'Verified Translation' : 'Original Record'}
                      </span>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Archived: {doc.uploadedAt || new Date().toISOString().substring(0, 10)}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Grid Strip */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200 text-[11px] bg-slate-50 p-2.5 rounded">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">Grievance Ref</span>
                      <span className="font-mono font-bold text-slate-800">{grievanceNumber || grievanceId.substring(0, 8)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">Language</span>
                      <span className="font-bold text-slate-800">
                        {doc.language === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English (en)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">Document Type</span>
                      <span className="font-bold text-slate-800">{doc.documentType || 'PETITION'}</span>
                    </div>
                  </div>
                </div>

                {/* Main Petition Body Content */}
                <div className="flex-1 py-4">
                  {grievanceTitle && (
                    <div className="mb-4 pb-2 border-b border-slate-200">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        Subject: {grievanceTitle}
                      </h3>
                    </div>
                  )}

                  <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans text-justify space-y-4">
                    {textContent}
                  </div>
                </div>

                {/* Official Legal Footer */}
                <div className="border-t border-slate-300 pt-4 mt-8 text-[10px] text-slate-500 flex items-center justify-between font-sans">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>JanSetu Public Grievance Redressal System &bull; Secure Local Archive</span>
                  </div>
                  <div>
                    <span>Document ID: <span className="font-mono">{doc.id.substring(0, 8)}...</span></span>
                  </div>
                </div>
              </div>
            ) : (
              /* Raw Monospace View */
              <div className="w-[794px] bg-slate-950 text-slate-100 p-6 shadow-2xl rounded-xl border border-slate-800 font-mono text-xs leading-relaxed max-h-[85vh] overflow-y-auto whitespace-pre-wrap select-all">
                {textContent}
              </div>
            )}
          </div>
        ) : isDocx ? (
          /* Dedicated Microsoft Word / DOCX Card */
          <div className="flex flex-col items-center justify-center h-full text-center max-w-lg p-8 bg-slate-900 border border-slate-800 rounded-2xl text-slate-300 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-inner">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">{displayName}</h3>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-700/50 text-[11px] text-blue-300 font-medium mb-3">
              <span>Microsoft Word Document (.docx)</span>
              <span>&bull;</span>
              <span>{((doc.size || 0) / 1024).toFixed(1)} KB</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
              This official petition was submitted in Microsoft Word format. To inspect full document formatting, tables, and typography, download and open in Word or LibreOffice.
            </p>
            <Button variant="primary" size="md" leftIcon={<Download className="w-4 h-4" />} onClick={handleDownload}>
              Download Document ({((doc.size || 0) / 1024).toFixed(1)} KB)
            </Button>
          </div>
        ) : (
          /* Fallback for other binary files */
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md p-6 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300">
            <FileText className="w-12 h-12 text-slate-400 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">{doc.name}</h3>
            <p className="text-xs text-slate-400 mb-4">
              Stored as binary {doc.type}. Use the download button to open in your system reader.
            </p>
            <Button variant="primary" size="sm" onClick={handleDownload}>
              Download Document ({((doc.size || 0) / 1024).toFixed(1)} KB)
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

