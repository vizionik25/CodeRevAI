import React from 'react';
import { REVIEW_MODE_GROUPS } from '../../constants';
import { ReviewModeGroup, ReviewMode } from '../../types';

interface ReviewModeSelectorProps {
  selectedModes: string[];
  onModeChange: (modes: string[]) => void;
}

const MAX_SELECTIONS = 3;

export const ReviewModeSelector: React.FC<ReviewModeSelectorProps> = ({ selectedModes, onModeChange }) => {

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

  const isMaxSelectionsReached = selectedModes.length >= MAX_SELECTIONS;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
            Review Modes (select up to {MAX_SELECTIONS})
        </label>
        <p className="text-xs text-gray-500">You can select one mode from each group.</p>
      </div>

      {REVIEW_MODE_GROUPS.map((group) => (
        <div key={group.name}>
          <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">{group.name}</h4>
          <div className="space-y-2">
            {group.modes.map((mode) => {
              const isChecked = selectedModes.includes(mode.value);
              const isDisabled = !isChecked && isMaxSelectionsReached;
              
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
                        className="h-4 w-4 mt-0.5 rounded bg-gray-800 border-gray-500 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="ml-3 text-sm">
                        <span className={`font-medium ${isChecked ? 'text-indigo-300' : 'text-gray-300'}`}>
                            {mode.label}
                        </span>
                        {/* Description is now in the tooltip */}
                      </div>
                    </label>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 text-xs text-white bg-gray-900 border border-gray-600 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                        {mode.description}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};