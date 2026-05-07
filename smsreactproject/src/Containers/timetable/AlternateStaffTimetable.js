import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { Link } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import Snackbar from '@material-ui/core/Snackbar';
import _ from 'lodash';
import loadingBar from 'images/loading.gif';
import {
    Paper, Box, CircularProgress, Grid, Button, Icon, Switch, Tooltip, Table, TableCell, TableContainer, TableHead,
    TableBody, TableRow
} from '@material-ui/core';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, Alert, getUrlParam } from 'Includes/functions';
import { GET_URL } from 'Includes/urls';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages'
import messages from './messages';
import SectionAltTeacher from './components/SectionAltTeacher';
import StaffAltTeacher from './components/StaffAltTeacher';
import './styles.scss';

class StaffRequestChangeCreate extends Component {

    constructor(props) {
        super(props)

        this.state = {
            loading: true,
            assigned_classes: [],
            timing_map: {},
            day_timing_map: {},
            is_staff_view: false,
            selected_date: '',
            errors: {},
            selectedStandard: '',
            selectedSection: '',
            period_wise: { columns: [], data: {}, new_data: [] },
            day_list: []
        }
        this.dateRange = React.createRef();
    }

    componentDidMount = () => {
        if (this.props.location.pathname === Actions.alternate_staff_timetable.create.url) {
            let { selectedYear, yearName, fromDate, toDate, selectedTimeTableRange, TimeTableRangeName } = getUrlParam();
            if (selectedYear && yearName && fromDate && toDate && selectedTimeTableRange && TimeTableRangeName) {
                this.setState({
                    year: selectedYear,
                    year_name: yearName,
                    fromDate,
                    toDate,
                    selectedTimeTableRange,
                    TimeTableRangeName,
                })
                this.getWorkingDays()
            }
            else {
                this.props.history.push(Actions.alternate_staff_timetable.view.url);
            }
        }
    }

    getWorkingDays = () => {
        const url = GET_URL.days.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.map((data, index) => {
                    if (!data.is_student_working_day) {
                        response.data.data.splice(index, 1)
                    }
                })
                this.setState({
                    day_list: response.data.data,
                    loading: false
                })
            }
        })
    }


    onChangeHandleView = (value) => {
        this.setState({
            is_staff_view: value
        })
    }

    handleViewButton = () => {
        const { selectedTimeTableRange } = this.state;
        let currentSelectedList = {
            selectedTimeTableRange: selectedTimeTableRange,
        }
        let searchParam = "?" + new URLSearchParams(currentSelectedList).toString()
        this.props.history.push({
            pathname: Actions.alternate_staff_timetable.view.url,
            search: searchParam,
        });
    }

    render() {
        const { loading, TimeTableRangeName, is_staff_view, openSnackbar, alertData, year_name, day_list } = this.state;
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={6} xs={12} className='header-align'>
                            <Box className='heading'>
                                <FormattedMessage {...messages.staffRequestChange} />
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {isUserHasPermission('alternate_staff_timetable', 'view') && <Button
                                    variant="contained"
                                    onClick={this.handleViewButton}
                                    className='editbutton-view'
                                ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.alternate_staff_timetable.view.label}</Button>}
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container>
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                                <Box className="year-std-box mr-40">
                                    <Box display='flex' className='align-items-center margin-top-5'>
                                        <Box className="exam-mark-heading-box"> Academic Year</Box>
                                        <Box className=" exam-mark-add-heading-bg">{year_name}</Box>
                                    </Box>
                                    <Box display='flex' className='align-items-center margin-top-5'>
                                        <Box className="exam-mark-heading-box"> TimeTable Range Name</Box>
                                        <Box className=" exam-mark-add-heading-bg">{TimeTableRangeName}</Box>
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12} >
                            <Box className='staff-request-toggle-outer-div header-align m-t-20px '>
                                <Button className={is_staff_view === false ? 'list-selected-toggle text-capitalize' : 'grid-selected-toggle text-capitalize'}
                                    onClick={(e) => this.onChangeHandleView(false)}
                                    disabled={is_staff_view === false}>
                                    <Box className={is_staff_view === false ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>Section TimeTable</Box>
                                </Button>
                                <Button className={is_staff_view === true ? 'list-selected-toggle text-capitalize' : 'grid-selected-toggle text-capitalize'}
                                    onClick={(e) => this.onChangeHandleView(true)}
                                    disabled={is_staff_view === true}>
                                    <Box className={is_staff_view === true ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>Staff TimeTable</Box>
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Paper className='paper-plain-background'>
                        <Box className={is_staff_view ? 'display-none' : ''}>
                            <SectionAltTeacher
                                day_list={day_list}
                            />
                        </Box>
                        <Box className={is_staff_view ? '' : 'display-none'}>
                            <StaffAltTeacher
                                day_list={day_list}
                            />
                        </Box>
                    </Paper>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackbar} autoHideDuration={2000} onClose={(e) => this.handleCloseSnackBar(e)}>
                        <Alert onClose={(e) => this.handleCloseSnackBar(e)} severity='error'>
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Paper >
            )
        }
    }
}


export default withRouter(StaffRequestChangeCreate)
