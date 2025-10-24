import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  describe('Basic Rendering', () => {
    it('should render default loading state', () => {
      render(<LoadingState />);
      
      expect(screen.getByText('Analyzing code structure...')).toBeInTheDocument();
      expect(screen.getByText('This may take 10-30 seconds depending on code complexity')).toBeInTheDocument();
    });

    it('should render custom message when provided', () => {
      const customMessage = 'Custom loading message';
      render(<LoadingState message={customMessage} />);
      
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('should render processing message when showProgress is false', () => {
      render(<LoadingState showProgress={false} />);
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.queryByText('Analyzing code structure...')).not.toBeInTheDocument();
    });
  });

  describe('Loading Types', () => {
    it('should render review type steps by default', () => {
      render(<LoadingState />);
      
      expect(screen.getByText('Analyzing code structure...')).toBeInTheDocument();
      expect(screen.getByText('This may take 10-30 seconds depending on code complexity')).toBeInTheDocument();
    });

    it('should render diff type steps when type is diff', () => {
      render(<LoadingState type="diff" />);
      
      expect(screen.getByText('Understanding requested changes...')).toBeInTheDocument();
      expect(screen.queryByText('This may take 10-30 seconds depending on code complexity')).not.toBeInTheDocument();
    });

    it('should render save type steps (defaults to review)', () => {
      render(<LoadingState type="save" />);
      
      expect(screen.getByText('Analyzing code structure...')).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('should show progress bars when showProgress is true', () => {
      render(<LoadingState showProgress={true} />);
      
      // Should have progress indicators for review steps (6 steps)
      const progressBars = document.querySelectorAll('.h-1.w-8.rounded-full');
      expect(progressBars).toHaveLength(6);
    });

    it('should not show progress bars when showProgress is false', () => {
      render(<LoadingState showProgress={false} />);
      
      const progressBars = document.querySelectorAll('.h-1.w-8.rounded-full');
      expect(progressBars).toHaveLength(0);
    });

    it('should show different number of progress bars for diff type', () => {
      render(<LoadingState type="diff" showProgress={true} />);
      
      // Should have progress indicators for diff steps (4 steps)
      const progressBars = document.querySelectorAll('.h-1.w-8.rounded-full');
      expect(progressBars).toHaveLength(4);
    });
  });

  describe('Initial State', () => {
    it('should start with first step active', () => {
      render(<LoadingState />);
      
      const progressBars = document.querySelectorAll('.h-1.w-8.rounded-full');
      expect(progressBars[0]).toHaveClass('bg-indigo-500');
      expect(progressBars[1]).toHaveClass('bg-gray-700');
    });
  });

  describe('Progress Percentage for Review Type', () => {
    it('should show progress percentage for review type', () => {
      render(<LoadingState type="review" />);
      
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('17%')).toBeInTheDocument(); // (1/6) * 100 = 16.67 ≈ 17
    });

    it('should not show progress percentage for diff type', () => {
      render(<LoadingState type="diff" />);
      
      expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    });
  });

  describe('Tips Display', () => {
    it('should not show tip initially for review type', () => {
      render(<LoadingState type="review" />);
      
      // Should not show tip initially (shows after step 2)
      expect(screen.queryByText(/Tip:/)).not.toBeInTheDocument();
    });

    it('should not show tip for diff type', () => {
      render(<LoadingState type="diff" />);
      
      expect(screen.queryByText(/Tip:/)).not.toBeInTheDocument();
    });

    it('should not show tip when showProgress is false', () => {
      render(<LoadingState type="review" showProgress={false} />);
      
      expect(screen.queryByText(/Tip:/)).not.toBeInTheDocument();
    });
  });

  describe('Custom Message Override', () => {
    it('should use custom message even with progress enabled', () => {
      const customMessage = 'Custom processing message';
      render(<LoadingState message={customMessage} showProgress={true} />);
      
      expect(screen.getByText(customMessage)).toBeInTheDocument();
      expect(screen.queryByText('Analyzing code structure...')).not.toBeInTheDocument();
    });
  });

  describe('Loader Icon', () => {
    it('should render LoaderIcon component', () => {
      render(<LoadingState />);
      
      // Check for spinner SVG
      const spinner = document.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('h-5', 'w-5', 'text-white');
    });
  });

  describe('Layout and Styling', () => {
    it('should render with proper container structure', () => {
      render(<LoadingState />);
      
      const mainContainer = document.querySelector('.flex.items-center.justify-center.h-full');
      expect(mainContainer).toBeInTheDocument();
      
      const contentContainer = document.querySelector('.flex.flex-col.items-center.gap-6');
      expect(contentContainer).toBeInTheDocument();
    });

    it('should have proper spacing and styling classes', () => {
      render(<LoadingState />);
      
      const textContainer = document.querySelector('.text-center.space-y-2');
      expect(textContainer).toBeInTheDocument();
      
      const mainText = screen.getByText('Analyzing code structure...');
      expect(mainText).toHaveClass('text-lg', 'font-medium');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message gracefully', () => {
      render(<LoadingState message="" />);
      
      // Should show first step message instead of empty string
      expect(screen.getByText('Analyzing code structure...')).toBeInTheDocument();
    });

    it('should handle undefined message', () => {
      render(<LoadingState message={undefined} />);
      
      expect(screen.getByText('Analyzing code structure...')).toBeInTheDocument();
    });

    it('should render without errors for all prop combinations', () => {
      const propCombinations = [
        { type: 'review' as const, showProgress: true },
        { type: 'diff' as const, showProgress: true },
        { type: 'save' as const, showProgress: true },
        { type: 'review' as const, showProgress: false },
        { type: 'diff' as const, showProgress: false },
        { message: 'Custom message', showProgress: true },
        { message: 'Custom message', showProgress: false },
      ];

      propCombinations.forEach((props, index) => {
        const { unmount } = render(<LoadingState {...props} />);
        
        // Should render without throwing
        expect(document.querySelector('.flex.items-center.justify-center.h-full')).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up properly on unmount', () => {
      const { unmount } = render(<LoadingState />);
      
      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle re-renders without issues', () => {
      const { rerender } = render(<LoadingState type="review" />);
      
      expect(screen.getByText('Analyzing code structure...')).toBeInTheDocument();
      
      rerender(<LoadingState type="diff" />);
      
      expect(screen.getByText('Understanding requested changes...')).toBeInTheDocument();
      expect(screen.queryByText('Analyzing code structure...')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper color contrast and visibility', () => {
      render(<LoadingState />);
      
      const mainText = screen.getByText('Analyzing code structure...');
      expect(mainText).toHaveClass('text-lg', 'font-medium');
      
      const description = screen.getByText('This may take 10-30 seconds depending on code complexity');
      expect(description).toHaveClass('text-sm', 'text-gray-500');
    });

    it('should provide meaningful content for screen readers', () => {
      render(<LoadingState />);
      
      // Text content should be descriptive
      expect(screen.getByText(/Analyzing code structure/)).toBeInTheDocument();
      expect(screen.getByText(/This may take.*seconds/)).toBeInTheDocument();
    });
  });
});