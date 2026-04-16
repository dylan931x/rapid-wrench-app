'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Eraser, Mail, PenLine, Share2, MessageSquare } from 'lucide-react';
import { ensureDocumentRecord, saveDocumentSignature, uploadDocumentPdf } from '@/lib/actions/documents';
import { formatMoney } from '@/lib/utils';

export type DocsJobOption = {
  id: string;
  title: string | null;
  complaint: string;
  labor_amount: number;
  parts_amount: number;
  deposit_amount: number;
  balance_amount: number;
  warranty_text: string | null;
  customer: {
    full_name: string;
    phone: string;
    email: string | null;
    area: string | null;
  } | null;
  vehicle: {
    year: number;
    make: string;
    model: string;
    engine: string | null;
    vin: string | null;
    mileage: number | null;
  } | null;
};

export type ExistingDocument = {
  id: string;
  job_id: string;
  document_type: 'invoice' | 'agreement';
  signer_name: string | null;
  signed_at: string | null;
  policy_text_snapshot: string;
  warranty_text_snapshot: string | null;
  pdf_signed_url: string | null;
  signature_signed_url: string | null;
};

type Props = {
  jobs: DocsJobOption[];
  documents: ExistingDocument[];
  defaultPolicies: string;
  invoiceFooterText: string | null;
};

type DocType = 'invoice' | 'agreement';

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />;
}

function formatDate(value: string | null) {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function SignaturePad({
  savedImage,
  onSave,
  onClear,
}: {
  savedImage: string | null;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const rect = canvas!.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    const point = getPoint(event);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingRef.current) return;
    const point = getPoint(event);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-3">
        <canvas
          ref={canvasRef}
          width={900}
          height={240}
          className="h-40 w-full rounded-2xl bg-slate-50"
          style={{ touchAction: 'none' }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={clearCanvas} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
          <Eraser className="h-4 w-4" /> Clear
        </button>
        <button type="button" onClick={saveCanvas} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
          <PenLine className="h-4 w-4" /> Save signature
        </button>
      </div>
      {savedImage ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Current signature</p>
          <img src={savedImage} alt="Current signature" className="h-24 w-full rounded-2xl bg-white object-contain" />
        </div>
      ) : null}
    </div>
  );
}

