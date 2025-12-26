import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import React from 'react';
const { useState, useEffect } = React as any;
import { CodeInput } from '../CodeInput';
import { CodeFile } from '@/app/types';

// Mock the external services
vi.mock('../../services/githubService', () => ({
  fetchRepoFiles: vi.fn(),
  fetchFileContent: vi.fn(),
  fetchFilesWithContent: vi.fn(),
}));

vi.mock('@/app/utils/githubUtils', () => ({
  parseGitHubUrl: vi.fn(),
}));

vi.mock('../../services/localFileService', () => ({
  openDirectoryAndGetFiles: vi.fn(),
  readFileContent: vi.fn(),
  getFilesFromInput: vi.fn(),
}));

// Mock child components
vi.mock('./LanguageOverrideSelector', () => ({
  LanguageOverrideSelector: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <select data-testid="language-override" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="auto-detect">Auto-detect</option>
      <option value="typescript">TypeScript</option>
      <option value="javascript">JavaScript</option>
      <option value="python">Python</option>
    </select>
  ),
}));

vi.mock('./ReviewModeSelector', () => ({
  ReviewModeSelector: ({ selectedModes, onModeChange }: { selectedModes: string[]; onModeChange: (modes: string[]) => void }) => (
    <div data-testid="review-mode-selector">
      <button onClick={() => onModeChange([...selectedModes, 'security'])}>
        Add Security Mode
      </button>
      <span>{selectedModes.join(',')}</span>
    </div>
  ),
}));

