
import React from 'react'
import { Link } from 'react-router-dom'

export const Footer = () => {
  return (
    <div>
        <footer className='footer'>
      
        <div className="footer-section">
          <div className="footer-section-item">
            <h3>Grand-Rest Hotel</h3>
            <p>
                 Your home away from home. Experience luxury and comfort at our branches worldwide.
            </p>
          </div> 
          <div className="footer-section-item">
            <h3>Quick Links</h3>
            <ul className="links">
              <li><Link to="/" className="link_1">Home</Link></li>
              <li><Link to="/hotels" className="link_1">Rooms</Link></li>
              <li><Link to="/bookings" className="link_1">My Bookings</Link></li>
              <li><Link to="/profile" className="link_1">Profile</Link></li>
            </ul>
          </div>
          <div className="footer-section-item">
            <h3>Contact Us</h3>
            <ul className="ContactUs_section">
              <li>Email: info@grandresthotel.com</li>
              <li>Phone: +1 (555) 123-4567</li>
              <li>Address: 123 Hotel Street, City, Country</li>
            </ul>
          </div>
        </div>
        <div className="copyRight">
          <p>&copy; {new Date().getFullYear()} Grand-Rest hotel. All rights reserved.</p>
        </div>
    
        </footer>
    </div>
  )
}
