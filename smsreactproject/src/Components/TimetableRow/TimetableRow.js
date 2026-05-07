import React, { Component } from 'react';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import { withRouter } from 'react-router-dom';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import { Link } from 'react-router-dom';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import {
    Paper, Box, Typography, Grid, MenuItem,
    Select, InputLabel, FormControl, Button,
    FormHelperText, TableContainer, Table,
} from '@material-ui/core';
import Tooltip from '@material-ui/core/Tooltip';
import Icon from '@material-ui/core/Icon';
import EditIcon from '@material-ui/icons/Edit';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import Swal from 'sweetalert2'
import { Actions } from 'Constants/permissions';

import moment from 'moment';
import TimeDialog from './CreateTimingDialog'
import { withStyles } from '@material-ui/core/styles';
import LoadingGif from 'Components/LoadingGif';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert, getUrlParam, isUserHasPermission, timeFormat } from 'Includes/functions';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import './styles.scss';

const Styles = theme => ({
    overrides: {
        "MuiSelect-select": {
            background: "yellow",
        },
    },
    selectInput: {
        border: '1px dashed rgba(151, 151, 151, 0.5)',
        borderRadius: '5px',
        paddingLeft: '10px'
    },
    selectLabel: {
        color: '#777070 !important',
        left: '1.3rem',
    },
    selectIcon: {
        right: '0.65rem',
    },
    mediaOne: {
        width: '100%',
        height: '100%',
    },
    mediaTwo: {
        width: '100%',
        height: '100vh',
    },
    paperTitle: {
        fontWeight: '500',
        fontSize: '1.7rem',
    },
    paperCaption: {
        color: '#bdbdbd',
    },
    tableHeaderRowStyle: {
        backgroundColor: "white",
        boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.15)",
        borderRadius: "15px 15px 0px 0px",
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: 500,
    },
    tableTimingCells: {
        background: "white",
        textAlign: "center",
    },
    tablePeriodCells: {
        borderRight: "1px solid #E9E9EA",
    },
    icon: {
        color: "linear-gradient(0deg, #757575, #757575), #1962FE",
    },
    selectStyle: {
        background: "#FBFDFD",
        border: "1px dashed rgba(151, 151, 151, 0.5)",
        borderRadius: "5px",
    },
    timingSelect: {
        backgroundColor: "white !important",
    },
    inputStyle: {
        transform: "translate(-10px, 34px) scale(1)",
        fontFamily: 'Roboto',
        fontStyle: 'normal',
        fontWeight: 500,
    },
    tableSelects: {
        border: "0px",
    },
    pos: {
        marginBottom: 3,
        fontWeight: 500,
        color: "black"
    },
    root: {
        minWidth: 275,
    },
    submitButton: {
        background: 'linear-gradient(180deg, #99D156 0%, #5E9824 100%)!important',
        boxShadow: '4px 4px 4px rgba(0, 0, 0, 0.25)',
        fontWeight: "bold",
        fontFamily: "Roboto",
        pointer: "cursor",
        margin: theme.spacing(1),
        padding: '10px',
        color: 'white'
    }
});


class TimetableRow extends Component {

    constructor(props) {
        super(props);
        this.state = {
            dialogs: {},
            periodList: [],
            daysList: [],
            currentSelectedList: {},
            periodRangeDialogOpen: null,
            periodTimings: [],
            staffSubMappings: {},
            tempPeriod: { "name": null, "start_time": null, "end_time": null },
            tableSelects: {},
            lastIndexSelects: 0,
            rows: [],
            newTimetableDataReceived: null,
            loading: false,
            timetableId: '',
            isCreate: false,
            isView: false,
            isUpdate: false
        };
    }

