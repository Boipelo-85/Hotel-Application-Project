import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const footerStyle: React.CSSProperties = {
    backgroundColor: '#1f2937',
    color: '#ffffff',
    padding: '2rem 0',
    marginTop: 'auto',
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, 1fr)',
    gap: '2rem',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '1rem',
  };

  const textStyle: React.CSSProperties = {
    color: '#9ca3af',
  };

  const linkStyle: React.CSSProperties = {
    color: '#9ca3af',
    textDecoration: 'none',
    transition: 'color 0.2s',
  };

  const listStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  };

  const listItemStyle: React.CSSProperties = {
    marginBottom: '0.5rem',
  };

  const dividerStyle: React.CSSProperties = {
    borderTop: '1px solid #374151',
    marginTop: '2rem',
    paddingTop: '2rem',
    textAlign: 'center',
    color: '#9ca3af',
  };

  return (
    <footer style={footerStyle}>
      <div style={containerStyle}>
        <div style={gridStyle}>
          <div>
            <h3 style={headingStyle}>Hotel Brand</h3>
            <p style={textStyle}>
              One hotel, many branches. Find a stay that fits your destination and travel dates.
            </p>
          </div>
          <div>
            <h3 style={headingStyle}>Explore</h3>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <Link to="/" style={linkStyle}>Home</Link>
              </li>
              <li style={listItemStyle}>
                <Link to="/hotels" style={linkStyle}>Find a branch</Link>
              </li>
              <li style={listItemStyle}>
                <Link to="/bookings" style={linkStyle}>My bookings</Link>
              </li>
              <li style={listItemStyle}>
                <Link to="/profile" style={linkStyle}>My profile</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 style={headingStyle}>Need help?</h3>
            <p style={textStyle}>
              Contact details are listed on each branch's details page.
            </p>
          </div>
        </div>
        <div style={dividerStyle}>
          <p>&copy; {new Date().getFullYear()} Hotel Brand. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
