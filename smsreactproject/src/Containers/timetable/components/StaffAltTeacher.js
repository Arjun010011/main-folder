import React, { Component } from 'react'
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import _ from 'lodash';
import { withRouter } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import Swal from 'sweetalert2'
import {
    Box, Grid, Table, TableCell, TableContainer, TableHead, TableBody, TableRow, Tooltip, CircularProgress
} from '@material-ui/core';
import CheckBoxOutlinedIcon from '@material-ui/icons/CheckBoxOutlined';
import CheckBoxOutlineBlankOutlinedIcon from '@material-ui/icons/CheckBoxOutlineBlankOutlined';

import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import InfoIcon from '@material-ui/icons/Info';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { Actions } from 'Constants/permissions';
import { getUrlParam, timeFormat, Alert, dateFormat, validateDate, getFullName } from 'Includes/functions';
import { GET_URL, DEL_URL } from 'Includes/urls';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages';
import AssignAltStaff from './../components/AssignAltStaff';
import messages from '../messages';
import './../styles.scss';


class StaffAltTeacher extends Component {

    constructor(props) {
        super(props)

        this.state = {
            timing_map: {},
            day_timing_map: {},
            selected_date: '',
            errors: {},
            selectedStaff: '',
            staffList: [],
            loadingDetails: true,
            selected_day: ''
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
                }, () => {
                    this.getStaffList();
                })
            }
            else {
                this.props.history.push(Actions.alternate_staff_timetable.view.url);
            }
        }
    }

    getStaffList = () => {
        const url = GET_URL.getstafffullname.api
        const params = { is_active: true, teaching_staff: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staffList: response.data.data,
                    loading: false
                })
            }
        })
    }

    getStaffTimeTable = () => {
        let { selectedTimeTableRange, selectedStaff, selected_date, selected_day } = this.state;
        let validate_date = this.onBlurValidation()
        if (!validate_date)
            return
        const url = GET_URL.timetablestaffassigned.api
        const params = {
            date_range: selectedTimeTableRange, staff: selectedStaff.id,
            alternate_teacher_fordate: dateFormat(selected_date, 'YYYY-MM-DD')
        }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let timing_map = {}
                let day_timing_map = {}
                selected_day = dateFormat(selected_date, 'dddd')
                response.data.data.staffData.map((staff) => {
                    staff.day_list.map((day) => {
                        if (selected_day.includes(day.day_name)) {
                            timing_map[`${day.period_start_time}-${day.period_end_time}`] = day
                            day_timing_map[`${day.period_start_time}-${day.period_end_time}-${day.day}`] = day
                        }
                    })
                })
                timing_map = Object.entries(timing_map).sort().reduce((o, [k, v]) => (o[k] = v, o), {})
                this.setState({
                    staffTimeTable: response.data.data,
                    timing_map,
                    day_timing_map,
                    loadingDetails: false,
                    selectedId: ''
                })
            }
        })
    }

    onBlurValidation = () => {
        const { selected_date, selectedStaff, fromDate, toDate, errors } = this.state;
        let { selected_day } = this.state;
        let return_value = true
        let error = validateDate(selected_date, fromDate, toDate)
        if (selectedStaff === '') {
            errors['selectedStaff'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
            return_value = false
        }
        if (selected_date === '') {
            errors['selected_date'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
            return_value = false
        }
        else if (selected_date !== '') {
            if (error !== '') {
                errors['selected_date'] = error
                return_value = false
            }
            else {
                selected_day = dateFormat(selected_date, 'dddd')
            }
            this.setState({
                errors,
                selected_day,
                selected_date,
            })
        }
        return return_value
    }

    handleDropDownWithSearchChange = (e, newValue) => {
        let { errors } = this.state;
        delete errors['selectedStaff']
        this.setState({
            selectedStaff: newValue,
            errors,
            loadingDetails: true
        }, () => {
            if (newValue) {
                this.getStaffTimeTable()
            }
        })
    }

    onChangeCheckBox = (id) => {
        const { selectedId } = this.state;
        this.setState({
            selectedId: selectedId === id ? '' : id
        })
    }
    validateCheckBox = () => {
        const { selectedId, selected_date, selectedStaff, errors } = this.state;
        let returnValue = true;
        if (!selected_date || !selectedStaff) {
            returnValue = false
            if (!selected_date) {
                errors['selected_date'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            if (!selectedStaff) {
                errors['selectedStaff'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            this.setState({
                errors
            })
        }
        else if (!selectedId) {
            returnValue = false
            this.setState({
                openSnackbar: true,
                alertData: 'Select period to assign alternate staff'
            })
        }
        return returnValue
    }

    handleCloseSnackBar = () => {
        this.setState({
            openSnackbar: false,
            alertData: ''
        })
    }



    onChangeDate = (e) => {
        let { errors, selectedStaff } = this.state;
        delete errors['selected_date']
        this.setState({
            selected_date: e,
            errors,
        }, () => {
            if (selectedStaff) {
                this.getStaffTimeTable()
            }
        })
    }


    getAlternativeFormat = (day_timing_map, timing_map, timing, weekDay, selectedId, selectedError) => {
        const staff_key = day_timing_map[`${timing_map[timing]['period_start_time']}-${timing_map[timing]['period_end_time']}-${weekDay.id}`]
        return (
            <TableCell className={staff_key['id'] === selectedId ? 'selected-time-period create-time-table-cell-heading' : 'create-time-table-cell-heading'}
                onClick={staff_key.assigned_data ? "" : () => this.onChangeCheckBox(staff_key['id'])}
            >
                <Box style={{ height: 'inherit' }} className={''}>
                    <Box className={'create-time-table-time-check'}>
                        <Box className='staff-request-change-timing-box'>
                            {`${timeFormat(staff_key['period_start_time'], 'hh:mm:ss', 'hh:mm A')} - ${timeFormat(staff_key['period_end_time'], 'hh:mm:ss', 'hh:mm A')}`}
                        </Box>
                        <Box>
                            {selectedError &&
                                <InfoIcon className='time-table-info' />
                            }
                        </Box>
                        <Box>
                            {staff_key.assigned_data ?
                                <Tooltip title={'Remove Alternate Staff'}
                                    enterDelay={400} classes={{ tooltip: 'tooltip-show-data' }}
                                    enterNextDelay={400} placement='top-start'>
                                    <HighlightOffIcon className='time-table-info-icon cross-btn-nominee'
                                        onClick={() => this.handleDeleteAltStaff(staff_key.assigned_data.id)}
                                    />
                                </Tooltip>
                                :
                                <>
                                    {(staff_key['id'] !== selectedId) ?
                                        <CheckBoxOutlineBlankOutlinedIcon className='timetable-checkbox-style' />
                                        :
                                        <CheckBoxOutlinedIcon className='timetable-checkbox-style' />
                                    }
                                </>
                            }
                        </Box>
                    </Box>
                    <Box className='create-time-table-subject-label'>
                        {`${staff_key['subject_name']} - ${staff_key['standard_name']} (${staff_key['section_name']})`}
                    </Box>
                    <Box display='flex'>
                        <Box>
                            <Box className='create-time-table-staff-label alt-teacher-label'>
                                {staff_key['assigned_data'] && getFullName(staff_key['assigned_data']['staff__first_name'], staff_key['assigned_data']['staff__middle_name'], staff_key['assigned_data']['staff__last_name'])}
                            </Box>
                        </Box>
                        <Box>
                            {staff_key['assigned_data'] &&
                                <Tooltip title={this.showData(staff_key['assigned_data'])}
                                    enterDelay={400} classes={{ tooltip: 'tooltip-show-data' }}
                                    enterNextDelay={400} placement='top-start'>
                                    <InfoIcon className='time-table-info' />
                                </Tooltip>
                            }
                        </Box>
                    </Box>
                </Box>
            </TableCell>
        )
    }

    showData = (data) => {
        return (
            <>
                <Box>
                    {`Alt Staff - ${getFullName(data.staff__first_name, data.staff__middle_name, data.staff__last_name)} - (${data.subject_name})`}
                </Box>
            </>
        )
    }

    handleDeleteAltStaff = (id) => {
        const url = DEL_URL.timetablerequestchange.api + id + '/';
        deleteRequest(url, {}, {}).then(response => {
            if (response && response.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
                this.getStaffTimeTable();
            }
        })
    }

    render() {
        const { selected_date, errors, fromDate, toDate, timing_map, selectedId, selectedError, openSnackbar, alertData,
            staffList, day_timing_map, selectedStaff, loadingDetails, year, selected_day } = this.state;
        const { day_list } = this.props;
        return (<>
            <Grid container spacing={2} className='p-t-20px p-b-20px'>
                <Grid item md={3} xs={12}>
                    <DropDownWithSearch
                        id="combo-box-demo"
                        options={staffList}
                        value={selectedStaff}
                        onChange={(e, newValue) => this.handleDropDownWithSearchChange(e, newValue)}
                        optionValue='full_name'
                        name='staff'
                        label={<FormattedMessage {...commonMessages.staffName} />}
                        className='w-100'
                        helperText={errors['selectedStaff'] && errors['selectedStaff']}
                        error={errors['selectedStaff']}
                    />
                </Grid>
                <Grid item md={3} xs={12}>
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                        <KeyboardDatePicker
                            autoOk
                            variant='inline'
                            inputVariant='outlined'
                            label={'Date'}
                            required={true}
                            fullWidth
                            name='selected_date'
                            minDate={fromDate}
                            maxDate={toDate}
                            format='dd-MM-yyyy'
                            value={selected_date}
                            onChange={(e) => this.onChangeDate(e)}
                            onBlur={(e) => this.getStaffTimeTable()}
                            KeyboardButtonProps={{
                                'aria-label': 'change date',
                            }}
                            InputLabelProps={{ shrink: selected_date ? true : false }}
                            helperText={(!errors.selected_date) ? 'Format DD-MM-YYYY' : errors.selected_date}
                            error={errors.selected_date && (errors.selected_date ? true : false)}
                        />
                    </MuiPickersUtilsProvider>
                </Grid>
                <Grid item md={3} xs={12}>
                    <AssignAltStaff
                        validateCheckBox={this.validateCheckBox}
                        year={year}
                        selectedId={selectedId}
                        selected_date={selected_date}
                        getRequest={this.getStaffTimeTable}
                    />
                </Grid>
            </Grid>
            {selectedStaff && loadingDetails && selected_date &&
                <Box className='text-center'>
                    <CircularProgress className='text-center' />
                </Box>
            }
            {selectedStaff && !loadingDetails && selected_date &&
                <TableContainer className=' header-align p-t-20px p-b-20px'>
                    <Table size='small' aria-label='simple table' className='w-auto'>
                        <TableHead>
                            <TableRow>
                                <TableCell className='add-period-time-table-side-heading'>
                                    Period Name
                                </TableCell>
                                {day_list.map((data) => {
                                    return (
                                        <>
                                            {data.is_student_working_day && selected_day.includes(data.name) &&
                                                <TableCell className='add-period-time-table-cell-heading'>
                                                    {data.name}
                                                </TableCell>
                                            }
                                        </>
                                    )
                                })}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.keys(timing_map).map((timing) => {
                                return <TableRow>
                                    <TableCell className={'add-period-time-table-side-heading'}>
                                        {timing_map[timing].period_start_time}
                                    </TableCell>
                                    {
                                        day_list.map((weekDay) => {
                                            return (<>
                                                {selected_day.includes(weekDay.name) &&
                                                    <>
                                                        {day_timing_map.hasOwnProperty(`${timing_map[timing]['period_start_time']}-${timing_map[timing]['period_end_time']}-${weekDay.id}`) ?
                                                            <Tooltip title={selectedError}
                                                                enterDelay={400}
                                                                enterNextDelay={400} placement='top-start'
                                                                classes={selectedError ? { tooltip: 'tooltip-show-data' } : { tooltip: 'bgcolor-transparent' }}>
                                                                {this.getAlternativeFormat(day_timing_map, timing_map, timing, weekDay, selectedId, selectedError)}
                                                            </Tooltip>
                                                            :
                                                            <TableCell className={'staff-view-time-table-cell'}>

                                                            </TableCell>
                                                        }
                                                    </>
                                                }
                                            </>
                                            )
                                        })
                                    }
                                </TableRow>
                            })
                            }
                            {!Object.keys(timing_map).length &&
                                <TableRow>
                                    <TableCell className={'add-period-time-table-side-heading'} colSpan={2}>
                                        No Time Table Assigned For Selected Day
                                    </TableCell>
                                </TableRow>
                            }
                        </TableBody>
                    </Table>
                </TableContainer>
            }
            <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackbar} autoHideDuration={2000} onClose={(e) => this.handleCloseSnackBar(e)}>
                <Alert onClose={(e) => this.handleCloseSnackBar(e)} severity='error'>
                    {alertData}
                </Alert>
            </Snackbar>
        </>
        )
    }
}

export default withRouter(StaffAltTeacher)
