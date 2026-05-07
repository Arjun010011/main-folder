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
import CheckBoxOutlinedIcon from '@material-ui/icons/CheckBoxOutlined';
import CheckBoxOutlineBlankOutlinedIcon from '@material-ui/icons/CheckBoxOutlineBlankOutlined';
import InfoIcon from '@material-ui/icons/Info';
import { Dropdown } from 'Components/DropDown';
import {
    Box, Grid, Table, TableCell, TableContainer, TableHead, TableBody, TableRow, Tooltip, CircularProgress, Button
} from '@material-ui/core';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { Actions } from 'Constants/permissions';
import { getUrlParam, timeFormat, Alert, dateFormat, getFullName, validateDate } from 'Includes/functions';
import { GET_URL, DEL_URL } from 'Includes/urls';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages'
import AssignAltStaff from './../components/AssignAltStaff'
import messages from '../messages';
import './../styles.scss';


class SectionAltTeacher extends Component {

    constructor(props) {
        super(props)

        this.state = {
            assigned_classes: [],
            selected_date: '',
            errors: {},
            selectedStandard: '',
            selectedSection: '',
            period_wise: { columns: [], data: {}, new_data: [] },
            fieldError: {},
            selectedId: '',
            loadingDetails: false,
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
                    this.getParentSchedule()
                })
            }
            else {
                this.props.history.push(Actions.alternate_staff_timetable.view.url);
            }
        }
    }

    getParentSchedule = () => {
        const { selectedTimeTableRange, year } = this.state;
        const uel = GET_URL.timetabledaterange.api
        const params = { is_active: 1, date_range: selectedTimeTableRange, academic_year: year }
        getRequest(uel, params, this.props).then(response => {
            if (response && response.status === 200) {
                let sectionList = {}
                response.data.data[0]['assigned_classes'].map((data) => {
                    sectionList[data.standard] = data.section_list
                })
                this.setState({
                    assigned_classes: response.data.data[0]['assigned_classes'],
                    loading: false,
                    sectionList
                })
            }
        })
    }

    getSectionTimeTable = () => {
        const { sectionList, selectedStandard, selectedSection, selected_date } = this.state;
        let validate_date = this.onBlurValidation()
        if (!validate_date)
            return
        this.setState({ loadingDetails: true })
        let schedule_parent_id, standard_section
        sectionList[selectedStandard].map((data) => {
            if (data.section == selectedSection) {
                schedule_parent_id = data.time_table_schedule_parent
                standard_section = data.time_table_schedule_parent
            }
        })
        const url = GET_URL.assigntimetable.api
        const params = {
            is_active: true, standard_section: standard_section, time_table_schedule_parent: schedule_parent_id,
            alternate_teacher_fordate: dateFormat(selected_date, 'YYYY-MM-DD')
        }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    periodPlanDetails: response.data.data,
                    year: response.data.data.academic_year,
                    isEdit: true,
                    selectedPlanName: response.data.data.name
                }, () => {
                    this.updateShiftDetails()
                })
            }
        })
    }

    updateShiftDetails = () => {
        let { periodPlanDetails, period_wise, workingDays, plan_name, selected } = this.state;
        const { day_list } = this.props;
        period_wise['new_data'] = []
        let tempObject = {}
        let period_key = { work_day_list: {} }
        plan_name = periodPlanDetails['name']
        periodPlanDetails.period_period_plan.map((field, index) => {
            tempObject = {}
            tempObject['id'] = field['id']
            tempObject['period_plan'] = field['period_plan']
            tempObject['name'] = field['name']
            tempObject['is_break_enable'] = field['is_break']
            tempObject['work_day_list'] = {}
            field.perioddaymapping_period.map((work_day) => {
                day_list.map((child_work_day) => {
                    if (child_work_day.id === work_day.day) {
                        tempObject['work_day_list'][work_day.day] = {}
                        work_day['isEdited'] = true
                        tempObject['work_day_list'][work_day.day] = _.cloneDeep(work_day)
                    }
                })
            })
            period_wise.new_data.push(tempObject)
        })

        period_wise.new_data.map((period) => {
            period_key['work_day_list'] = {}
            day_list.map((childWork) => {
                if (childWork.is_student_working_day && !period['work_day_list'][childWork.id]) {
                    period['work_day_list'][childWork.id] = {}
                    period['work_day_list'][childWork.id]['start_time'] = ''
                    period['work_day_list'][childWork.id]['end_time'] = ''
                    period['work_day_list'][childWork.id]['name'] = childWork.name
                    period['work_day_list'][childWork.id]['isEdited'] = true
                }
            })
        })
        selected = []
        periodPlanDetails.standard_list.map((data) => {
            let optionformat = {
                label: data.name,
                value: data.name,
                id: data.id
            }
            selected.push(optionformat)
        })
        this.setState({
            originalPeriodWise: _.cloneDeep(period_wise),
            period_wise,
            loading: false,
            workingDays,
            is_period_entered: true,
            plan_name,
            selected,
            year: periodPlanDetails.academic_year,
            loadingDetails: false
        })
    }

    onChangeHandleView = (value) => {
        this.setState({
            is_staff_view: value
        })
    }

    onChange = (e) => {
        const { name, value } = e.target;
        let { errors } = this.state;
        delete errors[name]
        this.setState({
            [name]: value,
            errors,
        }, () => {
            if (name === 'selectedSection') {
                this.getSectionTimeTable();
            }
            else {
                this.setState({ selectedSection: '' })
            }
        })
    }

    handleCheckEnable = (index, id) => {
        const { period_wise } = this.state;
        let returnValue = false
        if (period_wise.new_data[index].work_day_list[id].assignedData) {
            returnValue = true
        }
        if (period_wise.new_data[index].work_day_list[id].alternateTeacher) {
            returnValue = false
        }
        return returnValue
    }

    onChangeCheckBox = (id) => {
        const { selectedId } = this.state;
        this.setState({
            selectedId: selectedId === id ? '' : id
        })
    }


    validateCheckBox = () => {
        const { selectedId, selected_date, selectedStandard, selectedSection, errors } = this.state;
        let returnValue = true;
        if (!selected_date || !selectedStandard || !selectedSection) {
            returnValue = false
            if (!selected_date) {
                errors['selected_date'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            if (!selectedStandard) {
                errors['selectedStandard'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            if (!selectedSection) {
                errors['selectedSection'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
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
        let { errors, selectedSection } = this.state;
        delete errors['selected_date']
        this.setState({
            selected_date: e,
            selectedId: '',
            errors,
        }, () => {
            if (selectedSection) {
                this.getSectionTimeTable()
            }
        })
    }

    onBlurValidation = () => {
        const { selected_date, selectedStandard, selectedSection, fromDate, toDate, errors } = this.state;
        let { selected_day } = this.state;
        let return_value = true
        let error = validateDate(selected_date, fromDate, toDate)
        if (selectedStandard === '') {
            errors['selectedStandard'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
            return_value = false
        }
        if (selectedSection === '') {
            errors['selectedSection'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
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

    showData = (data) => {
        return (
            <>
                <Box>
                    {`Staff - ${data.assignedData.full_name} - (${data.assignedData.subject_name})`}
                </Box>
                {data.alternateTeacher &&
                    <Box>
                        {`Alt Staff - ${getFullName(data.alternateTeacher.staff__first_name, data.alternateTeacher.staff__middle_name, data.alternateTeacher.staff__last_name)} - (${data.alternateTeacher.subject_name})`}
                    </Box>
                }
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
                this.getSectionTimeTable();
            }
        })
    }

    render() {
        const {
            assigned_classes, selectedStandard, selected_date, errors, fromDate, toDate, sectionList, selectedSection, fieldError,
            period_wise, loadingDetails, selectedId, openSnackbar, alertData, year, selected_day } = this.state;
        const { day_list } = this.props;
        return (<>
            <Grid container spacing={2} className='p-t-20px p-b-20px'>
                <Grid item md={3} xs={12}>
                    <Dropdown
                        data={assigned_classes}
                        name='selectedStandard'
                        style='w-100'
                        value={selectedStandard}
                        onChange={this.onChange}
                        label={<FormattedMessage {...commonMessages.standard} />}
                        error={errors.selectedStandard}
                        hideSelect={true}
                        customName='standard_name'
                        customId='standard'
                        helperText={errors.selectedStandard && errors.selectedStandard}
                    />
                </Grid>
                <Grid item md={3} xs={12}>
                    <Dropdown
                        data={selectedStandard ? sectionList[selectedStandard] : []}
                        name='selectedSection'
                        style='w-100'
                        value={selectedSection}
                        onChange={this.onChange}
                        label={<FormattedMessage {...commonMessages.section} />}
                        error={errors.selectedSection}
                        hideSelect={true}
                        customName='section_name'
                        customId='section'
                        disabled={selectedStandard ? false : true}
                        helperText={selectedStandard ? errors.selectedStandard && errors.selectedStandard : 'Select Standard'}
                    />
                </Grid>
                <Grid item md={3} xs={12}>
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>

                        <KeyboardDatePicker
                            autoOk
                            variant='inline'
                            inputVariant="outlined"
                            label={'Date'}
                            minDate={fromDate}
                            maxDate={toDate}
                            name='selected_date'
                            InputLabelProps={{ shrink: selected_date ? true : false }}
                            format="dd-MM-yyyy"
                            value={selected_date ? selected_date : null}
                            required
                            onChange={(e) => this.onChangeDate(e)}
                            onBlur={(e) => this.getSectionTimeTable()}
                            KeyboardButtonProps={{
                                'aria-label': 'change date',
                            }}
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
                        getRequest={this.getSectionTimeTable}
                    />
                </Grid>
            </Grid>
            {
                selectedSection && loadingDetails &&
                <Box className='text-center'>
                    <CircularProgress className='text-center' />
                </Box>
            }
            {
                selectedSection && !loadingDetails && selected_date &&
                <TableContainer className=' header-align p-t-20px p-b-20px'>
                    <Table size='small' aria-label='simple table' className='w-auto'>
                        <TableHead>
                            <TableRow>
                                <TableCell className='add-period-time-table-side-heading'>
                                    Period Name
                                </TableCell>
                                {day_list.map((data, index) => {
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
                            {period_wise.new_data.map((parent, index) => {
                                return <TableRow>
                                    <TableCell className={parent.is_break_enable ? 'selected-break-time add-period-time-table-side-heading' : 'add-period-time-table-side-heading'}>
                                        {parent.name}
                                    </TableCell>
                                    {
                                        day_list.map((data) => {
                                            return (
                                                selected_day.includes(data.name) &&
                                                <>
                                                    {parent.work_day_list[data.id] && parent.work_day_list[data.id]['assignedData'] && data.is_student_working_day &&
                                                        <Tooltip title={parent.work_day_list[data.id].info}
                                                            enterDelay={400}
                                                            enterNextDelay={400} placement='top-start'
                                                            classes={parent.work_day_list[data.id].info ? { tooltip: 'tooltip-show-data' } : { tooltip: 'bgcolor-transparent' }}>
                                                            <TableCell className={this.handleCheckEnable(index, data.id) ? parent.work_day_list[data.id]['assignedData'].id === selectedId ? 'selected-time-period create-time-table-cell-heading' : 'create-time-table-cell-heading' : 'create-time-table-cell-not-enable'}
                                                                onClick={this.handleCheckEnable(index, data.id) ? () => this.onChangeCheckBox(parent.work_day_list[data.id]['assignedData'].id) : ""}
                                                            >
                                                                <Box style={{ height: 'inherit' }} className={fieldError[`start_time${index}${data.id}`] ? 'red-text' : ''}>
                                                                    <Box className={this.handleCheckEnable(index, data.id) ? 'create-time-table-time-check' : 'create-time-table-time-check'}>
                                                                        <Box className='time-table-timing-box'>
                                                                            {parent.work_day_list[data.id].start_time && parent.work_day_list[data.id].end_time && `${timeFormat(parent.work_day_list[data.id].start_time, 'hh:mm:ss', 'hh:mm A')} - ${timeFormat(parent.work_day_list[data.id].end_time, 'hh:mm:ss', 'hh:mm A')}`}
                                                                        </Box>

                                                                        <Box>
                                                                            {parent.work_day_list[data.id].alternateTeacher ?
                                                                                <Tooltip title={'Remove Alternate Staff'}
                                                                                    enterDelay={400} classes={{ tooltip: 'tooltip-show-data' }}
                                                                                    enterNextDelay={400} placement='top-start'>
                                                                                    <HighlightOffIcon className='time-table-info-icon cross-btn-nominee'
                                                                                        onClick={() => this.handleDeleteAltStaff(parent.work_day_list[data.id].alternateTeacher.id)}
                                                                                    />
                                                                                </Tooltip>
                                                                                :
                                                                                (parent.work_day_list[data.id]['assignedData'].id === selectedId && this.handleCheckEnable(index, data.id)) ?
                                                                                    <CheckBoxOutlinedIcon className='timetable-checkbox-style' />
                                                                                    :
                                                                                    <CheckBoxOutlineBlankOutlinedIcon className='timetable-checkbox-style' />
                                                                            }
                                                                        </Box>
                                                                    </Box>
                                                                    <Box display='flex'>
                                                                        <Box>
                                                                            <Box className='create-time-table-subject-label'>
                                                                                {parent.work_day_list[data.id].assignedData && `${parent.work_day_list[data.id].assignedData.full_name}`}
                                                                            </Box>

                                                                            <Box className='create-time-table-staff-label alt-teacher-label'>
                                                                                {parent.work_day_list[data.id].alternateTeacher && `${getFullName(parent.work_day_list[data.id].alternateTeacher.staff__first_name, parent.work_day_list[data.id].alternateTeacher.staff__middle_name, parent.work_day_list[data.id].alternateTeacher.staff__last_name)}`}
                                                                            </Box>
                                                                        </Box>
                                                                        <Box>
                                                                            <Tooltip title={this.showData(parent.work_day_list[data.id])}
                                                                                enterDelay={400} classes={{ tooltip: 'tooltip-show-data' }}
                                                                                enterNextDelay={400} placement='top-start'>
                                                                                <InfoIcon className='time-table-info' />
                                                                            </Tooltip>
                                                                        </Box>
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                        </Tooltip>
                                                    }
                                                    {(!parent.work_day_list[data.id] || !parent.work_day_list[data.id]['assignedData']) && data.is_student_working_day &&
                                                        <TableCell className='create-time-table-cell-not-enable'>
                                                            <Box style={{ height: 'inherit' }} className={fieldError[`start_time${index}${data.id}`] ? 'red-text' : ''}>
                                                                <Box className={'create-time-table-time-check'}>
                                                                    <Box className='time-table-timing-box'>
                                                                        {parent.work_day_list[data.id].start_time && parent.work_day_list[data.id].end_time && `${timeFormat(parent.work_day_list[data.id].start_time, 'hh:mm:ss', 'hh:mm A')} - ${timeFormat(parent.work_day_list[data.id].end_time, 'hh:mm:ss', 'hh:mm A')}`}
                                                                    </Box>
                                                                </Box>
                                                            </Box>
                                                        </TableCell>
                                                    }
                                                </>
                                            )
                                        })
                                    }
                                </TableRow>
                            })
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

export default withRouter(SectionAltTeacher)
