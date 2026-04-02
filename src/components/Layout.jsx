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
    <SearchContext.Provider value={{ setPageTitle }}>
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
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        />

        {isMobile && isMobileSidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="main-wrapper">
          <header className="dashboard-header dashboard-header-aligned">
            <div className="header-left header-left-aligned">
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
              {pageTitle.main && (
                <div className="page-title-display">
                  <h1 className="title-text-main">{pageTitle.main}</h1>
                  {pageTitle.sub && <p className="page-subtitle subtitle-text-main">{pageTitle.sub}</p>}
                </div>
              )}
            </div>

            <div className="header-actions">
              <div className="status-badge header-badge">
                <span className="dot dot-live"></span>
                Live
              </div>
              <LiveClock />
              <div className="user-profile-summary">
                <div className="user-info">
                  <span className="username">{user?.username}</span>
                  <span className="role">{user?.role}</span>
                </div>
                <button className="logout-btn header-logout-btn" onClick={logout} title="Logout">
                  <LogOut size={18} />
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
