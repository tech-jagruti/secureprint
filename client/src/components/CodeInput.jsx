import { useRef } from 'react';

export default function CodeInput({ length, value, onChange, disabled, invalid }) {
  const refs = useRef([]);
  const focus = (i) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const handleChange = (i, e) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      onChange(value.slice(0, i) + value.slice(i + 1));
      return;
    }
    onChange((value.slice(0, i) + digits + value.slice(i + 1)).slice(0, length));
    focus(i + digits.length);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      e.preventDefault();
      onChange(value.slice(0, i - 1));
      focus(i - 1);
    } else if (e.key === 'ArrowLeft') focus(i - 1);
    else if (e.key === 'ArrowRight') focus(i + 1);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(digits);
    focus(digits.length);
  };

  return (
    <div className={`code-input ${invalid ? 'is-invalid' : ''}`} role="group" aria-label="Access code">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