    createTimetableSettings = async (academicYearId, timetableId, standardSectionId, rows) => {
        this.setState({ loading: !this.state.loading });
        let daysData = await getRequest(GET_URL.days.api);
        let daysList = daysData.data.data.map((record) => {
            let day = {};
            day['id'] = record.id;
            day['name'] = record.name;
            return day;
        });

        // Get timetable data if already present
        let timetableParams = {
            date_range: timetableId,
            standard_section: standardSectionId,
        }
        // Get available periods if present
        let periodParams = {
            date_range: timetableId,
        }
        let periods = await getRequest(GET_URL.periods.api, periodParams);
        let periodList = periods.data.data.map((record) => {
            let period = {};
            period['id'] = record.id;
            period['name'] = record.name;
            period['start_time'] = record.start_time;
            period['end_time'] = record.end_time;
            period['is_selected'] = false;
            return period;
        });
        let staffSubMappingParams = {
            academic_year: academicYearId,
        }
        let staffSubjectMappingResp = await getRequest(GET_URL.getstaffsubmapping.api, staffSubMappingParams);
        let staffSubMappings = (staffSubjectMappingResp && staffSubjectMappingResp.data && staffSubjectMappingResp.data) ?
            staffSubjectMappingResp.data.data : {};
        let { lastIndexSelects, tableSelects } = this.state;
        let existingPeriodIds = [];
        let timetableResp = await getRequest(GET_URL.assigntimetable.api, timetableParams);
        if (timetableResp.data && timetableResp.data.data && timetableResp.data.data.length) {
            // Create rows based on periods if already selected for a timetable;
            for (let i = 0; i < timetableResp.data.data.length; i++) {
                if (existingPeriodIds.indexOf(timetableResp.data.data[i].period) == -1) {
                    existingPeriodIds.push(timetableResp.data.data[i].period);
                }
            }
        }

        if (existingPeriodIds && existingPeriodIds.length) {
            for (let i = 0; i < existingPeriodIds.length; i++) {
                let rowObject = {};
                rowObject['timing_id'] = existingPeriodIds[i];
                rowObject['rowSelects'] = [];
                if (daysList && staffSubMappings) {
                    for (let j = 0; j < daysList.length; j++) {
                        let key = "select" + lastIndexSelects;
                        rowObject['rowSelects'].push(key);
                        tableSelects[key] = {};
                        tableSelects[key]['day_id'] = daysList[j].id;
                        tableSelects[key]['periodTimingKeyToPluck'] = 0;
                        tableSelects[key]['staff_id'] = '';
                        tableSelects[key]['subject_id'] = '';
                        tableSelects[key]['period'] = i;
                        tableSelects[key]['availableTeachers'] = [];
                        tableSelects[key]['enable_edit'] = false;
                        tableSelects[key]['enable_delete'] = false;
                        timetableResp.data.data.forEach((data) => {
                            if (data.day == daysList[j].id && data.period == existingPeriodIds[i]) {
                                tableSelects[key]['staff_id'] = data.staff;
                                tableSelects[key]['subject_id'] = data.subject;
                                tableSelects[key]['id'] = data.id;
                                tableSelects[key]['enable_edit'] = (this.state.isView) ? false : true;
                                tableSelects[key]['enable_delete'] = (this.state.isView) ? false : true;
                            }
                        });
                        lastIndexSelects++;
                    }
                }
                rows.push(rowObject);
            }
        } else {
            let rowObject = {};
            rowObject['timing_id'] = null;
            rowObject['rowSelects'] = [];
            if (daysList && staffSubMappings) {
                for (let i = 0; i < daysList.length; i++) {
                    let key = "select" + lastIndexSelects;
                    rowObject['rowSelects'].push(key);
                    tableSelects[key] = {};
                    tableSelects[key]['day_id'] = daysList[i].id;
                    tableSelects[key]['periodTimingKeyToPluck'] = 0;
                    tableSelects[key]['staff_id'] = '';
                    tableSelects[key]['subject_id'] = '';
                    tableSelects[key]['period'] = '';
                    tableSelects[key]['availableTeachers'] = [];
                    tableSelects[key]['enable_edit'] = false;
                    lastIndexSelects++;
                }
            }
            rows.push(rowObject);
        }

        let finalTimetableObject = {};
        finalTimetableObject['periodList'] = periodList;
        finalTimetableObject['daysList'] = daysList;
        finalTimetableObject['staffSubMappings'] = staffSubMappings;
        finalTimetableObject['tableSelects'] = tableSelects;
        finalTimetableObject['lastIndexSelects'] = lastIndexSelects;
        finalTimetableObject['rows'] = rows;
        return finalTimetableObject;
    }


