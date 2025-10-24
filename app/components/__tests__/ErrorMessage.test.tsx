import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { ErrorMessage } from '../ErrorMessage';

describe('ErrorMessage', () => {
  beforeEach(() => {
    // Reset any mocks
    vi.clearAllMocks();
    
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true,
    });
  });

  describe('Error Context Detection', () => {
    it('should detect rate-limit context from error message', () => {
      render(<ErrorMessage error="Rate limit exceeded. Too many requests." />);
      
      expect(screen.getByText('Rate Limit Reached')).toBeInTheDocument();
      expect(screen.getByText('⏱️')).toBeInTheDocument();
      expect(screen.getByText('Wait a few minutes before trying again')).toBeInTheDocument();
    });

    it('should detect auth context from error message', () => {
      render(<ErrorMessage error="Unauthorized access. Authentication required." />);
      
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('🔐')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });

    it('should detect network context from error message', () => {
      render(<ErrorMessage error="Network connection failed. Could not fetch data." />);
      
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('🌐')).toBeInTheDocument();
      expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
    });

    it('should detect file context from error message', () => {
      render(<ErrorMessage error="Invalid file format. File too large." />);
      
      expect(screen.getByText('File Processing Error')).toBeInTheDocument();
      expect(screen.getByText('📄')).toBeInTheDocument();
      expect(screen.getByText('Ensure the file is a valid code file')).toBeInTheDocument();
    });

    it('should default to review context for unknown errors', () => {
      render(<ErrorMessage error="Something unexpected happened" />);
      
      expect(screen.getByText('AI Review Failed')).toBeInTheDocument();
      expect(screen.getByText('🤖')).toBeInTheDocument();
      expect(screen.getByText('The code may be too complex or too long')).toBeInTheDocument();
    });
  });

  describe('Explicit Context Override', () => {
    it('should use provided context instead of auto-detection', () => {
      render(<ErrorMessage error="Network failed" context="auth" />);
      
      // Should show auth context, not network
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('🔐')).toBeInTheDocument();
      expect(screen.queryByText('Connection Error')).not.toBeInTheDocument();
    });

    it('should handle all valid context types', () => {
      const contexts = ['review', 'diff', 'file', 'network', 'auth', 'rate-limit'] as const;
      
      contexts.forEach(context => {
        const { unmount } = render(
          <ErrorMessage error="Test error" context={context} />
        );
        
        // Should render without errors for each context
        expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Error Display', () => {
    it('should display the error message text', () => {
      const errorText = "Custom error message for testing";
      render(<ErrorMessage error={errorText} />);
      
      expect(screen.getByText(errorText)).toBeInTheDocument();
    });

    it('should display all solution steps', () => {
      render(<ErrorMessage error="Test error" context="network" />);
      
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
      expect(screen.getByText('3.')).toBeInTheDocument();
      expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
      expect(screen.getByText('Refresh the page and try again')).toBeInTheDocument();
      expect(screen.getByText('The service may be temporarily unavailable')).toBeInTheDocument();
    });

    it('should display "What you can try:" section', () => {
      render(<ErrorMessage error="Test error" />);
      
      expect(screen.getByText(/What you can try:/)).toBeInTheDocument();
    });
  });

  describe('Additional Help Sections', () => {
    it('should show rate limit help for rate-limit context', () => {
      render(<ErrorMessage error="Rate limit exceeded" context="rate-limit" />);
      
      expect(screen.getByText(/Rate Limits:/)).toBeInTheDocument();
      expect(screen.getByText(/Free tier allows 15 requests per minute/)).toBeInTheDocument();
      expect(screen.getByText(/Upgrade to Pro for unlimited reviews/)).toBeInTheDocument();
    });

    it('should show auth help for auth context', () => {
      render(<ErrorMessage error="Auth failed" context="auth" />);
      
      expect(screen.getByText(/Need Help\?/)).toBeInTheDocument();
      expect(screen.getByText(/try signing out and back in/)).toBeInTheDocument();
      expect(screen.getByText(/contact support/)).toBeInTheDocument();
    });

    it('should not show additional help for other contexts', () => {
      render(<ErrorMessage error="File error" context="file" />);
      
      expect(screen.queryByText(/Rate Limits:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Need Help\?/)).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call window.location.reload when refresh button is clicked', async () => {
      const user = userEvent.setup();
      const reloadSpy = vi.fn();
      window.location.reload = reloadSpy;
      
      render(<ErrorMessage error="Test error" />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh page & try again/i });
      await user.click(refreshButton);
      
      expect(reloadSpy).toHaveBeenCalledOnce();
    });

    it('should have proper button styling and accessibility', () => {
      render(<ErrorMessage error="Test error" />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh page & try again/i });
      
      expect(refreshButton).toHaveClass('w-full', 'px-4', 'py-2', 'bg-indigo-600');
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should render with proper container structure', () => {
      render(<ErrorMessage error="Test error" />);
      
      // Check for main container classes by finding the actual container element
      const container = document.querySelector('.max-w-lg.w-full.bg-red-900\\/20');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('border', 'border-red-700/50', 'rounded-lg');
    });

    it('should display error icon and title correctly', () => {
      render(<ErrorMessage error="Test error" context="file" />);
      
      expect(screen.getByText('📄')).toBeInTheDocument();
      expect(screen.getByText('File Processing Error')).toBeInTheDocument();
    });

    it('should have proper spacing and dividers', () => {
      render(<ErrorMessage error="Test error" />);
      
      // Check for divider element
      const divider = document.querySelector('.border-t.border-red-700\\/30');
      expect(divider).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty error message', () => {
      render(<ErrorMessage error="" />);
      
      expect(screen.getByText('AI Review Failed')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle very long error messages', () => {
      const longError = 'This is a very long error message that should still be displayed properly without breaking the layout or causing any issues with the component rendering and user experience.';
      
      render(<ErrorMessage error={longError} />);
      
      expect(screen.getByText(longError)).toBeInTheDocument();
    });

    it('should handle special characters in error messages', () => {
      const specialError = 'Error with special chars: <script>alert("test")</script> & quotes "test" & symbols ±∞';
      
      render(<ErrorMessage error={specialError} />);
      
      expect(screen.getByText(specialError)).toBeInTheDocument();
    });

    it('should handle multiple keywords in error message', () => {
      render(<ErrorMessage error="Authentication failed due to network connection issues" />);
      
      // Should prioritize auth over network in detection
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });
  });

  describe('Case Sensitivity', () => {
    it('should detect context case-insensitively', () => {
      render(<ErrorMessage error="RATE LIMIT EXCEEDED" />);
      
      expect(screen.getByText('Rate Limit Reached')).toBeInTheDocument();
    });

    it('should detect mixed case error contexts', () => {
      render(<ErrorMessage error="Network Connection Failed" />);
      
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });
  });
});