/**
 * Upload Page Tests - example render test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UploadPage } from '../UploadPage';

describe('UploadPage', () => {
  it('should render upload page', () => {
    render(<UploadPage />);
    expect(screen.getByText(/upload images/i)).toBeInTheDocument();
  });
});
