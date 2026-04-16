import { FileText } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { DocumentWorkspace, type DocsJobOption, type ExistingDocument } from '@/components/docs/document-workspace';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getDocsPageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      jobs: [] as DocsJobOption[],
      documents: [] as ExistingDocument[],
      defaultPolicies: '',
      invoiceFooterText: null as string | null,
    };
  }

  const [jobsResult, documentsResult, settingsResult, signaturesResult] = await Promise.all([
    supabase
      .from('jobs')
      .select(
        `
          id,
          title,
          complaint,
          labor_amount,
          parts_amount,
          deposit_amount,
          balance_amount,
          warranty_text,
          customer:customers!jobs_customer_id_fkey(full_name, phone, email, area),
          vehicle:vehicles!jobs_vehicle_id_fkey(year, make, model, engine, vin, mileage)
        `,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('documents')
      .select('id, job_id, document_type, signer_name, signed_at, policy_text_snapshot, warranty_text_snapshot, pdf_storage_path')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('business_settings')
      .select('default_policy_text, invoice_footer_text')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('signatures')
      .select('document_id, storage_path')
      .eq('user_id', user.id),
  ]);

  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (documentsResult.error) throw new Error(documentsResult.error.message);
  if (settingsResult.error) throw new Error(settingsResult.error.message);
  if (signaturesResult.error) throw new Error(signaturesResult.error.message);

  const documents = documentsResult.data ?? [];
  const signatures = signaturesResult.data ?? [];

  const signatureUrlMap = new Map<string, string | null>();
  await Promise.all(
    signatures.map(async (signature) => {
      const { data } = await supabase.storage.from('signatures').createSignedUrl(signature.storage_path, 60 * 60);
      signatureUrlMap.set(signature.document_id, data?.signedUrl ?? null);
    }),
  );

  const pdfUrlMap = new Map<string, string | null>();
  await Promise.all(
    documents.map(async (document) => {
      if (!document.pdf_storage_path) {
        pdfUrlMap.set(document.id, null);
        return;
      }
      const { data } = await supabase.storage.from('documents').createSignedUrl(document.pdf_storage_path, 60 * 60);
      pdfUrlMap.set(document.id, data?.signedUrl ?? null);
    }),
  );

  return {
    jobs: (jobsResult.data ?? []) as DocsJobOption[],
    documents: documents.map((document) => ({
      id: document.id,
      job_id: document.job_id,
      document_type: document.document_type,
      signer_name: document.signer_name,
      signed_at: document.signed_at,
      policy_text_snapshot: document.policy_text_snapshot,
      warranty_text_snapshot: document.warranty_text_snapshot,
      pdf_signed_url: pdfUrlMap.get(document.id) ?? null,
      signature_signed_url: signatureUrlMap.get(document.id) ?? null,
    })) as ExistingDocument[],
    defaultPolicies: settingsResult.data.default_policy_text,
    invoiceFooterText: settingsResult.data.invoice_footer_text,
  };
}

export default async function DocsPage() {
  const { jobs, documents, defaultPolicies, invoiceFooterText } = await getDocsPageData();

  return (
    <AppShell title="Docs" description="Create invoices and agreements, save signatures, and upload PDFs to Supabase Storage.">
      <Card>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-semibold">Paperwork</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Choose a job, capture the signature, then save or share the PDF. Saved documents and signatures are stored privately.
        </p>
      </Card>

      {jobs.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">Create a job first, then build paperwork here.</p>
        </Card>
      ) : (
        <DocumentWorkspace jobs={jobs} documents={documents} defaultPolicies={defaultPolicies} invoiceFooterText={invoiceFooterText} />
      )}
    </AppShell>
  );
}
