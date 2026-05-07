import React from 'react';
import { render } from 'react-dom';
import BigCalendar from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

moment.locale('en-GB');
BigCalendar.momentLocalizer(moment);


export default function Example(props) {
  const { holidays } = props;
  const today = new Date()
  return (
    <div className="dashboard-calender">
    <BigCalendar
      events={holidays}
      // step={60}
      view='month'
      views={['month']}
      min={new Date(today.getFullYear(), today.getMonth(), 1)} // 8.00 AM
      max={new Date(today.getFullYear(), today.getMonth()+1, 1)} // Max will be 6.00 PM!
      date={new Date(today.getFullYear(), today.getMonth(), 1)}
      popup={true}
    />
  </div>
  );
}