import { useEffect, useRef, useState } from 'react';
import { fetchPreview, sendToPrinter, verifyAccess } from '../api.js';
import CodeInput from '../components/CodeInput.jsx';
import Countdown from '../components/Countdown.jsx';
import DocumentPreview from '../components/DocumentPreview.jsx';
import { useConfig } from '../hooks/useConfig.js';
import upiQr from '../assets/upi-qr.png'; // <- put your QR screenshot here

/* ---------- EDIT THESE ---------- */
const SHOP = { name: 'Your Print Shop', address: 'Shop address, Mumbai', upiId: 'yourname@upi' };
const PRICING = {
  bw: { single: 2, double: 1.5 }, // ₹ per page
  color: { single: 5, double: 8 },
  gstPercent: 0,
  minCharge: 0,
};
/* -------------------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toInt = (v) => Math.max(1, parseInt(v, 10) || 1);
const inr = (n) => `₹${Number(n).toFixed(2)}`;

function calcBill({ pages, copies, color, duplex }) {
  const rate = PRICING[color ? 'color' : 'bw'][duplex ? 'double' : 'single'];
  const totalPages = pages * copies;
  const subtotal = Math.round(totalPages * rate * 100) / 100;
  const gst = Math.round(subtotal * PRICING.gstPercent) / 100;
  const total = Math.max(Math.round((subtotal + gst) * 100) / 100, PRICING.minCharge);
  return { rate, totalPages, subtotal, gst, total };
}

function Bill({ bill }) {
  return (
    <div className="bill">
      <h2>{SHOP.name}</h2>
      <p className="muted">{SHOP.address}</p>
      <hr />
      {bill.billNo && <p>Bill no: <strong>{bill.billNo}</strong></p>}
      <p>Date: {bill.date}</p>
      <p>Job: {bill.jobId}</p>
      <p>File: {bill.fileName}</p>
      <hr />
      <table className="bill__table">
        <tbody>
          <tr><td>Pages × copies</td><td>{bill.pages} × {bill.copies} = {bill.totalPages}</td></tr>
          <tr><td>Type</td><td>{bill.color ? 'Color' : 'B&W'}, {bill.duplex ? 'double-sided' : 'single-sided'}</td></tr>
          <tr><td>Rate / page</td><td>{inr(bill.rate)}</td></tr>
          <tr><td>Subtotal</td><td>{inr(bill.subtotal)}</td></tr>
          {PRICING.gstPercent > 0 && <tr><td>GST ({PRICING.gstPercent}%)</td><td>{inr(bill.gst)}</td></tr>}
          <tr className="bill__total"><td>Total</td><td>{inr(bill.total)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

const css = `
.billing-layout{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:900px){.billing-layout{grid-template-columns:1.4fr 1fr}}
.billing__grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:end}
.check{display:flex;gap:8px;align-items:center;margin:8px 0}
.pay{text-align:center}
.pay__amount{font-size:2rem;font-weight:700;margin:4px 0}
.pay__qr{width:240px;max-width:100%;margin:8px auto;display:block;border-radius:8px}
.bill{text-align:left;margin:12px 0}
.bill__table{width:100%;border-collapse:collapse}
.bill__table td{padding:4px 0}
.bill__table td:last-child{text-align:right}
.bill__total td{font-weight:700;border-top:1px solid currentColor;padding-top:8px}
@media print{
  body *{visibility:hidden}
  .bill,.bill *{visibility:visible}
  .bill{position:absolute;left:0;top:0;width:80mm}
}`;

export default function ShopPage() {
  const { codeLength } = useConfig();
  const [phase, setPhase] = useState('enter'); // enter | preview | printed | expired
  const [jobId, setJobId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [locked, setLocked] = useState(false);
  const [session, setSession] = useState(null); // { token, job }
  const [blobUrl, setBlobUrl] = useState('');
  const [printing, setPrinting] = useState(false);
  const [fileDeleted, setFileDeleted] = useState(false);
  const urlRef = useRef('');

  const [pages, setPages] = useState(1);
  const [copies, setCopies] = useState(1);
  const [color, setColor] = useState(false);
  const [duplex, setDuplex] = useState(false);
  const [paid, setPaid] = useState(false);
  const [bill, setBill] = useState(null);

  const calc = calcBill({ pages, copies, color, duplex });

  const dropBlob = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = '';
    setBlobUrl('');
  };
  useEffect(() => dropBlob, []);

  const unlock = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await verifyAccess(jobId, code);
      const blob = await fetchPreview(result.job.jobId, result.token);
      urlRef.current = URL.createObjectURL(blob);
      setBlobUrl(urlRef.current);
      setSession(result);
      setPages(toInt(result.job.pageCount)); // uses pageCount if API sends it
      setAttemptsLeft(null);
      setPhase('preview');
    } catch (err) {
      setError(err.message);
      setAttemptsLeft(err.data?.attemptsLeft ?? null);
      if (err.status === 423) setLocked(true);
      if (err.status === 401) setCode('');
    } finally {
      setBusy(false);
    }
  };

  const print = async () => {
    if (!paid) return;
    setPrinting(true);
    setError('');
    try {
      // The pause stands in for a real printer; the API call is real.
      const [result] = await Promise.all([sendToPrinter(session.job.jobId, session.token), sleep(1400)]);
      setFileDeleted(result.fileDeleted);
      setBill({
        billNo: `INV-${Date.now().toString(36).toUpperCase()}`,
        date: new Date().toLocaleString('en-IN'),
        jobId: session.job.jobId,
        fileName: session.job.fileName,
        pages, copies, color, duplex,
        ...calc,
      });
      dropBlob();
      setPhase('printed');
    } catch (err) {
      setError(err.message);
    } finally {
      setPrinting(false);
    }
  };

  const expire = () => {
    if (phase !== 'preview') return;
    dropBlob();
    setPhase('expired');
  };

  const next = () => {
    dropBlob();
    setSession(null);
    setJobId('');
    setCode('');
    setError('');
    setLocked(false);
    setAttemptsLeft(null);
    setPages(1);
    setCopies(1);
    setColor(false);
    setDuplex(false);
    setPaid(false);
    setBill(null);
    setPhase('enter');
  };

  if (phase === 'enter') {
    return (
      <div className="page page--narrow">
        <form className="card" onSubmit={unlock}>
          <h1>Open a print job</h1>
          <p className="muted">Ask the customer for their Job ID and access code.</p>

          <label className="field">
            <span>Job ID</span>
            <input
              className="text-input"
              value={jobId}
              onChange={(e) => setJobId(e.target.value.toUpperCase())}
              placeholder="SP-XXXXXXXX"
              autoComplete="off"
              spellCheck={false}
              disabled={busy || locked}
            />
          </label>

          <div className="field">
            <span>Access code</span>
            <CodeInput length={codeLength} value={code} onChange={setCode} disabled={busy || locked} invalid={!!error} />
          </div>

          {error && (
            <p className="error" role="alert">
              {error}
              {attemptsLeft !== null && ` ${attemptsLeft} ${attemptsLeft === 1 ? 'try' : 'tries'} left.`}
            </p>
          )}

          <button className="btn" type="submit" disabled={busy || locked || !jobId || code.length !== codeLength}>
            {busy ? 'Checking…' : 'Open job'}
          </button>
          {locked && (
            <button type="button" className="btn btn--ghost" onClick={next}>
              Try another job
            </button>
          )}
        </form>
      </div>
    );
  }

  if (phase === 'preview') {
    const { job } = session;
    const liveBill = {
      date: new Date().toLocaleString('en-IN'),
      jobId: job.jobId,
      fileName: job.fileName,
      pages, copies, color, duplex,
      ...calc,
    };
    return (
      <div className="page">
        <style>{css}</style>
        <div className="shop-head">
          <div>
            <h1>{job.fileName}</h1>
            <p className="muted">Job {job.jobId}</p>
          </div>
          <Countdown expiresAt={job.expiresAt} onExpire={expire} label="File deletes in" />
        </div>

        <div className="billing-layout">
          <div className="preview">
            <DocumentPreview url={blobUrl} mimeType={job.mimeType} fileName={job.fileName} />
          </div>

          <div className="card pay">
            <h2>Print options</h2>
            <div className="billing__grid">
              <label className="field">
                <span>Pages</span>
                <input className="text-input" type="number" min="0" value={pages}
                  onChange={(e) => setPages(toInt(e.target.value))} />
              </label>
              <label className="field">
                <span>Copies</span>
                <input className="text-input" type="number" min="0" value={copies}
                  onChange={(e) => setCopies(toInt(e.target.value))} />
              </label>
              <label className="check">
                <input type="checkbox" checked={color} onChange={(e) => setColor(e.target.checked)} /> Color
              </label>
              <label className="check">
                <input type="checkbox" checked={duplex} onChange={(e) => setDuplex(e.target.checked)} /> Double-sided
              </label>
            </div>

            <Bill bill={liveBill} />

            <p className="pay__amount">{inr(calc.total)}</p>
            <p className="muted">Scan &amp; pay. QR is static, so enter this exact amount.</p>
            <img className="pay__qr" src={upiQr} alt="UPI QR code" />
            <p className="muted">UPI ID: {SHOP.upiId}</p>

            <label className="check" style={{ justifyContent: 'center' }}>
              <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
              Received {inr(calc.total)} in my UPI app
            </label>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <div className="shop-actions">
              <button className="btn" onClick={print} disabled={!paid || printing}>
                {printing ? 'Sending to printer…' : 'Print'}
              </button>
              <button className="btn btn--ghost" onClick={next} disabled={printing}>
                Close without printing
              </button>
            </div>
          </div>
        </div>

        <p className="muted">
          Printing is simulated in this demo. Printing sends the job to the printer, then deletes the file immediately.
        </p>
      </div>
    );
  }

  return (
    <div className="page page--narrow">
      <style>{css}</style>
      <div className="card">
        {phase === 'printed' ? (
          <>
            <h1>Sent to printer</h1>
            <p className={`notice ${fileDeleted ? 'notice--ok' : ''}`}>
              {fileDeleted
                ? 'The file was deleted from storage and the job is closed.'
                : 'The job is closed. Deletion is still retrying in the background.'}
            </p>
            {bill && <Bill bill={bill} />}
            {bill && (
              <button className="btn btn--ghost" onClick={() => window.print()}>
                Print / save bill
              </button>
            )}
          </>
        ) : (
          <>
            <h1>This job expired</h1>
            <p className="notice">The timer ended and the file is being removed. Ask the customer to upload again.</p>
          </>
        )}
        <button className="btn" onClick={next}>
          Open next job
        </button>
      </div>
    </div>
  );
}