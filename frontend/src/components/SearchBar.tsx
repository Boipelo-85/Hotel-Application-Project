import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${weekday},${day}`;
}

function formatDateRange(checkIn: string, checkOut: string): string {
  return `${formatDate(checkIn)} - ${formatDate(checkOut)}`;
}

interface SearchBarProps {
  initialDestination?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialRooms?: string;
  initialAdults?: string;
  initialChildren?: string;
  onSearch?: (destination: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  initialDestination = '',
  initialCheckIn,
  initialCheckOut,
  initialRooms = '1',
  initialAdults = '1',
  initialChildren = '0',
  onSearch,
}) => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState(initialDestination);
  const [checkIn, setCheckIn] = useState<Date | null>(initialCheckIn ? parseLocalDate(initialCheckIn) : null);
  const [checkOut, setCheckOut] = useState<Date | null>(initialCheckOut ? parseLocalDate(initialCheckOut) : null);
  const [rooms, setRooms] = useState(initialRooms);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [isOccupancyDropdownOpen, setIsOccupancyDropdownOpen] = useState(false);
  const [travelingWithPets, setTravelingWithPets] = useState(false);

  useEffect(() => {
    setDestination(initialDestination);
    setCheckIn(initialCheckIn ? parseLocalDate(initialCheckIn) : null);
    setCheckOut(initialCheckOut ? parseLocalDate(initialCheckOut) : null);
    setRooms(initialRooms);
    setAdults(initialAdults);
    setChildren(initialChildren);
  }, [initialDestination, initialCheckIn, initialCheckOut, initialRooms, initialAdults, initialChildren]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!destination.trim()) {
      alert('Destination is required');
      return;
    }
    if (!checkIn) {
      alert('Check-in date is required');
      return;
    }
    if (!checkOut) {
      alert('Check-out date is required');
      return;
    }
    if (checkOut <= checkIn) {
      alert('Check-out date must be after check-in date');
      return;
    }

    if (onSearch) {
      onSearch(destination.trim());
    }

    const guestCount = String(Number(adults) + Number(children));
    const params = new URLSearchParams({
      destination: destination.trim(),
      checkIn: checkIn ? formatDateInput(checkIn) : '',
      checkOut: checkOut ? formatDateInput(checkOut) : '',
      rooms,
      adults,
      children,
      guests: guestCount,
    });
    navigate(`/hotels?${params.toString()}`);
  };

  return (
    <form className='serach_part search-bar' onSubmit={handleSubmit}>
       <div style={{border:'1px solid #c7c5c5', borderRadius:'10px', padding:'6px', flex: 1, height: '75px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
          <label style={{fontFamily:"'Courier New', Courier, monospace",fontWeight:'bold', display:'block', marginBottom:'0.25rem'}}>Destination</label>
          <input
            type="text"
            className='input_destin'
            value={destination}
            onChange={(event) => setDestination(event.target.value)}

            style={{width:'100%', border:'1px solid #dad9d9', outline:'none', fontSize:'1.5rem',borderRadius:'8px',height:'2.3rem'}}
          />
      </div>

      <div style={{border:'1px solid #c7c5c5', borderRadius:'10px', padding:'6px', flex: 1, height: '75px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
         <label style={{fontFamily:"'Courier New', Courier, monospace",fontWeight:'bold', display:'block', marginBottom:'0.25rem'}}>Select dates</label>
         <div style={{display:'flex', gap:'0.5rem', alignItems:'center',border:'1px solid #d6d6d6',borderRadius:'8px'}}>
            <div style={{flex: 1, position: 'relative'}}>
               <DatePicker
                 selected={checkIn}
                 onChange={(date: Date | null) => setCheckIn(date)}
                 minDate={new Date()}
                 dateFormat="EEE,dd"
                 placeholderText="Check-in date"
                 customInput={
                   <div style={{fontSize: '0.9rem', color: checkIn ? '#000' : '#999', cursor: 'pointer', padding: '8px 0'}}>
                     {checkIn ? formatDate(formatDateInput(checkIn)) : 'Check-in date'}
                   </div>
                 }
                 popperPlacement="bottom-start"
               />
            </div>
            <span>-</span>
            <div style={{flex: 1, position: 'relative'}}>
               <DatePicker
                 selected={checkOut}
                 onChange={(date: Date | null) => setCheckOut(date)}
                 minDate={checkIn || new Date()}
                 dateFormat="EEE,dd"
                 placeholderText="Check-out date"
                 customInput={
                   <div style={{fontSize: '0.9rem', color: checkOut ? '#000' : '#999', cursor: 'pointer', padding: '8px 0'}}>
                     {checkOut ? formatDate(formatDateInput(checkOut)) : 'Check-out date'}
                   </div>
                 }
                 popperPlacement="bottom-start"
               />
            </div>
         </div>
      </div>
      <div style={{position:'relative', border:'1px solid #c7c5c5', borderRadius:'10px', padding:'6px', flex: 1, height: '75px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
              <label style={{fontFamily:"'Courier New', Courier, monospace",fontWeight:'bold', display:'block', marginBottom:'0.25rem'}}>Select occupancy</label>
              <div
                className='occupancy_display'
                onClick={() => setIsOccupancyDropdownOpen(!isOccupancyDropdownOpen)}
                style={{cursor:'pointer', padding:'0.5rem', border:'1px solid #e5e7eb', borderRadius:'8px', display:'flex', alignItems:'center', gap:'0.5rem'}}
              >
                  <span>{adults} adult{Number(adults) > 1 ? 's' : ''} • {children} child{Number(children) !== 1 ? 'ren' : ''} • {rooms} room{Number(rooms) > 1 ? 's' : ''}</span>
              </div>
              {isOccupancyDropdownOpen && (
                <div className='occupancy_dropdown' style={{position:'absolute', top:'100%', left:0, right:0, backgroundColor:'white', border:'1px solid #e5e7eb', borderRadius:'12px', padding:'1rem', boxShadow:'0 4px 12px rgba(0,0,0,0.15)', zIndex:1000, marginTop:'0.5rem'}}>
                  <div style={{marginBottom:'1rem'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
                      <span style={{fontWeight:'bold'}}>Adults</span>
                      <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                        <button 
                          type='button'
                          onClick={() => setAdults(String(Math.max(1, Number(adults) - 1)))}
                          style={{width:'32px', height:'32px', borderRadius:'50%', border:'1px solid #e5e7eb', backgroundColor:'white', cursor:'pointer', fontSize:'1.2rem'}}
                        >-</button>
                        <span style={{minWidth:'20px', textAlign:'center'}}>{adults}</span>
                        <button 
                          type='button'
                          onClick={() => setAdults(String(Math.min(10, Number(adults) + 1)))}
                          style={{width:'32px', height:'32px', borderRadius:'50%', border:'1px solid #e5e7eb', backgroundColor:'white', cursor:'pointer', fontSize:'1.2rem'}}
                        >+</button>
                      </div>
                    </div>
                    <span style={{fontSize:'0.75rem', color:'#6b7280'}}>Ages 13 or above</span>
                  </div>
                  
                  <div style={{marginBottom:'1rem'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
                      <span style={{fontWeight:'bold'}}>Children</span>
                      <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                        <button 
                          type='button'
                          onClick={() => setChildren(String(Math.max(0, Number(children) - 1)))}
                          style={{width:'32px', height:'32px', borderRadius:'50%', border:'1px solid #e5e7eb', backgroundColor:'white', cursor:'pointer', fontSize:'1.2rem'}}
                        >-</button>
                        <span style={{minWidth:'20px', textAlign:'center'}}>{children}</span>
                        <button 
                          type='button'
                          onClick={() => setChildren(String(Math.min(10, Number(children) + 1)))}
                          style={{width:'32px', height:'32px', borderRadius:'50%', border:'1px solid #e5e7eb', backgroundColor:'white', cursor:'pointer', fontSize:'1.2rem'}}
                        >+</button>
                      </div>
                    </div>
                    <span style={{fontSize:'0.75rem', color:'#6b7280'}}>Ages 0-12</span>
                  </div>
                  
                  <div style={{marginBottom:'1rem'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
                      <span style={{fontWeight:'bold'}}>Rooms</span>
                      <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                        <button 
                          type='button'
                          onClick={() => setRooms(String(Math.max(1, Number(rooms) - 1)))}
                          style={{width:'32px', height:'32px', borderRadius:'50%', border:'1px solid #e5e7eb', backgroundColor:'white', cursor:'pointer', fontSize:'1.2rem'}}
                        >-</button>
                        <span style={{minWidth:'20px', textAlign:'center'}}>{rooms}</span>
                        <button 
                          type='button'
                          onClick={() => setRooms(String(Math.min(10, Number(rooms) + 1)))}
                          style={{width:'32px', height:'32px', borderRadius:'50%', border:'1px solid #e5e7eb', backgroundColor:'white', cursor:'pointer', fontSize:'1.2rem'}}
                        >+</button>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1rem', paddingTop:'0.5rem', borderTop:'1px solid #e5e7eb'}}>
                    <input 
                      type='checkbox'
                      id='pets'
                      checked={travelingWithPets}
                      onChange={(e) => setTravelingWithPets(e.target.checked)}
                      style={{width:'18px', height:'18px', cursor:'pointer'}}
                    />
                    <label htmlFor='pets' style={{cursor:'pointer', fontSize:'0.875rem'}}>Traveling with pets?</label>
                  </div>
                  
                  <button 
                    type='button'
                    onClick={() => setIsOccupancyDropdownOpen(false)}
                    style={{width:'100%', padding:'0.75rem', backgroundColor:'#3b82f6', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'600'}}
                  >
                    Done
                  </button>
                </div>
              )}
      </div>

      <button
        type="submit"
        className="search-bar__button"
      >
        Search
      </button>
    </form>
  );
};

export default SearchBar;
