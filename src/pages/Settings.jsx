import React, { useState } from 'react';
import { UserPlus, Palette, Settings as SettingsIcon, Save, X, Building2, MapPin, CreditCard, Phone, Mail, Info } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useSearch } from '../components/Layout';
import { useToast } from '../components/ToastProvider';
import { supabase } from '../supabaseClient';
import './Settings.css';

const Settings = () => {
  const { appName, setAppName, theme, setTheme } = useAppContext();
  const [localAppName, setLocalAppName] = useState(appName);
  const [isSavingApp, setIsSavingApp] = useState(false);
  const { addToast } = useToast();

  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'Admin' });
  const [isAddingUser, setIsAddingUser] = useState(false);

  const [companySettings, setCompanySettings] = useState({
    company_name: '',
    address: '',
    gstin: '',
    phone: '',
    email: ''
  });
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const { setPageTitle } = useSearch();

  React.useEffect(() => {
    setPageTitle({ main: 'System Preferences', sub: 'Manage global application configurations' });
    fetchCompanySettings();
  }, [setPageTitle]);

  const fetchCompanySettings = async () => {
    try {
      setIsLoadingCompany(true);
      const { data: companyData, error: companyError } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (companyError) throw companyError;
      
      if (companyData) {
        // Fetch address from separate table linked by shop_id
        const { data: addressData, error: addressError } = await supabase
          .from('addresses')
          .select('address')
          .eq('shop_id', companyData.id)
          .maybeSingle();

        if (addressError) console.error('Error fetching address:', addressError);

        setCompanySettings({
          ...companyData,
          address: addressData ? addressData.address : ''
        });
      }
    } catch (err) {
      console.error('Error fetching company settings:', err);
    } finally {
      setIsLoadingCompany(false);
    }
  };

  const validateCompanyForm = () => {
    const errors = {};
    const { company_name, gstin, phone, email } = companySettings;

    if (!company_name.trim()) errors.company_name = 'Business Name is required';

    // GSTIN Validation (15 chars)
    if (gstin && gstin.length !== 15) {
      errors.gstin = 'Invalid GST Number (Must be 15 characters)';
    }

    // Phone Validation (10 digits only)
    if (phone && !/^\d{10}$/.test(phone)) {
      errors.phone = 'Phone number must contain exactly 10 digits';
    }

    // Email Validation (Gmail only as requested)
    if (email && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
      errors.email = 'Enter valid Gmail address';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCompanySettings = async (e) => {
    e.preventDefault();

    if (!validateCompanyForm()) {
      return;
    }

    setIsSavingCompany(true);
    setCompanyError('');

    try {
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      let companyId;
      // Separate address from other company settings for separate table storage
      const { address, ...settingsWithoutAddress } = companySettings;

      if (existing) {
        const { error } = await supabase
          .from('company_settings')
          .update(settingsWithoutAddress)
          .eq('id', existing.id);
        
        if (error) throw error;
        companyId = existing.id;
      } else {
        const { data, error } = await supabase
          .from('company_settings')
          .insert([settingsWithoutAddress])
          .select()
          .single();
        
        if (error) throw error;
        companyId = data.id;
      }

      // Handle the separate address table
      const { data: existingAddress } = await supabase
        .from('addresses')
        .select('id')
        .eq('shop_id', companyId)
        .maybeSingle();

      if (existingAddress) {
        const { error: addressUpdateError } = await supabase
          .from('addresses')
          .update({ 
            address: address 
          })
          .eq('id', existingAddress.id);
        
        if (addressUpdateError) throw addressUpdateError;
      } else {
        const { error: addressInsertError } = await supabase
          .from('addresses')
          .insert([{ 
            shop_id: companyId, 
            address: address 
          }]);
        
        if (addressInsertError) throw addressInsertError;
      }

      addToast({ message: 'Updated successfully', type: 'success' });
    } catch (err) {
      setCompanyError(err.message);
    } finally {
      setIsSavingCompany(false);
    }
  };

  // --- App Name Handlers ---
  const handleSaveAppName = () => {
    setIsSavingApp(true);
    setTimeout(() => {
      setAppName(localAppName);
      setIsSavingApp(false);
      addToast({ message: 'Updated successfully', type: 'success' });
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
      setUserForm({ username: '', password: '', role: 'Admin' }); // reset form

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
        <section className="settings-card">
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
        <section className="settings-card">
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
        <section className="settings-card">
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
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
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
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
              </div>

              <div className="setting-group">
                <label>Role</label>
                <select
                  className="settings-input select-input"
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                >
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

        {/* Company Configuration Block */}
        <section className="settings-card company-config-card">
          <div className="settings-card-header">
            <h3 className="card-title">Company Details (PDF Header)</h3>
          </div>
          <div className="settings-card-body">
            {isLoadingCompany ? (
              <div className="loading-placeholder">Loading settings...</div>
            ) : (
              <form onSubmit={handleSaveCompanySettings} className="company-add-form">
                {companyError && <div className="error-message"><Info size={14} /> {companyError}</div>}

                <div className="setting-group">
                  <label>Business Name</label>
                  <div className="input-with-icon-settings">
                    <Building2 size={18} className="field-icon-settings" />
                    <input
                      type="text"
                      placeholder="e.g. SSV Food Tech"
                      className={`settings-input ${validationErrors.company_name ? 'has-error' : ''}`}
                      value={companySettings.company_name}
                      onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })}
                    />
                  </div>
                  {validationErrors.company_name && <span className="field-error-text">{validationErrors.company_name}</span>}
                </div>

                <div className="setting-group">
                  <label>Business Address</label>
                  <div className="input-with-icon-settings">
                    <MapPin size={18} className="field-icon-settings" />
                    <textarea
                      placeholder="Enter full address..."
                      className="settings-input"
                      rows="4"
                      style={{ paddingLeft: '48px', paddingTop: '16px' }}
                      value={companySettings.address}
                      onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="setting-group">
                  <label>GSTIN Number</label>
                  <div className="input-with-icon-settings">
                    <CreditCard size={18} className="field-icon-settings" />
                    <input
                      type="text"
                      placeholder="33XXXXXXXXXXXXX"
                      maxLength={15}
                      className={`settings-input ${validationErrors.gstin ? 'has-error' : ''}`}
                      value={companySettings.gstin}
                      onChange={(e) => setCompanySettings({ ...companySettings, gstin: e.target.value.toUpperCase() })}
                    />
                  </div>
                  {validationErrors.gstin && <span className="field-error-text">{validationErrors.gstin}</span>}
                </div>

                <div className="setting-group">
                  <label>Phone Number</label>
                  <div className="input-with-icon-settings">
                    <Phone size={18} className="field-icon-settings" />
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className={`settings-input ${validationErrors.phone ? 'has-error' : ''}`}
                      value={companySettings.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, ''); // Digits only
                        setCompanySettings({ ...companySettings, phone: val });
                      }}
                    />
                  </div>
                  {validationErrors.phone && <span className="field-error-text">{validationErrors.phone}</span>}
                </div>

                <div className="setting-group">
                  <label>Email Address</label>
                  <div className="input-with-icon-settings">
                    <Mail size={18} className="field-icon-settings" />
                    <input
                      type="email"
                      placeholder="yourname@gmail.com"
                      className={`settings-input ${validationErrors.email ? 'has-error' : ''}`}
                      value={companySettings.email}
                      onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value.toLowerCase() })}
                    />
                  </div>
                  {validationErrors.email && <span className="field-error-text">{validationErrors.email}</span>}
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSavingCompany}
                  style={{ marginTop: '12px' }}
                >
                  <Save size={18} />
                  {isSavingCompany ? 'Updating...' : 'Save Company Details'}
                </button>
              </form>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Settings;
