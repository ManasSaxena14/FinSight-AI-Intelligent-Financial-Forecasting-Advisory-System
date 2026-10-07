import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, FileSpreadsheet, MessageSquareText, Sparkles, Upload } from 'lucide-react';
import { aiService, apiError } from '../api/aiService';
import ProposalReview from './ProposalReview';
import VoiceButton from './advisor/VoiceButton';
import { Button } from './ui';
import { cn } from '../lib/cn';

const EXAMPLES = [
  '450 on Swiggy and 1.2k Uber yesterday',
  'Got salary 72000 today, paid rent 18000',
  'kal 650 ka Netflix aur 300 chai',
];

function useProposals() {
  const [result, setResult] = useState(null);
  const [key, setKey] = useState(0);
  return {
    result,
    key,
    show: (r) => { setResult(r); setKey((k) => k + 1); },
    clear: () => setResult(null),
  };
}

/** Free text / voice / receipt photo -> reviewed transactions. */
export function SmartAdd({ onSaved }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(null);
  const proposals = useProposals();
  const fileRef = useRef(null);

  const parse = async (value = text) => {
    if (!value.trim()) return;
    setBusy('text');
    try {
      const r = await aiService.parseText(value);
      if (!r.transactions.length) toast('No amounts found — try “450 on Swiggy”');
      else proposals.show({ ...r, source: 'ai-text' });
    } catch (err) {
      toast.error(apiError(err, 'Could not read that'));
    } finally {
      setBusy(null);
    }
  };

  const scan = async (file) => {
    if (!file) return;
    setBusy('receipt');
    try {
      const r = await aiService.scanReceipt(file);
      proposals.show({ ...r, source: 'receipt' });
      if (r.items?.length) toast.success(`Read ${r.items.length} line item(s)`);
    } catch (err) {
      toast.error(apiError(err, 'Could not read that receipt'));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (proposals.result) {
    return (
      <div className="p-5 sm:p-6">
        <ProposalReview key={proposals.key} proposals={proposals.result.transactions} method={proposals.result.method}
          source={proposals.result.source}
          onDone={(res) => { proposals.clear(); setText(''); onSaved?.(res); }} onCancel={proposals.clear} />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div>
        <label htmlFor="smart-text" className="field-label flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-ai" /> Describe it like a message</label>
        <div className="flex items-start gap-2 rounded-2xl border border-line bg-white/[0.03] p-2 pl-4 focus-within:border-brand-500/50">
          <textarea id="smart-text" value={text} rows={3} maxLength={2000} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) parse(); }}
            placeholder="450 on Swiggy and 1.2k Uber yesterday, got salary 72000"
            className="min-h-[72px] flex-1 resize-none bg-transparent py-1.5 text-[15px] text-fg outline-none placeholder:text-fg-faint" />
          <VoiceButton onText={(t) => { setText(t); parse(t); }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => setText(ex)}
              className="rounded-full border border-line px-2.5 py-1 text-[12px] text-fg-faint hover:border-brand-500/40 hover:text-fg">{ex}</button>
          ))}
        </div>
      </div>
      <Button size="lg" className="w-full" onClick={() => parse()} isLoading={busy === 'text'} disabled={!text.trim() || !!busy}>
        <Sparkles className="h-4 w-4" /> Read it
      </Button>

      <div className="relative py-1 text-center text-[11px] text-fg-faint before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-line">
        <span className="relative bg-ink-850 px-3">or</span>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => scan(e.target.files?.[0])} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={!!busy}
        className="flex w-full items-center gap-4 rounded-2xl border border-dashed border-line-strong p-4 text-left transition hover:border-brand-500/50 hover:bg-white/[0.02]">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ai/10 text-ai"><Camera className="h-5 w-5" /></span>
        <span className="flex-1">
          <span className="block text-sm text-fg">{busy === 'receipt' ? 'Reading receipt…' : 'Scan a receipt or bill'}</span>
          <span className="block text-xs text-fg-faint">Take a photo or upload an image — the AI reads the merchant, date and total.</span>
        </span>
      </button>
    </div>
  );
}

/** CSV/PDF bank statement or pasted SMS -> reviewed transactions. */
export function ImportStatement({ onSaved }) {
  const [mode, setMode] = useState('file');
  const [sms, setSms] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const proposals = useProposals();
  const fileRef = useRef(null);

  const handle = async (promise) => {
    setBusy(true);
    try {
      const r = await promise;
      proposals.show({ ...r, source: 'import' });
      toast.success(`Found ${r.count} transaction(s)`);
    } catch (err) {
      toast.error(apiError(err, 'Could not import that'));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onFile = (file) => file && handle(aiService.importFile(file));

  if (proposals.result) {
    return (
      <div className="p-5 sm:p-6">
        <ProposalReview key={proposals.key} proposals={proposals.result.transactions} method={proposals.result.method}
          source="import" onDone={(res) => { proposals.clear(); setSms(''); onSaved?.(res); }} onCancel={proposals.clear} />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-white/[0.02] p-1">
        {[{ id: 'file', label: 'Statement file', icon: FileSpreadsheet }, { id: 'sms', label: 'Bank / UPI SMS', icon: MessageSquareText }].map((m) => (
          <button key={m.id} type="button" onClick={() => setMode(m.id)}
            className={cn('flex h-9 items-center justify-center gap-2 rounded-lg text-sm transition', mode === m.id ? 'bg-white/[0.08] text-fg' : 'text-fg-muted hover:text-fg')}>
            <m.icon className="h-4 w-4" /> {m.label}
          </button>
        ))}
      </div>

      {mode === 'file' ? (
        <>
          <input ref={fileRef} type="file" accept=".csv,.pdf,text/csv,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files?.[0]); }}
            className={cn('flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center transition',
              dragging ? 'border-brand-400 bg-brand-500/[0.06]' : 'border-line-strong hover:border-brand-500/50 hover:bg-white/[0.02]')}>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] text-brand-300"><Upload className="h-5 w-5" /></span>
            <span className="text-sm text-fg">{busy ? 'Reading statement…' : 'Drop a CSV or PDF statement, or click to choose'}</span>
            <span className="max-w-sm text-xs text-fg-faint">Works with most Indian bank exports (date, narration, debit/credit). Password-protected PDFs need unlocking first. Files are parsed and not stored.</span>
          </button>
        </>
      ) : (
        <>
          <textarea value={sms} onChange={(e) => setSms(e.target.value)} rows={7} maxLength={50000}
            placeholder={'Paste one or more bank/UPI SMS, e.g.\nRs.250.00 debited from A/c XX1234 on 05-10-26 to VPA swiggy@icici. UPI Ref 1234'}
            className="field h-auto py-3 text-[13px] leading-relaxed" aria-label="Bank or UPI SMS text" />
          <p className="text-xs text-fg-faint">OTP messages are ignored automatically.</p>
          <Button size="lg" className="w-full" onClick={() => handle(aiService.importSms(sms))} isLoading={busy} disabled={!sms.trim()}>
            Read messages
          </Button>
        </>
      )}
    </div>
  );
}
