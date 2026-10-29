
import React from 'react'

export const Footer = () => {
  return (
    <div>
        <footer className='footer'>
      
        <div className="footer-section">
          <div>
            <h3  style={{ color: '#fdfdfd', fontFamily: "'Courier New', Courier, monospace" }}>Grand-Rest Hotel</h3>
            <p   style={{ color: '#fdfdfd', fontFamily: "'Courier New', Courier, monospace" }}>
                 Your home away from home. Experience luxury and comfort at our branches worldwide.
            </p>
          </div> 
          <div>
            <h3  style={{ color: '#fdfdfd', fontFamily: "'Courier New', Courier, monospace" }}>Quick Links</h3>
            <ul className="links">
              <li><a href="/" className="link_1">Home</a></li>
              <li><a href="/rooms" className="link_1">Rooms</a></li>
              <li><a href="/bookings" className="link_1">My Bookings</a></li>
              <li><a href="/profile" className="link_1">Profile</a></li>
            </ul>
          </div>
          <div>
            <h3 style={{ color: '#fdfdfd', fontFamily: "'Courier New', Courier, monospace" }}> Contact Us </h3>
            <ul className="ContactUs_section">
              <li>Email: info@grandresthotel.com</li>
              <li>Phone: +1 (555) 123-4567</li>
              <li>Address: 123 Hotel Street, City, Country</li>
            </ul>
          </div>
        </div>
        <div className="copyRight">
          <p  style={{ color: '#fdfdfd', fontFamily: "'Courier New', Courier, monospace" }}>&copy; {new Date().getFullYear()} Grand-Rest hotel. All rights reserved.</p>
        </div>
    
        </footer>
    </div>
  )
}
