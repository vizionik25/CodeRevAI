import React, { useState, useEffect } from 'react';
import { LoaderIcon } from './icons/LoaderIcon';

interface LoadingStateProps {
  message?: string;
  showProgress?: boolean;
  type?: 'review' | 'diff' | 'save';
}

const REVIEW_STEPS = [
  { message: 'Analyzing code structure...', minTime: 1000 },
  { message: 'Running security checks...', minTime: 2000 },
  { message: 'Checking for bugs and errors...', minTime: 3000 },
  { message: 'Evaluating performance patterns...', minTime: 4000 },
  { message: 'Generating recommendations...', minTime: 5000 },
  { message: 'Finalizing review...', minTime: 6000 },
];

const DIFF_STEPS = [
  { message: 'Understanding requested changes...', minTime: 1000 },
  { message: 'Applying AI suggestions...', minTime: 2000 },
  { message: 'Generating modified code...', minTime: 3000 },
  { message: 'Validating changes...', minTime: 4000 },
];

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message, 
  showProgress = true,
  type = 'review' 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [startTime] = useState(Date.now());

  const steps = type === 'diff' ? DIFF_STEPS : REVIEW_STEPS;

  useEffect(() => {
    if (!showProgress) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Progress through steps based on elapsed time
      for (let i = 0; i < steps.length; i++) {
        if (elapsed < steps[i].minTime) {
          setCurrentStep(i);
          break;
        }
      }
      
      // Stay on last step if we've exceeded all time thresholds
      if (elapsed >= steps[steps.length - 1].minTime) {
        setCurrentStep(steps.length - 1);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [startTime, showProgress, steps]);

  return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="flex flex-col items-center gap-6 max-w-md px-4">
        {/* Animated loader */}
        <div className="relative">
          <LoaderIcon />
          {showProgress && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="flex gap-1">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 w-8 rounded-full transition-all duration-300 ${
                      index <= currentStep ? 'bg-indigo-500' : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main message */}
        <div className="text-center space-y-2">
          <span className="text-lg font-medium">
            {message || (showProgress ? steps[currentStep].message : 'Processing...')}
          </span>
          
          {showProgress && type === 'review' && (
            <p className="text-sm text-gray-500">
              This may take 10-30 seconds depending on code complexity
            </p>
          )}
        </div>

        {/* Progress percentage (only for review) */}
        {showProgress && type === 'review' && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.min(Math.round(((currentStep + 1) / steps.length) * 100), 99)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(((currentStep + 1) / steps.length) * 100, 99)}%` }}
              />
            </div>
          </div>
        )}

        {/* Helpful tip */}
        {showProgress && type === 'review' && currentStep >= 2 && (
          <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-xs text-gray-400">
            <span className="text-indigo-400 font-semibold">\uD83D\uDCA1 Tip:</span> Large files or complex
            code may take longer to analyze. The AI is carefully reviewing every aspect of your code.
          </div>
        )}
      </div>
    </div>
  );
};
