import { useState, useEffect, useRef } from 'react';

interface UseTypewriterOptions {
    text: string;
    speed?: number;
    deleteSpeed?: number;
    delay?: number;
    pauseTime?: number;
    loop?: boolean;
}

export const useTypewriter = ({
    text,
    speed = 100,
    deleteSpeed = 50,
    delay = 0,
    pauseTime = 2000,
    loop = false
}: UseTypewriterOptions) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const indexRef = useRef(0);
    const directionRef = useRef<'typing' | 'deleting' | 'paused'>('typing');

    useEffect(() => {
        let timeoutId: number;

        const tick = () => {
            const currentIndex = indexRef.current;

            if (directionRef.current === 'typing') {
                if (currentIndex <= text.length) {
                    setDisplayedText(text.slice(0, currentIndex));
                    indexRef.current = currentIndex + 1;
                    timeoutId = window.setTimeout(tick, speed);
                } else {
                    // Finished typing
                    setIsTyping(false);
                    if (loop) {
                        // Pause before deleting
                        directionRef.current = 'paused';
                        timeoutId = window.setTimeout(() => {
                            directionRef.current = 'deleting';
                            tick();
                        }, pauseTime);
                    }
                }
            } else if (directionRef.current === 'deleting') {
                if (currentIndex >= 0) {
                    setDisplayedText(text.slice(0, currentIndex));
                    indexRef.current = currentIndex - 1;
                    timeoutId = window.setTimeout(tick, deleteSpeed);
                } else {
                    // Finished deleting
                    directionRef.current = 'paused';
                    timeoutId = window.setTimeout(() => {
                        directionRef.current = 'typing';
                        setIsTyping(true);
                        indexRef.current = 0;
                        tick();
                    }, 500);
                }
            }
        };

        // Start typing after initial delay
        const startTimeout = window.setTimeout(() => {
            indexRef.current = 0;
            directionRef.current = 'typing';
            setIsTyping(true);
            tick();
        }, delay);

        return () => {
            clearTimeout(startTimeout);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [text, speed, deleteSpeed, delay, pauseTime, loop]);

    return {
        displayedText,
        isTyping,
        showCursor: true
    };
};
