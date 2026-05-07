import React, { Component } from 'react';
import { Paper, Box, Button, Grid, TableContainer, Table, TableHead, TableCell, CircularProgress, TableRow, TableBody, Tooltip, TextField } from '@material-ui/core';
import { DialogTitle, FormControl, TextareaAutosize, DialogActions, DialogContentText, DialogContent, Dialog, FormHelperText } from '@material-ui/core'
import { withRouter } from 'react-router-dom';
import ExpandMoreOutlinedIcon from '@material-ui/icons/ExpandMoreOutlined';
import ExpandLessOutlinedIcon from '@material-ui/icons/ExpandLessOutlined';
import Snackbar from '@material-ui/core/Snackbar';
import WarningIcon from '@material-ui/icons/Warning';
import Swal from 'sweetalert2'
import SettingsIcon from '@material-ui/icons/Settings';

import { APPROVAL_STATUS } from 'Constants';
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, dateFormat, timeFormat, Alert, getAcademicYear, SetAcademicYear, getKeyValueMap, getUrlParam } from 'Includes/functions';
import { getRequest, deleteRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, PUT_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';

class AssignStudentToSchedule extends Component {
    constructor(props) {
        super(props)

        this.state = {
            yearList: [],
            result_configured_list: [],
            selectedYear: '',
            selectedExam: '',
            error: {},
            open: false,
            alertData: '',
            blank: true,
            loadingExam: false,
            isExpand: false,
            isExpanded: false,
            examList: [],
            blankData: 'Please select academic year,Term, Exam and expect the result',
            approvalStatus: {},
            reasonOpen: false,
            reason: '',
            examTermList: [],
            selectedTerm: '',
            alias_names: JSON.parse(localStorage.getItem('alias_name'))
        }
    }

    async componentDidMount() {
        this.getYearList();
        let { selectedExam, selectedTerm, selectedYear } = getUrlParam()
        if (selectedExam && selectedTerm && selectedYear) {
            this.setState({
                selectedExam,
                selectedTerm,
                selectedYear,
            })
        }
        else {
            if (getAcademicYear()) {
                let year = getAcademicYear()
                if (year !== 0) {
                    this.setState({
                        selectedYear: year,
                        blankData: 'Please select Term, Exam and expect the result'
                    })
                }
            }
            else {
                this.setState({
                    pageLoading: false,
                    loading: false,
                })
            }
        }
    }

    getAliasLanguage = (sequence) => {
        let return_value
        let { alias_names } = this.state;
        if (sequence == 1) {
            return_value = alias_names['first_language']
        }
        else if (sequence == 2) {
            return_value = alias_names['second_language']
        }
        else if (sequence == 3) {
            return_value = alias_names['third_language']
        }
        return return_value
    }

    scroll = () => {
        window.scrollTo(0, 0);
    }

    getYearList = async (year) => {
        const url = GET_URL.getacademicyear.api
        const param = { is_active: true }
        await getRequest(url, param, this.props).then(response => {
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
                this.getTermList();
            }
        })
    }


    getTermList = async () => {
        const url = GET_URL.examterms.api
        const params = { is_active: true }
        await getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    examTermList: response.data.data,
                })
                let { selectedYear, selectedTerm, selectedExam } = getUrlParam()
                if (!(selectedYear && selectedTerm && selectedExam)) {
                    this.setState({
                        loading: false
                    })
                }
                else {
                    this.getexamList(selectedYear, selectedTerm);
                    this.getResultConfiguredList(selectedExam);
                }
            }
        })
        return true
    }


    onChange = (e) => {
        let { name, value, } = e.target;
        let { error, blank, loadingExam, selectedYear } = this.state;
        if (value !== 0) {
            if (name === 'selectedYear') {
                SetAcademicYear(value)
            }
            else if (name === 'selectedTerm') {
                this.setState({
                    loadingExam: false,
                    blankData: 'Please select Exam and expect the result',
                    selectedExam: '',
                    blank: true,
                    examList: [],
                }, () => {
                    this.getexamList(selectedYear, value);
                })

            } else if (name === 'selectedExam') {
                blank = false
                loadingExam = true
                this.getResultConfiguredList(value)
            }
            delete error[name]
            this.setState({
                [name]: value,
                blank,
                error,
                loadingExam
            })
        }
    }

    getexamList = (selectedYear, term) => {
        let { examList } = this.state
        examList = []
        const url = GET_URL.exam.api
        const params = { academic_year: selectedYear, is_active: true, term: term }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    examList: response.data.data,
                })
            }
        })
    }

    getResultConfiguredList = (selectedExam) => {
        let { selectedTerm, selectedYear } = this.state;
        const url = GET_URL.resultconfiguration.api
        const param = { is_active: true, term: selectedTerm, academic_year: selectedYear, exam: selectedExam }
        let props = { ...this.props };
        props['return_error_message'] = true
        getRequest(url, param, props).then(response => {
            let result_data = {
                section_list: [
                    {
                        id: 15,
                        section_name: "Section A",
                        total: 600,
                        min_marks: 250,
                        exam_test_list: [
                            { 'id': 1, 'name': 'Internal 1' },
                            { 'id': 2, 'name': 'Internal 2' },
                            { 'id': 3, 'name': 'Final Exam' },
                        ],
                        subject_list: [
                            {
                                subject_name: "Kannada",
                                is_language: true,
                                sequence: 1,
                                subject_code: 'kannada',
                                subject: 1,
                                total: 60,
                                min_marks: 20,
                                exam_test_list: {
                                    1: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 1,
                                    },
                                    2: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 2,
                                    },
                                    3: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 3,
                                    },
                                },
                            },
                            {
                                subject_name: "English",
                                is_language: true,
                                sequence: 1,
                                subject_code: 'english',
                                subject: 2,
                                total: 60,
                                min_marks: 20,
                                exam_test_list: {
                                    1: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 1,
                                    },
                                    2: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 2,
                                    },
                                    3: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 3,
                                    },
                                }
                            },
                            {
                                subject_name: "Kannada",
                                is_language: true,
                                sequence: 2,
                                subject_code: 'kannada',
                                subject: 3,
                                total: 60,
                                min_marks: 20,
                                exam_test_list: {
                                    1: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 1,
                                    },
                                    2: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 2,
                                    },
                                    3: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 3,
                                    },
                                },
                            },
                            {
                                subject_name: "English",
                                is_language: true,
                                sequence: 2,
                                subject_code: 'english',
                                subject: 4,
                                total: 60,
                                min_marks: 20,
                                exam_test_list: {
                                    1: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 1,
                                    },
                                    2: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 2,
                                    },
                                    3: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 3,
                                    },
                                }
                            },
                            {
                                subject_name: "Maths",
                                is_language: false,
                                subject: 5,
                                total: 60,
                                min_marks: 20,
                                exam_test_list: {
                                    1: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 1,
                                    },
                                    2: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 2,
                                    },
                                    3: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 3,
                                    },
                                },
                            },
                            {
                                subject_name: "Science",
                                is_language: false,
                                subject: 6,
                                total: 60,
                                min_marks: 20,
                                exam_test_list: {
                                    1: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 1,
                                    },
                                    2: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 2,
                                    },
                                    3: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 3,
                                    },
                                }
                            }
                        ]
                    },
                    {
                        id: 16,
                        section_name: "Section B",
                        total: 600,
                        min_marks: 250,
                        exam_test_list: [
                            { 'id': 1, 'name': 'Internal 1' },
                            { 'id': 2, 'name': 'Internal 2' },
                            { 'id': 3, 'name': 'Final Exam' },
                        ],
                        subject_list: [
                            {
                                subject_name: "Kannada",
                                is_language: true,
                                sequence: 1,
                                subject_code: 'kannada',
                                subject: 7,
                                total: 60,
                                min_marks: 20,
                                exam_test_list: {
                                    1: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 1,
                                    },
                                    2: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 2,
                                    },
                                    3: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 3,
                                    },
                                },
                            },
                            {
                                subject_name: "English",
                                is_language: true,
                                sequence: 1,
                                subject_code: 'english',
                                subject: 8,
                                total: 60,
                                min_marks: 20,
                                exam_test_list: {
                                    1: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 1,
                                    },
                                    2: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 2,
                                    },
                                    3: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 3,
                                    },
                                }
                            },
                            {
                                subject_name: "Kannada",
                                is_language: true,
                                sequence: 2,
                                subject_code: 'kannada',
                                subject: 9,
                                total: 60,
                                min_marks: 20,
                                exam_test_list: {
                                    1: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 1,
                                    },
                                    2: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 2,
                                    },
                                    3: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 3,
                                    },
                                },
                            },
                            {
                                subject_name: "English",
                                is_language: true,
                                sequence: 2,
                                subject_code: 'english',
                                subject: 10,
                                total: 60,
                                min_marks: 20,
                                exam_test_list: {
                                    1: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 1,
                                    },
                                    2: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 2,
                                    },
                                    3: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 3,
                                    },
                                }
                            },
                            {
                                subject_name: "Maths",
                                is_language: false,
                                subject: 11,
                                total: 60,
                                min_marks: 20,
                                exam_test_list: {
                                    1: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 1,
                                    },
                                    2: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 2,
                                    },
                                    3: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 3,
                                    },
                                },
                            },
                            {
                                subject_name: "Science",
                                is_language: false,
                                subject: 12,
                                total: 60,
                                min_marks: 20,
                                exam_test_list: {
                                    1: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 1,
                                    },
                                    2: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 2,
                                    },
                                    3: {
                                        marks: 40,
                                        configured_marks: 20,
                                        id: 3,
                                    },
                                }
                            }
                        ]
                    },
                ]
            }
            let temp
            result_data.section_list.map((section) => {
                section.sequence = { 1: [], 2: [], 3: [] }
                section.subject_list.map((subject) => {
                    if (subject.is_language && subject.sequence === 1) {
                        temp = {}
                        temp['id'] = subject.subject
                        temp['name'] = subject.subject_name
                        if (section.sequence['1'].length > 0) {
                            subject.hidden = true
                        }
                        else {
                            subject.subject_name = this.getAliasLanguage(1)
                        }
                        section.sequence['1'].push(temp)
                    }
                    else if (subject.is_language && subject.sequence === 2) {
                        temp = {}
                        temp['id'] = subject.subject
                        temp['name'] = subject.subject_name
                        if (section.sequence['2'].length > 0) {
                            subject.hidden = true
                        }
                        else {
                            subject.subject_name = this.getAliasLanguage(2)
                        }
                        section.sequence['2'].push(temp)
                    }
                    else if (subject.is_language && subject.sequence === 3) {
                        temp = {}
                        temp['id'] = subject.subject
                        temp['name'] = subject.subject_name
                        if (section.sequence['3'].length > 0) {
                            subject.hidden = true
                        }
                        else {
                            subject.subject_name = this.getAliasLanguage(3)
                        }
                        section.sequence['3'].push(temp)
                    }
                })
            })
            this.setState({
                result_configured_list: result_data.section_list,
                loadingExam: false,
                blank: false
            })
            if (response && response.status === 200) {

            }
            else {
                // this.setState({
                //     result_configured_list: [],
                //     loadingExam: false,
                //     blankData: response,
                //     blank: true
                // })
            }
        })
    }


    handleClickMore = (index) => {
        this.setState({
            isExpanded: index
        })
    }

    handleClickLess = () => {
        this.setState({
            isExpanded: ''
        })
    }



    handleClose = () => {
        this.setState({
            open: false
        })
    }

    ApproveLeave = () => {
        Swal.fire({
            title: `<strong>Are you sure want to Approve</strong>`,
            text: "You won't be able to update exam!",
            type: 'info',
            showCloseButton: true,
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel',
            confirmButtonColor: 'green',
            cancelButtonColor: 'orange',
        }).then((result) => {
            if (result.value) {
                this.requestForApprove()
            }
        });
    }

    requestForApprove = () => {
        const { selectedExam } = this.state;
        let post_data = {
            approval_status: APPROVAL_STATUS.approved
        }
        let url = PUT_URL.examapprove.api + selectedExam + '/';
        putRequest(url, post_data, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.getResultConfiguredList(selectedExam)
                }
            });
    }

    rejectPopup = () => {
        this.setState({
            reasonOpen: true
        })
    }

    handleCloseReason = () => {
        this.setState({
            reasonOpen: false
        })
    }

    rejectScheduledExam = () => {
        const { selectedExam, reason, error } = this.state;
        if (!reason) {
            error['reason'] = 'Please Enter Reason'
            this.setState({
                error
            })
            return
        }
        let post_data = {
            approval_status: APPROVAL_STATUS.rejected,
            reason: reason
        }
        let url = PUT_URL.examapprove.api + selectedExam + '/';
        putRequest(url, post_data, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                }
                this.handleCloseReason()
                this.getResultConfiguredList(selectedExam)
            });
    }

    onChangeReason = (e) => {
        let { name, value } = e.target;
        let { error } = this.state;
        delete error['reason']
        this.setState({
            [name]: value,
            error
        })
    }

    handleClickConfiguration = (sectionId, section_name) => {
        const { selectedExam, selectedTerm, selectedYear, examList, examTermList, yearList } = this.state;
        let year_key_value = getKeyValueMap(yearList, 'id', 'name')
        let term_key_value = getKeyValueMap(examTermList, 'id', 'name')
        let standard_key_value = getKeyValueMap(examList, 'id', 'name')
        let sectionInformation = {
            'selectedExam': selectedExam,
            'selectedTerm': selectedTerm,
            'selectedYear': selectedYear,
            'standard_section_id': sectionId,
            'section_name': section_name,
            'year_name': year_key_value[selectedYear],
            'term_name': term_key_value[selectedTerm],
            'standard_name': standard_key_value[selectedExam],
        }
        let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
        this.props.history.push({
            pathname: Actions.result_config.create.url,
            search: searchParam,
        });
    }

    render() {
        let { yearList, selectedYear, open, alertData, error, blank, loadingExam, examList, selectedExam, result_configured_list, isExpanded,
            blankData, approvalStatus, reasonOpen, reason, examTermList, selectedTerm } = this.state;
        return (
            <Paper className='paper-background'>
                <Grid container>
                    <Grid item md={6} xs={12} className='header-align'>
                        <Box className='heading'>
                            View Assigned Students to schedule
                        </Box>
                    </Grid>
                </Grid>
                <Grid container spacing={2}>
                    <Grid item md={3} xs={12} className='margin-top-20'>
                        <Dropdown
                            data={yearList}
                            name='selectedYear'
                            style='width-100'
                            value={selectedYear}
                            onChange={this.onChange}
                            label='Select Academic Year'
                            error={error.selectedYear}
                            hideSelect={true}
                        />
                    </Grid>
                    <Grid item md={3} xs={12} className='margin-top-20'>
                        <Dropdown
                            data={examTermList}
                            name='selectedTerm'
                            style='width-100'
                            value={selectedTerm}
                            onChange={this.onChange}
                            label='Select Term'
                            error={error.selectedTerm}
                            disabled={selectedYear ? false : true}
                            helperText={!selectedYear ? 'Select Academic Year' : ''}
                            hideSelect={true}
                        />
                    </Grid>
                    <Grid item md={3} xs={12} className='margin-top-20'>
                        <Dropdown
                            data={examList}
                            name='selectedExam'
                            style='width-100'
                            value={selectedExam}
                            onChange={this.onChange}
                            label='Select Exam'
                            error={error.selectedExam}
                            disabled={!selectedYear ? true : !selectedTerm ? true : false}
                            helperText={!selectedYear ? 'Select Academic Year' : !selectedTerm ? 'Select Term' : ''}
                            hideSelect={true}
                            customName='exam_type_name'
                        />
                    </Grid>
                </Grid>

                {(blank && !loadingExam) &&
                    <BlankPagewithIcon data={blankData} />
                }
                {loadingExam &&
                    <Box display='flex'>
                        <CircularProgress className='loading' />
                    </Box>
                }
                <Grid container spacing={2}>
                    {result_configured_list.map((section, stIndex) => {
                        return (
                            <Grid item xl={8} md={12} xs={12}>
                                <Paper className='schedule-add-paper' elevation={2} >
                                    <Box className='schedule-add-standard-outer-box'>
                                        <Box className='schedule-add-standard-name'>
                                            {section.section_name}
                                        </Box>
                                        <Box display='flex'>
                                            <Box className='result-config-total-min'>
                                                {`Total Marks - ${section.total}`}
                                            </Box>
                                            <Box className='result-config-total-min'>
                                                {`Min Marks - ${section.min_marks}`}
                                            </Box>
                                            <Box>
                                                <Button onClick={() => this.handleClickConfiguration(section.id, section.section_name)}>
                                                    <SettingsIcon /> Configuration
                                                </Button>
                                            </Box>
                                        </Box>
                                    </Box>
                                    <TableContainer className='schedule-exam-overflow'>
                                        <Table size='small' aria-label='simple table' className=''>
                                            <TableHead>
                                                <TableRow className=''>
                                                    <TableCell className=''>Subject</TableCell>
                                                    {section.exam_test_list.map((data) => {
                                                        return <TableCell className=''>{data.name}</TableCell>
                                                    })
                                                    }
                                                    <TableCell className=''>Total</TableCell>
                                                    <TableCell className=''>Min Marks</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {section.subject_list.map((subject, subIndex) => {
                                                    return (
                                                        <>
                                                            {!Boolean(subject.hidden) &&
                                                                <TableRow key={subIndex} className={(isExpanded !== stIndex && subIndex > 2) ? 'display-none' : 'schedule-exam-subject-name-box'}>
                                                                    <TableCell className='' component='th' scope='row'>
                                                                        {subject.subject_name}
                                                                    </TableCell>
                                                                    {section.exam_test_list.map((exam_test) => {
                                                                        return <TableCell className='' component='th' scope='row'>
                                                                            {Boolean(subject.exam_test_list[exam_test.id]) &&
                                                                                <Box>
                                                                                    {subject.exam_test_list[exam_test.id].configured_marks}
                                                                                </Box>
                                                                            }

                                                                            {!Boolean(subject.exam_test_list[exam_test.id]) &&
                                                                                <Box>
                                                                                    {`N/A`}
                                                                                </Box>
                                                                            }
                                                                        </TableCell>
                                                                    })}
                                                                    <TableCell className='' component='th' scope='row'>
                                                                        {subject.total}
                                                                    </TableCell>
                                                                    <TableCell className='' component='th' scope='row'>
                                                                        {subject.min_marks}
                                                                    </TableCell>
                                                                </TableRow>
                                                            }
                                                        </>
                                                    )
                                                })}
                                            </TableBody>
                                            {isExpanded !== stIndex && section.subject_list.length > 3 &&
                                                <Tooltip title='Expand More' enterDelay={400}
                                                    enterNextDelay={400} placement='top-start'
                                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                                    <Box className='view-exam-expand-icon-box'>
                                                        <ExpandMoreOutlinedIcon className='view-exam-expand-icon' onClick={() => this.handleClickMore(stIndex)} />
                                                    </Box>
                                                </Tooltip>
                                            }
                                            {isExpanded === stIndex && section.subject_list.length > 3 &&
                                                <Tooltip title='Expand Less' enterDelay={400}
                                                    enterNextDelay={400} placement='top-start'
                                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                                    <Box className='view-exam-expand-icon-box'>
                                                        <ExpandLessOutlinedIcon className='view-exam-expand-icon' onClick={() => this.handleClickLess()} />
                                                    </Box>
                                                </Tooltip>
                                            }
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            </Grid>
                        )
                    })}
                </Grid>

                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                    <Alert onClose={this.handleClose} severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>
                <Dialog className='schedule-reject-popup' open={reasonOpen} onClose={this.handleCloseReason} aria-labelledby="form-dialog-title">
                    <DialogTitle id="form-dialog-title"></DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Please Enter Reject Reason
                        </DialogContentText>
                        <FormControl
                            fullWidth
                            error={error.reason && (error.reason ? true : false)}
                        >
                            <Box className='leave-pending-staff-label'>Reason</Box>
                            <TextareaAutosize aria-label="minimum height"
                                className='apply-leave-text-area-auto-size-reason'
                                value={reason}
                                name='reason'
                                onChange={this.onChangeReason}
                                required
                            />
                            {error.reason &&
                                <FormHelperText>{error.reason}</FormHelperText>
                            }
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Box className='leave-pending-approve-reject'>
                            <Button
                                className='apply-leave-reset-button'
                                onClick={e => this.rejectScheduledExam()}>Reject
                            </Button>
                            <Button
                                className='apply-leave-button '
                                onClick={e => this.handleCloseReason()}>Close
                            </Button>
                        </Box>

                    </DialogActions>
                </Dialog>

            </Paper>

        )
    }
}
export default withRouter(AssignStudentToSchedule)

