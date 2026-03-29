import React, { useState, createContext, useContext } from 'react';
import Sidebar from './Sidebar';
import LiveClock from './LiveClock';
import { Search, Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const SearchContext = createContext();
export const useSearch = () => useContext(SearchContext);

const Layout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageTitle, setPageTitle] = useState({ main: '', sub: '' });
  const { user, logout } = useAuth();

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery, setPageTitle }}>
      <div className={`layout-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          setIsCollapsed={setIsSidebarCollapsed} 
        />
        
        <main className="main-wrapper">
          <header className="dashboard-header">
            <div className="header-title-section">
              {pageTitle.main && (
                <div className="page-title-display">
                  <h1>{pageTitle.main}</h1>
                  <p className="subtitle">{pageTitle.sub}</p>
                </div>
              )}
            </div>

            <div className="header-actions">
              <LiveClock />
              <div className="status-badge">
                <span className="dot"></span>
                Cloud Sync Active
              </div>
              <div className="user-profile-summary">
                <div className="user-info">
                  <span className="username">{user?.username}</span>
                  <span className="role">{user?.role}</span>
                </div>
                <button className="logout-btn" onClick={logout} title="Logout">
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </header>

          <div className="page-content-scroll">
            {children}
          </div>
        </main>
      </div>
    </SearchContext.Provider>
  );
};

export default Layout;
