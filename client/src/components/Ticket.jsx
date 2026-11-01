import { useEffect, useState } from 'react';
import { deleteUploadedFile, getStatus } from '../api.js';
import Countdown from './Countdown.jsx';

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button type="button" className="btn btn--ghost btn--small" onClick={copy}>
      {copied ? 'Copied' : label}
    </button>
  );
}

export default function Ticket({ receipt, onReset }) {
  const [expired, setExpired] = useState(false);
  const [status, setStatus] = useState({ status: 'active', fileDeleted: false });
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const storageLabel = receipt.storage === 'cloudinary' ? 'Cloudinary' : 'server storage';

  const deleteFile = async () => {
    setDeleting(true);
    setDeleteMessage('');
    setDeleteError('');
    try {
      const result = await deleteUploadedFile(receipt.jobId, receipt.code);
      setStatus((current) => ({ ...current, status: 'deleted', fileDeleted: result.fileDeleted }));
      if (!result.fileDeleted) setDeleteMessage('Deletion requested. The server will retry if storage is temporarily unavailable.');
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Poll the server so this page shows the real outcome (printed, locked, deleted).
  useEffect(() => {
    let stop = false;
    let timer;
    const poll = async () => {
      try {
        const s = await getStatus(receipt.jobId);
        if (stop) return;
        setStatus(s);
        if (s.fileDeleted) return;
      } catch {
        /* keep trying */
      }
      timer = setTimeout(poll, 3000);
    };
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [receipt.jobId]);

  let footer;
  if (status.fileDeleted) {
    footer = (
      <p className="notice notice--ok">
        {status.status === 'printed' ? 'Printed. ' : ''}
        File deleted from {storageLabel}. This job can no longer be opened.
      </p>
    );
  } else if (status.status === 'locked') {
    footer = <p className="notice notice--bad">Locked after too many wrong codes. Upload the file again.</p>;
  } else if (expired) {
    footer = <p className="notice">Time is up. Deleting the file from {storageLabel}…</p>;
  } else {
    footer = <Countdown expiresAt={receipt.expiresAt} onExpire={() => setExpired(true)} />;
  }

  return (
    <section className="ticket" aria-label="Print job ticket">
      <div className="ticket__main">
        <p className="ticket__file">{receipt.fileName}</p>
        <div className="ticket__field">
          <span className="ticket__label">Job ID</span>
          <span className="ticket__id">{receipt.jobId}</span>
        </div>
        <div className="ticket__field">
          <span className="ticket__label">Access code</span>
          <span className="ticket__code">{receipt.code}</span>
        </div>
        <div className="ticket__actions">
          <CopyButton text={receipt.jobId} label="Copy Job ID" />
          <CopyButton text={receipt.code} label="Copy code" />
        </div>
        <p className="muted">
          Give both to the print shop. The code is shown once and can't be recovered.
        </p>
      </div>
      <div className="ticket__stub">
        {footer}
        {deleteMessage && <p className="notice">{deleteMessage}</p>}
        {deleteError && <p className="notice notice--bad" role="alert">{deleteError}</p>}
        {!status.fileDeleted && status.status !== 'printed' && status.status !== 'deleted' && (
          <button type="button" className="btn btn--ghost" onClick={deleteFile} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete file now'}
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={onReset}>
          Send another file
        </button>
      </div>
    </section>
  );
}
