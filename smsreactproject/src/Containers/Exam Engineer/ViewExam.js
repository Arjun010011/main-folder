import React, { Component } from 'react';
import { Button, Box, Grid, Paper, CircularProgress, Tooltip } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import { withRouter } from 'react-router-dom';
import DeleteForeverOutlinedIcon from '@material-ui/icons/DeleteForeverOutlined';
import EditOutlinedIcon from '@material-ui/icons/EditOutlined';
import ExpandMoreOutlinedIcon from '@material-ui/icons/ExpandMoreOutlined';
import ExpandLessOutlinedIcon from '@material-ui/icons/ExpandLessOutlined';

import loadingBar from 'images/loading.gif'
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, dateFormat, Alert, getAcademicYear, SetAcademicYear, getKeyValueMap } from 'Includes/functions';
import { getRequest, deleteRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, PUT_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';

class ViewExam extends Component {
    constructor(props) {
        super(props)

        this.state = {
            yearList: [],
            examTermList: [],
            selectedYear: '',
            selectedTerm: 'All',
            error: { year: '' },
            open: false,
            alertData: '',
            blank: true,
            loadingExam: false,
            isExpand: false,
            isExpanded: false,
            loading: true,
            blankHeading: 'Change the Academic year and expect the result'
        }
    }

    async componentDidMount() {
        this.getYearList();
        this.getTermList();
        if (getAcademicYear()) {
            let year = getAcademicYear()
            if (year != 0) {
                this.setState({
                    selectedYear: year
                }, () => {
                    this.getExamList()
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

    getYearList = () => {
        const url = GET_URL.getacademicyear.api
        const param = { is_active: true }
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                let fromYear, ToYear
                response.data.data.map((data) => {
                    fromYear = data.start_date.split('-');
                    ToYear = data.end_date.split('-');
                    data.name = fromYear[0] + '-' + ToYear[0]
                })
                this.setState({
                    yearList: response.data.data,
                })
            }
        })
    }

    getTermList = () => {
        const url = GET_URL.examterms.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let temp = { id: 'All', name: 'All' }
                response.data.data.unshift(temp)
                this.setState({
                    examTermList: response.data.data,
                })
            }
        })
    }


    handleAddExamButton = () => {
        let { selectedYear, error, alertData, yearList } = this.state;
        if (selectedYear && selectedYear !== 0) {
            let fromDate
            let toDate
            let yearName
            yearList.map((data) => {
                if (data.id == selectedYear) {
                    fromDate = data.start_date
                    toDate = data.end_date
                    yearName = data.name
                }
            })

            let currentSelectedList = {
                selectedYear: selectedYear,
                yearName: yearName,
                fromDate: fromDate,
                toDate: toDate,
            }
            let searchParam = "?" + new URLSearchParams(currentSelectedList).toString()
            this.props.history.push({
                pathname: Actions.exams.create.url,
                search: searchParam,
            });
        }
        else {
            alertData = 'Select Academic Year'
            error.country = alertData
            this.setState({
                open: true,
                alertData,
                error
            })
        }

    }

    onChange = (e) => {
        let { name, value } = e.target;
        if (value !== 0) {
            this.setState({
                [name]: value,
                error: {},
                loadingExam: true
            }, () => {
                this.getExamList();
                if (name === 'selectedYear') {
                    SetAcademicYear(value)
                }
            })
        }
    }

    getExamList = () => {
        let { blankHeading, blank, selectedYear, selectedTerm } = this.state;
        let params
        if (selectedTerm !== 'All') {
            params = { academic_year: selectedYear, is_active: true, term: selectedTerm }
        }
        else {
            params = { academic_year: selectedYear, is_active: true }
        }
        const url = GET_URL.exam.api
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                if (response.data.data.length === 0) {
                    blank = true
                    blankHeading = `No exams found for academic year`
                }
                else {
                    blank = false
                }
                this.setState({
                    examList: response.data.data,
                    loading: false,
                    blankHeading,
                    loadingExam: false,
                    blank
                })
            }
        })

    }

    handleClose = () => {
        this.setState({
            open: false
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

    handleEdit = (id) => {
        let { selectedYear, error, alertData, yearList } = this.state;
        if (selectedYear && selectedYear !== 0) {
            let fromDate, toDate, yearName
            yearList.map((data) => {
                if (data.id == selectedYear) {
                    fromDate = data.start_date
                    toDate = data.end_date
                    yearName = data.name
                }
            })
            let currentSelectedList = {
                selectedYear: selectedYear,
                yearName: yearName,
                fromDate: fromDate,
                toDate: toDate,
                id: id
            }
            let searchParam = "?" + new URLSearchParams(currentSelectedList).toString()
            this.props.history.push({
                pathname: Actions.exams.update.url,
                search: searchParam,
            });
        }
        else {
            alertData = 'Select Academic Year'
            error.country = alertData
            this.setState({
                open: true,
                alertData,
                error
            })
        }
    }

    handleDelete = (id, index) => {
        let { examList } = this.state
        const del_url = DEL_URL.exam.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                examList.splice(index, 1)
                this.setState({
                    examList,
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500,
                })
            }
        })
    }

    render() {
        let { yearList, examTermList, selectedTerm, selectedYear, open, alertData, error, blank, loadingExam, examList, isExpanded, loading, blankHeading } = this.state;
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
                                Exam
                            </Box>
                        </Grid>

                        <Grid item md={6} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {isUserHasPermission('exams', 'create') && <Button
                                    variant="contained"
                                    onClick={this.handleAddExamButton}
                                    className='editbutton-view'
                                ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.exams.create.label}</Button>
                                }
                            </Box>
                        </Grid>
                    </Grid>

                    <Grid container spacing={2} className='header-align'>
                        <Grid item md={3} xs={12}>
                            <Dropdown
                                data={yearList}
                                name='selectedYear'
                                style='width-100'
                                value={selectedYear}
                                onChange={this.onChange}
                                label='Academic Year'
                                error={error.country}
                                hideSelect
                            />
                        </Grid>
                        <Grid item md={3} xs={12}>
                            <Dropdown
                                data={examTermList}
                                name='selectedTerm'
                                value={selectedTerm}
                                onChange={this.onChange}
                                style='width-100'
                                label='Term'
                                error={error.country}
                                hideSelect={true}
                            />
                        </Grid>
                    </Grid>

                    {(blank && !loadingExam) &&
                        <Box className='header-align'>
                            <BlankPagewithIcon data={blankHeading} />
                        </Box>
                    }
                    {loadingExam &&
                        <Box display='flex'>
                            <CircularProgress className='loading' />
                        </Box>
                    }
                    {
                        (!blank && !loadingExam) &&
                        <Box className='view-exam-outer-box header-align'>
                            {examList.map((examData, eIndex) => {
                                return (
                                    <Paper className='view-exam-paper'>
                                        <Box className='view-exam-name'>
                                            {examData.exam_type_name}
                                        </Box>
                                        <Box className='view-exam-edit-delete-outer-box'>
                                            {isUserHasPermission('exams', 'update') &&
                                                <Box className='view-exam-edit-delete-icon-box'>
                                                    <EditOutlinedIcon className='view-exam-edit-delete-icon'
                                                        onClick={() => this.handleEdit(examData.id)}
                                                    />
                                                </Box>
                                            }
                                            {isUserHasPermission('exams', 'delete') &&
                                                <Box className='view-exam-edit-delete-icon-box'>
                                                    <DeleteForeverOutlinedIcon className='view-exam-edit-delete-icon'
                                                        onClick={() => this.handleDelete(examData.id, eIndex)}
                                                    />
                                                </Box>
                                            }
                                        </Box>
                                        <Box className='view-exam-type-outer-box'>
                                            Exam Term : {examData.term_name}
                                        </Box>
                                        <Box className='view-exam-start-end-box'>
                                            <Box>
                                                {dateFormat(examData.from_date, 'DD-MM-YYYY')}
                                            </Box>
                                            <Box>
                                                {dateFormat(examData.to_date, 'DD-MM-YYYY')}
                                            </Box>
                                        </Box>
                                        <Box className='margin-top-20'>

                                        </Box>
                                        {!examData.is_standard_section &&
                                            <Box className='view-exam-standard-list-outer-box'>
                                                {examData.standard_names.map((standardData, sIndex) => {
                                                    return (
                                                        <Box className={(isExpanded !== eIndex && sIndex > 2) ? 'display-none' : 'view-exam-standard-name-box'}>
                                                            {standardData.name}
                                                        </Box>
                                                    )
                                                })}
                                            </Box>
                                        }
                                        {examData.is_standard_section &&
                                            <Box className='view-exam-standard-list-outer-box'>
                                                {examData.standard_names.map((standardData, sIndex) => {
                                                    return (
                                                        <Box className={(isExpanded !== eIndex && sIndex > 2) ? 'display-none' : 'view-exam-section-name-box'}>
                                                            {`${standardData.standard_name} - `}
                                                            <Box style={{ opacity: '0.7' }}>
                                                                {Array.prototype.map.call(standardData.section_list, function (item) { return ` ${item.section_name} `; }).join(",")}
                                                            </Box>
                                                        </Box>
                                                    )
                                                })}
                                            </Box>
                                        }
                                        {isExpanded !== eIndex && examData.standard_names.length > 3 &&
                                            <Tooltip title='Expand More' enterDelay={400}
                                                enterNextDelay={400} placement='top-start'
                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                <Box className='view-exam-expand-icon-box'>
                                                    <ExpandMoreOutlinedIcon className='view-exam-expand-icon' onClick={() => this.handleClickMore(eIndex)} />
                                                </Box>
                                            </Tooltip>
                                        }
                                        {isExpanded === eIndex && examData.standard_names.length > 3 &&
                                            <Tooltip title='Expand Less' enterDelay={400}
                                                enterNextDelay={400} placement='top-start'
                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                <Box className='view-exam-expand-icon-box'>
                                                    <ExpandLessOutlinedIcon className='view-exam-expand-icon' onClick={() => this.handleClickLess()} />
                                                </Box>
                                            </Tooltip>
                                        }
                                    </Paper>

                                )
                            })}
                        </Box>
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
export default withRouter(ViewExam)

