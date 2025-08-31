import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { UserProfile } from '../components/UserProfile/UserProfile';
import { MessagingContract } from '../services/MessagingContract';

jest.mock('../services/MessagingContract');

describe('UserProfile', () => {
  it('should render profile data', async () => {
    const mockProfile = {
      username: 'TestUser',
      bio: 'Test Bio',
      avatar: 'test.jpg'
    };

    MessagingContract.prototype.getUserProfile = jest.fn().mockResolvedValue(
      JSON.stringify(mockProfile)
    );

    const { getByText } = render(<UserProfile />);
    
    await waitFor(() => {
      expect(getByText('TestUser')).toBeInTheDocument();
      expect(getByText('Test Bio')).toBeInTheDocument();
    });
  });

  it('should handle profile updates', async () => {
    const { getByText, getByPlaceholderText } = render(<UserProfile />);
    
    fireEvent.click(getByText('Edit Profile'));
    
    const usernameInput = getByPlaceholderText('Username');
    fireEvent.change(usernameInput, { target: { value: 'NewUsername' } });
    
    fireEvent.click(getByText('Save'));
    
    await waitFor(() => {
      expect(MessagingContract.prototype.updateProfile).toHaveBeenCalled();
    });
  });
});