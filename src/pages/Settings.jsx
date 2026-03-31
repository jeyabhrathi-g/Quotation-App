import React, { useState } from 'react';
import { UserPlus, Palette, Settings as SettingsIcon, Save, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useSearch } from '../components/Layout';
import { supabase } from '../supabaseClient';
import './Settings.css';

const Settings = () => {
  const { appName, setAppName, theme, setTheme } = useAppContext();
  const [localAppName, setLocalAppName] = useState(appName);
  const [isSavingApp, setIsSavingApp] = useState(false);

  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'User' });
  const [isAddingUser, setIsAddingUser] = useState(false);

  const { setPageTitle } = useSearch();

  React.useEffect(() => {
    setPageTitle({ main: 'System Preferences', sub: 'Manage global application configurations' });
  }, [setPageTitle]);

  // --- App Name Handlers ---
  const handleSaveAppName = () => {
    setIsSavingApp(true);
    setTimeout(() => {
      setAppName(localAppName);
      setIsSavingApp(false);
      alert('App Name updated successfully!');
    }, 400); // Simulate tiny network delay feeling
  };

  const handleCancelAppName = () => {
    setLocalAppName(appName); // revert
  };

  // --- Theme Handler ---
  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
  };

  // --- User Management Handlers ---
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!userForm.username || !userForm.password || !userForm.role) {
      alert('Please fill out all user fields.');
      return;
    }

    try {
      setIsAddingUser(true);
      
      // 1. Check if username already exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('user_name', userForm.username)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      if (existingUser) {
        alert('This username is already taken!');
        setIsAddingUser(false);
        return;
      }

      // 2. Insert new user
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          user_name: userForm.username,
          password: userForm.password,
          role: userForm.role
        });

      if (insertError) throw insertError;

      alert('User added successfully!');
      setUserForm({ username: '', password: '', role: 'User' }); // reset form

    } catch (err) {
      console.error('Error adding user:', err);
      
      // Specifically catch Supabase RLS issues and provide clear instructions
      if (err.message?.includes('row-level security')) {
        alert("Action Required: Supabase is blocking this action.\n\nTo fix this: Go to your Supabase Dashboard -> Table Editor -> 'users' table -> Click 'Add RLS Policy' or disable Row Level Security (RLS) entirely for the users table.");
      } else {
        alert('Failed to add user: ' + err.message);
      }
    } finally {
      setIsAddingUser(false);
    }
  };

  return (
    <div className="settings-wrapper">
      <div className="settings-header">
        <div className="settings-title-group">
          <SettingsIcon size={28} className="settings-main-icon" />
          <div>
            <h2 className="settings-heading">System Preferences</h2>
            <p className="settings-subheading">Manage global application configurations and access</p>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        {/* App Configuration Block */}
        <section className="settings-card app-config-card">
          <div className="settings-card-header">
            <h3 className="card-title">App Configuration</h3>
          </div>
          <div className="settings-card-body">
            <div className="setting-group">
              <label>Application Name</label>
              <input 
                type="text" 
                value={localAppName}
                onChange={(e) => setLocalAppName(e.target.value)}
                placeholder="Enter app name"
                className="settings-input"
              />
              <span className="helper-text">Currently live as: <strong>{appName}</strong></span>
            </div>
            
            <div className="settings-actions-inline">
              <button 
                className="btn-cancel" 
                onClick={handleCancelAppName} 
                disabled={localAppName === appName}
              >
                <X size={16} /> Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSaveAppName} 
                disabled={localAppName === appName || isSavingApp}
              >
                <Save size={16} /> {isSavingApp ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </section>

        {/* Theme Configuration Block */}
        <section className="settings-card theme-config-card">
          <div className="settings-card-header">
            <h3 className="card-title">Theme Preferences</h3>
          </div>
          <div className="settings-card-body">
            <div className="theme-toggle-container">
              <button 
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <span className="theme-icon">🌞</span> Light Mode
              </button>
              <button 
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <span className="theme-icon">🌙</span> Dark Mode
              </button>
            </div>
          </div>
        </section>

        {/* User Management Block */}
        <section className="settings-card user-config-card">
          <div className="settings-card-header">
            <h3 className="card-title">User Management (Add New User)</h3>
          </div>
          <div className="settings-card-body">
            <form onSubmit={handleAddUser} className="user-add-form">
              <div className="setting-group">
                <label>Username</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. janesmith123"
                  className="settings-input"
                  value={userForm.username}
                  onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                />
              </div>

              <div className="setting-group">
                <label>Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="Enter strong password"
                  className="settings-input"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                />
              </div>

              <div className="setting-group">
                <label>Role</label>
                <select 
                  className="settings-input select-input"
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn-primary user-submit-btn" 
                disabled={isAddingUser}
              >
                <UserPlus size={18} />
                {isAddingUser ? 'Adding...' : 'Add User'}
              </button>
            </form>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Settings;