export function DocumentWorkspace({ jobs, documents, defaultPolicies, invoiceFooterText }: Props) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id ?? '');
  const [docType, setDocType] = useState<DocType>('invoice');
  const [signerName, setSignerName] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [policiesText, setPoliciesText] = useState(defaultPolicies);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null, [jobs, selectedJobId]);
  const currentDocument = useMemo(
    () => documents.find((document) => document.job_id === selectedJobId && document.document_type === docType) ?? null,
    [documents, docType, selectedJobId],
  );

  const effectivePolicies = currentDocument?.policy_text_snapshot || policiesText;
  const effectiveSignature = signatureDataUrl || currentDocument?.signature_signed_url || null;
  const effectiveSignerName = signerName || currentDocument?.signer_name || '';
  const totalAmount = Number(selectedJob?.labor_amount ?? 0) + Number(selectedJob?.parts_amount ?? 0);

  const ensureRecord = async () => {
    if (!selectedJob) throw new Error('Select a job first.');
    const formData = new FormData();
    formData.set('job_id', selectedJob.id);
    formData.set('document_type', docType);
    if (effectiveSignerName) {
      formData.set('signer_name', effectiveSignerName);
    }
    formData.set('policy_text_snapshot', policiesText);
    const result = await ensureDocumentRecord(formData);
    return result.documentId;
  };

  const saveSignature = () => {
    if (!signatureDataUrl) {
      setMessage('Save a signature on the pad first.');
      return;
    }

    startTransition(async () => {
      try {
        const documentId = await ensureRecord();
        const blob = await (await fetch(signatureDataUrl)).blob();
        const file = new File([blob], 'signature.png', { type: 'image/png' });
        const formData = new FormData();
        formData.set('document_id', documentId);
        if (effectiveSignerName) {
          formData.set('signer_name', effectiveSignerName);
        }
        formData.set('signature', file);
        await saveDocumentSignature(formData);
        setMessage('Signature saved.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to save signature.');
      }
    });
  };

  const buildPdfFile = async () => {
    if (!previewRef.current || !selectedJob) throw new Error('Nothing to export yet.');
    const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imageData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imageData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imageData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    const blob = pdf.output('blob');
    const fileNameBase = selectedJob.vehicle
      ? `${selectedJob.vehicle.year}-${selectedJob.vehicle.make}-${selectedJob.vehicle.model}`
      : 'vehicle';
    return new File([blob], `rapid-wrench-${docType}-${fileNameBase}.pdf`, { type: 'application/pdf' });
  };

  const uploadPdfAndMaybeShare = (mode: 'download' | 'share') => {
    startTransition(async () => {
      try {
        const documentId = await ensureRecord();
        const file = await buildPdfFile();

        const formData = new FormData();
        formData.set('document_id', documentId);
        formData.set('pdf', file);
        await uploadDocumentPdf(formData);

        if (mode === 'share' && navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Rapid Wrench ${docType}`,
            text: `Rapid Wrench ${docType} for ${selectedJob?.customer?.full_name ?? 'customer'}`,
          });
        } else {
          const href = URL.createObjectURL(file);
          const a = document.createElement('a');
          a.href = href;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(href);
        }

        setMessage(mode === 'share' ? 'PDF saved and shared.' : 'PDF saved and downloaded.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to export PDF.');
      }
    });
  };

  if (!selectedJob) {
    return <p className="text-sm text-slate-600">Create a job first, then build paperwork here.</p>;
  }

  const smsBody = `Hi ${selectedJob.customer?.full_name ?? 'there'}, your ${docType} from Rapid Wrench is ready.`;
  const emailBody = `Hi ${selectedJob.customer?.full_name ?? 'there'},\n\nYour ${docType} from Rapid Wrench is ready. Please see the attached PDF once it has been downloaded or shared from the app.\n\nThank you.`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <Select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {(job.title?.trim() || (job.vehicle ? `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}` : 'Untitled job'))}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setDocType('invoice')} className={`rounded-2xl px-4 py-3 text-sm font-medium ${docType === 'invoice' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
            Invoice
          </button>
          <button type="button" onClick={() => setDocType('agreement')} className={`rounded-2xl px-4 py-3 text-sm font-medium ${docType === 'agreement' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
            Agreement
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,1.1fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Signature and handoff</h3>
            <p className="mt-1 text-sm text-slate-600">Capture the signature, set the printed name, then export or share the PDF.</p>
            <div className="mt-4 grid gap-3">
              <Input value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder="Customer printed name" />
              <SignaturePad savedImage={effectiveSignature} onSave={setSignatureDataUrl} onClear={() => setSignatureDataUrl(null)} />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={saveSignature} disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
                  <PenLine className="h-4 w-4" /> Save signature
                </button>
                <button type="button" onClick={() => uploadPdfAndMaybeShare('download')} disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
                  <Download className="h-4 w-4" /> Download PDF
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => uploadPdfAndMaybeShare('share')} disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-60">
                  <Share2 className="h-4 w-4" /> Share PDF
                </button>
                <a href={`sms:${selectedJob.customer?.phone ?? ''}?body=${encodeURIComponent(smsBody)}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                  <MessageSquare className="h-4 w-4" /> Text customer
                </a>
              </div>
              <a href={`mailto:${selectedJob.customer?.email ?? ''}?subject=${encodeURIComponent(`Rapid Wrench ${docType}`)}&body=${encodeURIComponent(emailBody)}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4" /> Email customer
              </a>
              {currentDocument?.pdf_signed_url ? (
                <a href={currentDocument.pdf_signed_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-700 underline underline-offset-4">
                  Open last saved PDF
                </a>
              ) : null}
              {message ? <p className="text-sm text-slate-600">{message}</p> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Policy snapshot</h3>
            <p className="mt-1 text-sm text-slate-600">The saved document record keeps its own policy text snapshot once created.</p>
            <textarea
              value={policiesText}
              onChange={(event) => setPoliciesText(event.target.value)}
              className="mt-4 min-h-40 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div ref={previewRef} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Rapid Wrench</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                {docType === 'invoice' ? 'Mobile Service Invoice' : 'Service Agreement'}
              </h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{formatDate(currentDocument?.signed_at ?? null)}</span>
          </div>

          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p><span className="font-medium">Customer:</span> {selectedJob.customer?.full_name ?? 'Unknown customer'}</p>
            <p><span className="font-medium">Phone:</span> {selectedJob.customer?.phone ?? 'Not entered'}</p>
            <p><span className="font-medium">Email:</span> {selectedJob.customer?.email ?? 'Not entered'}</p>
            <p><span className="font-medium">Vehicle:</span> {selectedJob.vehicle ? `${selectedJob.vehicle.year} ${selectedJob.vehicle.make} ${selectedJob.vehicle.model}` : 'Unknown vehicle'}</p>
            <p><span className="font-medium">VIN:</span> {selectedJob.vehicle?.vin ?? 'Not entered'}</p>
            <p><span className="font-medium">Mileage:</span> {selectedJob.vehicle?.mileage?.toLocaleString() ?? 'Not entered'}</p>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Complaint / notes</p>
            <p className="mt-2 whitespace-pre-wrap">{selectedJob.complaint}</p>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-500">Labor</span><span className="font-semibold">{formatMoney(selectedJob.labor_amount)}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-500">Parts</span><span className="font-semibold">{formatMoney(selectedJob.parts_amount)}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-500">Total</span><span className="font-semibold">{formatMoney(totalAmount)}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-500">Deposit paid</span><span className="font-semibold">{formatMoney(selectedJob.deposit_amount)}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-500">Balance due</span><span className="font-semibold">{formatMoney(selectedJob.balance_amount)}</span></div>
          </div>

          {docType === 'agreement' ? (
            <div className="mt-4 rounded-3xl border border-slate-200 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Warranty</p>
              <p className="mt-2 whitespace-pre-wrap">{currentDocument?.warranty_text_snapshot ?? selectedJob.warranty_text ?? '2 years workmanship'}</p>
            </div>
          ) : null}

          <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm whitespace-pre-wrap text-slate-700">
            {effectivePolicies}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Customer signature</p>
              {effectiveSignature ? (
                <img src={effectiveSignature} alt="Customer signature" className="h-20 w-full object-contain" />
              ) : (
                <div className="h-20 rounded-2xl bg-slate-50" />
              )}
            </div>
            <div className="rounded-3xl border border-slate-200 p-4 space-y-3 text-sm text-slate-700">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Printed name</p>
                <p>{effectiveSignerName || 'Pending printed name'}</p>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Date signed</p>
                <p>{formatDate(currentDocument?.signed_at ?? null)}</p>
              </div>
            </div>
          </div>

          {invoiceFooterText ? <p className="mt-5 text-xs text-slate-500">{invoiceFooterText}</p> : null}
        </div>
      </div>
    </div>
  );
}
