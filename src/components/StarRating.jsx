// src/components/StarRating.jsx
import React from 'react';

export default function StarRating({ value = 0, onRate, readOnly = false, size = 22 }) {
  const [hover, setHover] = React.useState(0);
  const display = hover || value || 0;

  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onRate && onRate(n)}
          style={{
            cursor: readOnly ? 'default' : 'pointer',
            fontSize: size,
            lineHeight: 1,
            color: n <= display ? '#f5a623' : '#ddd',
            userSelect: 'none'
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}
