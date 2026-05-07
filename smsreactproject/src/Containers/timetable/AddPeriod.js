import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { Link } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import CheckBoxOutlinedIcon from '@material-ui/icons/CheckBoxOutlined';
import ControlPointOutlinedIcon from '@material-ui/icons/ControlPointOutlined';
import CheckBoxOutlineBlankOutlinedIcon from '@material-ui/icons/CheckBoxOutlineBlankOutlined';
import Snackbar from '@material-ui/core/Snackbar';
import moment from 'moment';
import _ from 'lodash';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import InfoIcon from '@material-ui/icons/Info';

import MultiSelect from "react-multi-select-component";
import PreviewPeriod from 'Containers/timetable/components/PreviewPeriod'
import loadingBar from 'images/loading.gif';
import {
    Paper, Box, TextField, Grid, Button, FormControlLabel, Switch, Tooltip, Table, TableCell, TableContainer, TableHead,
    TableBody, TableRow
} from '@material-ui/core';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { Actions } from 'Constants/permissions';
import { dateFormat, timeFormat, isUserHasPermission, Alert, getUrlParam } from 'Includes/functions';
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

const override = {
    "selectSomeItems": `Select ${alias_names['standard']}`,
    "allItemsAreSelected": `All are selected.`,
    "selectAll": "Select All",
    "search": "Search",
    "clearSearch": "Clear Search"
}


