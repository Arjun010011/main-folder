import React, { Component } from 'react';
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { Link } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import Snackbar from '@material-ui/core/Snackbar';
import moment from 'moment';
import _ from 'lodash';
import CheckBoxOutlinedIcon from '@material-ui/icons/CheckBoxOutlined';
import CheckBoxOutlineBlankOutlinedIcon from '@material-ui/icons/CheckBoxOutlineBlankOutlined';
import InfoIcon from '@material-ui/icons/Info';

import StaffTimeTableView from 'Containers/timetable/components/StaffTimeTableView'
import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import loadingBar from 'images/loading.gif';
import {
    Paper, Box, CircularProgress, Grid, Button, FormControlLabel, Switch, Tooltip, Table, TableCell, TableContainer, TableHead,
    TableBody, TableRow
} from '@material-ui/core';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { Actions } from 'Constants/permissions';
import { dateFormat, timeFormat, isUserHasPermission, Alert, getUrlParam, getSettingValue} from 'Includes/functions';
import { GET_URL, POST_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';
import { numberRegex } from 'Constants/regularExpression';
import { minDate, options } from 'Constants';
import './styles.scss';
import AssignTiming from './components/AssignTiming';
import { ThreeSixty } from '@material-ui/icons';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages'

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}
const number_of_language = parseInt(getSettingValue('number_of_language'));

const lang_seq = {
    1: 'First Lang',
    2: 'Second Lang',
    3: 'Third Lang',
}

