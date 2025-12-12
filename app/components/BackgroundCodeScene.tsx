import React from 'react';
// Workaround for TypeScript build issue where React types aren't resolving correctly
const { useState, useRef, useEffect } = React as any;

const SAMPLE_CODE = `// Welcome to CodeRevAI
function greet(name) {
  console.log("Hello, " + name + "!");
}

// Example TODOs
// - Check for nulls
// - Add unit tests
// - Optimize loops

for (let i = 0; i < 5; i++) {
  greet("developer");
}
`;

export const BackgroundCodeScene = () => {
  const [text, setText] = useState('');
  const indexRef = useRef(0);
  const directionRef = useRef(1); // 1 typing, -1 deleting
  const timeoutRef = useRef(null);

  useEffect(() => {
    // typing loop
    function tick() {
      const full = SAMPLE_CODE;
      const i = indexRef.current;

      // append next char
      if (directionRef.current === 1) {
        if (i <= full.length) {
          setText(full.slice(0, i));
          indexRef.current = i + 1;
        } else {
          // pause at end, then start deleting
          directionRef.current = -1;
          timeoutRef.current = window.setTimeout(tick, 1200);
          return;
        }
      } else {
        // deleting
        if (i >= 0) {
          setText(full.slice(0, i));
          indexRef.current = i - 1;
        } else {
          directionRef.current = 1;
          timeoutRef.current = window.setTimeout(tick, 300);
          return;
        }
      }

      // syntax-aware pause: longer pause after newline or punctuation to feel natural
      let delay = directionRef.current === 1 ? 24 + Math.random() * 20 : 12;

      if (directionRef.current === 1) {
        const nextChar = full.charAt(i) || '';
        // longer pause after newlines
        if (nextChar === '\n') {
          delay += 180 + Math.random() * 220; // pause for a line break
        }
        // punctuation pauses
        if (/[;:{}\),]/.test(nextChar)) {
          delay += 80 + Math.random() * 160;
        }
        // slightly longer pause after comments markers (//)
        if (full.slice(i, i + 2) === '//') {
          delay += 120 + Math.random() * 200;
        }
      }

      timeoutRef.current = window.setTimeout(tick, Math.round(delay));
    }

    // start typing after small delay
    indexRef.current = 0;
    directionRef.current = 1;
    timeoutRef.current = window.setTimeout(tick, 300);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div aria-hidden className="background-scene pointer-events-none">
      <div className="background-scene__overlay"></div>
      <pre className="background-scene__code">
        <code>{text}</code>
        <span className="typing-cursor" aria-hidden>█</span>
      </pre>
    </div>
  );
};

export default BackgroundCodeScene;
