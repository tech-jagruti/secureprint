import { useState } from 'react';
import { uploadFile } from '../api.js';
import FileDropzone from '../components/FileDropzone.jsx';
import Ticket from '../components/Ticket.jsx';
import { useConfig } from '../hooks/useConfig.js';

const TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const EXPIRY_OPTIONS = [5, 15, 30, 60];

export default function UploadPage() {
  const { maxFileMb } = useConfig();
  const [file, setFile] = useState(null);
  const [expiry, setExpiry] = useState(15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  const choose = (f) => {
    setError('');
    if (!TYPES.includes(f.type)) return setError('Only PDF, PNG, JPG and Word files are supported.');
    if (f.size > maxFileMb * 1024 * 1024) return setError(`That file is over ${maxFileMb} MB.`);
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Choose a file first.');
    setBusy(true);
    setError('');
    try {
      setReceipt(await uploadFile(file, expiry));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setReceipt(null);
    setFile(null);
    setError('');
  };

  if (receipt) {
    return (
      <div className="page page--narrow">
        <h1>Your file is ready to collect</h1>
        <Ticket receipt={receipt} onReset={reset} />
      </div>
    );
  }

  return (
    <div className="page page--split">
      <form className="card" onSubmit={submit}>
        <h1>Send a file to the print shop</h1>
        <p className="muted">
          Upload once, share a Job ID and code, and the file deletes itself after the timer.
        </p>

        <FileDropzone file={file} onFile={choose} maxMb={maxFileMb} disabled={busy} />

        <label className="field">
          <span>Delete the file after</span>
          <select value={expiry} onChange={(e) => setExpiry(Number(e.target.value))} disabled={busy}>
            {EXPIRY_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button className="btn" type="submit" disabled={busy || !file}>
          {busy ? 'Uploading…' : 'Upload and get code'}
        </button>
      </form>

      <aside className="steps">
        <h2>How it works</h2>
        <ol>
          <li>
            <strong>Upload.</strong> The file is stored privately. There is no public link.
          </li>
          <li>
            <strong>Share the ticket.</strong> Tell the shop your Job ID and code.
          </li>
          <li>
            <strong>They print it.</strong> The file is deleted the moment it prints, or when the timer ends.
          </li>
        </ol>
      </aside>
    </div>
  );
}