    componentDidMount = async () => {
        let currentSelectedList = getUrlParam();
        let { rows, isCreate, isView, isUpdate } = { ...this.state };
        let academicYearId = currentSelectedList.academic_year;
        let timetableId = currentSelectedList.timetable_id;
        let standardSectionId = currentSelectedList.standard_section_id;
        let timetableSettings = await this.createTimetableSettings(academicYearId, timetableId, standardSectionId, rows);
        if (Actions.timetable_view.view.url == this.props.location.pathname) {
            isView = true;
        } else if (Actions.assign_timetable.create.url == this.props.location.pathname) {
            isCreate = true;
        } else {
            isUpdate = true;
        }
        this.setState({
            currentSelectedList, periodList: timetableSettings.periodList,
            daysList: timetableSettings.daysList, staffSubMappings: timetableSettings.staffSubMappings,
            tableSelects: timetableSettings.tableSelects, lastIndexSelects: timetableSettings.lastIndexSelects,
            rows: timetableSettings.rows, loading: !this.state.loading, timetableId: currentSelectedList.timetable_id,
            isView, isCreate, isUpdate
        });
    }

    shouldComponentUpdate = async (nextProps, nextState) => {
        if (nextState.rows.length > this.state.rows.length) {
            return true;
        } else {
            return false;
        }
    }

    handleDialogOpen = async (e) => {
        let { dialogs } = this.state;
        dialogs[e.currentTarget.id] = true;
        this.setState({ dialogs });
    }

    handleDialogClose = async (e, id) => {
        let { dialogs } = this.state;
        dialogs[id] = false;
        this.setState(dialogs);
    }

    addTableRow = () => {
        let { daysList, lastIndexSelects } = this.state;
        let rows = [...this.state.rows];
        let rowObject = {};
        rowObject['timing_id'] = null;
        rowObject['rowSelects'] = [];
        let tableSelects = { ...this.state.tableSelects };
        for (let i = 0; i < daysList.length; i++) {
            let key = "select" + lastIndexSelects;
            let tempObj = {};
            rowObject['rowSelects'].push(key);
            tempObj[key] = {};
            tempObj[key]['day_id'] = daysList[i].id;
            tempObj[key]['periodTimingKeyToPluck'] = 0;
            tempObj[key]['staff_id'] = '';
            tempObj[key]['subject_id'] = '';
            tempObj[key]['availableTeachers'] = [];
            tempObj[key]['enable_edit'] = false;
            lastIndexSelects++;
            tableSelects = { ...tableSelects, ...tempObj };
        }
        rows.push(rowObject);
        this.setState({ rows, tableSelects, lastIndexSelects });
    }

    deleteRow = (rowIndex) => {
        let { rows, tableSelects } = { ...this.state };
        for (let i = 0; i < rows[rowIndex]['rowSelects'].length; i++) {
            tableSelects[rows[rowIndex]['rowSelects'][i]] = { ...tableSelects[rows[rowIndex]['rowSelects'][i]] };
            delete tableSelects[rows[rowIndex]['rowSelects'][i]];
        }
        rows.splice(rowIndex, 1);
        this.checkDuplicatePeriods(rows)
        this.setState({ rows, tableSelects });
    }


    submitPeriodsForCreation = (tempPeriod) => {
        let returnErrorMessage = '';
        if (tempPeriod.start_time !== '' && tempPeriod.end_time != '' && tempPeriod.name !== '') {
            let periodData = { ...tempPeriod };
            periodData.start_time = moment(periodData.start_time).format("HH:mm:00");
            periodData.end_time = moment(periodData.end_time).format("HH:mm:00");
            let { currentSelectedList } = this.state;
            let periodListToSend = {};
            periodListToSend["periods"] = [periodData];
            periodListToSend["date_range"] = currentSelectedList.timetable_id;
            let props = { 'return_error_message': true };
            return postRequest(POST_URL.periods.api, periodListToSend, props).then((response) => {
                if (response && response.status === 200) {
                    this.getPeriods();
                    return '';
                } else {
                    returnErrorMessage = response;
                    return returnErrorMessage;
                }
            });
        }

    }

    getPeriods = async () => {
        let periodParams = {
            date_range: this.state.currentSelectedList.timetable_id
        }
        getRequest(GET_URL.periods.api, periodParams).then((response) => {
            if (response && response.status === 200) {
                let periodList = response.data.data.map((record) => {
                    let period = {};
                    period['id'] = record.id;
                    period['name'] = record.name;
                    period['start_time'] = record.start_time;
                    period['end_time'] = record.end_time;
                    period['is_selected'] = false;
                    return period;
                });
                this.setState({ periodRangeDialogOpen: null, periodList });
            }
        })
    }

    handlePeriodChange = (e, tableCellPeriodTiming) => {
        if (e == "addperiod") {
            this.setState({ periodRangeDialogOpen: true });
        } else {
            let { rows } = { ...this.state };
            rows[tableCellPeriodTiming] = { ...this.state.rows[tableCellPeriodTiming] };
            rows[tableCellPeriodTiming].timing_id = e.target.value;

            this.checkDuplicatePeriods(rows);

            this.setState({ rows });
        }
    }

