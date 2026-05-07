import React, { Component } from 'react'
import {
    Paper, FormHelperText, Box, CircularProgress, Grid, Button, ListItemText, withStyles, FormControl, InputLabel, MenuItem, Select
} from '@material-ui/core';
import Swal from 'sweetalert2'
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import InsertInvitationIcon from '@material-ui/icons/InsertInvitation';
import CancelIcon from '@material-ui/icons/Cancel';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import classNames from 'classnames'
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";

import { Link, withRouter } from 'react-router-dom';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { Actions } from 'Constants/permissions';
import { Dropdown } from 'Components/DropDown';
import { minDate, maxDate, options } from 'Constants';
import { dateFormat, validateDate } from 'Includes/functions';
import backGround from 'images/backgroundSchoolView.png'
import './styles.scss'

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const useStyles = {
    divStyle: {
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url(${backGround})`,
        backgroundSize: '105%',
        marginBottom: '40px',
        paddingBottom: '40px'

    },
    loading: {
        marginRight: 'auto',
        marginLeft: 'auto',
        marginTop: '35vh',
        width: '20vh'
    },
    submit: {
        height: '37px',
        marginTop: 'auto',
        marginBottom: '20px',
        marginRight: '20px',
        color: '#ffffff'
    },
};

class HrAssignShift extends Component {
    state = {
        yearList: [],
        loading: true,
        loadingStaff: false,
        year: '',
        fromDate: '',
        toDate: '',
        errors: {},
        shiftTypeList: [],
        selectedShift: '',
        openFromCalender: false,
        openToCalender: false,
        manageyear: { start_date: null, end_date: null },
        staffList: [],
        selectedToggle: 'custom',
        staffIndex: [],
        staffids: [],
        submitDisable: false,
        yearError: '',
        customDate: false,
        applyDisable: true,
        enableTitle: false,
        enableTable: false,
        blankPageMessage: 'Select Date Range',
        columns: [
            {
                name: "full_name",
                label: "Staff Name",
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "mobile_num",
                label: "Mobile Number",
                options: {
                    filter: true,
                    sort: true,
                }
            },
        ]
    }

    componentDidMount = async () => {
        this.getShiftDetails();
        this.setOptionsForTable();
    }

    getShiftDetails = async () => {
        const shift_url = GET_URL.shift.api
        const param = { is_active: true }
        await getRequest(shift_url, param, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    shiftTypeList: response.data.data,
                })
                this.getFinancialYearList();

            }
        })

    }

    getFinancialYearList = async () => {
        const f_url = GET_URL.financialyear.api
        const param = { is_active: true }
        await getRequest(f_url, param, this.props).then(response => {
            if (response && response.status === 200) {
                let fromYear = ''
                let ToYear = ''
                response.data.data.map((data) => {
                    fromYear = data.start_date.split('-');
                    ToYear = data.end_date.split('-');
                    data.name = fromYear[0] + '-' + ToYear[0]
                })
                this.setState({
                    yearList: response.data.data,
                    loading: false
                })
            }
        })
    }

    setOptionsForTable = () => {

        // this.setState({
        //     options: newOptions
        // })
    }

    onChangeYear = async (e) => {
        let { value } = e.target;
        let { errors, options, selectedToggle } = this.state
        if (value !== 0) {
            let fromDate = ''
            let toDate = ''
            let fromDateValue = ''
            let toDateValue = ''
            this.state.yearList.map((data) => {
                if (data.id === value) {
                    fromDate = dateFormat(data.start_date, 'DD-MM-YYYY')
                    toDate = dateFormat(data.end_date, 'DD-MM-YYYY')
                    fromDateValue = data.start_date
                    toDateValue = data.end_date
                }
            })
            delete errors['year']
            // options['rowsSelected'] = []
            this.setState({
                year: value,
                errors,
                open: false,
                applyDisable: false,
                fromDate,
                toDate,
                staffList: [],
                staffIndex: [],
                enableTitle: false,
                fromDateValue,
                toDateValue,
            }, () => {
                this.applyUpdateStaffList(selectedToggle)
            })
        }
    }

    applyUpdateStaffList = (name) => {
        const { fromDateValue, toDateValue, manageyear, errors } = this.state
        if (name === 'custom') {
            let validate = true
            let from_error = validateDate(manageyear.start_date, minDate, maxDate)
            if (from_error !== '') {
                errors['start_date'] = from_error
                validate = false
            }
            let to_error = validateDate(manageyear.end_date, manageyear.start_date, maxDate)
            if (to_error !== '') {
                errors['end_date'] = to_error
                validate = false
            }
            this.setState({ errors })
            if (validate) {
                let start_date = dateFormat(manageyear.start_date, 'YYYY-MM-DD')
                let end_date = dateFormat(manageyear.end_date, 'YYYY-MM-DD')
                this.getStaffList(start_date, end_date);
            }
        }
        else if (name === 'financial') {
            let start_date = dateFormat(fromDateValue, 'YYYY-MM-DD')
            let end_date = dateFormat(toDateValue, 'YYYY-MM-DD')
            this.getStaffList(start_date, end_date)
        }
    }


    getStaffList = (fromDate, toDate) => {
        this.setState({ loadingStaff: true, applyDisable: true })
        const f_url = GET_URL.getunassigned.api + `?fromdate=${fromDate}&todate=${toDate}`
        const param = {}
        getRequest(f_url, param, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staffList: response.data.data.unassigned_staff,
                })
            }
            this.setState({
                loadingStaff: false,
                open: false,
                enableTitle: true,
                applyDisable: false,
                fromDate: fromDate,
                toDate: toDate,
                enableTable: true
            })
        })
    }

    onChangeShift = (e) => {
        const { name, value } = e.target
        let { errors } = this.state
        if (value !== 0) {
            delete errors[name]
            this.setState({
                [name]: value,
                open: false,
                errors
            })
        }
    }

    submit = async () => {
        let { selectedToggle, staffIndex, toDate, staffList, manageyear, fromDate, selectedShift, errors, fromDateValue, toDateValue } = this.state;
        this.validate(errors)
        if ((Object.keys(errors).length === 0)) {
            this.setState({ submitDisable: true })
            let from = ''
            let to = ''
            if (selectedToggle === 'financial') {
                from = dateFormat(fromDateValue, 'YYYY-MM-DD')
                to = dateFormat(toDateValue, 'YYYY-MM-DD')
            }
            else {
                from = dateFormat(manageyear.start_date, 'YYYY-MM-DD')
                to = dateFormat(manageyear.end_date, 'YYYY-MM-DD')
            }
            let ids = []
            staffIndex.map((data) => {
                ids.push(staffList[data.dataIndex].id)
            })

            let postData = {
                "fromdate": from,
                "todate": to,
                'shift': selectedShift,
                'staffids': ids
            }
            let url = POST_URL.assignshift.api
            postRequest(url, postData, this.props).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.assign_shift.view.url);
                }
                this.setState({ submitDisable: false })
            })
        }
        else {
            this.setState({
                errors,

            })
        }
    }

    validate = (errors) => {
        const { selectedToggle, year, selectedShift, manageyear, staffIndex, staffList } = this.state
        if (!selectedShift) {
            errors['selectedShift'] = 'Select Shift'
        }
        if (selectedToggle === 'financial') {
            if (!year) {
                errors['year'] = 'Select year'
            }
        }
        else {
            if (!manageyear.start_date) {
                errors['start_date'] = 'Select From Date'
            }
            if (!manageyear.end_date) {
                errors['end_date'] = 'Select End Date'
            }
        }
        if (staffIndex.length === 0) {
            errors['staffNotSelected'] = 'Staff not selected'
            this.setState({
                open: true,
                alertData: 'Select at least One Staff'
            })
        }

    }

    onBlurValidation = (e, label) => {
        const { errors, manageyear } = this.state
        let name = e.target.name;
        let value = manageyear[name];
        let minDateValue = minDate
        let error = ''
        if (name === 'end_date') {
            minDateValue = manageyear.start_date
        }
        error = validateDate(value, minDateValue, maxDate)
        if (error !== '') {
            errors[name] = error
            this.setState({ errors, applyDisable: true })
        }
    }

    onChangeDatesYears = (e, date_name) => {
        let { manageyear, applyDisable, errors, selectedToggle } = this.state
        manageyear[date_name] = e
        delete errors[date_name]
        if (manageyear['start_date'] && manageyear['end_date']) {
            applyDisable = false
        }
        this.setState({
            manageyear,
            applyDisable,
            errors
        }, () => {
            if (date_name === 'end_date' || (date_name === 'start_date' && Boolean(manageyear['end_date']))) {
                this.applyUpdateStaffList(selectedToggle)
            }
        })

    }

    changeToggle = (event, value) => {
        let { columns, options } = this.state;
        if (value !== null) {
            // options['rowsSelected'] = []
            this.setState({
                selectedToggle: value,
                enableTitle: false,
                staffList: [],
                staffIndex: [],
                columns: [...columns],
                // options: { ...options },
                enableTable: false,
                fromDateValue: '',
                toDateValue: '',
                manageyear: { start_date: null, end_date: null },
                year: '',
                applyDisable: true,
                blankPageMessage: 'Select Date Range',
            })
        }
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    render() {
        const {
            loading, fromDate, alertData, open, loadingStaff, blankPageMessage, staffList, selectedToggle, staffIndex, toDate, customDate,
            selectedYearName, shiftTypeList, selectedShift, errors, manageyear, yearList, year,
            applyDisable, enableTitle, enableTable
        } = this.state
        const options = {
            selectableRows: 'multiple',
            customToolbarSelect: () => { },
            onRowsClick: (data) => {
            },
            onTableChange: (action, tableState) => {
                if (action === 'rowSelectionChange') {
                    let { errors } = this.state
                    delete errors['staffNotSelected']
                    this.setState({
                        staffIndex: tableState.selectedRows.data,
                        errors,
                        open: false
                    })
                }
            }
        }
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Assign Shift to Staffs
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    <Button
                                        variant='contained'
                                        component={Link} to={Actions.assign_shift.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.assign_shift.view.label}</Button>
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container spacing={3}>
                            <Grid item md={8} xs={12} className='end-flex-prop header-align'>
                                <ToggleButtonGroup size="small" value={selectedToggle} exclusive onChange={this.changeToggle}>
                                    <ToggleButton key={2} value="custom"
                                        className={selectedToggle == 'custom' ? 'selected-shift-date-type' : 'not-selected-shift-date-type'}>
                                        Custom Date Range
                                    </ToggleButton>
                                    <ToggleButton key={1} value="financial"
                                        className={selectedToggle == 'financial' ? 'selected-shift-date-type' : 'not-selected-shift-date-type'}>
                                        Financial Year Date
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Grid>
                        </Grid>
                        <Box className='staff-list-assigned-shift'>Note : Staffs added with custom date range can also exceed the financial year date range.</Box>
                        <Grid container spacing={3}>
                            <Grid item md={8} xs={12}>
                                <Paper className='paper-plain-background header-align'>
                                    <Grid item container spacing={2} className={selectedToggle !== 'custom' && 'display-none'}>
                                        <Grid item md={5} xs={12} className='margin-top-30'>
                                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                <KeyboardDatePicker
                                                    autoOk
                                                    variant='inline'
                                                    inputVariant='outlined'
                                                    label='From Date'
                                                    fullWidth
                                                    name='start_date'
                                                    minDate={minDate}
                                                    maxDate={Boolean(manageyear.end_date) ? manageyear.end_date : maxDate}
                                                    onBlur={(e) => this.onBlurValidation(e, 'Start Date')}
                                                    InputLabelProps={{ shrink: manageyear.start_date ? true : false }}
                                                    format='dd-MM-yyyy'
                                                    value={manageyear.start_date}
                                                    onChange={(e) => this.onChangeDatesYears(e, 'start_date')}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change date',
                                                    }}
                                                    helperText={(!errors.start_date) ? 'Valid Format DD-MM-YYYY' : errors.start_date}
                                                    error={errors.start_date && (errors.start_date ? true : false)}
                                                />
                                            </MuiPickersUtilsProvider>
                                        </Grid>
                                        <Grid item md={5} xs={12} className='margin-top-30'>
                                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                <KeyboardDatePicker
                                                    autoOk
                                                    variant='inline'
                                                    inputVariant='outlined'
                                                    label='To Date'
                                                    fullWidth
                                                    name='end_date'
                                                    minDate={manageyear.start_date}
                                                    maxDate={maxDate}
                                                    onBlur={(e) => this.onBlurValidation(e, 'End Date')}
                                                    format='dd-MM-yyyy'
                                                    value={manageyear.end_date}
                                                    disabled={manageyear.start_date ? false : true}
                                                    InputLabelProps={{ shrink: manageyear.end_date ? true : false }}
                                                    onChange={(e) => this.onChangeDatesYears(e, 'end_date')}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change date',
                                                    }}
                                                    helperText={(!errors.end_date) ? 'Valid Format DD-MM-YYYY' : errors.end_date}
                                                    error={errors.end_date && (errors.end_date ? true : false)}
                                                />
                                            </MuiPickersUtilsProvider>
                                        </Grid>
                                    </Grid>

                                    {selectedToggle === 'financial' &&
                                        <Grid item md={10} xs={12} className='p-t-20px margin-top-30'>
                                            <Dropdown
                                                data={yearList}
                                                name='year'
                                                value={year}
                                                onChange={this.onChangeYear}
                                                error={errors.year}
                                                label='Financial year'
                                                hideSelect
                                            />
                                        </Grid>
                                    }
                                    {enableTable &&
                                        <Grid container className='flex-justify-center header-align staff-assign-shift-table '>
                                            <Grid item md={12}>
                                                <Paper>
                                                    <AllMUIDataTable
                                                        title={loadingStaff ? <CircularProgress className='white-text' /> : enableTitle ? `From ${fromDate} To ${toDate}` : ''}
                                                        data={this.state.staffList}
                                                        columns={this.state.columns}
                                                        options={options}
                                                    />
                                                </Paper>
                                            </Grid>
                                        </Grid>
                                    }
                                    {!enableTable && selectedToggle === 'custom' &&
                                        <BlankPagewithIcon data='Select Date Range' />
                                    }
                                    {!enableTable && selectedToggle === 'financial' &&
                                        <BlankPagewithIcon data='Select Financial Year' />
                                    }
                                </Paper>
                            </Grid>
                            <Grid item md={4} xs={12}>
                                <Paper className='paper-plain-background header-align staff-assigned-shift-paper p-b-20px'>
                                    <Grid item md={12} xs={12} className='p-t-20px'>
                                        <Dropdown
                                            data={shiftTypeList}
                                            name='selectedShift'
                                            value={selectedShift}
                                            onChange={this.onChangeShift}
                                            error={errors.selectedShift}
                                            label='Shift'
                                            hideSelect
                                        />
                                    </Grid>
                                    <Box className={!enableTable ? 'staff-assigned-shift-table' : 'staff-assigned-enabletable-shift-table'}>
                                        <Box className='staff-list-assigned-shift'>Users who are selected for assigning a shift</Box>
                                        {staffIndex.map((data, index) => {
                                            return (
                                                <Box key={index}>
                                                    <Box className='selected-assigned-staff'>
                                                        {staffList[data.dataIndex].full_name}
                                                    </Box>
                                                </Box>
                                            )
                                        })

                                        }
                                    </Box>
                                    <Box className='assign-shift-submit-position'>
                                        <Button variant="contained"
                                            className='submit'
                                            onClick={this.submit}
                                            disabled={this.state.submitDisable}
                                        >
                                            Submit
                                        </Button>
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>

                    </Paper>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Box>
            )
        }
    }
}

export default withRouter(HrAssignShift)