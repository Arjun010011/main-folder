import React, { Component } from 'react';
import { Paper, Box, Button, Grid, TableContainer, Table, TableHead, TableCell, Icon, CircularProgress, TableRow, TableBody, Tooltip, TextField } from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import ExpandMoreOutlinedIcon from '@material-ui/icons/ExpandMoreOutlined';
import ExpandLessOutlinedIcon from '@material-ui/icons/ExpandLessOutlined';
import Snackbar from '@material-ui/core/Snackbar';
import WarningIcon from '@material-ui/icons/Warning';
import Swal from 'sweetalert2';
import classNames from 'classnames'
import Skeleton from '@material-ui/lab/Skeleton';

import _ from 'lodash';
import loadingBar from 'images/loading.gif';
import { APPROVAL_STATUS } from 'Constants';
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, dateFormat, timeFormat, Alert, getAcademicYear, SetAcademicYear, getKeyValueMap, getUrlParam } from 'Includes/functions';
import { getRequest, deleteRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, PUT_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';

const exam_config = JSON.parse(localStorage.getItem('exam_configurations')) ? JSON.parse(localStorage.getItem('exam_configurations')) : {}
const is_result_config_wise = exam_config['resultannouncmentconfigurationwise'] == 0 ? false : true

class ViewResultConfiguration extends Component {
    constructor(props) {
        super(props)

        this.state = {
            yearList: [],
            examList: [],
            selectedYear: '',
            selectedExam: '',
            error: {},
            open: false,
            alertData: '',
            blank: true,
            loadingExam: false,
            loading: true,
            isExpand: false,
            isExpanded: false,
            standardList: [],
            blankData: 'Select academic year,Term and expect the result',
            approvalStatus: {},
            reasonOpen: false,
            reason: '',
            examTermList: [],
            selectedTerm: '',
            is_term_wise: false,
            loadingExamGet: false,
            part_type: {}
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
                        blankData: 'Select Term and expect the result'
                    })
                }
            }
            else {
                this.setState({
                    pageLoading: false,
                })
            }
        }
        this.scroll()
    }

    scroll = () => {
        window.scrollTo(0, 0);
    }

    getYearList = async () => {
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
                if (!(selectedYear && selectedTerm)) {
                    this.setState({
                        loading: false
                    })
                }
                else {
                    this.setState({
                        selectedTerm,
                        is_term_wise: selectedExam ? false : true,
                        selectedExam: selectedExam ? selectedExam : ''
                    }, () => {
                        if (selectedExam && selectedYear && selectedTerm) {
                            this.getExamList(selectedYear, selectedTerm);
                        }
                        this.getExamStandardList(selectedExam && selectedExam);
                    })
                }
            }
        })
        return true
    }


    onChange = (e) => {
        let { name, value, } = e.target;
        let { error, blank, loadingExam, selectedYear, is_term_wise } = this.state;
        if (value !== 0) {
            this.setState({ [name]: value }, () => {
                if (name === 'selectedYear') {
                    SetAcademicYear(value)
                    this.setState({
                        loadingExam: false,
                        blankData: 'Select Exam and expect the result',
                        selectedExam: '',
                        selectedTerm: '',
                        blank: true,
                        standardList: [],
                    })
                }
                else if (name === 'selectedTerm') {
                    this.setState({
                        loadingExam: false,
                        blankData: 'Select Exam and expect the result',
                        selectedExam: '',
                        blank: true,
                        standardList: [],
                        loadingExamGet: true
                    }, () => {
                        if (is_term_wise) {
                            this.getExamStandardList();
                        }
                        else {
                            this.getExamList(selectedYear, value);
                        }
                    })

                } else if (name === 'selectedExam') {
                    blank = false
                    loadingExam = true
                    this.getExamStandardList(value)
                    delete error[name]
                    this.setState({
                        blank,
                        error,
                        loadingExam
                    })
                }
            })
        }
    }

    getExamList = (selectedYear, term) => {
        let { examList } = this.state
        examList = []
        const url = GET_URL.exam.api
        const params = { academic_year: selectedYear, is_active: true, term: term }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.map((data) => {
                    data.name = data.exam_type_name
                })
                examList = response.data.data
                this.setState({
                    examList,
                    loadingExamGet: false
                })
            }
        })
    }

    getExamStandardList = (selectedExam) => {
        let { blank, blankData, selectedTerm, selectedYear, is_term_wise } = this.state;
        let url = GET_URL.examresultconfig.api;
        let param = { is_active: true, exam: selectedExam }
        if (is_term_wise) {
            url = GET_URL.resultconfiguration.api;
            param = { is_active: true, academic_year: selectedYear, term: selectedTerm }
        }
        let props = { ...this.props };
        props['return_error_message'] = true
        getRequest(url, param, props).then(response => {
            if (response && response.status === 200) {
                if (response.data.data.standard_data) {
                    blank = false
                    let part_type = {}
                    response.data.data.part_type_list.map((data) => {
                        part_type[data['id']] = { list: [], id: data['id'], name: data['name'] }
                    })
                    response.data.data.standard_data.map((stdData) => {
                        stdData.part_type = _.cloneDeep(part_type)
                        stdData.subject_list.map((subData, subIndex) => {
                            Object.keys(stdData.part_type).map((part_key) => {
                                if (subData?.subject_part_type_id == part_key && !stdData.part_type[part_key].list.includes(subData.subject)) {
                                    stdData.part_type[part_key].list.push(subData.subject)
                                }
                            })
                        })
                        Object.keys(stdData.part_type).map((part_key) => {
                            if (stdData.part_type[part_key].list.length === 0) {
                                delete stdData.part_type[part_key]
                            }
                        })
                    })
                }
                else {
                    blankData = 'Exam is not scheduled'
                    blank = true
                }
                this.setState({
                    standardList: response.data.data?.standard_data ?? [],
                    loadingExam: false,
                    loading: false,
                    blank
                })
            }
            else {
                this.setState({
                    standardList: [],
                    loadingExam: false,
                    blankData: response,
                    blank: true,
                    loading: false,
                })
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


    handleClickEnter = (standard, section) => {
        const { selectedExam, selectedTerm, selectedYear, examList, examTermList, yearList, is_term_wise } = this.state;
        let year_key_value = getKeyValueMap(yearList, 'id', 'name')
        let term_key_value = getKeyValueMap(examTermList, 'id', 'name')
        let exam_key_value = getKeyValueMap(examList, 'id', 'name')
        let sectionInformation = {
            'selectedExam': selectedExam,
            'selectedTerm': selectedTerm,
            'selectedYear': selectedYear,
            'standard_section_id': section.standard_section,
            'standard_name': standard.standard_name,
            'section_name': section.section_name,
            'year_name': year_key_value[selectedYear],
            'term_name': term_key_value[selectedTerm],
            'exam_name': exam_key_value[selectedExam],
        }
        let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
    let pathName = Actions.result_config.create.url
        if (is_term_wise) {
            pathName = Actions.term_result_config.create.url
        }
        this.props.history.push({
            pathname: pathName,
            search: searchParam,
        });
    }

    getShowContentMarks = (stIndex, secIndex, subIndex) => {
        let { standardList } = this.state;
        return (
            <Box>
                <Box>
                    <Box>{`Exam/Test Name - Config Marks`}</Box>
                </Box>
                <Box>
                    <Box>{` `}</Box>
                </Box>
                {standardList[stIndex]['section_list'][secIndex]['subject_data'][subIndex]?.['exam_list'] && standardList[stIndex]['section_list'][secIndex]['subject_data'][subIndex]['exam_list'].map((exam) => {
                    return (
                        <Box>
                            <Box>{`${exam.exam_type_name} - ${exam.configured_marks}`}</Box>
                        </Box>
                    )
                })
                }
            </Box>
        )
    }

    onChangeHandleView = (value) => {
        let { standardList, selectedYear, selectedExam, selectedTerm, blank } = this.state;
        if (!value) {
            standardList = []
            selectedExam = ''
            blank = true
            if (selectedTerm) {
                this.getExamList(selectedYear, selectedTerm);
            }
        }

        this.setState({
            is_term_wise: value,
            standardList,
            selectedExam,
            blank
        }, () => {
            if (selectedTerm && value) {
                this.getExamStandardList()
            }
        })

    }

    getSubjectTotal = (standard, stIndex, section, secIndex, is_term_wise, part) => {
        return (
            <>
                {standard.subject_list.map((subject) => {
                    return (
                        <>{standard.part_type[part].list.includes(subject.subject) && <TableCell className='' component='th' scope='row'>
                            {(section.exam_configuration_data?.approval_status != 1 || Boolean(section.subject_data[subject.subject])) ?
                                section['subject_data'][subject.subject]?.['exam_list'] ?
                                    <Tooltip
                                        title={this.getShowContentMarks(stIndex, secIndex, subject.subject)}
                                        enterDelay={400}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Box className='pointer'>
                                            {is_term_wise &&
                                                section.subject_data[subject.subject]?.max_marks
                                            }
                                            {!is_term_wise &&
                                                section.subject_data[subject.subject]?.configured_marks
                                            }
                                        </Box>
                                    </Tooltip>
                                    :
                                    <Box className='pointer'>
                                        {is_term_wise &&
                                            section.subject_data[subject.subject]?.max_marks
                                        }
                                        {!is_term_wise &&
                                            section.subject_data[subject.subject]?.configured_marks
                                        }
                                    </Box>
                                :
                                <Box className='pointer'>
                                    NA
                                </Box>
                            }
                        </TableCell>
                        }
                        </>
                    )
                })
                }
            </>
        )
    }

    getSubjectNameFormat = (standard, part) => {
        return (
            <>
                {standard.subject_list && standard.subject_list.map((data) => {
                    return (standard.part_type[part].list.includes(data.subject) &&
                        <TableCell className='width-250-px'>{data.subject_name}</TableCell>
                    )
                })
                }
            </>
        )
    }

    render() {
        let { yearList, selectedYear, open, alertData, error, blank, loadingExam, examList, selectedExam, standardList, isExpanded,
            blankData, is_term_wise, examTermList, selectedTerm, loading, loadingExamGet, part_type } = this.state;
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
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='heading'>
                                Result Configuration
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
                                label='Academic Year'
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
                                label='Term'
                                error={error.selectedTerm}
                                disabled={selectedYear ? false : true}
                                helperText={!selectedYear ? 'Select Term' : ''}
                                hideSelect={true}
                            />
                        </Grid>
                        {!is_term_wise &&
                            <Grid item md={3} xs={12} className='margin-top-20'>
                                {loadingExamGet ?
                                    <Skeleton variant="rect" className='drop-down-skeleton m-t-10px'></Skeleton>
                                    :
                                    <Dropdown
                                        data={examList}
                                        name='selectedExam'
                                        style='width-100'
                                        value={selectedExam}
                                        onChange={this.onChange}
                                        label='Exam'
                                        error={error.selectedExam}
                                        disabled={selectedYear ? false : selectedTerm ? false : true}
                                        helperText={!selectedYear ? 'Select Academic Year' : !selectedTerm ? 'Select Term' : ''}
                                        hideSelect={true}
                                    />
                                }
                            </Grid>
                        }
                    </Grid>

                    {(blank && !loadingExam) &&
                        <BlankPagewithIcon data={blankData} />
                    }
                    {loadingExam &&
                        <Box display='flex'>
                            <CircularProgress className='loading' />
                        </Box>
                    }
                    {!loadingExam &&
                        <Grid container spacing={2}>
                            {standardList.map((standard, stIndex) => {
                                return (
                                    <Grid item xl={12} md={12} xs={12}>
                                        <Paper className='schedule-add-paper' elevation={2} >
                                            <Box className='schedule-add-standard-outer-box'>
                                                <Box className='schedule-add-standard-name'>
                                                    {standard.standard_name}
                                                </Box>
                                            </Box>
                                            <TableContainer className='schedule-exam-overflow'>
                                                <Table size='small' aria-label='simple table' className=''>
                                                    <TableHead>
                                                        {Object.keys(standard.part_type).length > 1 &&
                                                            <TableRow className=''>
                                                                <TableCell className=''></TableCell>
                                                                {Object.keys(standard.part_type).map((part_key) => {
                                                                    return (standard.part_type[part_key].list.length > 0 &&
                                                                        <TableCell className='' colSpan={standard.part_type[part_key].list.length}>{standard.part_type[part_key]['name']}</TableCell>
                                                                    )
                                                                })}
                                                                <TableCell className=''></TableCell>
                                                            </TableRow>
                                                        }
                                                        <TableRow className=''>
                                                            <TableCell className=''>Section</TableCell>
                                                            {Object.keys(standard.part_type).map((part_key) => {
                                                                return (standard.part_type[part_key].list.length > 0 &&
                                                                    this.getSubjectNameFormat(standard, part_key)
                                                                )
                                                            })
                                                            }
                                                            <TableCell className='text-align-center'>Action</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {standard.section_list && standard.section_list.map((section, secIndex) => {
                                                            return (
                                                                <TableRow key={secIndex} className={(isExpanded !== stIndex && secIndex > 2) ? 'display-none' : 'schedule-exam-subject-name-box'}>
                                                                    <TableCell className='' component='th' scope='row'>
                                                                        <Box className='mui-table-custom-value-left-align' display='flex'>
                                                                            {section.section_name}
                                                                        </Box>
                                                                    </TableCell>
                                                                    {Object.keys(standard.part_type).map((part_key) => {
                                                                        return (standard.part_type[part_key].list.length > 0 &&
                                                                            this.getSubjectTotal(standard, stIndex, section, secIndex, is_term_wise, part_key)
                                                                        )
                                                                    })
                                                                    }
                                                                    <TableCell className='text-align-center' component='th' scope='row'>
                                                                        <Button onClick={() => this.handleClickEnter(standard, section)}>
                                                                            {is_term_wise && section?.approval_status &&
                                                                                (section?.approval_status == 1 ?
                                                                                    <Box>
                                                                                        View Configuration Marks
                                                                                    </Box>
                                                                                    :
                                                                                    <Box>
                                                                                        Enter Configuration Marks
                                                                                    </Box>
                                                                                )
                                                                            }
                                                                            {!is_term_wise && section?.exam_configuration_data?.approval_status == 1 ?
                                                                                <Box>
                                                                                    View Configuration Marks
                                                                                </Box>
                                                                                :
                                                                                <Box>
                                                                                    Enter Configuration Marks
                                                                                </Box>
                                                                            }
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>)
                                                        })}
                                                    </TableBody>
                                                    {isExpanded !== stIndex && standard.section_list.length > 3 &&
                                                        <Tooltip title='Expand More' enterDelay={400}
                                                            enterNextDelay={400} placement='top-start'
                                                            classes={{ tooltip: 'tooltip-show-data' }}>
                                                            <Box className='view-exam-expand-icon-box'>
                                                                <ExpandMoreOutlinedIcon className='view-exam-expand-icon' onClick={() => this.handleClickMore(stIndex)} />
                                                            </Box>
                                                        </Tooltip>
                                                    }
                                                    {isExpanded === stIndex && standard.section_list.length > 3 &&
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
                    }
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>

                </Paper>

            )
        }
    }
}
export default withRouter(ViewResultConfiguration)