    checkDuplicatePeriods = (rows) => {
        let selectedTimings = rows.map(row => {
            return row.timing_id;
        });

        let repeatedTimings = [];
        // Get Repeated timings
        selectedTimings.forEach((timing, index) => {
            let arr = [];
            if (index + 1 !== selectedTimings.length) {
                for (let i = index + 1; i <= selectedTimings.length; i++) {
                    if (selectedTimings[i] !== null && selectedTimings[i] !== undefined && timing == selectedTimings[i]) {
                        arr.push(i);
                    }
                }
                if (arr.length > 0) {
                    arr.push(index);
                    arr.forEach(timing => {
                        if (repeatedTimings.indexOf(timing) == -1) {
                            repeatedTimings.push(timing);
                        }
                    });
                }
            }
        });
        // Set error for duplicate timings
        for (let i = 0; i < rows.length; i++) {
            if (repeatedTimings.indexOf(i) !== -1) {
                rows[i]['error'] = true;
            } else {
                rows[i]['error'] = false;
            }
        }
        return rows
    }

    openPeriodDialog = () => {
        this.setState({ periodRangeDialogOpen: true });
    }

    closePeriodDialog = () => {
        this.setState({ periodRangeDialogOpen: null });
    }

    handlePeriodDeselect = (e, periodId) => {
        e.stopPropagation();
        e.preventDefault();
        let { periodList } = { ...this.state };
        let periodsAfterDeslection = periodList.map((period) => {
            if (period.id == periodId) {
                let tempPeriod = { ...period };
                tempPeriod.is_selected = false;
                return tempPeriod;
            } else {
                return period;
            }
        });
        this.setState({ periodList: periodsAfterDeslection });
    }

    handleMenuBubbling = (e) => {
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
    }

    handleTimetableSelectChange = (e, change, tableSelectId, dayId, periodId) => {
        let { tableSelects, staffSubMappings } = { ...this.state };
        if (change == "subject") {
            if (e.target.value != 0) {
                let subjectId = e.target.value;
                // Destructuring to prevent state ref modification
                if (staffSubMappings.subject_staff_mapping.hasOwnProperty(subjectId)) {
                    tableSelects[tableSelectId] = { ...tableSelects[tableSelectId] };
                    tableSelects[tableSelectId]['subject_id'] = subjectId;
                    tableSelects[tableSelectId].availableTeachers = [...tableSelects[tableSelectId].availableTeachers];
                    let availableTeachers = [...staffSubMappings.subject_staff_mapping[subjectId]];
                    tableSelects[tableSelectId].availableTeachers = availableTeachers;
                    this.setState({ tableSelects });
                } else if (tableSelects[tableSelectId].staff_id !== '' || subjectId !== tableSelects[tableSelectId].subject_id) {
                    tableSelects[tableSelectId] = { ...tableSelects[tableSelectId] };
                    tableSelects[tableSelectId]['subject_id'] = subjectId;
                    tableSelects[tableSelectId].availableTeachers = [...tableSelects[tableSelectId].availableTeachers];
                    tableSelects[tableSelectId].availableTeachers = [];
                    tableSelects[tableSelectId]['staff_id'] = '';
                    this.setState({ tableSelects });
                }
            }
        } else if (change == 'staff') {
            if (e.target.value != "Add Faculty") {
                let staffId = e.target.value;
                tableSelects[tableSelectId]['staff_id'] = staffId;
                tableSelects[tableSelectId] = { ...tableSelects[tableSelectId], ...tableSelects[tableSelectId]['enable_edit'] };
                tableSelects[tableSelectId]['enable_edit'] = (this.state.isView) ? false : !tableSelects[tableSelectId]['enable_edit'];
                tableSelects[tableSelectId]['period'] = periodId
                this.setState({ tableSelects });
            }
        } else {
            tableSelects[tableSelectId] = { ...tableSelects[tableSelectId], ...tableSelects[tableSelectId]['enable_edit'] };
            tableSelects[tableSelectId]['enable_edit'] = !tableSelects[tableSelectId]['enable_edit'];
            this.setState({ tableSelects });
        }

    }

