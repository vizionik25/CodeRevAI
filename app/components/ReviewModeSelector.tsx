import React, { useRef, useState, useEffect } from 'react';
import { REVIEW_MODE_GROUPS } from '@/app/data/constants';
import { ReviewModeGroup, ReviewMode } from '@/app/types';

interface ReviewModeSelectorProps {
  selectedModes: string[];
  onModeChange: (modes: string[]) => void;
}

const MAX_SELECTIONS = 3;

export const ReviewModeSelector: React.FC<ReviewModeSelectorProps> = ({ selectedModes, onModeChange }) => {
  const [focusedTooltip, setFocusedTooltip] = useState<string | null>(null);
  const checkboxRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const getGroupForMode = (modeValue: string): ReviewModeGroup | undefined => {
    return REVIEW_MODE_GROUPS.find(group => group.modes.some(m => m.value === modeValue));
  }

  const handleCheckboxChange = (modeValue: string, group: ReviewModeGroup, isChecked: boolean) => {
    let newModes = [...selectedModes];

    if (isChecked) {
        // If another mode in the same group is selected, deselect it first
        const existingSelectionInGroup = group.modes.find(m => newModes.includes(m.value));
        if (existingSelectionInGroup) {
            newModes = newModes.filter(m => m !== existingSelectionInGroup.value);
        }
        
        // Add the new mode
        newModes.push(modeValue);
        
        // If we exceed max selections, remove the oldest one that is not in the current group
        if (newModes.length > MAX_SELECTIONS) {
            const modeToRemove = newModes.find(m => getGroupForMode(m) !== group);
            if (modeToRemove) {
                 newModes = newModes.filter(m => m !== modeToRemove);
            } else {
                // This case is unlikely but as a fallback, remove the first one
                newModes.shift();
            }
        }
    } else {
        // Uncheck: just remove the mode
        newModes = newModes.filter(m => m !== modeValue);
    }
    
    onModeChange(newModes);
  };

  const handleKeyDown = (e: React.KeyboardEvent, modeValue: string, group: ReviewModeGroup, isChecked: boolean, isDisabled: boolean) => {
    // Space or Enter to toggle
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!isDisabled) {
        handleCheckboxChange(modeValue, group, !isChecked);
      }
    }
    
    // Arrow key navigation
    const allModeValues = REVIEW_MODE_GROUPS.flatMap(g => g.modes.map(m => m.value));
    const currentIndex = allModeValues.indexOf(modeValue);
    
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % allModeValues.length;
      const nextMode = allModeValues[nextIndex];
      checkboxRefs.current.get(nextMode)?.focus();
      setFocusedTooltip(nextMode);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + allModeValues.length) % allModeValues.length;
      const prevMode = allModeValues[prevIndex];
      checkboxRefs.current.get(prevMode)?.focus();
      setFocusedTooltip(prevMode);
    }
  };

  const isMaxSelectionsReached = selectedModes.length >= MAX_SELECTIONS;

  return (
    <div 
      className="space-y-4" 
      role="group" 
      aria-labelledby="review-modes-heading"
      aria-describedby="review-modes-description"
    >
      <div>
        <label 
          id="review-modes-heading" 
          className="block text-sm font-medium text-gray-400 mb-2"
        >
            Review Modes (select up to {MAX_SELECTIONS})
        </label>
        <p 
          id="review-modes-description" 
          className="text-xs text-gray-500"
        >
          You can select one mode from each group. Use arrow keys to navigate, Space or Enter to select.
        </p>
      </div>

      {REVIEW_MODE_GROUPS.map((group) => (
        <div key={group.name} className="space-y-2" role="group" aria-labelledby={`group-${group.name}`}>
          <div>
            <h4 
              id={`group-${group.name}`} 
              className="text-xs font-bold uppercase text-gray-400 tracking-wider"
            >
              {group.name}
            </h4>
            {group.description && (
              <p className="text-xs text-gray-500 mt-0.5" id={`group-${group.name}-desc`}>
                {group.description}
              </p>
            )}
          </div>
          <div className="space-y-2">
            {group.modes.map((mode) => {
              const isChecked = selectedModes.includes(mode.value);
              const isDisabled = !isChecked && isMaxSelectionsReached;
              const tooltipId = `tooltip-${mode.value}`;
              const showTooltip = focusedTooltip === mode.value;
              
              return (
                <div key={mode.value} className="relative group">
                    <label
                        className={`flex items-start w-full p-3 rounded-md transition-colors border ${
                            isChecked 
                                ? 'bg-indigo-900/50 border-indigo-600' 
                                : 'bg-gray-700/50 border-gray-600'
                        } ${
                            isDisabled 
                                ? 'cursor-not-allowed opacity-50' 
                                : 'cursor-pointer hover:bg-gray-700'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={(e) => handleCheckboxChange(mode.value, group, e.target.checked)}
                        onKeyDown={(e) => handleKeyDown(e, mode.value, group, isChecked, isDisabled)}
                        onFocus={() => setFocusedTooltip(mode.value)}
                        onBlur={() => setFocusedTooltip(null)}
                        className="h-4 w-4 mt-0.5 rounded bg-gray-800 border-gray-500 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                        aria-label={mode.label}
                        aria-describedby={tooltipId}
                        aria-checked={isChecked}
                        aria-disabled={isDisabled}
                        ref={(el) => {
                          if (el) {
                            checkboxRefs.current.set(mode.value, el);
                          } else {
                            checkboxRefs.current.delete(mode.value);
                          }
                        }}
                      />
                      <div className="ml-3 text-sm">
                        <span className={`font-medium ${isChecked ? 'text-indigo-300' : 'text-gray-300'}`}>
                            {mode.label}
                        </span>
                      </div>
                    </label>
                    <div 
                      id={tooltipId}
                      role="tooltip"
                      aria-live="polite"
                      className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 text-xs text-white bg-gray-900 border border-gray-600 rounded-md shadow-lg transition-opacity duration-300 z-10 ${
                        showTooltip ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none'
                      }`}
                    >
                        {mode.description}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Screen reader announcement for selection count */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedModes.length} of {MAX_SELECTIONS} review modes selected
      </div>
    </div>
  );
};