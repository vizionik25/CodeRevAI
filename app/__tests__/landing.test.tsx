import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Clerk client-side components used in the landing page
vi.mock('@clerk/nextjs', () => ({
  SignInButton: ({ children }: any) => <div>{children}</div>,
  SignedIn: ({ children }: any) => <div>{children}</div>,
  SignedOut: ({ children }: any) => <div>{children}</div>,
  useUser: () => ({ isSignedIn: false, user: null }),
}));

import LandingPage from '../page';

describe('Landing page', () => {
  it('renders hero and GitHub CTA', () => {
    render(<LandingPage />);

    expect(screen.getByText(/Elevate Your Code Quality with AI/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Get it on GitHub/i })).toBeInTheDocument();
  });
});
