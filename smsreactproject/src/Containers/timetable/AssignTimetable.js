import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import {
    Grid, Paper, Box,
    Button, Dialog, DialogTitle,
    DialogActions, DialogContent,
    TextField
} from '@material-ui/core';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';
import { SetAcademicYear, getAcademicYear ,dateFormat} from 'Includes/functions';
import TimetableDateRangeView from './TimetableDateRangeView';
import './styles.scss';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import classNames from 'classnames';
import { Actions } from 'Constants/permissions';
import moment from 'moment';
import DateFnsUtils from '@date-io/date-fns';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { isUserHasPermission, getKeyValueMap , validateDate} from 'Includes/functions';

class AssignTimetable extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selectedYear: 0,
            yearList: [],
            standard: 0,
            section: 0,
            subjectList: [],
            subject: [],
            subjectListSelected: [],
            enrollmentDetails: [],
            retrievedTimetableData: [],
            dateRangeDialogOpen: null,
            currentSelectedList: {},
            standardList: [],
            createdTimetableData: {
                'name': '',
                'start_date': moment(new Date()).format("YYYY-MM-DD"),
                'end_date': moment(new Date()).format("YYYY-MM-DD"),
            },
            errors: {},
            isCreateRangeDisabled: false,
            selectedTimeTableId: '',
            year_name: '',
            dateRange: '',
            selectedDateRange:[]
        };
    }

    componentDidMount() {
        this.yearList();
        if (this.props.location.state && 'timetable_id' in this.props.location.state) {
            this.setState({ selectedTimeTableId: this.props.location.state.timetable_id })
        }
    }

    yearList = () => {
        let tempSelectedAcademic = getAcademicYear();
        const url = GET_URL.getacademicyear.api
        const param = { is_active: true }
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                let fromYear = ''
                let toYear = ''
                response.data.data.map((data) => {
                    fromYear = data.start_date.split('-');
                    toYear = data.end_date.split('-');
                    // data.name = fromYear[0] + '-' + toYear[0]
                })
                let entry_academic_year_value = ''
                if (tempSelectedAcademic) {
                    entry_academic_year_value = getKeyValueMap(response.data.data, 'id', 'name')
                    entry_academic_year_value = entry_academic_year_value[tempSelectedAcademic]
                }
                this.setState({
                    yearList: response.data.data,
                    selectedYear: tempSelectedAcademic,
                    year_name: entry_academic_year_value
                }, () => { this.getTimetableDateRange() })
            }
        })
    }

    getTimetableDateRange = (name) => {
        let{selectedDateRange,dateRange}=this.state;
        const params = { academic_year: this.state.selectedYear };
        if (this.state.selectedYear) {
            getRequest(GET_URL.timetabledaterange.api, params, this.props).then((response) => {
                if (response && response.status === 200) {
                    const retrievedTimetableData = response.data.data;
                    retrievedTimetableData.map((data)=>{
                        data['label']=`${data['name']} (${dateFormat(data['start_date'],'DD-MM-YYYY')} - ${dateFormat(data['end_date'],'DD-MM-YYYY')})`
                    })
                    if(name==='new'){
                        selectedDateRange=[]
                        selectedDateRange[0]= retrievedTimetableData[retrievedTimetableData.length-1]
                        dateRange=retrievedTimetableData[retrievedTimetableData.length-1]['id']
                    }
                    this.setState({ retrievedTimetableData,selectedDateRange,dateRange });
                }
            });
        }
    }

    onChange = async (e) => {
        const { yearList } = this.state;
        let value = e.target.value;
        if (value !== 0) {
            let entry_academic_year_value = getKeyValueMap(yearList, 'id', 'name')
            entry_academic_year_value = entry_academic_year_value[value]
            SetAcademicYear(value);
            this.setState({ retrievedTimetableData: [], selectedYear: value, year_name: entry_academic_year_value }, () => {
                this.getTimetableDateRange();
            })
        }
    }

    onChangeDateRange = async (e) => {
        const { retrievedTimetableData } = this.state;
        let {name,value} = e.target;
        let index = retrievedTimetableData.findIndex(data => data.id === parseInt(value))
        let selectedDateRange=[]
        selectedDateRange[0]= retrievedTimetableData[index]
        this.setState({ selectedDateRange,[name]:value })
    }

    selectfunction = (index, id) => {
        let { subjectList, subject } = this.state;
        let checksubjectPresent = subject.indexOf(id);
        if (checksubjectPresent === -1) {
            this.setState({
                subject: subject.concat(subjectList[index].subject)
            });
        }
        else {
            subject.splice(checksubjectPresent, 1);
            this.setState({ subject });
        }
    }


    addSubjects = () => {
        let { subjectList, subject } = this.state;
        let filterData = subjectList.filter((data) => {
            let test = subject.indexOf(data.subject);
            if (test > -1) {
                return data;
            }
        })
        let removeSelectedSubjects = subjectList.filter((data) => {
            let test = subject.indexOf(data.subject);
            if (test === -1) {
                return data;
            }
        })
        this.setState({
            subjectListSelected: this.state.subjectListSelected.concat(filterData),
            subjectList: removeSelectedSubjects
        });
        if (filterData.length === 0) {
            alert('Please select subjects');
        }
    }

    deleteSubject = (index, id) => {
        let temp = this.state.subjectListSelected;
        let removedData = temp.splice(index, 1);
        let subject = this.state.subject
        let removesubjectTest = subject.indexOf(id);
        if (removesubjectTest > -1) {
            subject.splice(removesubjectTest, 1)
        }
        this.setState({
            subjectListSelected: temp,
            subjectList: this.state.subjectList.concat(removedData)
        })
    }

    // Timetable Date Range creation functions 
    handleDialogOpen = async (e, type) => {
        let { selectedYear, yearList } = this.state;
        this.setState({ dateRangeDialogOpen: !this.state.dateRangeDialogOpen });
        if (e.target.value === "Calendar") {
            if (selectedYear != 0) {
                this.setState({ dateRangeDialogOpen: !this.state.dateRangeDialogOpen });
            }
        } else {
            // Store selected timetable 
            let { currentSelectedList, createdTimetableData, selectedYear } = { ...this.state };
            let max_start_date,max_end_date
            yearList.some((data) => {
                if (data['id'] == selectedYear) {
                    createdTimetableData['start_date'] = data.start_date;
                    createdTimetableData['end_date'] = data.end_date;
                    max_start_date=data.start_date
                    max_end_date=data.end_date
                    return;
                }
            });
            currentSelectedList['timetable_id'] = e.target.value
            this.setState({ currentSelectedList, createdTimetableData , max_start_date, max_end_date});
        }
    }

    submitTimetableForCreation = async (e) => {
        const { createdTimetableData } = { ...this.state };
        let errors = this.checkErrors(createdTimetableData);
        this.setState({ isCreateRangeDisabled: true });
        if (Object.keys(errors).length === 0) {
            let timetableDataToSend = {};
            let removeErrors = {};
            let props = { ...this.props };
            const params = { academic_year: this.state.selectedYear };
            timetableDataToSend["academic_year"] = this.state.selectedYear;
            timetableDataToSend = { ...timetableDataToSend, ...createdTimetableData };
            props['return_error_message'] = true;
            postRequest(POST_URL.timetabledaterange.api, timetableDataToSend, props).then((response) => {
                if (response.status !== 200) {
                    errors['error_text'] = response;
                    this.setState({ errors, isCreateRangeDisabled: false });
                } else {
                    this.getTimetableDateRange('new')
                    // getRequest(GET_URL.timetabledaterange.api, params, props).then((response) => {
                    //     if (response && response.status === 200) {
                    //         const retrievedTimetableData = response.data.data;
                            this.setState({ errors: removeErrors, dateRangeDialogOpen: !this.state.dateRangeDialogOpen, isCreateRangeDisabled: false });
                    //     }
                    // });
                }
            });
        } else {
            this.setState({ errors, isCreateRangeDisabled: false });
        }

    }

    handleTimetableCreation = (e, type) => {
        let createdTimetableData = { ...this.state.createdTimetableData };
        let timetableField = (e.currentTarget) ? e.currentTarget.name : type;
        let timetableFieldValue = (e.currentTarget) ? e.currentTarget.value : e;
        if (type && (timetableField == "start_date" || timetableField == "end_date")) {
            timetableFieldValue = moment(timetableFieldValue).format("YYYY-MM-DD");
        }
        createdTimetableData[timetableField] = timetableFieldValue;
        this.setState({ createdTimetableData });
    }

    checkErrors = (createdTimetableData) => {
        let { max_start_date, max_end_date } = this.state;
        let errors = {};
        if (createdTimetableData.name == '') {
            errors['name'] = "Please enter a Valid Name"
        } else {
            delete errors['name'];
        }
        let fromerror=validateDate(createdTimetableData.start_date,max_start_date,max_end_date)
        let torror=validateDate(createdTimetableData.end_date,createdTimetableData.start_date,max_end_date)
        if (fromerror) {
            errors['start_date'] = fromerror
        } else {
            delete errors['start_date'];
        }
        if (torror) {
            errors['end_date'] = torror
        } else {
            delete errors['end_date'];
        }

        if (moment(createdTimetableData.start_date) >= moment(createdTimetableData.end_date)) {
            errors['start_date'] = "Start date cannot be greater or equal to end date"
        } else {
            delete errors['start_date'];
        }

        return errors;
    }

    closeTimetableDialog = (e) => {

        let initialState = {
            createdTimetableData: {
                'name': '',
                'start_date': moment(new Date()).format("YYYY-MM-DD"),
                'end_date': moment(new Date()).format("YYYY-MM-DD"),
            },
            errors: {},
        };

        this.setState({ ...initialState, dateRangeDialogOpen: null });
    }

    // Redirect to Timetable Creation UI
    passToTimetableComponent = (currentSelectedList, type) => {
        let searchParam = "?" + new URLSearchParams(currentSelectedList).toString()

        if (type == 'create') {
            this.props.history.push({
                pathname: Actions.assign_timetable.create.url,
                search: searchParam,
            });
        }

        if (type == 'edit') {
            this.props.history.push({
                pathname: Actions.assign_timetable.update.url,
                search: searchParam,
            });
        }

        if (type == 'view') {
            this.props.history.push({
                pathname: Actions.timetable_view.view.url,
                search: searchParam,
            });
        }
    }

    render() {
        const { selectedYear, yearList, retrievedTimetableData, standardList, dateRangeDialogOpen,max_start_date,max_end_date,
            createdTimetableData, errors, isCreateRangeDisabled, dateRange ,selectedDateRange} = this.state;
        let blankPageMessage = 'No Timetable Date ranges available, add from top right';
        return (
            <>
                <Paper className='paper-background'>
                    <Dialog
                        className="action-basic-detail-width"
                        buttonid="dateDialog"
                        open={dateRangeDialogOpen}
                        onClose={(e) => { this.closeTimetableDialog(e) }}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                    >
                        <DialogTitle id="alert-dialog-title">{"Select Required Dates"}</DialogTitle>
                        <DialogContent>
                            <Grid container direction="column" spacing={0}>
                                <Grid item>
                                    <TextField
                                        onChange={(e) => { this.handleTimetableCreation(e) }}
                                        fullWidth
                                        id="timetableName"
                                        label="Timetable Name"
                                        name="name"
                                        margin="normal"
                                        variant="outlined"
                                        helperText={errors['name'] ? errors['name'] : null}
                                        error={errors['name'] ? true : false}
                                    />
                                </Grid>
                                <Grid item>
                                    <MuiPickersUtilsProvider utils={DateFnsUtils} >
                                        <KeyboardDatePicker
                                            autoOk
                                            fullWidth
                                            variant='inline'
                                            inputVariant="outlined"
                                            label="Start Date"
                                            minDate={max_start_date}
                                            maxDate={max_end_date}
                                            name='start_date'
                                            margin="normal"
                                            id="mui-pickers-time"
                                            format='dd-MM-yyyy'
                                            value={createdTimetableData.start_date}
                                            onChange={(e) => { this.handleTimetableCreation(e, "start_date") }}
                                            KeyboardButtonProps={{
                                                'aria-label': 'change time',
                                            }}
                                            helperText={errors['start_date'] ? errors['start_date'] : null}
                                            error={errors['start_date'] ? true : false}
                                        />
                                    </MuiPickersUtilsProvider>
                                    {/* <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                            <Grid container justify="space-around">
                                                <KeyboardDatePicker
                                                    fullWidth
                                                    disableToolbar
                                                    variant="inline"
                                                    format="yyyy-MM-dd"
                                                    inputVariant='outlined'
                                                    margin="normal"
                                                    autoOk={true}
                                                    name="start_date"
                                                    id="fromDate"
                                                    label="From Date"
                                                    value={createdTimetableData.start_date}
                                                    inputProps={{ readOnly: true }}
                                                    onChange={(e) => { this.handleTimetableCreation(e, "start_date") }}
                                                    helperText={errors['start_date'] ? errors['start_date'] : null}
                                                    error={errors['start_date'] ? true : false}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change date',
                                                    }}
                                                />
                                            </Grid>
                                        </MuiPickersUtilsProvider> */}
                                </Grid>
                                <Grid item>
                                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                        <Grid container justify="space-around">
                                            <KeyboardDatePicker
                                                autoOk
                                                fullWidth
                                                variant='inline'
                                                inputVariant="outlined"
                                                label="End Date"
                                                name='end_date'
                                                margin="normal"
                                                minDate={max_start_date}
                                                maxDate={max_end_date}
                                                id="mui-pickers-time"
                                                format='dd-MM-yyyy'
                                                value={createdTimetableData.end_date}
                                                onChange={(e) => { this.handleTimetableCreation(e, "end_date") }}
                                                KeyboardButtonProps={{
                                                    'aria-label': 'change time',
                                                }}
                                                helperText={errors['end_date'] ? errors['end_date'] : null}
                                                error={errors['end_date'] ? true : false}
                                            />
                                        </Grid>
                                    </MuiPickersUtilsProvider>
                                </Grid>
                            </Grid>
                            <Box className='error-content flex-justify-center margin-top-10'>
                                {errors['error_text']}
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button mappedid="dateDialog" disabled={isCreateRangeDisabled}
                                onClick={(e) => { this.submitTimetableForCreation(e) }} color="primary">Create</Button>
                        </DialogActions>
                    </Dialog>
                    <Grid container >
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                Create/Edit Timetable
                            </Box>
                            <Box className='sub-heading'>
                                You can add/edit/view Timetables for given Academic Year and Time period
                            </Box>
                        </Grid>
                        {isUserHasPermission('assign_timetable', 'create') &&

                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    <Button
                                        variant="contained"
                                        className='editbutton-view'
                                        onClick={(e) => { this.handleDialogOpen(e) }}
                                    >
                                        <AddCircleOutlineOutlinedIcon className='visibility-icon' />
                                        Create Timetable Range
                                    </Button>
                                </Box>
                            </Grid>
                        }
                        <Grid item md={5} lg={4} xs={12}>
                            <Box mt={2}>
                                <Dropdown
                                    data={yearList}
                                    name='selectedYear'
                                    value={selectedYear}
                                    onChange={this.onChange}
                                    label='Academic year'
                                    hideSelect={true}
                                />
                            </Box>
                        </Grid>
                        <Grid item md={5} lg={4} xs={12}>
                            <Box mt={2}>
                                <Dropdown
                                    data={retrievedTimetableData}
                                    name='dateRange'
                                    value={dateRange}
                                    onChange={this.onChangeDateRange}
                                    label='Date Range'
                                    hideSelect={true}
                                    customName='label'
                                />
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container>
                        <Grid item md={12} xs={12} sm={12} >
                            {
                                selectedDateRange && selectedDateRange.length ? (
                                    <Box mt={4}>
                                        <TimetableDateRangeView retrievedTimetableData={selectedDateRange}
                                            standardList={standardList} passToTimetableComponent={this.passToTimetableComponent}
                                            selectedTimeTableId={this.state.selectedTimeTableId}
                                            year={this.state.selectedYear} year_name={this.state.year_name} />
                                    </Box>
                                ) : (
                                    <Box marginTop="1rem">
                                        <BlankPagewithIcon data={blankPageMessage} />
                                    </Box>
                                )
                            }

                        </Grid>
                    </Grid>
                </Paper>
            </>
        )
    }
}

export default withRouter(AssignTimetable)