class AddPeriod extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            fieldError: { entire_paper_error: {} },
            workingDays: [],
            period_list: { periods: [] },
            openSnackbar: false,
            alertData: '',
            isHalfDay: false,
            deletableIds: [],
            loading: true,
            isEdit: false,
            number_of_periods: '',
            is_period_entered: false,
            is_all_weekdays_selected: false,
            minDateValue: '',
            maxDateValue: '',
            plan_name: '',
            options: [],
            selected: [],
            period_wise: { columns: [], data: {}, new_data: [] },
            day_wise: {},
            is_week_wise: false,
            period_list_names: [],
            isBreakPeriod: false,
            delete_period_list: [],
            delete_period_ids: [],
            yearName: ''
        }
        this.dateRange = React.createRef();
    }

    componentDidMount = () => {
        if (this.props.location.pathname === Actions.period_plan.update.url) {
            if (this.props.location.state && this.props.location.state.detail) {
                let id = this.props.location.state.detail
                this.getPeriodPlanDetails(id);
            }
            else {
                this.props.history.push(Actions.period_plan.view.url);
            }
        }
        else {
            let { year, yearName, fromDate, toDate } = getUrlParam();
            if (year && yearName) {
                this.setState({
                    year: year,
                    yearName: yearName,
                }, () => {
                    this.getStandardList()
                    this.getWorkingDays();
                })
            }
            else {
                this.props.history.push(Actions.period_plan.view.url);
            }
        }
    }

    getStandardList = () => {
        let { year, standardList, options, isEdit } = this.state;
        const url = GET_URL.getstandard.api
        const params = { is_active: true, academic_year: year }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                standardList = response.data.data
                standardList.map((data) => {
                    let optionformat = {
                        label: data.name,
                        value: data.name,
                        id: data.id
                    }
                    options.push(optionformat)
                })
                this.setState({
                    standardList: response.data.data,
                    selectedYear: year,
                    loading: false,
                    options,
                }, () => {
                    if (isEdit)
                        this.updateShiftDetails()
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
            period_wise,
            loading: false,
            workingDays,
            is_period_entered: true,
            plan_name,
            selected,
            year: periodPlanDetails.academic_year,
            yearName: periodPlanDetails.academic_year_value,
        })
    }

    getWorkingDays = () => {
        let { period_wise, isEdit } = this.state;
        const url = GET_URL.days.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                period_wise.columns = response.data.data
                this.setState({
                    period_wise
                }, () => {
                    if (isEdit) {
                        this.getStandardList()
                    }
                })
            }
        })
    }


    handleCloseSnackBar = () => {
        this.setState({
            openSnackbar: false
        })
    }


    postMethod = () => {
        const { isEdit } = this.state;
        if (isEdit) {
            this.removeUnchangedPeriodData();
        }
        let post_data = this.validateDuplicatePeriod('post_data')
        if (post_data) {
            this.setState({ submitDisable: true })
            let url = POST_URL.period.api;
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
                        this.props.history.push(Actions.period_plan.view.url)
                    }
                    this.setState({ submitDisable: false })
                });
        }
    }

    removeUnchangedPeriodData = () => {
        let { period_wise, periodPlanDetails } = this.state;
        periodPlanDetails.period_period_plan.map((parentPeriod, pIndex) => {
            parentPeriod.perioddaymapping_period.map((parentDay) => {
                period_wise.new_data.map((childPeriod, cIndex) => {
                    Object.keys(childPeriod.work_day_list).map((childDay) => {
                        if (parentDay.day == childDay && pIndex == cIndex) {
                            if (parentDay['start_time'] == childPeriod.work_day_list[childDay]['start_time'] && parentDay['end_time'] == childPeriod.work_day_list[childDay]['end_time']) {
                                childPeriod.work_day_list[childDay]['isEdited'] = false
                            }
                        }
                    })
                })
            })
        })
        this.setState({
            period_wise
        })
    }

    getReturnWorkingDays = (index) => {
        let { workingDays } = this.state;
        let return_data = []
        let temp = {}
        workingDays.map((data) => {
            if (data.is_enable == index) {
                temp = {}
                temp['day'] = data.id
                return_data.push(temp)
            }
        })
        return return_data
    }


    validateDuplicatePeriod = (name) => {
        let { fieldError, period_wise, plan_name, selected, year, isEdit, periodPlanDetails, delete_period_ids, delete_period_list } = this.state;
        fieldError = {}
        let returnValue = true
        let formatValue = 'HH:mm:ss'
        let parent_temp = {}
        let child_temp = {}
        let period_temp = {}
        let parent_post_data = []
        let period_post_data = { period_list: [] }
        let days_temp = []
        period_wise.new_data.map((parent, pIndex) => {
            parent_temp = {}
            child_temp = {}
            period_post_data = { period_list: [] }
            period_post_data.name = parent.name
            period_post_data.is_break = !!parent.is_break_enable
            if (isEdit) {
                period_post_data.period_id = parent.id
            }
            days_temp = []
            for (const parent_work of Object.keys(parent.work_day_list)) {
                parent_temp.start_time = moment(parent.work_day_list[parent_work].start_time, formatValue)
                parent_temp.end_time = moment(parent.work_day_list[parent_work].end_time, formatValue)
                parent_temp.name = parent.name
                period_temp = { days: [] }
                period_temp['start_time'] = parent.work_day_list[parent_work].start_time
                period_temp['end_time'] = parent.work_day_list[parent_work].end_time
                if (!parent_temp.name) {
                    fieldError[`name${pIndex}`] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
                    returnValue = false
                }
                if (isEdit && !Boolean(parent.work_day_list[parent_work].isEdited)) {
                    continue
                }
                if (isEdit) {
                    period_temp.id = parent.work_day_list[parent_work].id
                    period_temp.period = parent.work_day_list[parent_work].period
                }
                if (!days_temp.includes(parseInt(parent_work))) {
                    period_temp['days'].push({ day: parent_work })
                    days_temp.push(parseInt(parent_work))
                }
                if (parent_temp.start_time && parent_temp.end_time) {
                    period_wise.new_data.map((child, cIndex) => {
                        Object.keys(child.work_day_list).map((child_work, cwIndex) => {
                            child_temp.start_time = moment(child.work_day_list[child_work].start_time, formatValue)
                            child_temp.end_time = moment(child.work_day_list[child_work].end_time, formatValue)
                            child_temp.name = child.name
                            if (child.work_day_list[child_work] && child.work_day_list[child_work]) {
                                if (moment(parent_temp.start_time).isBetween(child_temp.start_time, child_temp.end_time, null, '[)') && pIndex !== cIndex && parent_work === child_work) {
                                    fieldError[`start_time${pIndex}${parent_work}`] = `Error: Time conflict with ${child['name']}`;
                                    returnValue = false
                                }
                                if (moment(parent_temp.end_time).isBetween(child_temp.start_time, child_temp.end_time, null, '(]') && pIndex !== cIndex && parent_work === child_work) {
                                    fieldError[`end_time${pIndex}${parent_work}`] = `Error: Time conflict with ${child['name']}`;
                                    returnValue = false
                                }
                                if (moment(child_temp.start_time).isBetween(parent_temp.start_time, parent_temp.end_time, null, '[)') && pIndex !== cIndex && parent_work === child_work) {
                                    fieldError[`start_time${pIndex}${parent_work}`] = `Error: Time conflict with ${child['name']}`;
                                    returnValue = false
                                }
                                if (moment(child_temp.end_time).isBetween(parent_temp.start_time, parent_temp.end_time, null, '(]') && pIndex !== cIndex && parent_work === child_work) {
                                    fieldError[`end_time${pIndex}${parent_work}`] = `Error: Time conflict with ${child['name']}`;
                                    returnValue = false
                                }
                                if (!days_temp.includes(parseInt(child_work)) && parent_work !== child_work && pIndex === cIndex &&
                                    parent_temp.start_time.isSame(child_temp.start_time)
                                    && parent_temp.end_time.isSame(child_temp.end_time) && child.work_day_list[child_work].isEdited) {
                                    period_temp.days.push({ day: child_work })
                                    days_temp.push(parseInt(child_work))
                                }
                            }
                        })

                        if (parent_temp.name === child_temp.name && pIndex !== cIndex) {
                            fieldError[`name${pIndex}`] = <FormattedMessage {...commonMessages.duplicateFoundLabel} />;
                            returnValue = false
                        }
                    })
                }
                if (!!period_temp.start_time && !!period_temp.end_time && name === 'post_data' && period_temp['days'].length > 0) {
                    period_post_data.period_list.push(period_temp)
                }
                if (!!period_temp.id && !period_temp.start_time && !period_temp.end_time && name === 'post_data') {
                    delete_period_list.push(period_temp.id)
                    delete period_temp.id
                }
            }
            parent_post_data.push(period_post_data)
        })
        if (!Boolean(plan_name) && name === 'post_data') {
            fieldError['plan_name'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            returnValue = false
        }
        if (selected.length===0 && name === 'post_data') {
            fieldError['selected'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            returnValue = false
        }
        this.setState({
            fieldError,
            openSnackbar: returnValue ? false : true,
            alertData: <FormattedMessage {...commonMessages.clearAllErrors} />
        })
        if (returnValue && name === 'post_data') {
            let standards_temp = []
            selected.map((data) => {
                standards_temp.push(data.id)
            })
            returnValue = {
                "period_data": {
                    periods: parent_post_data,
                    name: plan_name,
                    academic_year: parseInt(year),
                    standard: standards_temp
                },
                "delete_perioddaymapping_list": [],
                "delete_period_ids": delete_period_ids
            }
            if (isEdit) {
                returnValue['period_data']['id'] = periodPlanDetails.id
                returnValue['delete_perioddaymapping_list'] = delete_period_list
            }
        }
        return returnValue
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

    handleAddPeriods = () => {
        let { period_list, number_of_periods, workingDays, period_wise } = this.state;
        let temp = {}
        for (let i = 1; i <= number_of_periods; i++) {
            temp = {}
            temp = { name: `Period ${i}`, start_time: null, end_time: null, enable: true }
            period_list['periods'].push(temp)
        }
        period_list['column'] = workingDays
        this.setState({
            period_list,
        }, () => {
            let new_period_wise = this.handleWorkPeriodWise()
            period_wise.data = new_period_wise
            this.setState({
                is_period_entered: true,
                period_wise
            })
        })
    }

    handleWorkPeriodWise = () => {
        let { period_list, period_wise } = this.state;
        let period_key = {}
        period_wise['new_data'] = []
        period_list.periods.map((period) => {
            period_key = {}
            period_key['name'] = period.name
            period_key['work_day_list'] = {}
            period_wise.columns.map((childWork) => {
                if (childWork.is_student_working_day) {
                    period_key['work_day_list'][childWork.id] = {}
                    period_key['work_day_list'][childWork.id]['start_time'] = period.start_time
                    period_key['work_day_list'][childWork.id]['end_time'] = period.end_time
                    period_key['work_day_list'][childWork.id]['name'] = childWork.name
                }
            })
            period_wise.new_data.push(period_key)
        })
        return period_key

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
        let { selected,fieldError } = this.state
        selected = data
        delete fieldError['selected']
        this.setState({
            selected,
            fieldError
        })
    }

    validateCheckBox = (name) => {
        let { is_week_wise, period_wise, isEdit, delete_period_id } = this.state;
        let delete_period_id_temp = []
        let returnValue = false
        let isEqual = true
        let start_time = ''
        let end_time = ''
        if (!is_week_wise) {
            period_wise.new_data.map((period) => {
                return period_wise.columns.map((data) => {
                    if (period['work_day_list'][data.id] && data.is_student_working_day && period['work_day_list'][data.id].is_enable) {
                        if (!start_time && !end_time) {
                            start_time = period['work_day_list'][data.id]['start_time']
                            end_time = period['work_day_list'][data.id]['end_time']
                        }
                        if (name === 'delete_period') {
                            delete_period_id_temp.push(period['work_day_list'][data.id]['id'] && period['work_day_list'][data.id]['id'])
                            delete period['work_day_list'][data.id]['start_time']
                            delete period['work_day_list'][data.id]['end_time']
                            period['work_day_list'][data.id].is_enable = false
                        }
                        if (start_time !== period['work_day_list'][data.id]['start_time'] || end_time !== period['work_day_list'][data.id]['end_time']) {
                            isEqual = false
                        }
                        returnValue = true
                    }
                })
            })
        }

        if (!returnValue) {
            this.setState({
                openSnackbar: true,
                alertData: 'Select Period To Perform Action'
            })
        }
        else {
            if (name === 'delete_period') {
                delete_period_id = delete_period_id_temp
                this.setState({
                    period_wise,
                    delete_period_id
                })
            }
            if (isEqual) {
                returnValue = { start_time: start_time, end_time: end_time }
            }
        }
        return returnValue
    }

    validateAssigningTime = (period) => {
        let { period_wise, isEdit, deletableIds } = this.state;
        let returnValue = { validate: true }
        period_wise.new_data.map((parent) => {
            return period_wise.columns.map((data) => {
                if (parent['work_day_list'][data.id] && data.is_student_working_day && parent['work_day_list'][data.id].is_enable) {
                    parent['work_day_list'][data.id].start_time = period.start_time
                    parent['work_day_list'][data.id].end_time = period.end_time
                    parent['work_day_list'][data.id].is_enable = false
                    if (isEdit && parent['work_day_list'][data.id].id) {
                        parent['work_day_list'][data.id].is_editable = true
                        deletableIds.push(parent['work_day_list'][data.id].id)
                    }
                }
            })
        })
        this.setState({
            period_wise,
            deletableIds
        }, () => {
            this.validateDuplicatePeriod()
        })
        return returnValue
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

    handleAddMore = () => {
        let { period_wise } = this.state;
        const validate = this.validateDuplicatePeriod();
        if (validate) {
            let period_key = {}
            period_key['name'] = ''
            period_key['work_day_list'] = {}
            period_wise.columns.map((childWork) => {
                if (childWork.is_student_working_day) {
                    period_key['work_day_list'][childWork.id] = {}
                    period_key['work_day_list'][childWork.id]['start_time'] = ''
                    period_key['work_day_list'][childWork.id]['end_time'] = ''
                    period_key['work_day_list'][childWork.id]['name'] = childWork.name
                    period_key['work_day_list'][childWork.id]['isEdited'] = true
                }
            })
            period_wise.new_data.push(period_key)
            this.setState({
                period_wise
            })
        }
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

    handleBreakPeriod = () => {
        let { isBreakPeriod } = this.state;
        this.setState({
            isBreakPeriod: !isBreakPeriod
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

    render() {
        const { loading, fieldError, isBreakPeriod, selected, plan_name, options, openSnackbar, alertData,
            number_of_periods, is_period_entered, period_wise, is_week_wise, yearName } = this.state;
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
                                Period Plan
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {isUserHasPermission('period_plan', 'create') && <Button
                                    variant="contained"
                                    component={Link} to={Actions.period_plan.view.url}
                                    className='editbutton-view'
                                ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.period_plan.view.label}</Button>}
                            </Box>
                        </Grid>
                    </Grid>
                    <Box className="year-std-box mr-40">
                        <Box className="academic-std-head "> Academic Year</Box>
                        <Box className="aca-std-white-background">{yearName}</Box>
                    </Box>
                    {!is_period_entered &&
                        <Paper className='paper-plain-background header-align  p-t-20px m-t-20px p-b-20px'>
                            <Grid container spacing={1}>
                                <Grid item md={5} xs={3} className='room-strength-asset-label'>
                                    <Box>Maximum number of periods for a day : {number_of_periods}</Box>
                                </Grid>
                                <Grid item md={2} xs={3}>
                                    <Tooltip title='Maximum number of periods for a day' placement='top-start'>
                                        <TextField
                                            label='No of periods'
                                            name='number_of_periods'
                                            type='text'
                                            size='small'
                                            value={number_of_periods}
                                            autoComplete='off'
                                            className='width-100'
                                            inputProps={{ maxLength: '2' }}
                                            fullWidth={true}
                                            variant="outlined"
                                            helperText={fieldError['number_of_periods'] ? fieldError['number_of_periods'] : ''}
                                            error={fieldError['number_of_periods']}
                                            onChange={(e) => this.handleSearchChange(e)}
                                        />
                                    </Tooltip>
                                </Grid>
                                <Grid item md={2} xs={2} className='hostel-add-building-add-button'>
                                    <AddCircleOutlineOutlinedIcon onClick={this.handleAddPeriods} className='hostel-add-building-add-button-icon' />
                                </Grid>
                            </Grid>
                        </Paper>
                    }
                    {is_period_entered &&
                        <Paper className='paper-plain-background  p-t-20px m-t-20px p-b-20px'>
                            <Grid container spacing={2} >
                                <Grid item md={3} xs={12}>
                                    <TextField
                                        label='Plan Name'
                                        name='plan_name'
                                        type='text'
                                        value={plan_name}
                                        autoComplete='off'
                                        className='width-form-100'
                                        inputProps={{ maxLength: '20' }}
                                        fullWidth={true}
                                        variant="outlined"
                                        helperText={fieldError['plan_name'] ? fieldError['plan_name'] : ''}
                                        error={fieldError['plan_name']}
                                        onChange={(e) => this.handleSearchChange(e)}
                                    />
                                </Grid>
                                <Grid item md={3} xs={12} className='header-lign'>
                                    <Box className='header-lign'>
                                        <MultiSelect
                                            options={options}
                                            value={selected}
                                            onChange={(e) => this.setSelected(e)}
                                            className={fieldError.selected ? "review-quiz-section-error " : "review-quiz-section"}
                                            labelledBy={"Select"}
                                            overrideStrings={override}
                                        />
                                        <Box className='section-error'>{fieldError.selected}</Box>
                                    </Box>
                                </Grid>
                                <Grid item md={3} xs={12} className='align-self-center'>
                                    <AssignTiming
                                        validateCheckBox={this.validateCheckBox}
                                        validateAssigningTime={this.validateAssigningTime}
                                    />
                                </Grid>
                                <Grid item md={3} xs={12} className='align-self-center'>
                                    <Button
                                        className='apply-leave-reset-button'
                                        onClick={() => this.validateCheckBox('delete_period')}>Delete Period
                                    </Button>
                                </Grid>
                            </Grid>
                            {is_period_entered && !is_week_wise &&
                                <>
                                    <TableContainer className=' header-align p-t-20px'>
                                        <Table size='small' aria-label='simple table' className='exam-mark-row-table'>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell className='add-period-time-table-side-heading'>
                                                        {/* <Button variant="contained"
                                                            className='previous-but'
                                                            onClick={this.handleBreakPeriod}
                                                        >
                                                            Mark Break Period
                                                        </Button> */}
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
                                                    <TableCell className='border-none'>
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {period_wise.new_data.map((parent, index) => {
                                                    return <TableRow>
                                                        <TableCell className={parent.is_break_enable ? 'selected-break-time add-period-time-table-side-heading' : 'add-period-time-table-side-heading'}>
                                                            <Box style={{ height: 'inherit' }}>
                                                                <Tooltip title='Is Break Period'
                                                                    enterDelay={400}
                                                                    enterNextDelay={400} placement='top-start'
                                                                    classes={{ tooltip: 'tooltip-show-data end-flex-prop' }}>
                                                                    <Box className=''>
                                                                        {!parent.is_break_enable &&
                                                                            <CheckBoxOutlineBlankOutlinedIcon className='timetable-checkbox-style cursor-pointer' onClick={() => this.onChangeBreakCheckBox(index)} />
                                                                        }
                                                                        {parent.is_break_enable &&
                                                                            <CheckBoxOutlinedIcon className='timetable-checkbox-style cursor-pointer' onClick={() => this.onChangeBreakCheckBox(index)} />
                                                                        }
                                                                    </Box>
                                                                </Tooltip>
                                                                <Tooltip title={fieldError[`name${index}`]}
                                                                    enterDelay={400}
                                                                    enterNextDelay={400} placement='top-start'
                                                                    classes={fieldError[`name${index}`] ? { tooltip: 'tooltip-show-data' } : { tooltip: 'bgcolor-transparent' }}>
                                                                    <Box className='create-time-table-subject-label'>
                                                                        <TextField
                                                                            id="number"
                                                                            label=""
                                                                            type="text"
                                                                            name='name'
                                                                            autoComplete="off"
                                                                            className={fieldError[`name${index}`] ? 'cursor-pointer' : ''}
                                                                            value={parent.name}
                                                                            onChange={(e) => this.handleChange(e, index)}
                                                                            onBlur={() => this.validateDuplicatePeriod()}
                                                                            InputProps={{
                                                                                endAdornment: (
                                                                                    fieldError[`name${index}`] ?
                                                                                        <InfoIcon className='time-table-info-icon' />
                                                                                        : ''
                                                                                )
                                                                            }}
                                                                            disabled={isBreakPeriod}
                                                                            defaultValue=""
                                                                            InputLabelProps={{
                                                                                shrink: true,
                                                                            }}
                                                                            inputProps={{
                                                                                max: 200,
                                                                                min: 0
                                                                            }}
                                                                            error={fieldError[`name${index}`] && (fieldError[`name${index}`] ? true : false)}
                                                                        />

                                                                    </Box>
                                                                </Tooltip>
                                                            </Box>
                                                        </TableCell>
                                                        {
                                                            period_wise.columns.map((data) => {
                                                                return (
                                                                    <>
                                                                        {parent.work_day_list[data.id] && data.is_student_working_day && !isBreakPeriod &&
                                                                            <Tooltip title={fieldError[`start_time${index}${data.id}`]}
                                                                                enterDelay={400}
                                                                                enterNextDelay={400} placement='top-start'
                                                                                classes={fieldError[`start_time${index}${data.id}`] ? { tooltip: 'tooltip-show-data' } : { tooltip: 'bgcolor-transparent' }}>
                                                                                <TableCell className={parent.is_break_enable ? 'selected-break-time add-period-time-table-cell' : parent.work_day_list[data.id].is_enable ? 'selected-time-period add-period-time-table-cell' : 'add-period-time-table-cell'}
                                                                                    onClick={() => this.onChangeCheckBox(index, data.id, 'period_wise')}
                                                                                >
                                                                                    <Box style={{ height: 'inherit' }} className={fieldError[`start_time${index}${data.id}`] ? 'red-text' : ''}>
                                                                                        <Box className='add-period-time-table-time-check'>
                                                                                            <Box>
                                                                                                {fieldError[`start_time${index}${data.id}`] &&
                                                                                                    <InfoIcon className='time-table-info-icon' />
                                                                                                }
                                                                                            </Box>
                                                                                            <Box>
                                                                                                {!parent.work_day_list[data.id].is_enable &&
                                                                                                    <CheckBoxOutlineBlankOutlinedIcon className='timetable-checkbox-style' />
                                                                                                }
                                                                                                {parent.work_day_list[data.id].is_enable &&
                                                                                                    <CheckBoxOutlinedIcon className='timetable-checkbox-style' />
                                                                                                }
                                                                                            </Box>
                                                                                        </Box>
                                                                                        <Box className='create-time-table-subject-label'>
                                                                                            {parent.work_day_list[data.id].start_time && `${timeFormat(parent.work_day_list[data.id].start_time, 'hh:mm:ss', 'hh:mm A')}`}
                                                                                        </Box>
                                                                                        <Box className='create-time-table-subject-label'>
                                                                                            {parent.work_day_list[data.id].end_time && `${timeFormat(parent.work_day_list[data.id].end_time, 'hh:mm:ss', 'hh:mm A')}`}
                                                                                        </Box>
                                                                                    </Box>
                                                                                </TableCell>
                                                                            </Tooltip>
                                                                        }
                                                                        {parent.work_day_list[data.id] && data.is_student_working_day && isBreakPeriod &&
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
                                                        < TableCell className='border-none' >
                                                            <Button onClick={() => this.handleDeletePeriod(index)}>
                                                                <DeleteOutlineIcon className='red-text' />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                })
                                                }
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            }
                            <Button className='m-t-20px' onClick={() => this.handleAddMore()}>
                                <ControlPointOutlinedIcon />
                                <Box className='p-l-20px'>Add More</Box>
                            </Button>
                        </Paper >
                    }
                    {
                        is_period_entered &&
                        <Box className="submt-button-float-bottom" mt={3}>
                            <Button
                                className='submit'
                                variant="contained"
                                style={{ 'float': 'right' }}
                                onClick={this.postMethod}
                                disabled={this.state.submitDisable}>
                                Submit
                            </Button>
                        </Box>
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


export default withRouter(AddPeriod)
