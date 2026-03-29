import React from 'react';
import { 
  Users, 
  Package, 
  FileText, 
  Receipt,
  ChevronLeft, 
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobile, isMobileSidebarOpen }) => {
  const { role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const adminMenu = [
    { icon: <Users size={22} />, label: 'Customer', path: '/' },
    { icon: <Package size={22} />, label: 'Product', path: '/products' },
    { icon: <FileText size={22} />, label: 'Quotation', path: '/quotations' },
    { icon: <Receipt size={22} />, label: 'Invoice', path: '/invoices' },
  ];

  const userMenu = [
    { icon: <LayoutDashboard size={22} />, label: 'Dashboard', path: '/' },
  ];

  const menuItems = role === 'admin' ? adminMenu : userMenu;

  const mobileStateClass = isMobile
    ? isMobileSidebarOpen
      ? 'sidebar-mobile-open'
      : 'sidebar-mobile-hidden'
    : '';

  return (
    <aside className={`sidebar-nav ${isCollapsed ? 'sidebar-collapsed' : ''} ${mobileStateClass}`}>
      <div className="sidebar-brand">
        {!isCollapsed && <span className="brand-text">SSV Food Tech</span>}
        <button 
          className="sidebar-toggle" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="nav-menu">
        {menuItems.map((item, index) => (
          <Link 
            key={index} 
            to={item.path} 
            className={`nav-link ${location.pathname === item.path ? 'nav-active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="nav-label">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="nav-link settings">
          <span className="nav-icon"><Settings size={22} /></span>
          {!isCollapsed && <span className="nav-label">Settings</span>}
        </div>
        <button className="nav-link logout-nav" onClick={logout}>
          <span className="nav-icon"><LogOut size={22} /></span>
          {!isCollapsed && <span className="nav-label">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