class CreateTimeTable extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            fieldError: { entire_paper_error: {} },
            workingDays: [],
            openSnackbar: false,
            alertData: '',
            isHalfDay: false,
            loading: true,
            isEdit: false,
            number_of_periods: 3,
            is_period_entered: true,
            is_all_weekdays_selected: false,
            minDateValue: '',
            maxDateValue: '',
            plan_name: '',
            options: [],
            selected: [],
            period_wise: { columns: [], data: {}, new_data: [] },
            originalPeriodWise: { columns: [], data: {}, new_data: [] },
            day_wise: {},
            is_week_wise: false,
            period_list_names: [],
            isBreakPeriod: false,
            delete_period_list: [],
            delete_period_ids: [],
            yearName: '',
            staffList: [],
            selectedStaff: '',
            fieldErrors: {},
            subjectList: [],
            selectedSubject: '',
            staffTimeTableLoading: false,
            deletable_ids: [],
            staffTimeTable: { staffData: [] },
            is_loading_period: false
        }
        this.dateRange = React.createRef();
        this.createTimeTable = React.createRef();
    }

    componentDidMount = () => {
        if (this.props.location.pathname === Actions.assign_timetable.update.url) {
            let { academic_year, year_name, standardName, sectionName, selectedPlanName, selectedPlan, standard, timetable_id,
                standard_section_id, time_table_schedule_parent } = getUrlParam();
            if (academic_year && year_name && standardName && sectionName && selectedPlan && standard && standard_section_id && time_table_schedule_parent) {
                this.setState({
                    year: academic_year,
                    year_name: year_name,
                    standardName,
                    sectionName,
                    selectedPlanName,
                    standard,
                    selectedPlan,
                    timetable_id,
                    standard_section_id,
                    time_table_schedule_parent
                }, () => {
                    this.getStaffList()
                    this.getSubjectList()
                    this.getAssignedTimeTable()
                })
            }
            else {
                this.props.history.push(Actions.period_plan.view.url);
            }
        }
        else {
            let { academic_year, year_name, standardName, sectionName, selectedPlanName, selectedPlan, standard, timetable_id, standard_section_id } = getUrlParam();
            if (academic_year && year_name && standardName && sectionName && selectedPlan && standard) {
                this.setState({
                    year: academic_year,
                    year_name: year_name,
                    standardName,
                    sectionName,
                    selectedPlanName,
                    standard,
                    selectedPlan,
                    timetable_id,
                    standard_section_id
                }, () => {
                    this.getStaffList()
                    this.getSubjectList()
                    this.getPeriodPlanDetails(selectedPlan)
                })
            }
            else {
                this.props.history.push(Actions.period_plan.view.url);
            }
        }
    }

    getStaffList = () => {
        const { year } = this.state;
        const url = GET_URL.getstaffsubject.api
        const params = { is_active: true, academic_year: year }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                if (response.data.data.assigned_subjects) {
                    response.data.data.assigned_subjects.map((data) => {
                        if (data.is_language && number_of_language>1) {
                            data['subject'] = data['subject'] + ' ' + this.getSequence(data.sequence)
                        }
                    })
                }
                this.setState({
                    staffList: response.data.data,
                })
            }
        })
    }

    getSubjectList = () => {
        const { year, standard, standard_section_id } = this.state;
        const url = GET_URL.getAssignSubject.api;
        let params = { is_active: true, for_admission: 1, academic_year: year, standard: standard, section: standard_section_id };
        getRequest(url, params).then((response) => {
            if (response && response.status === 200) {
                const subjectList = [];
                response.data.data.map((data) => {
                    if (data.subject_is_language && number_of_language>1) {
                        data['subject_name'] = `${data['subject_name']} ${this.getSequence(data.subject_sequence)}`
                    }
                    subjectList.push(
                        {
                            id: data.id,
                            is_language: data.subject_is_language,
                            sequence: data.subject_sequence,
                            subject_id: data.subject,
                            subject: data.subject_name,
                            subject_alias: data.subject_name,
                        }
                    )
                })
                this.setState({
                    subjectList
                })
            }
        });
    }

    getSequence = (sequence) => {
        if (sequence == 1) {
            return alias_names['first_language']
        }
        else if (sequence == 2) {
            return alias_names['second_language']
        }
        else if (sequence == 3) {
            return alias_names['third_language']
        }
    }

    getAssignedTimeTable = () => {
        const { standard_section_id, time_table_schedule_parent } = this.state;
        const url = GET_URL.assigntimetable.api
        const params = { is_active: true, standard_section: standard_section_id, time_table_schedule_parent: time_table_schedule_parent }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    periodPlanDetails: response.data.data,
                    year: response.data.data.academic_year,
                    isEdit: true,
                    selectedPlanName: response.data.data.name
                }, () => {
                    this.getWorkingDays()
                })
            }
        })
    }

    getPeriodPlanDetails = (id) => {
        const url = GET_URL.period.api + id + '/'
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    periodPlanDetails: response.data.data,
                    year: response.data.data.academic_year,
                    isEdit: true
                }, () => {
                    this.getWorkingDays()
                })
            }
        })
    }

    updateShiftDetails = () => {
        let { periodPlanDetails, period_wise, workingDays, plan_name, selected } = this.state;
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
                period_wise.columns.map((child_work_day) => {
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
            period_wise.columns.map((childWork) => {
                if (childWork.is_student_working_day && !period['work_day_list'][childWork.id]) {
                    period['work_day_list'][childWork.id] = {}
                    period['work_day_list'][childWork.id]['start_time'] = ''
                    period['work_day_list'][childWork.id]['end_time'] = ''
                    period['work_day_list'][childWork.id]['name'] = childWork.name
                    period['work_day_list'][childWork.id]['isEdited'] = true
                }
                period['work_day_list'][childWork.id]['is_check_enable'] = true
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
            is_loading_period: false
        })
    }

    getWorkingDays = () => {
        let { period_wise, isEdit } = this.state;
        const url = GET_URL.days.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.map((data, index) => {
                    if (!data.is_student_working_day) {
                        response.data.data.splice(index, 1)
                    }
                })
                period_wise.columns = response.data.data
                this.setState({
                    period_wise
                }, () => {
                    this.updateShiftDetails()
                })
            }
        })
    }


    handleCloseSnackBar = () => {
        this.setState({
            openSnackbar: false
        })
    }

    handleSearchChange = (e) => {
        let { fieldError } = this.state;
        let { name, value } = e.target;
        if (name === 'number_of_periods' && !numberRegex.value.test(value) && value) {
            fieldError[name] = numberRegex.errorText
            this.setState({
                fieldError,
                [name]: value
            })
            return
        }
        delete fieldError[name]
        this.setState({
            [name]: value,
            fieldError,
        })
    }

    onChangeCheckBox = (index, id, name) => {
        let { period_wise, day_wise } = this.state;
        if (name === 'period_wise') {
            period_wise['new_data'][index]['work_day_list'][id].is_enable = period_wise['new_data'][index]['work_day_list'][id].hasOwnProperty('is_enable') ? !period_wise['new_data'][index]['work_day_list'][id]['is_enable'] : true
        }
        else {
            period_wise['new_data'][index]['work_day_list'][id].is_enable = period_wise['new_data'][index]['work_day_list'][id].hasOwnProperty('is_enable') ? !period_wise['new_data'][index]['work_day_list'][id]['is_enable'] : true
        }
        this.setState({
            day_wise,
            period_wise,
        })
    }

    setSelected = (data) => {
        let { selected } = this.state
        selected = data
        this.setState({
            selected,
        })
    }

    handleChange = (e, index) => {
        let { name, value } = e.target;
        let { period_wise } = this.state;
        period_wise.new_data[index][name] = value
        this.setState({
            period_wise,
            fieldError: {}
        })
    }

    handleDeletePeriod = (index) => {
        let { period_wise, delete_period_ids } = this.state;
        if (!!period_wise['new_data'][index]['id'])
            delete_period_ids.push(period_wise['new_data'][index]['id'])
        period_wise['new_data'].splice(index, 1)
        this.setState({
            period_wise,
            delete_period_ids
        }, () => {
            this.validateDuplicatePeriod()
        })
    }

    onChangeBreakCheckBox = (index) => {
        let { period_wise } = this.state;
        if (period_wise.new_data[index]['is_break_enable'] === undefined) {
            period_wise.new_data[index]['is_break_enable'] = true
        }
        else {
            period_wise.new_data[index]['is_break_enable'] = !period_wise.new_data[index]['is_break_enable']
        }
        this.setState({
            period_wise
        })
    }

    handleDropDownSearchChange = (e, newValue, name) => {
        let { fieldErrors } = this.state;
        delete fieldErrors[name]
        this.setState({
            [name]: newValue,
            fieldErrors,
            staffTimeTableLoading: (name === 'selectedStaff' && newValue) ? true : false
        }, () => {
            if (name === 'selectedStaff' && newValue) {
                this.getStaffTimeTable()
            }
        })
    }

    getStaffTimeTable = () => {
        const { timetable_id, selectedStaff } = this.state;
        const url = GET_URL.timetablestaffassigned.api
        const params = { date_range: timetable_id, staff: selectedStaff.staff }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    selectedSubject: '',
                    staffTimeTable: response.data.data ? response.data.data : response.data,
                }, () => {
                    this.resetCheckEnable()
                    this.validateStaffTimeTable()
                })
            }
        })
    }

    validateStaffTimeTable = () => {
        const { staffTimeTable, period_wise, standard_section_id } = this.state;
        let formatValue = 'HH:mm:ss'
        let period_start_time = ''
        let period_end_time = ''
        let staff_start_time = ''
        let staff_end_time = ''
        let conflict_found = false
        period_wise.new_data.map((period) => {
            staffTimeTable.staffData.map((staff) => {
                staff.day_list.map((staffDay) => {
                    conflict_found = false
                    period_start_time = moment(period.work_day_list[staffDay.day].start_time, formatValue)
                    period_end_time = moment(period.work_day_list[staffDay.day].end_time, formatValue)
                    staff_start_time = moment(staffDay.period_start_time, formatValue)
                    staff_end_time = moment(staffDay.period_end_time, formatValue)
                    if (moment(staff_start_time).isBetween(period_start_time, period_end_time, null, '[)') && parseInt(standard_section_id) !== parseInt(staffDay.standard_section)) {
                        conflict_found = true
                        period.work_day_list[staffDay.day]['is_enable'] = false
                    }
                    if (moment(staff_end_time).isBetween(period_start_time, period_end_time, null, '(]') && parseInt(standard_section_id) !== parseInt(staffDay.standard_section)) {
                        conflict_found = true
                        period.work_day_list[staffDay.day]['is_enable'] = false
                    }
                    if (conflict_found) {
                        period.work_day_list[staffDay.day]['info'] = `Already assgined ${staffDay.full_name} to
                         ${staffDay.standard_name} (${staffDay.section_name}) for ${staffDay.subject_name}`
                        period.work_day_list[staffDay.day]['is_check_enable'] = false
                    }
                })
            })
        })
        this.setState({
            period_wise,
            staffTimeTableLoading: false
        })
    }

    resetCheckEnable = () => {
        const { period_wise } = this.state;
        period_wise.new_data.map((period) => {
            Object.keys(period.work_day_list).map((work_day) => {
                period.work_day_list[work_day]['is_enable'] = false
                period.work_day_list[work_day]['is_check_enable'] = true
                period.work_day_list[work_day]['info'] = ''
            })
        })
        this.setState({
            period_wise
        })
    }

    postSubjectAssign = (name) => {
        const { period_wise, selectedStaff, selectedSubject, standard_section_id, timetable_id, selectedPlan, deletable_ids,
            time_table_schedule_parent, } = this.state;
        let subject_staff = []
        let temp = { period_day_mapping: '' }
        period_wise.new_data.map((period) => {
            Object.keys(period.work_day_list).map((work_day) => {
                if (period.work_day_list[work_day]['is_enable']) {
                    temp = { period_day_mapping: '' }
                    temp['period_day_mapping'] = period.work_day_list[work_day].id
                    subject_staff.push(temp)
                }
            })
        })
        let post_data = {}
        if (name === 'delete') {
            post_data = {
                'assign_timetable': {
                    "deletable_ids": deletable_ids,
                    "onlydelete": true
                }
            }
        }
        else {
            post_data = {
                'assign_timetable': {
                    "staff": parseInt(selectedStaff.staff),
                    "schedule_parent": time_table_schedule_parent && parseInt(time_table_schedule_parent),
                    "deletable_ids": deletable_ids,
                    "subject": parseInt(selectedSubject.subject_id),
                    "date_range": parseInt(timetable_id),
                    "standard_section": parseInt(standard_section_id),
                    "subject_staff": subject_staff,
                    "period_plan": parseInt(selectedPlan)
                }
            }
        }
        let url = POST_URL.assigntimetable.api;
        postRequest(url, post_data, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    const {
                        year, year_name, standardName, sectionName, selectedPlanName, standard, selectedPlan, timetable_id,
                        standard_section_id, time_table_schedule_parent } = this.state;

                    this.setState({
                        period_wise: { columns: [], data: {}, new_data: [] },
                        time_table_schedule_parent: time_table_schedule_parent ? time_table_schedule_parent : response.data.schedule_parent,
                        selectedStaff: '',
                        selectedSubject: '',
                        is_loading_period: true
                    }, () => {
                        if (this.props.location.pathname === Actions.assign_timetable.create.url) {
                            let currentSelectedList = {
                                'academic_year': year,
                                'year_name': year_name,
                                'timetable_id': timetable_id,
                                'standard': standard,
                                'standard_section_id': standard_section_id,
                                'standardName': standardName,
                                'sectionName': sectionName,
                                'time_table_schedule_parent': time_table_schedule_parent ? time_table_schedule_parent : response.data.schedule_parent,
                                'selectedPlan': selectedPlan
                            };
                            let searchParam = "?" + new URLSearchParams(currentSelectedList).toString()
                            this.props.history.push({
                                pathname: Actions.assign_timetable.update.url,
                                search: searchParam,
                            });
                        }
                        else {
                            this.getAssignedTimeTable()
                        }
                    })
                }
                this.setState({ submitDisable: false })
            });

    }

    handleAssignSubject = () => {
        let { selectedStaff, selectedSubject, fieldErrors, openSnackbar, alertData } = this.state;
        let validate = true
        if (!selectedStaff && !selectedSubject) {
            fieldErrors['selectedStaff'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            fieldErrors['selectedSubject'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            validate = false
        }
        let validateCheckBox = this.validateCheckBox()
        if (!validateCheckBox) {
            openSnackbar = true
            alertData = 'Select atleast one period to assign'
            validate = false
        }
        if (validate) {
            let deletable_ids = this.handleDeletableIds()
            this.setState({
                submitDisable: true,
                deletable_ids
            }, () => {

                this.postSubjectAssign()
            })
        }
        this.setState({
            openSnackbar,
            alertData,
            fieldErrors
        })
    }

    handleDeletableIds = () => {
        let { originalPeriodWise, period_wise, selectedStaff, selectedSubject, deletable_ids } = this.state;
        deletable_ids = []
        originalPeriodWise.new_data.map((original) => {
            period_wise.new_data.map((period) => {
                if (original.id === period.id) {
                    for (const original_week in original.work_day_list) {
                        if (original.work_day_list[original_week]['assignedData'] && (original.work_day_list[original_week]['assignedData']['subject'] !== selectedSubject.id || original.work_day_list[original_week]['assignedData']['staff'] !== selectedStaff.staff) && period.work_day_list[original_week]['is_enable']) {
                            deletable_ids.push(original.work_day_list[original_week]['assignedData']['id'])
                        }
                    }
                }
            })
        })
        return deletable_ids
    }

    validateCheckBox = (name) => {
        let { period_wise, deletable_ids } = this.state;
        let returnValue = false
        deletable_ids = []
        period_wise.new_data.map((period) => {
            return period_wise.columns.map((data) => {
                if (period['work_day_list'][data.id] && data.is_student_working_day && period['work_day_list'][data.id].is_enable) {
                    if (name === 'delete') {
                        if (period['work_day_list'][data.id]['assignedData'] && period['work_day_list'][data.id]['assignedData']['id']) {
                            deletable_ids.push(period['work_day_list'][data.id]['assignedData']['id'])
                        }
                        delete period['work_day_list'][data.id]['assignedData']
                        period['work_day_list'][data.id].is_enable = false
                    }
                    returnValue = true
                }
            })
        })
        if (returnValue && name === 'delete') {
            this.setState({
                deletable_ids,
                period_wise,
                submitDisable: deletable_ids.length > 0
            }, () => {
                if (deletable_ids.length > 0) {
                    this.postSubjectAssign(name)
                }
            })
        }
        return returnValue
    }

    checkStaffSelected = () => {
        let { fieldErrors, selectedStaff } = this.state;
        let validate = true
        if (!selectedStaff) {
            validate = false
            fieldErrors['selectedStaff'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            this.setState({
                openSnackbar: true,
                alertData: 'Select staff to view Timetable',
                fieldErrors,
            })
        }
        if (validate) {
            this.createTimeTable.current.handleOpen()
        }
    }

    handleCheckEnable = (index, id) => {
        const { period_wise, selectedStaff } = this.state;
        let returnValue = false
        if (period_wise.new_data[index].work_day_list[id].start_time && period_wise.new_data[index].work_day_list[id].end_time && (period_wise.new_data[index].work_day_list[id].is_check_enable || (!selectedStaff && period_wise.new_data[index].work_day_list[id].assignedData && period_wise.new_data[index].work_day_list[id].assignedData['subject_name']))) {
            returnValue = true
        }
        return returnValue
    }

    render() {
        const { loading, fieldError, subjectList, submitDisable, staffList, selectedStaff, openSnackbar, alertData, staffTimeTable,
            year_name, standardName, period_wise, sectionName, fieldErrors, selectedPlanName, selectedSubject, staffTimeTableLoading, is_loading_period
        } = this.state;
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
                                Create Time Table
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {isUserHasPermission('period_plan', 'create') && <Button
                                    variant="contained"
                                    component={Link} to={Actions.assign_timetable.view.url}
                                    className='editbutton-view'
                                ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.assign_timetable.view.label}</Button>}
                            </Box>
                        </Grid>
                    </Grid>
                    <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                        <Box className="year-std-box mr-40">
                            <Box className="exam-mark-heading-box"> Academic Year</Box>
                            <Box className=" exam-mark-add-heading-bg">{year_name}</Box>
                            <Box className="exam-mark-heading-box"> {`${alias_names['standard']}`}</Box>
                            <Box className=" exam-mark-add-heading-bg">{standardName}</Box>
                            <Box className=" exam-mark-add-heading-bg">{sectionName}</Box>
                            <Box className="exam-mark-heading-box"> Period Plan</Box>
                            <Box className=" exam-mark-add-heading-bg">{selectedPlanName}</Box>
                        </Box>
                    </Box>
                    <Grid container spacing={2}>
                        <Grid item md={3} xs={4}>
                            <DropDownWithSearch
                                id="combo-box-demo"
                                options={staffList}
                                autoComplete="off"
                                value={selectedStaff}
                                onChange={(e, newValue) => this.handleDropDownSearchChange(e, newValue, 'selectedStaff')}
                                optionValue='staff_name'
                                name='selectedStaff'
                                label='Staff'
                                className='width-100'
                                helperText={fieldErrors['selectedStaff']}
                                error={fieldErrors['selectedStaff']}
                            />
                        </Grid>
                        <Grid item md={3} xs={4}>
                            <DropDownWithSearch
                                id="combo-box-demo"
                                options={selectedStaff && selectedStaff.assigned_subjects ? selectedStaff.assigned_subjects : subjectList}
                                autoComplete="off"
                                value={selectedSubject}
                                onChange={(e, newValue) => this.handleDropDownSearchChange(e, newValue, 'selectedSubject')}
                                optionValue='subject_alias'
                                name='selectedSubject'
                                label='Subject'
                                className='width-100'
                                // disabled={selectedStaff ? false : true}
                                helperText={selectedStaff ? (!selectedStaff.assigned_subjects || selectedStaff.assigned_subjects.length === 0) ? 'No subjects assigned for selected staff' : fieldErrors['selectedSubject'] : 'Select Staff'}
                                error={fieldErrors['selectedSubject']}
                            />
                        </Grid>
                        <Grid item md={3} xs={4} className='align-self-center'>
                            <Button
                                className='submit'
                                variant="contained"
                                disabled={submitDisable}
                                onClick={this.handleAssignSubject}
                            >
                                Assign Staff & Subject
                            </Button>
                        </Grid>
                        <Grid item md={3} xs={4} className='align-self-center'>
                            <Button
                                className='delete-staff-subject'
                                onClick={() => this.validateCheckBox('delete')}>Delete Staff & Subject
                            </Button>
                        </Grid>
                    </Grid>
                    {is_loading_period &&
                        <Box display='flex'>
                            <CircularProgress className='loading' />
                        </Box>
                    }
                    {!is_loading_period &&
                        <Paper className='paper-plain-background  p-t-20px m-t-20px p-b-20px p-l-10px'>
                            <StaffTimeTableView
                                staffTimeTable={staffTimeTable}
                                week_day_list={period_wise.columns}
                                selectedStaff={selectedStaff}
                                staffTimeTableLoading={staffTimeTableLoading}
                                ref={this.createTimeTable}
                            />
                            <Button
                                className={staffTimeTableLoading ? 'add-modify-button disabled-button' : 'add-modify-button'}
                                onClick={this.checkStaffSelected}
                                disabled={staffTimeTableLoading}
                            ><VisibilityOutlinedIcon /> Staff Time Table
                            </Button>
                            {staffTimeTableLoading &&
                                <CircularProgress />
                            }
                            {/* <TableContainer className=' header-align p-t-20px' classes={{ root: classes.customTableContainer }}> */}
                            <TableContainer className=' header-align p-t-20px'>
                                <Table size='small' aria-label='simple table' className='w-auto' stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell className='add-period-time-table-side-heading'>
                                            </TableCell>
                                            {period_wise.columns.map((data, index) => {
                                                return (
                                                    <>
                                                        {data.is_student_working_day &&
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
                                                <TableCell className={parent.is_break_enable ? 'selected-break-time add-period-time-table-side-heading position-sticky-column-time' : 'position-sticky-column-time add-period-time-table-side-heading'}>
                                                    {parent.name}
                                                </TableCell>
                                                {
                                                    period_wise.columns.map((data) => {
                                                        return (
                                                            <>
                                                                {parent.work_day_list[data.id] && data.is_student_working_day && !parent.is_break_enable &&
                                                                    <Tooltip title={parent.work_day_list[data.id].info}
                                                                        enterDelay={400}
                                                                        enterNextDelay={400} placement='top-start'
                                                                        classes={parent.work_day_list[data.id].info ? { tooltip: 'tooltip-show-data' } : { tooltip: 'bgcolor-transparent' }}>
                                                                        <TableCell className={this.handleCheckEnable(index, data.id) ? parent.work_day_list[data.id].is_enable ? 'selected-time-period create-time-table-cell-heading' : 'create-time-table-cell-heading' : 'create-time-table-cell-not-enable'}
                                                                            onClick={this.handleCheckEnable(index, data.id) ? () => this.onChangeCheckBox(index, data.id, 'period_wise') : ""}
                                                                        >
                                                                            <Box style={{ height: 'inherit' }} className={fieldError[`start_time${index}${data.id}`] ? 'red-text' : ''}>
                                                                                <Box className={this.handleCheckEnable(index, data.id) ? 'create-time-table-time-check' : 'create-time-table-time-check'}>
                                                                                    <Box className='time-table-timing-box'>
                                                                                        {parent.work_day_list[data.id].start_time && parent.work_day_list[data.id].end_time && `${timeFormat(parent.work_day_list[data.id].start_time, 'hh:mm:ss', 'hh:mm A')} - ${timeFormat(parent.work_day_list[data.id].end_time, 'hh:mm:ss', 'hh:mm A')}`}
                                                                                    </Box>
                                                                                    {parent.work_day_list[data.id].info &&
                                                                                        <Box>
                                                                                            <InfoIcon className='time-table-info' />
                                                                                        </Box>
                                                                                    }
                                                                                    {parent.work_day_list[data.id].start_time && parent.work_day_list[data.id].end_time && !parent.work_day_list[data.id].is_enable && this.handleCheckEnable(index, data.id) &&
                                                                                        <CheckBoxOutlineBlankOutlinedIcon className='timetable-checkbox-style' />
                                                                                    }
                                                                                    {parent.work_day_list[data.id].start_time && parent.work_day_list[data.id].end_time && parent.work_day_list[data.id].is_enable && this.handleCheckEnable(index, data.id) &&
                                                                                        <CheckBoxOutlinedIcon className='timetable-checkbox-style' />
                                                                                    }
                                                                                </Box>
                                                                                <Box className='create-time-table-subject-label'>
                                                                                    {parent.work_day_list[data.id].assignedData && parent.work_day_list[data.id].assignedData.subject_name}
                                                                                </Box>

                                                                                <Box className='create-time-table-staff-label'>
                                                                                    {parent.work_day_list[data.id].assignedData && parent.work_day_list[data.id].assignedData.full_name}
                                                                                </Box>
                                                                            </Box>
                                                                        </TableCell>
                                                                    </Tooltip>
                                                                }
                                                                {parent.work_day_list[data.id] && data.is_student_working_day && parent.is_break_enable &&
                                                                    <TableCell className={parent.is_break_enable ? 'selected-break-time add-period-time-table-cell' : parent.work_day_list[data.id].is_enable ? 'selected-time-period add-period-time-table-cell' : 'add-period-time-table-cell'}>
                                                                        <Box className='create-time-table-subject-label'>
                                                                            {parent.work_day_list[data.id].start_time && parent.work_day_list[data.id].end_time && `${timeFormat(parent.work_day_list[data.id].start_time, 'hh:mm:ss', 'hh:mm A')} - ${timeFormat(parent.work_day_list[data.id].end_time, 'hh:mm:ss', 'hh:mm A')}`}
                                                                        </Box>
                                                                    </TableCell>
                                                                }
                                                                {!parent.work_day_list[data.id] && data.is_student_working_day &&
                                                                    <TableCell>

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
                        </Paper >
                    }
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


export default withRouter(CreateTimeTable)
