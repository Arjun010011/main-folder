import React, { Component } from 'react';
import { Box } from '@material-ui/core';
import BigCalendar from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';


moment.locale('en-GB');
BigCalendar.momentLocalizer(moment);

export default class CalenderView extends Component {
    render() {
        const { eventList } = this.props
        return (
            <div>
                <Box style={{ height: '500px' }}>
                    <BigCalendar
                        startAccessor="start"
                        endAccessor="end"
                        dayLayoutAlgorithm={'overlap'}
                        events={eventList}
                        step={60}
                        popup={true}
                        // views={allViews}
                        views={['month', 'agenda']}
                        defaultDate={new Date()}
                        // minDate={moment().toDate()}
                        minDate={new Date(2022, 8, 0, 7, 0, 0)}
                        maxDate={new Date(2022, 9, 0, 19, 0, 0)}
                    />
                </Box>
            </div>
        )
    }
}


