import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewModeSelector } from '../ReviewModeSelector';

// Mock the constants to have predictable test data
vi.mock('@/app/data/constants', () => ({
  REVIEW_MODE_GROUPS: [
    {
      name: "Core Analysis",
      description: "Fundamental code review focuses",
      modes: [
        { 
          value: 'comprehensive', 
          label: 'Comprehensive Review', 
          description: 'Full analysis covering bugs, performance, security, best practices' 
        },
        { 
          value: 'security', 
          label: 'Security Audit', 
          description: 'Deep security analysis: injection flaws, authentication issues' 
        },
        { 
          value: 'bug_fixes', 
          label: 'Bug Detection', 
          description: 'Identify logic errors, edge cases, null pointer issues' 
        },
      ]
    },
    {
      name: "Code Generation",
      description: "AI-powered code generation",
      modes: [
        { 
          value: 'test_generation', 
          label: 'Test Generation', 
          description: 'Generate comprehensive unit tests with edge cases' 
        },
      ]
    },
    {
      name: "Production Readiness",
      description: "Final verification before deployment",
      modes: [
        { 
          value: 'production_ready', 
          label: 'Production Ready Check', 
          description: 'Comprehensive pre-deployment audit' 
        },
      ]
    }
  ]
}));

describe('ReviewModeSelector', () => {
  const defaultProps = {
    selectedModes: [],
    onModeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render all review mode groups', () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      expect(screen.getByText('Core Analysis')).toBeInTheDocument();
      expect(screen.getByText('Code Generation')).toBeInTheDocument();
      expect(screen.getByText('Production Readiness')).toBeInTheDocument();
    });

    it('should render group descriptions', () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      expect(screen.getByText('Fundamental code review focuses')).toBeInTheDocument();
      expect(screen.getByText('AI-powered code generation')).toBeInTheDocument();
      expect(screen.getByText('Final verification before deployment')).toBeInTheDocument();
    });

    it('should render all review modes', () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      expect(screen.getByText('Comprehensive Review')).toBeInTheDocument();
      expect(screen.getByText('Security Audit')).toBeInTheDocument();
      expect(screen.getByText('Bug Detection')).toBeInTheDocument();
      expect(screen.getByText('Test Generation')).toBeInTheDocument();
      expect(screen.getByText('Production Ready Check')).toBeInTheDocument();
    });

    it('should show maximum selection limit in heading', () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      expect(screen.getByText('Review Modes (select up to 3)')).toBeInTheDocument();
    });

    it('should show usage instructions', () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      expect(screen.getByText(/Use arrow keys to navigate, Space or Enter to select/)).toBeInTheDocument();
    });
  });

  describe('Mode Selection', () => {
    it('should handle single mode selection', async () => {
      const user = userEvent.setup();
      render(<ReviewModeSelector {...defaultProps} />);
      
      const comprehensiveCheckbox = screen.getByLabelText('Comprehensive Review');
      await user.click(comprehensiveCheckbox);
      
      expect(defaultProps.onModeChange).toHaveBeenCalledWith(['comprehensive']);
    });

    it('should handle multiple mode selection from different groups', async () => {
      const user = userEvent.setup();
      
      // Track state changes manually for this test
      let currentModes: string[] = [];
      const mockOnModeChange = vi.fn((newModes: string[]) => {
        currentModes = newModes;
      });
      
      const { rerender } = render(<ReviewModeSelector selectedModes={currentModes} onModeChange={mockOnModeChange} />);
      
      const comprehensiveCheckbox = screen.getByLabelText('Comprehensive Review');
      await user.click(comprehensiveCheckbox);
      
      expect(mockOnModeChange).toHaveBeenCalledWith(['comprehensive']);
      
      // Update state and rerender
      rerender(<ReviewModeSelector selectedModes={['comprehensive']} onModeChange={mockOnModeChange} />);
      
      const testGenCheckbox = screen.getByLabelText('Test Generation');
      await user.click(testGenCheckbox);
      
      expect(mockOnModeChange).toHaveBeenCalledWith(['comprehensive', 'test_generation']);
    });

    it('should replace mode when selecting within same group', async () => {
      const user = userEvent.setup();
      render(<ReviewModeSelector {...defaultProps} selectedModes={['comprehensive']} />);
      
      const securityCheckbox = screen.getByLabelText('Security Audit');
      await user.click(securityCheckbox);
      
      expect(defaultProps.onModeChange).toHaveBeenCalledWith(['security']);
    });

    it('should handle mode deselection', async () => {
      const user = userEvent.setup();
      render(<ReviewModeSelector {...defaultProps} selectedModes={['comprehensive']} />);
      
      const comprehensiveCheckbox = screen.getByLabelText('Comprehensive Review');
      await user.click(comprehensiveCheckbox);
      
      expect(defaultProps.onModeChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Maximum Selection Limit', () => {
    it('should enforce maximum of 3 selections', async () => {
      const user = userEvent.setup();
      render(<ReviewModeSelector {...defaultProps} />);
      
      // Select 3 modes
      await user.click(screen.getByLabelText('Comprehensive Review'));
      await user.click(screen.getByLabelText('Test Generation'));  
      await user.click(screen.getByLabelText('Production Ready Check'));
      
      // Try to select a 4th mode from the same group as the first
      await user.click(screen.getByLabelText('Security Audit'));
      
      // Should replace comprehensive with security (both in Core Analysis group)
      expect(defaultProps.onModeChange).toHaveBeenLastCalledWith(['security']);
    });

    it('should disable unselected modes when maximum is reached', () => {
      render(<ReviewModeSelector {...defaultProps} selectedModes={['comprehensive', 'test_generation', 'production_ready']} />);
      
      const securityCheckbox = screen.getByLabelText('Security Audit');
      const bugCheckbox = screen.getByLabelText('Bug Detection');
      
      // Security and Bug Detection should be disabled (not selected and max reached)
      expect(securityCheckbox).toBeDisabled();
      expect(bugCheckbox).toBeDisabled();
      
      // Selected modes should remain enabled
      const comprehensiveCheckbox = screen.getByLabelText('Comprehensive Review');
      expect(comprehensiveCheckbox).not.toBeDisabled();
    });

    it('should show correct selection count for screen readers', () => {
      render(<ReviewModeSelector {...defaultProps} selectedModes={['comprehensive', 'test_generation']} />);
      
      expect(screen.getByText('2 of 3 review modes selected')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Space key to toggle selection', async () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      const comprehensiveCheckbox = screen.getByLabelText('Comprehensive Review');
      comprehensiveCheckbox.focus();
      
      fireEvent.keyDown(comprehensiveCheckbox, { key: ' ' });
      
      expect(defaultProps.onModeChange).toHaveBeenCalledWith(['comprehensive']);
    });

    it('should handle Enter key to toggle selection', async () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      const comprehensiveCheckbox = screen.getByLabelText('Comprehensive Review');
      comprehensiveCheckbox.focus();
      
      fireEvent.keyDown(comprehensiveCheckbox, { key: 'Enter' });
      
      expect(defaultProps.onModeChange).toHaveBeenCalledWith(['comprehensive']);
    });

    it('should navigate with arrow keys', async () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      const comprehensiveCheckbox = screen.getByLabelText('Comprehensive Review');
      comprehensiveCheckbox.focus();
      
      // Arrow down should focus next mode
      fireEvent.keyDown(comprehensiveCheckbox, { key: 'ArrowDown' });
      
      expect(document.activeElement).toBe(screen.getByLabelText('Security Audit'));
    });

    it('should wrap around navigation at end of list', async () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      const lastCheckbox = screen.getByLabelText('Production Ready Check');
      lastCheckbox.focus();
      
      // Arrow down from last should go to first
      fireEvent.keyDown(lastCheckbox, { key: 'ArrowDown' });
      
      expect(document.activeElement).toBe(screen.getByLabelText('Comprehensive Review'));
    });

    it('should navigate backwards with up arrow', async () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      const securityCheckbox = screen.getByLabelText('Security Audit');
      securityCheckbox.focus();
      
      // Arrow up should focus previous mode
      fireEvent.keyDown(securityCheckbox, { key: 'ArrowUp' });
      
      expect(document.activeElement).toBe(screen.getByLabelText('Comprehensive Review'));
    });

    it('should not toggle disabled modes with keyboard', async () => {
      render(<ReviewModeSelector {...defaultProps} selectedModes={['comprehensive', 'test_generation', 'production_ready']} />);
      
      const securityCheckbox = screen.getByLabelText('Security Audit');
      securityCheckbox.focus();
      
      fireEvent.keyDown(securityCheckbox, { key: ' ' });
      
      // Should not change modes since security is disabled
      expect(defaultProps.onModeChange).not.toHaveBeenCalled();
    });
  });

  describe('Tooltips and Descriptions', () => {
    it('should show tooltip on focus', async () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      const comprehensiveCheckbox = screen.getByLabelText('Comprehensive Review');
      
      fireEvent.focus(comprehensiveCheckbox);
      
      await waitFor(() => {
        expect(screen.getByText('Full analysis covering bugs, performance, security, best practices')).toBeVisible();
      });
    });

    it('should hide tooltip on blur', async () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      const comprehensiveCheckbox = screen.getByLabelText('Comprehensive Review');
      
      fireEvent.focus(comprehensiveCheckbox);
      
      await waitFor(() => {
        expect(screen.getByText('Full analysis covering bugs, performance, security, best practices')).toBeVisible();
      });
      
      fireEvent.blur(comprehensiveCheckbox);
      
      await waitFor(() => {
        const tooltip = screen.getByText('Full analysis covering bugs, performance, security, best practices');
        expect(tooltip).toHaveClass('opacity-0');
      });
    });

    it('should show tooltip on hover', async () => {
      const user = userEvent.setup();
      render(<ReviewModeSelector {...defaultProps} />);
      
      const comprehensiveLabel = screen.getByText('Comprehensive Review').closest('label');
      
      await user.hover(comprehensiveLabel!);
      
      await waitFor(() => {
        const tooltip = screen.getByText('Full analysis covering bugs, performance, security, best practices');
        expect(tooltip).toHaveClass('group-hover:opacity-100');
      });
    });
  });

  describe('Visual States', () => {
    it('should apply selected styling to checked modes', () => {
      render(<ReviewModeSelector {...defaultProps} selectedModes={['comprehensive']} />);
      
      const comprehensiveLabel = screen.getByText('Comprehensive Review').closest('label');
      const securityLabel = screen.getByText('Security Audit').closest('label');
      
      expect(comprehensiveLabel).toHaveClass('bg-indigo-900/50', 'border-indigo-600');
      expect(securityLabel).toHaveClass('bg-gray-700/50', 'border-gray-600');
    });

    it('should apply disabled styling to disabled modes', () => {
      render(<ReviewModeSelector {...defaultProps} selectedModes={['comprehensive', 'test_generation', 'production_ready']} />);
      
      const securityLabel = screen.getByText('Security Audit').closest('label');
      
      expect(securityLabel).toHaveClass('cursor-not-allowed', 'opacity-50');
    });

    it('should show selected mode text with indigo color', () => {
      render(<ReviewModeSelector {...defaultProps} selectedModes={['comprehensive']} />);
      
      const comprehensiveText = screen.getByText('Comprehensive Review');
      const securityText = screen.getByText('Security Audit');
      
      expect(comprehensiveText).toHaveClass('text-indigo-300');
      expect(securityText).toHaveClass('text-gray-300');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      // Main container should have group role
      const mainContainer = screen.getByRole('group', { name: /Review Modes/ });
      expect(mainContainer).toBeInTheDocument();
      
      // Individual groups should have group role (they don't have accessible names due to aria-labelledby)
      const groups = screen.getAllByRole('group');
      expect(groups).toHaveLength(4); // Main container + 3 mode groups
    });

    it('should have proper checkbox attributes', () => {
      render(<ReviewModeSelector {...defaultProps} selectedModes={['comprehensive']} />);
      
      const comprehensiveCheckbox = screen.getByLabelText('Comprehensive Review');
      const securityCheckbox = screen.getByLabelText('Security Audit');
      
      expect(comprehensiveCheckbox).toHaveAttribute('aria-checked', 'true');
      expect(securityCheckbox).toHaveAttribute('aria-checked', 'false');
      expect(comprehensiveCheckbox).toHaveAttribute('aria-describedby', 'tooltip-comprehensive');
    });

    it('should have live region for selection announcements', () => {
      render(<ReviewModeSelector {...defaultProps} selectedModes={['comprehensive']} />);
      
      const liveRegion = screen.getByText('1 of 3 review modes selected');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(liveRegion).toHaveClass('sr-only');
    });

    it('should have proper tooltip attributes', () => {
      render(<ReviewModeSelector {...defaultProps} />);
      
      const tooltip = screen.getByText('Full analysis covering bugs, performance, security, best practices');
      expect(tooltip).toHaveAttribute('role', 'tooltip');
      expect(tooltip).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selectedModes array', () => {
      render(<ReviewModeSelector {...defaultProps} selectedModes={[]} />);
      
      expect(screen.getByText('0 of 3 review modes selected')).toBeInTheDocument();
      
      // All checkboxes should be unchecked and enabled
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
        expect(checkbox).not.toBeDisabled();
      });
    });

    it('should handle invalid mode values in selectedModes', () => {
      render(<ReviewModeSelector {...defaultProps} selectedModes={['invalid_mode', 'comprehensive']} />);
      
      // Should still work with valid modes
      const comprehensiveCheckbox = screen.getByLabelText('Comprehensive Review');
      expect(comprehensiveCheckbox).toBeChecked();
    });

    it('should handle rapid selection changes', async () => {
      const user = userEvent.setup();
      
      // Track state changes manually for this test
      let currentModes: string[] = [];
      const mockOnModeChange = vi.fn((newModes: string[]) => {
        currentModes = newModes;
      });
      
      const { rerender } = render(<ReviewModeSelector selectedModes={currentModes} onModeChange={mockOnModeChange} />);
      
      const comprehensive = screen.getByLabelText('Comprehensive Review');
      await user.click(comprehensive);
      expect(mockOnModeChange).toHaveBeenCalledWith(['comprehensive']);
      
      // Update state
      rerender(<ReviewModeSelector selectedModes={['comprehensive']} onModeChange={mockOnModeChange} />);
      
      const security = screen.getByLabelText('Security Audit');
      await user.click(security); // This replaces comprehensive since same group
      expect(mockOnModeChange).toHaveBeenCalledWith(['security']);
      
      // Update state
      rerender(<ReviewModeSelector selectedModes={['security']} onModeChange={mockOnModeChange} />);
      
      const testGen = screen.getByLabelText('Test Generation');
      await user.click(testGen);
      expect(mockOnModeChange).toHaveBeenCalledWith(['security', 'test_generation']);
      
      // Should handle all changes correctly
      expect(mockOnModeChange).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration', () => {
    it('should work with controlled component pattern', () => {
      const { rerender } = render(<ReviewModeSelector {...defaultProps} selectedModes={[]} />);
      
      // Initially no modes selected
      expect(screen.getByText('0 of 3 review modes selected')).toBeInTheDocument();
      
      // Update props
      rerender(<ReviewModeSelector {...defaultProps} selectedModes={['comprehensive', 'test_generation']} />);
      
      // Should reflect new state
      expect(screen.getByText('2 of 3 review modes selected')).toBeInTheDocument();
      expect(screen.getByLabelText('Comprehensive Review')).toBeChecked();
      expect(screen.getByLabelText('Test Generation')).toBeChecked();
    });

    it('should preserve focus during state updates', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<ReviewModeSelector {...defaultProps} selectedModes={[]} />);
      
      const comprehensiveCheckbox = screen.getByLabelText('Comprehensive Review');
      await user.click(comprehensiveCheckbox);
      comprehensiveCheckbox.focus();
      
      // Update props
      rerender(<ReviewModeSelector {...defaultProps} selectedModes={['comprehensive']} />);
      
      // Focus should be preserved
      expect(document.activeElement).toBe(comprehensiveCheckbox);
    });
  });
});