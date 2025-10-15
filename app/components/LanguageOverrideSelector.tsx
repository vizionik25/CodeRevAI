import React from 'react';
import { LANGUAGE_OVERRIDE_OPTIONS } from '../../constants';

interface LanguageOverrideSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const LanguageOverrideSelector: React.FC<LanguageOverrideSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="mb-4">
      <label htmlFor="language-override" className="block text-sm font-medium text-gray-400 mb-2">
        Code Language
      </label>
      <select
        id="language-override"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Select code language"
      >
        {LANGUAGE_OVERRIDE_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      { value === 'auto-detect' && (
          <p className="text-xs text-gray-500 mt-1.5 px-1">Language will be determined by file extension.</p>
      )}
    </div>
  );
};
