import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';

export default function DocumentPreview({ url, mimeType, fileName }) {
  const wordPreviewRef = useRef(null);
  const [wordError, setWordError] = useState('');
  const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  useEffect(() => {
    if (!isDocx || !url || !wordPreviewRef.current) return;

    let cancelled = false;
    const container = wordPreviewRef.current;
    setWordError('');
    container.replaceChildren();

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error('Could not load this Word document.');
        return response.blob();
      })
      .then((blob) => renderAsync(blob, container, container))
      .catch(() => {
        if (!cancelled) setWordError('This Word document could not be previewed. Download it to open the file.');
      });

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [isDocx, url]);

  if (mimeType === 'application/pdf') {
    return <iframe className="preview__frame" src={url} title={`Preview of ${fileName}`} />;
  }
  if (isDocx) {
    return (
      <div>
        {wordError ? (
          <div className="preview__word-error">
            <p role="alert">{wordError}</p>
            <a href={url} download={fileName}>Download {fileName}</a>
          </div>
        ) : (
          <div ref={wordPreviewRef} className="preview__word" aria-label={`Preview of ${fileName}`} />
        )}
      </div>
    );
  }
  if (mimeType === 'application/msword') {
    return (
      <div className="preview__image">
        <a href={url} download={fileName}>
          Download {fileName} to open or print it
        </a>
      </div>
    );
  }
  return (
    <div className="preview__image">
      <img src={url} alt={`Preview of ${fileName}`} />
    </div>
  );
}