    handleTableEdit = (e, tableSelectId) => {
        let { tableSelects, isView } = { ...this.state };
        tableSelects[tableSelectId] = { ...tableSelects[tableSelectId], ...tableSelects[tableSelectId]['enable_edit'] };
        tableSelects[tableSelectId]['enable_edit'] = (isView) ? false : !tableSelects[tableSelectId]['enable_edit'];
        tableSelects[tableSelectId]['staff_id'] = "";
        tableSelects[tableSelectId]['subject_id'] = "";
        tableSelects[tableSelectId]['availableTeachers'] = [];
        delete tableSelects[tableSelectId]['id'];
        this.setState({ tableSelects });
    }

    handleTimetableSubmission = async () => {
        this.setState({ submitDisable: true });
        let { currentSelectedList } = this.state;
        let { tableSelects, rows } = this.state;
        let timeTablePostData = {};
        timeTablePostData['date_range'] = currentSelectedList.timetable_id;
        timeTablePostData['standard_section'] = currentSelectedList.standard_section_id;
        timeTablePostData['schedules'] = [];
        let tableSelectKeys = Object.keys(tableSelects);
        tableSelectKeys.map((periodKey) => {
            if (tableSelects[periodKey].subject_id !== "" && tableSelects[periodKey].staff_id !== "") {
                let tempPeriodData = {};
                let periodId = rows[tableSelects[periodKey].period].timing_id;
                tempPeriodData['day'] = tableSelects[periodKey].day_id;
                tempPeriodData['staff'] = tableSelects[periodKey].staff_id;
                tempPeriodData['subject'] = tableSelects[periodKey].subject_id;
                if (tableSelects[periodKey].hasOwnProperty('id') && tableSelects[periodKey].id !== null) {
                    tempPeriodData['id'] = tableSelects[periodKey].id;
                }
                tempPeriodData['period'] = periodId;
                timeTablePostData.schedules.push(tempPeriodData);
            }
        });
        let validateResult = this.validateData(timeTablePostData);
        if (validateResult['Result']) {
            const params = { 'academic_year': currentSelectedList.academic_year };
            postRequest(POST_URL.assigntimetable.api, timeTablePostData, params).then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    }).then(
                        this.props.history.push(Actions.assign_timetable.view.url)
                    )
                }
                else {
                    this.setState({
                        errorContent: response,
                    })
                }
            });
        } else {
            this.setState({
                openSnackbar: true, errorStatus: 'error', alertData: validateResult['error']
            })
        }
    }

    validateData(postData) {
        let result = { 'Result': true, 'error': {} }
        if (postData.schedules.length < 1) {
            result['Result'] = false;
            result['error'] = 'Scheduled Timetable cant be empty';
            return result
        }
        return result;
    }

    handleCloseSnackBar = () => {
        this.setState({
            openSnackbar: false
        });
    }

    render() {
        const { periodList, daysList, periodRangeDialogOpen,
            staffSubMappings, tableSelects,
            rows, currentSelectedList, loading, alertData, openSnackbar,
            errorStatus, isCreate, isUpdate, isView } = this.state;
        const { classes } = this.props;
        let Cells = [];
        let errorPresent = null;
        let tableHeaderRow;
        let disabled = true;

        // Plot TimeTable Header
        if (daysList && daysList.length) {
            let days = daysList.map((day, index) => {
                return (<TableCell id={day.id} style={{ 'border-right': '1px solid #E9E9EA', 'text-transform': 'uppercase' }} align="center">{day.name}</TableCell>)
            });
            tableHeaderRow = (
                <TableHead>
                    <TableRow class={classes.tableHeaderRowStyle}>
                        <TableCell style={{ 'border-right': '1px solid #E9E9EA', 'text-transform': 'uppercase' }} id="create-period-cell" align="center">
                            {(isCreate || isUpdate) &&
                                <Button onClick={this.openPeriodDialog} variant="contained" color="primary">Add Period Timings</Button>
                            }
                        </TableCell>
                        {days}
                    </TableRow>
                </TableHead>
            )
        } else {
            errorPresent = true;
        }
        if (staffSubMappings && staffSubMappings.hasOwnProperty("subjectList")) {
            for (let j = 0; j < rows.length; j++) {
                disabled = (rows[j].timing_id !== null ? false : true);
                // Creating DOM for timetable selection columns
                let subjectItems = Object.keys(staffSubMappings.subjectList);
                let cellRows = [];
                let timingId = (rows[j].hasOwnProperty("timing_id")) ? rows[j].timing_id : null;
                for (let i = 0; i < rows[j]['rowSelects'].length; i++) {
                    let selectBoxKey = rows[j]['rowSelects'][i];
                    let selectedSubject = null;
                    let subjectElements = subjectItems && subjectItems.length ? (
                        subjectItems.map(subjectId => {
                            if (tableSelects[selectBoxKey].subject_id !== '') {
                                selectedSubject = tableSelects[selectBoxKey].subject_id;
                                return <MenuItem key={subjectId} name={staffSubMappings.subjectList[subjectId]}
                                    value={parseInt(subjectId)}>
                                    {staffSubMappings.subjectList[subjectId]}
                                </MenuItem>
                            } else {
                                return <MenuItem key={subjectId} name={staffSubMappings.subjectList[subjectId]} value={parseInt(subjectId)}>
                                    {staffSubMappings.subjectList[subjectId]}
                                </MenuItem>;
                            }
                        })
                    ) : null;

                    let selectedTeacher = null;
                    let teacherElements = (tableSelects && tableSelects[selectBoxKey] && tableSelects[selectBoxKey].availableTeachers.length) ? (
                        tableSelects[selectBoxKey].availableTeachers.map(teacherId => {
                            if (tableSelects[selectBoxKey].staff_id !== '') {
                                selectedTeacher = tableSelects[selectBoxKey].staff_id;
                                return <MenuItem key={teacherId} name={staffSubMappings.staffList[teacherId]} value={teacherId}>
                                    {staffSubMappings.staffList[teacherId]}
                                </MenuItem>;
                            } else {
                                return <MenuItem key={teacherId} name={staffSubMappings.staffList[teacherId]} value={teacherId}>
                                    {staffSubMappings.staffList[teacherId]}
                                </MenuItem>;
                            }

                        })
                    ) : null;


                    let cell = (<TableCell style={{ 'borderRight': '1px solid #E9E9EA', 'borderBottom': '1px solid #E9E9EA', padding: "3px" }}
                        classes={{ classes: { root: classes.tablePeriodCells } }} align="center">
                        {(tableSelects && tableSelects[selectBoxKey] && tableSelects[selectBoxKey].enable_edit) && (isCreate || isUpdate) ? (
                            <Box display="flex" justifyContent="flex-end">
                                <Tooltip title="edit" aria-label="text">
                                    <EditIcon className="icon-color edit-icon" style={{ marginBottom: '0px', marginTop: '-10px' }}
                                        onClick={(e) => { this.handleTableEdit(e, selectBoxKey) }} />
                                </Tooltip>
                            </Box>
                        ) : null}
                        {(tableSelects && tableSelects[selectBoxKey] && tableSelects[selectBoxKey].enable_edit) ?
                            (<Tooltip title={staffSubMappings.subjectList[tableSelects[selectBoxKey].subject_id]} aria-label="text">
                                <Box className="table-cell-timetable" mb={1} mt={isView ? 2 : 1}>
                                    {staffSubMappings.subjectList[tableSelects[selectBoxKey].subject_id]}
                                </Box>
                            </Tooltip>) :
                            !isView &&
                            <Box pt={2} >
                                <FormControl style={{ 'max-width': '9rem', 'width': '9rem' }}>
                                    <InputLabel
                                        id="class-label"
                                        className={classes.selectLabel}
                                    >
                                        {selectedSubject !== null ? '' : 'Add Subject'}
                                    </InputLabel>
                                    <Select
                                        labelId="class-label"
                                        id={selectBoxKey}
                                        displayEmpty={true}
                                        disabled={disabled}
                                        value={selectedSubject}
                                        onChange={(e) => this.handleTimetableSelectChange(e, 'subject', selectBoxKey, daysList[i].id)}
                                        dayId={daysList[i].id}
                                        disableUnderline={true}
                                        inputProps={{
                                            classes: {
                                                icon: classes.selectIcon,
                                                root: classes.selectInput,
                                            }
                                        }}
                                    >
                                        <MenuItem value="0">
                                            <em>Add Subject</em>
                                        </MenuItem>
                                        {subjectElements}
                                    </Select>
                                </FormControl>
                            </Box>
                        }

                        {(tableSelects && tableSelects[selectBoxKey] && tableSelects[selectBoxKey].enable_edit) ?
                            (<React.Fragment>
                                <Tooltip title={staffSubMappings.staffList[tableSelects[selectBoxKey].staff_id]} aria-label="text"><Typography variant="subtitle2"
                                    gutterBottom style={{
                                        "padding": "5px", "background": "#18A453", "color": "white", "border-radius": "3px",
                                        'max-width': '9rem', 'width': '9rem', 'text-overflow': 'ellipsis', 'margin-left': 'auto', 'margin-right': 'auto',
                                        'margin-top': '12px', 'overflow': 'hidden', 'white-space': 'nowrap', 'margin-bottom': '12px', 'marginLeft': 'auto', 'marginRight': 'auto'
                                    }}>
                                    {staffSubMappings.staffList[tableSelects[selectBoxKey].staff_id]}
                                </Typography>
                                </Tooltip>
                            </React.Fragment>) :
                            !isView &&
                            <Box mb={2}>
                                <FormControl className={classes.tableSelects} style={{ 'max-width': '9rem', 'width': '9rem' }}>
                                    <InputLabel
                                        id="class-label"
                                        className={classes.selectLabel}
                                    >
                                        {selectedTeacher !== null ? '' : 'Add Faculty'}
                                    </InputLabel>
                                    <Select
                                        labelId="class-label"
                                        id={"subject" + selectBoxKey}
                                        displayEmpty={true}
                                        disabled={disabled || tableSelects[selectBoxKey].availableTeachers.length == 0 ? true : null}
                                        value={selectedTeacher}
                                        onChange={(e) => this.handleTimetableSelectChange(e, 'staff', selectBoxKey, daysList[i].id, j)}
                                        disableUnderline={true}
                                        inputProps={{
                                            classes: {
                                                icon: classes.selectIcon,
                                                root: classes.selectInput,
                                            }
                                        }}
                                    >
                                        {teacherElements}
                                    </Select>
                                    {/* {selectedStandard == '' ? <FormHelperText style={{'font-weight': 'bold', 'text-align': 'center', 'color': 'red'}}>Select Standard First</FormHelperText>: null} */}
                                    {teacherElements == null && tableSelects[selectBoxKey].subject_id !== '' ? <FormHelperText style={{ 'font-weight': 'bold', 'color': 'red', 'text-align': 'center', 'margin-right': 0, 'margin-left': 0 }}>No Teachers Assigned</FormHelperText> : null}
                                </FormControl>
                            </Box>
                        }
                    </TableCell>);
                    cellRows.push(cell);
                }
                let defaultSelectedPeriod = null;
                let periodName = '';
                let periodStartTime = '';
                let periodEndTime = '';
                let periodListMenuItems = periodList.map((period, index) => {
                    if (rows[j].timing_id !== null && period.id == rows[j].timing_id) {
                        defaultSelectedPeriod = period.id;
                        periodStartTime = period.start_time;
                        periodEndTime = period.end_time;
                        periodName = period.name;
                        return (<MenuItem key={index} value={period.id} onChange={(e) => { this.handleMenuBubbling(e) }}>
                            {`${moment(period.start_time, "hh:mm a").format("hh:mm a")} - ${moment(period.end_time, "hh:mm a").format("hh:mm a")} (${period.name})`}
                        </MenuItem>)
                    } else {
                        return (<MenuItem key={index} value={period.id} onChange={(e) => { this.handleMenuBubbling(e) }}>
                            {`${moment(period.start_time, "hh:mm a").format("hh:mm a")} - ${moment(period.end_time, "hh:mm a").format("hh:mm a")} (${period.name})`}
                        </MenuItem>)
                    }
                })

                let periodTimingSelected = (rows[j].hasOwnProperty('error') && rows[j]['error'] == true) ? true : null;
                errorPresent = periodTimingSelected;
                // Creating period timings columns for timetable
                let cellData =
                    (<TableCell class={classes.tableTimingCells} style={{
                        'borderRight': '1px solid #E9E9EA',
                        'borderBottom': '1px solid #E9E9EA', 'position': 'relative'
                    }}>
                        {currentSelectedList.academic_year && currentSelectedList.timetable_id && periodListMenuItems.length !== 0 ? <Grid item>
                            {
                                (isCreate || isUpdate) ?
                                    <FormControl className={classes.tableSelects} fullWidth={true}
                                        style={{ 'width': '10rem' }}
                                        error={(periodTimingSelected) ? periodTimingSelected : null}>
                                        <InputLabel
                                            id="selectDateRange-label"
                                            className={classes.selectLabel}
                                        >
                                            Select Timing
                                        </InputLabel>
                                        <Select
                                            id="selectDateRange"
                                            select
                                            value={defaultSelectedPeriod}
                                            size="small"
                                            displayEmpty={true}
                                            disableUnderline={true}
                                            onChange={(e) => { this.handlePeriodChange(e, j) }}
                                            inputProps={{
                                                classes: {
                                                    root: classes.selectInput,
                                                }
                                            }}
                                        >
                                            {periodListMenuItems}
                                        </Select>
                                    </FormControl>
                                    :
                                    <Box>
                                        {periodName}
                                        <br />
                                        ({timeFormat(periodStartTime)} - {timeFormat(periodEndTime)})

                                    </Box>
                            }
                            {
                                (isCreate || isUpdate) &&
                                <Tooltip title="Delete Row">
                                    <div className="delete-row-button" onClick={() => this.deleteRow(j)}>
                                        <DeleteOutlineIcon />
                                    </div>
                                </Tooltip>
                            }
                            {periodTimingSelected ? <FormHelperText style={{ 'color': 'red', 'font-weight': 'bold', 'text-align': 'center' }}>
                                Timings are overlapping</FormHelperText> : null}
                        </Grid> : <Typography variant="subtitle2" gutterBottom>Timings empty, please add periods!!!</Typography>}
                    </TableCell>);
                Cells.push(<TableRow key={j}>{cellData}{cellRows}</TableRow>);
            }
        }

        return (
            <>
                <Paper className='paper-background'>
                    {loading ? (
                        <LoadingGif />
                    ) : (
                        <Box>
                            <Box display="flex" flex="wrap" justifyContent="space-between">
                                <Box mt={2}>
                                    <Box className='heading'>
                                        Create Time Table
                                    </Box>
                                    <Box className='sub-heading'>
                                        schedule the timetable and allot subjects
                                    </Box>
                                </Box>
                                <Box mt={2}>
                                    <Box className='header-align, end-flex-prop'>
                                        {isUserHasPermission('assign_timetable', 'view') && <Button
                                            variant="contained"
                                            component={Link} to={{
                                                pathname: Actions.assign_timetable.view.url,
                                                state: { timetable_id: this.state.timetableId }
                                            }}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' />
                                            View Timetable</Button>}
                                    </Box>
                                </Box>
                            </Box>
                            <Box className="md-up-justify-space-between" pb={1} mt={2}>
                                <Box className={"section-details"}>{`${currentSelectedList.standardName} - ${currentSelectedList.sectionName} (  ${currentSelectedList.timetableName}`} )</Box>
                            </Box>
                            <TableContainer component={Paper}>
                                <Table className={classes.table} aria-label="timetable">
                                    <TimeDialog periodRangeDialogOpen={periodRangeDialogOpen} closePeriodDialog={this.closePeriodDialog}
                                        submitPeriodsForCreation={this.submitPeriodsForCreation} />
                                    {
                                        tableHeaderRow ? tableHeaderRow : null
                                    }
                                    <TableBody>
                                        {
                                            Cells && Cells.length ?
                                                Cells : <TableCell colSpan={daysList.length}>
                                                    <Box>No Periods Available, Click </Box>
                                                    <Tooltip title="add more rows">
                                                        <Icon color="primary" onClick={this.addTableRow}
                                                            style={{ 'cursor': 'pointer', 'fontSize': 30 }}>add_circle
                                                        </Icon>
                                                    </Tooltip>
                                                </TableCell>
                                        }
                                        {(!isView && (Cells && Cells.length)) ?

                                            <Tooltip title="add more rows">
                                                <Icon color="primary" onClick={this.addTableRow}
                                                    style={{ 'cursor': 'pointer', 'fontSize': 30, 'margin': '1rem' }}>add_circle
                                                </Icon>
                                            </Tooltip>
                                            : <div></div>
                                        }
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Grid >
                                <Grid item xs={12}>
                                    {errorPresent ? (
                                        <Typography variant="subtitle2" gutterBottom style={{ "color": "red" }}> Rectify errors before submission </Typography>
                                    ) : (
                                        (isCreate || isUpdate) &&
                                        <Grid item style={{ 'text-align': 'end' }}>
                                            <Button variant="container" className={classes.submitButton} onClick={this.handleTimetableSubmission}>Submit Timetable</Button>
                                        </Grid>
                                    )}
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackbar}
                        autoHideDuration={2000} onClose={(e) => this.handleCloseSnackBar(e)}>
                        <Alert onClose={(e) => this.handleCloseSnackBar(e)} severity={errorStatus}>
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Paper>
            </>
        )
    }
}

export default withRouter(withStyles(Styles)(TimetableRow))