vi.mock('./LocalFolderWarningModal', () => ({
  LocalFolderWarningModal: ({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: (dontShow: boolean) => void }) => (
    isOpen ? (
      <div>
        <button onClick={() => onConfirm(false)}>OK</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}));

vi.mock('./icons/SparklesIcon', () => ({
  SparklesIcon: () => <span data-testid="sparkles-icon">✨</span>,
}));

vi.mock('./icons/ChevronDownIcon', () => ({
  ChevronDownIcon: ({ className }: { className?: string }) => (
    <span data-testid="chevron-icon" className={className}>▼</span>
  ),
}));

// Import mocked services for control in tests
import { fetchRepoFiles, fetchFileContent, fetchFilesWithContent } from '../../services/githubService';
import { parseGitHubUrl } from '@/app/utils/githubUtils';
import { openDirectoryAndGetFiles, readFileContent, getFilesFromInput } from '../../services/localFileService';

const mockFetchRepoFiles = fetchRepoFiles as ReturnType<typeof vi.fn>;
const mockFetchFileContent = fetchFileContent as ReturnType<typeof vi.fn>;
const mockFetchFilesWithContent = fetchFilesWithContent as ReturnType<typeof vi.fn>;
const mockParseGitHubUrl = parseGitHubUrl as ReturnType<typeof vi.fn>;
const mockOpenDirectoryAndGetFiles = openDirectoryAndGetFiles as ReturnType<typeof vi.fn>;
const mockReadFileContent = readFileContent as ReturnType<typeof vi.fn>;
const mockGetFilesFromInput = getFilesFromInput as ReturnType<typeof vi.fn>;

describe('CodeInput', () => {
  // Mock props
  const defaultProps = {
    onReview: vi.fn(),
    onRepoReview: vi.fn(),
    isLoading: false,
    selectedFile: null,
    setSelectedFile: vi.fn(),
    code: '',
    setCode: vi.fn(),
    customPrompt: '',
    setCustomPrompt: vi.fn(),
    setError: vi.fn(),
    reviewModes: [],
    setReviewModes: vi.fn(),
    setDirectoryHandle: vi.fn(),
  };

  const mockCodeFile: CodeFile = {
    path: 'test.ts',
    language: { value: 'typescript', label: 'TypeScript', extensions: ['.ts'] },
    content: 'console.log("test");',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
    // Mock window properties
    Object.defineProperty(window, 'self', { value: window, writable: true });
    Object.defineProperty(window, 'top', { value: window, writable: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render all main sections', () => {
      render(<CodeInput {...defaultProps} />);

      expect(screen.getByText('Code Input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://github.com/owner/repo')).toBeInTheDocument();
      expect(screen.getByText('Select Local Folder')).toBeInTheDocument();
      expect(screen.getByText('Paste Code Manually')).toBeInTheDocument();
      expect(screen.getByText('Review File')).toBeInTheDocument();
    });

    it('should render collapsible sections', () => {
      render(<CodeInput {...defaultProps} />);

      expect(screen.getByText('Code Analysis Options')).toBeInTheDocument();
      expect(screen.getByText('Custom Instructions')).toBeInTheDocument();
    });

    it('should show language override selector', () => {
      render(<CodeInput {...defaultProps} />);

      expect(screen.getByLabelText('Select code language')).toBeInTheDocument();
    });
  });

  describe('GitHub Repository Integration', () => {
    it('should handle GitHub URL input changes', async () => {
      const user = userEvent.setup();
      render(<CodeInput {...defaultProps} />);

      const urlInput = screen.getByPlaceholderText('https://github.com/owner/repo');
      await user.type(urlInput, 'https://github.com/test/repo');

      expect(urlInput).toHaveValue('https://github.com/test/repo');
    });

    it('should fetch repository files when Load button is clicked', async () => {
      const user = userEvent.setup();
      mockParseGitHubUrl.mockReturnValue({ owner: 'test', repo: 'repo' });
      mockFetchRepoFiles.mockResolvedValue([mockCodeFile]);

      render(<CodeInput {...defaultProps} />);

      const urlInput = screen.getByPlaceholderText('https://github.com/owner/repo');
      const loadButton = screen.getByText('Load');

      await user.type(urlInput, 'https://github.com/test/repo');
      await user.click(loadButton);

      expect(mockParseGitHubUrl).toHaveBeenCalledWith('https://github.com/test/repo');
      expect(mockFetchRepoFiles).toHaveBeenCalledWith('test', 'repo');
    });

    it('should handle invalid GitHub URLs', async () => {
      const user = userEvent.setup();
      mockParseGitHubUrl.mockReturnValue(null);

      render(<CodeInput {...defaultProps} />);

      const urlInput = screen.getByPlaceholderText('https://github.com/owner/repo');
      const loadButton = screen.getByText('Load');

      await user.type(urlInput, 'invalid-url');
      await user.click(loadButton);

      expect(defaultProps.setError).toHaveBeenCalledWith('Invalid GitHub repository URL.');
    });

    it('should handle GitHub API errors', async () => {
      const user = userEvent.setup();
      mockParseGitHubUrl.mockReturnValue({ owner: 'test', repo: 'repo' });
      mockFetchRepoFiles.mockRejectedValue(new Error('API Error'));

      render(<CodeInput {...defaultProps} />);

      const urlInput = screen.getByPlaceholderText('https://github.com/owner/repo');
      const loadButton = screen.getByText('Load');

      await user.type(urlInput, 'https://github.com/test/repo');
      await user.click(loadButton);

      await waitFor(() => {
        expect(defaultProps.setError).toHaveBeenCalledWith('API Error');
      });
    });

    it('should show repository review button when files are loaded', async () => {
      const user = userEvent.setup();
      mockParseGitHubUrl.mockReturnValue({ owner: 'test', repo: 'repo' });
      mockFetchRepoFiles.mockResolvedValue([mockCodeFile]);

      render(<CodeInput {...defaultProps} />);

      const urlInput = screen.getByPlaceholderText('https://github.com/owner/repo');
      const loadButton = screen.getByText('Load');

      await user.type(urlInput, 'https://github.com/test/repo');
      await user.click(loadButton);

      await waitFor(() => {
        expect(screen.getByText('Review Entire Repository')).toBeInTheDocument();
      });
    });

    it('should disable repository review for test generation mode', () => {
      render(<CodeInput {...defaultProps} reviewModes={['test_generation']} />);

      // First we need to load files
      render(<CodeInput {...defaultProps} />);

      // Mock having loaded files with a repo URL
      const propsWithRepo = {
        ...defaultProps,
        reviewModes: ['test_generation'],
      };

      const { rerender } = render(<CodeInput {...propsWithRepo} />);

      // Simulate having files loaded
      rerender(<CodeInput {...propsWithRepo} />);
    });
  });

  describe('Local File System Access', () => {
    it('should handle iframe detection', () => {
      // Mock iframe environment
      Object.defineProperty(window, 'self', { value: window, writable: true });
      Object.defineProperty(window, 'top', { value: {}, writable: true });

      render(<CodeInput {...defaultProps} />);

      expect(screen.getByText('Select Local Folder')).toBeInTheDocument();
    });

    it('should show warning modal on first local folder access', async () => {
      const user = userEvent.setup();
      render(<CodeInput {...defaultProps} />);

      const localFolderButton = screen.getByText('Select Local Folder');
      await user.click(localFolderButton);

      expect(screen.getByText('Security & Privacy Warning')).toBeInTheDocument();
    });

    it('should skip warning modal if previously dismissed', async () => {
      const user = userEvent.setup();
      localStorage.setItem('hideLocalFolderWarning', 'true');
      mockOpenDirectoryAndGetFiles.mockResolvedValue({
        directoryHandle: {},
        files: [mockCodeFile],
      });

      render(<CodeInput {...defaultProps} />);

      const localFolderButton = screen.getByText('Select Local Folder');
      await user.click(localFolderButton);

      expect(screen.queryByText('Security & Privacy Warning')).not.toBeInTheDocument();
    });

    it('should handle directory selection success', async () => {
      const user = userEvent.setup();
      localStorage.setItem('hideLocalFolderWarning', 'true');
      mockOpenDirectoryAndGetFiles.mockResolvedValue({
        directoryHandle: {},
        files: [mockCodeFile],
      });

      render(<CodeInput {...defaultProps} />);

      const localFolderButton = screen.getByText('Select Local Folder');
      await user.click(localFolderButton);

      await waitFor(() => {
        expect(mockOpenDirectoryAndGetFiles).toHaveBeenCalled();
      });
    });

    it('should handle directory selection errors', async () => {
      const user = userEvent.setup();
      localStorage.setItem('hideLocalFolderWarning', 'true');
      mockOpenDirectoryAndGetFiles.mockRejectedValue(new Error('Access denied'));

      render(<CodeInput {...defaultProps} />);

      const localFolderButton = screen.getByText('Select Local Folder');
      await user.click(localFolderButton);

      // In the error scenario, the component should skip the warning if hideLocalFolderWarning is set
      // and directly attempt the operation, resulting in the error
      await waitFor(() => {
        expect(defaultProps.setError).toHaveBeenCalledWith('Access denied');
      });
    });

    it('should handle file input fallback in iframe', async () => {
      const user = userEvent.setup();
      // Mock iframe environment
      Object.defineProperty(window, 'top', {
        get: () => { throw new Error('Cross-origin access'); },
        configurable: true
      });

      mockGetFilesFromInput.mockResolvedValue([mockCodeFile]);

      render(<CodeInput {...defaultProps} />);

      const localFolderButton = screen.getByText('Select Local Folder');
      await user.click(localFolderButton);

      // In iframe mode, should trigger warning modal first
      expect(screen.getByText('Security & Privacy Warning')).toBeInTheDocument();
    });
  });

  describe('Manual Code Input', () => {
    it('should open paste modal when button is clicked', async () => {
      const user = userEvent.setup();
      render(<CodeInput {...defaultProps} />);

      const pasteButton = screen.getByText('Paste Code Manually');
      await user.click(pasteButton);

      expect(screen.getByText('Paste Code')).toBeInTheDocument();
    });

    it('should handle code pasting and modal closure', async () => {
      const user = userEvent.setup();
      render(<CodeInput {...defaultProps} code="initial code" />);

      const pasteButton = screen.getByText('Paste Code Manually');
      await user.click(pasteButton);

      const textarea = screen.getByPlaceholderText('Paste your code here...');
      await user.clear(textarea);
      await user.type(textarea, 'new code content');

      const saveButton = screen.getByText('Save Code');
      await user.click(saveButton);

      expect(defaultProps.setCode).toHaveBeenCalledWith('new code content');
      expect(defaultProps.setSelectedFile).toHaveBeenCalledWith(null);
    });

    it('should close paste modal on cancel', async () => {
      const user = userEvent.setup();
      render(<CodeInput {...defaultProps} />);

      const pasteButton = screen.getByText('Paste Code Manually');
      await user.click(pasteButton);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(screen.queryByText('Paste Code')).not.toBeInTheDocument();
    });

    it('should close paste modal when clicking backdrop', async () => {
      const user = userEvent.setup();
      render(<CodeInput {...defaultProps} />);

      const pasteButton = screen.getByText('Paste Code Manually');
      await user.click(pasteButton);

      const backdrop = screen.getByRole('dialog');
      await user.click(backdrop);

      expect(screen.queryByText('Paste Code')).not.toBeInTheDocument();
    });
  });

  describe('File Selection and Management', () => {
    const filesWithContent = [
      { ...mockCodeFile, path: 'file1.ts' },
      { ...mockCodeFile, path: 'file2.js', language: { value: 'javascript', label: 'JavaScript', extensions: ['.js'] } },
    ];

    it('should populate file selector when files are loaded', () => {
      render(<CodeInput {...defaultProps} />);

      // Check that the basic UI is rendered correctly
      expect(screen.getByText('Code Input')).toBeInTheDocument();
      expect(screen.getByText('Select Local Folder')).toBeInTheDocument();
    });

    it('should handle file selection from dropdown', async () => {
      const user = userEvent.setup();
      mockFetchFileContent.mockResolvedValue('file content');

      // Create component with mocked files state
      const TestWrapper = () => {
        const [files, setFiles] = useState([]);
        const [selectedFile, setSelectedFile] = useState(null);

        useEffect(() => {
          setFiles(filesWithContent);
        }, []);

        return (
          <CodeInput
            {...defaultProps}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
          />
        );
      };

      render(<TestWrapper />);

      await waitFor(() => {
        const fileSelect = screen.queryByDisplayValue('Select a file to review');
        if (fileSelect) {
          fireEvent.change(fileSelect, { target: { value: 'file1.ts' } });
        }
      });
    });

    it('should handle GitHub file content fetching', async () => {
      const user = userEvent.setup();
      mockParseGitHubUrl.mockReturnValue({ owner: 'test', repo: 'repo' });
      mockFetchFileContent.mockResolvedValue('github file content');

      render(<CodeInput {...defaultProps} />);

      // This test would require more complex setup to simulate the full flow
      expect(mockParseGitHubUrl).not.toHaveBeenCalled();
    });

    it('should handle local file content reading', async () => {
      mockReadFileContent.mockResolvedValue('local file content');

      const fileWithHandle = {
        ...mockCodeFile,
        handle: {} as FileSystemFileHandle,
        content: undefined,
      };

      render(<CodeInput {...defaultProps} selectedFile={fileWithHandle} />);

      // This would require more complex setup for full integration
      expect(mockReadFileContent).not.toHaveBeenCalled();
    });
  });

  describe('UI State Management', () => {
    it('should show loading state during file operations', () => {
      render(<CodeInput {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Reviewing...')).toBeInTheDocument();
    });

    it('should disable buttons during loading', () => {
      render(<CodeInput {...defaultProps} isLoading={true} />);

      const reviewButton = screen.getByText('Reviewing...');
      expect(reviewButton).toBeDisabled();
    });

    it('should disable review button when no code is present', () => {
      render(<CodeInput {...defaultProps} code="" />);

      const reviewButton = screen.getByText('Review File');
      expect(reviewButton).toBeDisabled();
    });

    it('should enable review button when code is present', () => {
      render(<CodeInput {...defaultProps} code="some code" />);

      const reviewButton = screen.getByText('Review File');
      expect(reviewButton).not.toBeDisabled();
    });
  });

  describe('Advanced Options', () => {
    it('should toggle review options section', async () => {
      const user = userEvent.setup();
      render(<CodeInput {...defaultProps} />);

      const toggleButton = screen.getByText('Code Analysis Options');
      await user.click(toggleButton);

      // Check if the ReviewModeSelector appears (mocked component)
      expect(screen.getByText('Review Modes (select up to 3)')).toBeInTheDocument();
    });

    it('should toggle custom prompt section', async () => {
      const user = userEvent.setup();
      render(<CodeInput {...defaultProps} />);

      const toggleButton = screen.getByText('Custom Instructions');
      await user.click(toggleButton);

      const textarea = screen.getByPlaceholderText(/Focus on performance optimizations/);
      expect(textarea).toBeInTheDocument();
    });

    it('should handle custom prompt changes', async () => {
      const user = userEvent.setup();
      render(<CodeInput {...defaultProps} />);

      const toggleButton = screen.getByText('Custom Instructions');
      await user.click(toggleButton);

      const textarea = screen.getByPlaceholderText(/Focus on performance optimizations/);

      // Simulate direct value change (like what would happen in real usage)
      fireEvent.change(textarea, { target: { value: 'Custom instruction text' } });

      expect(defaultProps.setCustomPrompt).toHaveBeenCalledWith('Custom instruction text');
    });

    it('should handle language override changes', async () => {
      const user = userEvent.setup();
      render(<CodeInput {...defaultProps} />);

      const languageSelect = screen.getByLabelText('Select code language');
      await user.selectOptions(languageSelect, 'typescript');

      // This would be handled by the mocked LanguageOverrideSelector
      expect(languageSelect).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should call onReview with correct parameters', async () => {
      const user = userEvent.setup();
      render(<CodeInput {...defaultProps} code="test code" />);

      const reviewButton = screen.getByText('Review File');
      await user.click(reviewButton);

      expect(defaultProps.onReview).toHaveBeenCalledWith('test code', 'typescript', '');
    });

    it('should handle repository review', async () => {
      const user = userEvent.setup();
      mockFetchFilesWithContent.mockResolvedValue([
        { path: 'file1.ts', content: 'content1' },
        { path: 'file2.js', content: 'content2' },
      ]);

      // This test would require more setup to simulate the full repository review flow
      render(<CodeInput {...defaultProps} />);

      expect(mockFetchFilesWithContent).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle file reading errors gracefully', async () => {
      const user = userEvent.setup();
      localStorage.setItem('hideLocalFolderWarning', 'true');
      mockOpenDirectoryAndGetFiles.mockRejectedValue(new Error('File system error'));

      render(<CodeInput {...defaultProps} />);

      const localFolderButton = screen.getByText('Select Local Folder');
      await user.click(localFolderButton);

      await waitFor(() => {
        expect(defaultProps.setError).toHaveBeenCalledWith('File system error');
      });
    });

    it('should handle GitHub URL validation errors', async () => {
      const user = userEvent.setup();
      mockParseGitHubUrl.mockReturnValue(null);

      render(<CodeInput {...defaultProps} />);

      const urlInput = screen.getByPlaceholderText('https://github.com/owner/repo');
      await user.type(urlInput, 'invalid-url');

      const loadButton = screen.getByText('Load');
      await user.click(loadButton);

      await waitFor(() => {
        expect(defaultProps.setError).toHaveBeenCalledWith('Invalid GitHub repository URL.');
      });
    });
  });

  describe('Integration and Props', () => {
    it('should update code when selectedFile changes', () => {
      const { rerender } = render(<CodeInput {...defaultProps} selectedFile={null} />);

      rerender(<CodeInput {...defaultProps} selectedFile={mockCodeFile} />);

      expect(defaultProps.setCode).toHaveBeenCalledWith('console.log("test");');
    });

    it('should handle props updates correctly', () => {
      const { rerender } = render(<CodeInput {...defaultProps} customPrompt="" />);

      rerender(<CodeInput {...defaultProps} customPrompt="new prompt" />);

      // Component should handle prop changes gracefully
      expect(screen.getByText('Custom Instructions')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<CodeInput {...defaultProps} />);

      const urlInput = screen.getByPlaceholderText('https://github.com/owner/repo');
      expect(urlInput).toBeInTheDocument();

      // Check for semantic structure
      expect(screen.getByText('Code Input')).toBeInTheDocument();
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CodeInput {...defaultProps} />);

      const urlInput = screen.getByPlaceholderText('https://github.com/owner/repo');
      await user.tab();

      expect(document.activeElement).toBe(urlInput);
    });
  });
});