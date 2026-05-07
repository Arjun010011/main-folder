import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, CircularProgress, Icon, Button, Tooltip } from '@material-ui/core';
import classNames from 'classnames'
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';

import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import LeaveSummary from 'Containers/LeaveManagement/LeaveSummary'
import {
    getPaginationProps, getAcademicYear, dateFormat, SetAcademicYear, hhmmss
} from 'Includes/functions';
import moment from 'moment';
import { Dropdown } from 'Components/DropDown';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import LoadingGif from 'Components/LoadingGif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import loadingBar from 'images/loading.gif';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import AttendIndividualQuestionFeedBackForm from 'Containers/FeedBackForm/components/AttendIndividualQuestionFeedBackForm';
import messages from './messages';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';
import StudentSummaryFeedBackForm from 'Containers/FeedBackForm/StudentSummaryFeedBackForm';

import './styles.scss';

const user = localStorage.getItem("user")!='undefined'?JSON.parse(localStorage.getItem("user")):'';

class AttendFeedBackForm extends Component {
    constructor(props) {
        super(props)
        this.state = {
            blankPageMessage: 'Select Year',
            loading: true,
            blank: false,
            error: '',
            yearList: [],
            quizList: [],
            tableUpdating: false,
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            openPopup: false,
            selectedQuiz: '',
            quizName: '',
            is_answer: false,
            last_submitted_sequence: 0,
            is_attend_list: true,
            columns: [
                {
                    name: "form_code",
                    label: <FormattedMessage {...messages.title} />,
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: "response_data",
                    label: <FormattedMessage {...messages.title} />,
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: "title",
                    label: "Feed Back Form",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div className='cursor-pointer'>
                                <Tooltip title={tableMeta.rowData[7] ? "Video Quiz" : "Quiz"} enterDelay={400}
                                    enterNextDelay={400} placement='top-start'
                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Box className='display-flex'>
                                        {tableMeta.rowData[7] &&
                                            <PlayCircleOutlineIcon className='quiz-list-mp4-icon' />
                                        }
                                        <Box className='pl-5'>
                                            {value}
                                        </Box>
                                    </Box>
                                </Tooltip>
                            </div>
                            )
                        }
                    }
                },
                {
                    name: "start_date",
                    label: <FormattedMessage {...commonMessages.start_date} />,
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {dateFormat(value, 'DD-MM-yyyy hh:mm A')}
                            </div>
                            )
                        }
                    }
                },
                {
                    name: "end_date",
                    label: <FormattedMessage {...commonMessages.end_date} />,
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {dateFormat(value, 'DD-MM-yyyy hh:mm A')}
                            </div>
                            )
                        }
                    }
                },
                {
                    name: "last_submitted_sequence",
                    label: <FormattedMessage {...messages.title} />,
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: "number_of_questions",
                    label: <FormattedMessage {...messages.title} />,
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: "is_video_quiz",
                    label: <FormattedMessage {...messages.title} />,
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: "action",
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<>
                                {this.validateDate(tableMeta.rowData[3], tableMeta.rowData[4], tableMeta.rowData[1]) === 'within' ?
                                    <>{tableMeta.rowData[1] && (tableMeta.rowData[1]['is_submitted'] && !tableMeta.rowData[1]['is_evaluated']) ?
                                        <Box className='text-green  fs-18 p-l-5px'>Submited</Box>
                                        :
                                        tableMeta.rowData[1] && tableMeta.rowData[1]['is_evaluated'] ?
                                            <Box
                                                className='text-underline fs-18  cursor-pointer p-l-5px text-blue'
                                                onClick={e => this.handleQuizQuestion(tableMeta.rowData[0], tableMeta.rowData[2], tableMeta.rowData[1], tableMeta.rowData[7])}
                                            > View Marks
                                            </Box>
                                            :
                                            tableMeta.rowData[1] && tableMeta.rowData[1]['is_total_time_completed']?
                                            <Box className='text-red fs-18 p-l-5px'>Total time is completed</Box>:
                                            <Button
                                                className='add-modify-button'
                                                onClick={e => this.handleQuizQuestion(tableMeta.rowData[0], tableMeta.rowData[2], tableMeta.rowData[1], tableMeta.rowData[7])}
                                            > Attend
                                            </Button>
                                    }
                                    </>
                                    :
                                    this.validateDate(tableMeta.rowData[3], tableMeta.rowData[4]) === 'past' ?
                                        <Box className='text-red fs-18 p-l-5px'>Date is completed</Box> :
                                        <Box className='p-l-5px text-green'>{`Upcoming Quiz in (${hhmmss(this.totalTimer[tableMeta.rowData[0]])})`}</Box>
                                }
                            </>
                            );
                        }
                    }
                },
            ]
        }
        this.quizQuestion = React.createRef()
        this.totalTimer = {}
        this.startTotalTimer = this.startTotalTimer.bind(this);
        this.countDownTotal = this.countDownTotal.bind(this);
    }

    startTotalTimer(id,seconds) {
        if (seconds > 0) {
            this.totalTimer[id]=seconds
            setInterval(()=>this.countDownTotal(id), 1500);
        }
    }

    countDownTotal(id) {
        this.setState({loadingData:true})
        this.totalTimer[id]=this.totalTimer[id] - 1
        this.setState({
            loadingData:false
        });
        if (this.totalTimer[id] == 0) { 
            clearInterval(this.totalTimer[id]);
            this.totalTimer[id] = 0
        }
    }

    validateDate = (start_date, end_date, status) => {
        let returnValue = 'past'
        const today = moment(new Date())
        let fromValue = moment(start_date)
        let toValue = moment(end_date)
        if (fromValue.diff(today, 'seconds') > 0) {
            returnValue = 'future'
        }
        else if (toValue.diff(today, 'seconds') > 0) {
            returnValue = 'within'
        }
        if (status && status['is_submitted']) {
            returnValue = 'within'
        }
        return returnValue
    }

    handleQuizQuestion = (id, name, status, is_video_quiz) => {
        this.setState({
            openPopup: (status['is_evaluated'] || status['is_submitted']) ? false : true,
            selectedQuiz: id,
            quizName: name,
        }, () => {
            if (!(status['is_evaluated'] || status['is_submitted'])) {
                let sectionInformation = {
                    'selectedQuiz': id,
                    'quizName': name,
                }
                let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
                let url = Actions.attend_feedbackform.view.url
                if (is_video_quiz) {
                    url = Actions.attend_video_feedbackform.view.url
                }
                this.props.history.push({
                    pathname: url,
                    search: searchParam,
                });
            }
            else if (status['is_evaluated']) {
                let sectionInformation = {
                    'form_code': id,
                    'student': user.student['id'],
                    'is_video': is_video_quiz
                }
                let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
                this.props.history.push({
                    pathname: Actions.student_feedbackform_view_marks.view.url,
                    search: searchParam,
                });
            }
        })
    }


    componentDidMount() {
        if (user['is_staff']) {
            this.props.history.push('/dashboard')
        }
        else {
            this.getAcademicYearList()
        }
    }


    getAcademicYearList = async () => {
        const url = GET_URL.getacademicyear.api
        const param = { is_active: true }
        await getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    yearList: response.data.data,
                }, () => {
                    if (getAcademicYear()) {
                        let year = getAcademicYear()
                        this.setState({
                            year,
                        }, () => {
                            this.getQuizList()
                        })
                    }
                    else {
                        this.setState({
                            loading: false
                        })
                    }
                })
            }
        })
    }

    getQuizList = (paginationProps) => {
        let { pagination, year, current_standard, dateRangeValue, student_type } = this.state;
        this.setState({ tableUpdating: true, dateRangeValue: dateRangeValue, })
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, academic_year: year, is_active: true, };
        const url = GET_URL.feedbackformforms.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const quiz_list = response.data.data;
                const today = moment(new Date())
                quiz_list['data_list'].map((data)=>{
                    let fromValue = moment(data['start_date'])
                    if (fromValue.diff(today, 'seconds') > 0) {
                        this.startTotalTimer(data['form_code'],fromValue.diff(today, 'seconds'))
                    }
                })
                this.setState({
                    quizList: quiz_list,
                    loading: false,
                    tableUpdating: false,
                    pagination: this.currentPagination,
                    dateRangeValue: dateRangeValue
                });
            }
        });
    };

    onChange = async (e) => {
        let { value } = e.target;
        SetAcademicYear(value)
        this.setState({
            year: value,
        }, () => {
            this.getQuizList()
        })
    }

    onChangeHandleView = (value) => {
        if (value) {
            this.getQuizList()
        }
        this.setState({
            is_attend_list: value
        })
    }

    render() {
        const { is_attend_list, error, blankPageMessage, loading, yearList, year, quizList, tableUpdating, 
            pagination, loadingData } = this.state;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: false,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
        };
        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <Paper className='paper-background'>
                    <Box className='heading'>
                        {Actions.set_feedbackform.view.label}
                    </Box>
                    <Grid container className='m-bt-15px justify-content-space-between'>
                        <Grid item md={3} xs={12}>
                            <Box className='header-align p-r-20px'>
                                <Dropdown
                                    data={yearList}
                                    name='year'
                                    value={year}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...commonMessages.academicYear} />}
                                    error={error.year}
                                    hideSelect={true}
                                />
                            </Box>
                        </Grid>
                        {year &&
                            <Grid item md={3} xs={12} className='margin-top-10'>
                                <Box className='attend-quiz-tab header-align'>
                                    <Button className={is_attend_list === true ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                        onClick={(e) => this.onChangeHandleView(true)}
                                        disabled={is_attend_list === true}>
                                        <Box className={is_attend_list === true ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>Feed Back Form List</Box>
                                        <Icon className={classNames(is_attend_list === true ? 'list-selected-toggle-icon' : 'grid-selected-toggle-icon', "fa fa-bars")} />

                                    </Button>
                                    <Button className={is_attend_list === false ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                        onClick={(e) => this.onChangeHandleView(false)}
                                        disabled={is_attend_list === false}>
                                        <Box className={is_attend_list === false ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>Summary</Box>
                                        <Icon className={classNames(is_attend_list === false ? 'list-selected-toggle-icon' : 'grid-selected-toggle-icon', "fa fa-th-large")} />
                                    </Button>
                                </Box>
                            </Grid>
                        }
                    </Grid>

                    <Box className='header-align'>
                        {is_attend_list ?
                            year ?
                            !loadingData &&
                                <AllMUIDataTable
                                    data={quizList.data_list}
                                    key={quizList.data_list}
                                    title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                    columns={this.state.columns}
                                    options={options}
                                    onTableChange={this.getQuizList}
                                    serverSide={true}
                                    pagination={pagination}
                                    count={quizList.count}
                                />
                                :
                                <BlankPagewithIcon data={blankPageMessage} />

                            :
                            <StudentSummaryFeedBackForm
                                year={year}
                            />
                        }
                    </Box>
                </Paper>
            )
        }
    }
}


export default withRouter(AttendFeedBackForm)