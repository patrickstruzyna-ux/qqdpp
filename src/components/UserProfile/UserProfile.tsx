import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { MessagingContract } from '../../services/MessagingContract';
import styles from './UserProfile.module.css';

interface UserProfileData {
  username: string;
  bio: string;
  avatar: string;
}

export const UserProfile: React.FC = () => {
  const { account } = useWallet();
  const [profile, setProfile] = useState<UserProfileData>({
    username: '',
    bio: '',
    avatar: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (account) {
      loadProfile();
    }
  }, [account]);

  const loadProfile = async () => {
    try {
      const contract = new MessagingContract();
      const profileData = await contract.getUserProfile(account);
      setProfile(JSON.parse(profileData));
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    if (!account) return;
    
    setIsSaving(true);
    try {
      const contract = new MessagingContract();
      await contract.updateProfile(JSON.stringify(profile));
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.profileContainer}>
      {!isEditing ? (
        <div className={styles.viewMode}>
          <img src={profile.avatar} alt="Profile" className={styles.avatar} />
          <h2>{profile.username}</h2>
          <p>{profile.bio}</p>
          <button onClick={() => setIsEditing(true)}>Edit Profile</button>
        </div>
      ) : (
        <div className={styles.editMode}>
          <input
            type="text"
            value={profile.username}
            onChange={e => setProfile({...profile, username: e.target.value})}
            placeholder="Username"
          />
          <textarea
            value={profile.bio}
            onChange={e => setProfile({...profile, bio: e.target.value})}
            placeholder="Bio"
          />
          <input
            type="text"
            value={profile.avatar}
            onChange={e => setProfile({...profile, avatar: e.target.value})}
            placeholder="Avatar URL"
          />
          <div className={styles.buttons}>
            <button onClick={saveProfile} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};