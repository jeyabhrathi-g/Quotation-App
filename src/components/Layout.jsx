import React, { useState, useEffect, createContext, useContext } from 'react';
import Sidebar from './Sidebar';
import LiveClock from './LiveClock';
import { Search, Bell, Settings, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const SearchContext = createContext();
export const useSearch = () => useContext(SearchContext);

const Layout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageTitle, setPageTitle] = useState({ main: '', sub: '' });
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileSidebarOpen(false);
        setIsSidebarCollapsed(false);
      } else {
        setIsSidebarCollapsed(!isMobileSidebarOpen);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileSidebarOpen]);

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery, setPageTitle }}>
      <div className={`layout-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar
          isCollapsed={isMobile ? !isMobileSidebarOpen : isSidebarCollapsed}
          setIsCollapsed={(collapsed) => {
            if (isMobile) {
              setIsMobileSidebarOpen(!isMobileSidebarOpen);
              setIsSidebarCollapsed(!isMobileSidebarOpen);
            } else {
              setIsSidebarCollapsed(collapsed);
            }
          }}
          isMobile={isMobile}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />

        <main className="main-wrapper">
          <header className="dashboard-header">
            {isMobile && (
              <button
                className="mobile-menu-toggle"
                onClick={() => {
                  setIsMobileSidebarOpen(!isMobileSidebarOpen);
                  setIsSidebarCollapsed(isMobileSidebarOpen);
                }}
                aria-label="Toggle navigation"
              >
                {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
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
