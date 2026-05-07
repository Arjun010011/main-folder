import React from 'react';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';
import ColumnBasicCharts from 'Components/ColumnBasicChart';
import BasicAreaChart from 'Components/BasicAreaChart';
import PieChart from 'Components/PieChart';
import HolidayDayPicker from './Components/HolidayPicker'
import './styles.scss';
import { getRequest } from 'Includes/api/apicall';
import { isUserHasPermission } from 'Includes/functions';

import { GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions'

import { withRouter } from 'react-router-dom';
class Dashboard extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dashBoardData: null,
      selectedDays: []
    }
  }
  
  componentDidMount() {
    this.getDashBoardData();
  }

  getDashBoardData = () => {
    const url = GET_URL.dashboard.api;
    getRequest(url, {}, this.props).then(response => {
      if (response && response.status === 200) {
        let dashBoardData = response.data;
        if (typeof (dashBoardData) === 'object' && Object.keys(dashBoardData).length > 0) {
          dashBoardData.holidays.forEach((data) => {
            data.title = data.reason
            data.allDay = false;
            data.start = new Date(data.from_date); // 10.00 AM
            data.end = new Date(data.to_date); // 2.00 PM 
          })
          this.setState({
            dashBoardData
          });
        }
      }
    })
  }
  render() {
    const { dashBoardData, selectedDays } = this.state;
    return (
      <Box className='paper-background'>
        <div className='text-align-end dashboard-year'>{dashBoardData?.standards_chart_data?.academic_year}</div>
        <Box className='dash-card-div  flex-justify-space-around md-down-flex-column' >
          <div class="custom_card custom_card_small custom_card_dark custom_card_dark--magenta">
            <div class="media">
              <img src="https://media.pixeltuner.de/wp-content/uploads/2018/06/london-3078109_640.jpg" alt="" width="640" height="426" />
            </div>
            <div class="primary-title">
              <div class="primary-text">Students</div>
              {dashBoardData && <div class="secondary-text">{dashBoardData.students}</div>}
            </div>
            {isUserHasPermission('general_student_list', 'view') && <div class="view-details-div border-top">
              <div class="action-buttons">
                <div className="view-card-details" onClick={() => { this.props.history.push(Actions.general_student_list.view.url) }}>Click Here</div>
              </div>
            </div>}
          </div>

          <div class="custom_card custom_card_small custom_card_dark custom_card_dark--magenta">
            <div class="media">
              <img src="https://media.pixeltuner.de/wp-content/uploads/2018/06/london-3078109_640.jpg" alt="" width="740" height="426" />
            </div>
            <div class="primary-title">
              <div class="primary-text">Staff</div>
              {dashBoardData && <div class="secondary-text">{dashBoardData.staff_attendence.split("/")[1]}</div>}
            </div>
            {isUserHasPermission('staff_list', 'view') && <div class="view-details-div border-top">
              <div class="action-buttons">
                <div className="view-card-details" onClick={() => { this.props.history.push(Actions.staff_list.view.url) }}>Click Here</div>
              </div>
            </div>}
          </div>

          <div class="custom_card custom_card_small custom_card_dark custom_card_dark--magenta">
            <div class="media">
              <img src="https://media.pixeltuner.de/wp-content/uploads/2018/06/london-3078109_640.jpg" alt="" width="640" height="426" />
            </div>
            <div class="primary-title">
              <div class="primary-text">Standards</div>
              {dashBoardData && <div class="secondary-text">{dashBoardData.standards}</div>}
            </div>
            {isUserHasPermission('standard_strength', 'view') && <div class="view-details-div border-top">
              <div class="action-buttons">
                <div className="view-card-details" onClick={() => { this.props.history.push(Actions.standard_strength.view.url) }}>Click Here</div>
              </div>
            </div>} 
          </div>
        </Box>
        {dashBoardData && <Box my={4} className='flex-justify-space-around md-down-flex-column '>
          <Box className="chart-container"><ColumnBasicCharts staff_students_data={dashBoardData.staff_students_data} /></Box>
          <Box className="chart-container">
            <HolidayDayPicker
              holidays={dashBoardData.holidays}
              academic_year={dashBoardData.standards_chart_data.academic_year}
            />
          </Box>
        </Box>}
        {dashBoardData && <Box my={2} className='flex-justify-space-around md-down-flex-column '>
          <Box className="chart-container"> <BasicAreaChart basic_area_chart_data={dashBoardData.student_joining_variance} /> </Box>
          {/* <Box className="chart-container"> <PieChart standards_chart_data={dashBoardData.standards_chart_data}/> </Box> */}
        </Box>}
        {dashBoardData && <Box my={4} className='flex-justify-space-around md-down-flex-column '>
          <Box className="chart-container"><ColumnBasicCharts staff_students_data={dashBoardData.staff_students_data} /></Box>
          {/* <Box className="chart-container">
            <HolidayDayPicker
              holidays={dashBoardData.holidays}
              academic_year={dashBoardData.standards_chart_data.academic_year}
            />
          </Box> */}
        </Box>}
        {dashBoardData && <Box my={2} className='flex-justify-space-around md-down-flex-column '>
          <Box className="chart-container"> <BasicAreaChart basic_area_chart_data={dashBoardData.student_joining_variance} /> </Box>
          {/* <Box className="chart-container"> <PieChart standards_chart_data={dashBoardData.standards_chart_data}/> </Box> */}
        </Box>}
      </Box>
    );
  }
}
export default withRouter(Dashboard)