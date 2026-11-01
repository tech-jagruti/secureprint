import { useRef, useState } from 'react';

const formatSize = (bytes) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function FileDropzone({ file, onFile, maxMb, disabled }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setOver(false);
    if (!disabled && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  };

  return (
    <div
      className={`drop ${over ? 'is-over' : ''} ${file ? 'has-file' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
      <button type="button" className="drop__btn" onClick={() => inputRef.current.click()} disabled={disabled}>
        {file ? (
          <>
            <span className="drop__name">{file.name}</span>
            <span className="drop__hint">{formatSize(file.size)}. Choose a different file</span>
          </>
        ) : (
          <>
            <span className="drop__name">Drop a file here or choose one</span>
            <span className="drop__hint">PDF, PNG, JPG or Word, up to {maxMb} MB</span>
          </>
        )}
      </button>
    </div>
  );
}
