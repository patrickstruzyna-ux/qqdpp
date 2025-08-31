export const UserProfile: React.FC = () => {
  const [profile, setProfile] = useState('');

  const updateProfile = async () => {
    try {
      const contract = await getContract();
      await contract.updateProfile(profile);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <div>
      <input 
        value={profile}
        onChange={(e) => setProfile(e.target.value)}
        placeholder="Update your profile"
      />
      <button onClick={updateProfile}>Save Profile</button>
    </div>
  );
};