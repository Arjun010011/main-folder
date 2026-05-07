import React, { Component, Fragment } from 'react'
import { Paper, Box, Button, Grid, MenuItem, Menu, CircularProgress, Tooltip, Icon } from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames'
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import MoreVertIcon from '@material-ui/icons/MoreVert';

import Swal from 'sweetalert2'
import _ from 'lodash';

import { DateRange } from 'Components/DateRange';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { Dropdown } from 'Components/DropDown';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import {
    isUserHasPermission, dateFormat, getIsGridOrListView, getKeyValueMap, getAcademicYear, SetAcademicYear, getPaginationProps,
    getSettingValue, getFullName, getFormatMessage, updatePermissions, getKeyValueInArray, getUrlParam
} from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import messages from './messages';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';
import QuizListActions from './components/QuizListActions';
import StaffSummaryQuiz from './StaffSummaryQuiz';

const user = localStorage.getItem("user")!='undefined'?JSON.parse(localStorage.getItem("user")):'';

const ITEM_HEIGHT = 35;


const quizTypeList = [{ id: 'all', name: 'All' }, { id: 'quiz', name: 'Quiz' }, { id: 'video_quiz', name: 'Video Quiz' }]


class QuizList extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('set_quiz', ['update', 'delete'])
        this.state = {
            quizList: [],
            AllquizList: [],
            dataReady: false,
            loading: true,
            tableUpdating: false,
            student_type: 'All',
            enabledActions: [],
            filterList: [],
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            studentTypeList: [{ name: 'All', id: 'All' }, { name: 'Day Scholar', id: 'Day Scholar' }, { name: 'Residential', id: 'Residential' }],
            searchStudent: '',
            dateRangeValue: {},
            dateRangeValueDefault: {},
            current_standard: null,
            start_date: '',
            end_date: '',
            year_name: '',
            blankPageMessage: 'Select year and standard',
            is_quiz_list: true,
            error: {},
            year: '',
            quiz_type: 'all',
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
                    name: "title",
                    label: <FormattedMessage {...messages.title} />,
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div className='cursor-pointer'>
                                <Tooltip title={tableMeta.rowData[9] ? "Video Quiz" : "Quiz"} enterDelay={400}
                                    enterNextDelay={400} placement='top-start'
                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Box className='display-flex'>
                                        {tableMeta.rowData[9] &&
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
                    name: "number_of_students",
                    label: <FormattedMessage {...commonMessages.noOfStudents} />,
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                    }
                },
                {
                    name: "form_standard_section_mapping_form",
                    label: <FormattedMessage {...commonMessages.sectionNames} />,
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Tooltip title={value.map((data, index) => {
                                    return (
                                        <Box key={index}>
                                            {`${data.standard_section_name}`}
                                        </Box>
                                    )
                                })} enterDelay={400}
                                    enterNextDelay={400} placement='top-start'
                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Box className='stock-property-value'>
                                        {value &&
                                            value.map((data, index) => {
                                                return (
                                                    <Box key={index}>
                                                        {(value.length === 1 && index === 0) &&
                                                            `${data.standard_section_name}`}
                                                        {value.length > 1 && index === 0 &&
                                                            `${data.standard_section_name} ....`
                                                        }
                                                    </Box>
                                                )
                                            })
                                        }
                                    </Box>
                                </Tooltip>
                            )
                        }
                    }
                },
                {
                    name: "is_finalized",
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
                    name: "access",
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
                    name: "creater",
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
                    name: "Action",
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        display: this.permission.length > 0,
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <QuizListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteQuiz}
                                    editURL={Actions.set_quiz.update.url}
                                    editExtraParams={{
                                        start_date: this.state.start_date, end_date: this.state.end_date,
                                        year_name: this.state.year_name, standard_name: this.state.standard_name,
                                        year: this.state.year, current_standard: this.state.current_standard,
                                        is_video: tableMeta.rowData[9]
                                    }}
                                    viewURL={Actions.application_student.view.url}
                                    enabledActions={this.permission}
                                    replaceEditToView={true}
                                    isFinalized={tableMeta.rowData[6]}
                                    access={tableMeta.rowData[7]}
                                    creator={tableMeta.rowData[8]}
                                    user={user['id']}
                                />
                            </div>
                            );
                        }
                    }
                }
            ]
        }
        this.dateRange = React.createRef();
    }


    handleStandardChange = (e) => {
        let { value, name } = e.target;
        const { pagination, standardList, standard_name } = this.state;
        if (name === 'current_standard') {
            let standard_name = getKeyValueMap(standardList, 'id', 'name')
            standard_name = standard_name[value]
        }
        this.setState({
            [name]: value,
            standard_name,
            error: {}
        }, () => {
            this.getQuizList(pagination)
        })
    }

    componentDidMount() {
        if (user['is_staff']) {
            this.getAcademicYearList();
        }
        else {
            this.props.history.push('/dashboard')
        }
    }

    handleChangeDateRange = (value) => {
        let { pagination } = this.state;
        this.setState({
            dateRangeValue: value,
            dateRangeValueDefault: value
        }, () => {
            this.getQuizList(pagination)
        })
    }

    handleClick = event => {
        this.setState({
            anchorEl: event.currentTarget
        })
    };

    handleCloseMenu = () => {
        this.setState({
            anchorEl: null
        })
    }

    onFilterChangeHandler = (type) => {
        if (type === 'reset') {
            this.setState({
                tableUpdating: true,
                quiz_type: 'all',
            }, () => {
                this.getQuizList();
            })
        }
    }

    getAcademicYearList = async () => {
        let { start_date, end_date, year_name } = this.state;
        const url = GET_URL.getacademicyear.api
        const param = { is_active: true }
        await getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    yearList: response.data.data,
                }, () => {
                    let { year, current_standard } = getUrlParam()
                    if (getAcademicYear() || year) {
                        year = getAcademicYear()
                        response.data.data.map((data) => {
                            if (data.id == year) {
                                start_date = data.start_date
                                end_date = data.end_date
                                year_name = data.name
                            }
                        })
                        this.setState({
                            year,
                            blankPageMessage: 'Select standard',
                            start_date: start_date,
                            end_date: end_date,
                            current_standard: current_standard ? current_standard : '',
                            year_name: year_name
                        }, () => {
                            this.getStandardList(current_standard);
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


    onChange = async (e) => {
        let { value } = e.target;
        let { yearList, start_date, end_date, year_name } = this.state;
        if (value !== 0) {
            yearList.map((data) => {
                if (data.id == value) {
                    start_date = data.start_date
                    end_date = data.end_date
                    year_name = data.name
                }
            })
            SetAcademicYear(value)
            this.setState({
                year: value,
                tableUpdating: true,
                academicYearFromDate: '',
                academicYearToDate: '',
                current_standard: null,
                dateRangeValue: {},
                error: {},
                blankPageMessage: 'Select standard',
                start_date: start_date,
                end_date: end_date,
                year_name: year_name
            }, () => {
                this.getStandardList();
            })
        }
    }

    getStandardList = (current_standard) => {
        let { year } = this.state;
        const params = { academic_year: year, is_active: true };
        getRequest(GET_URL.getstandardandsection.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let standardList = response.data.data;
                this.setState({
                    standardList,
                    loading: current_standard?true:false,
                }, () => {
                    if (current_standard !== 'undefined' && current_standard) {
                        let standard_name = getKeyValueMap(standardList, 'id', 'name')
                        standard_name = standard_name[current_standard]
                        this.setState({
                            standard_name,
                            loading:false
                        })
                        this.getQuizList()
                    }
                });
            }
        });
    }

    getSections = () => {
        let { standard, standardList } = this.state;
        if (standard) {
            const sectionList = getKeyValueInArray(standardList, 'id', standard, 'sections');
            this.setState({
                sectionList,
            }, () => {
                this.getQuizList();
            });
        }
    }

    getQuizList = (paginationProps) => {
        let { pagination, year, current_standard, dateRangeValue, quiz_type } = this.state;
        this.setState({ tableUpdating: true, dateRangeValue: dateRangeValue, })
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, academic_year: year, is_active: true, standard: current_standard };
        if (quiz_type !== 'all') {
            params['is_video_quiz'] = quiz_type === 'quiz' ? false : true
        }
        const url = GET_URL.forms.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const quizList = response.data;
                this.setState({
                    quizList: quizList.data,
                    AllquizList: quizList.data,
                    dataReady: true,
                    loading: false,
                    tableUpdating: false,
                    pagination: this.currentPagination,
                    dateRangeValue: dateRangeValue
                });
            }
        });
    };



    deleteQuiz = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { quizList, columns } = this.state
        const url = DEL_URL.forms.api + id + '/'
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                quizList.data_list.splice(index, 1)
                this.setState({
                    quizList: { ...quizList },
                    columns: [...columns]
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
        this.setState({ tableUpdating: false })
    }

    handleAddButton = (is_video) => {
        let { year, error, alertData, yearList, current_standard, standardList } = this.state;
        if (year && current_standard) {
            let start_date, end_date, year_name
            yearList.map((data) => {
                if (data.id == year) {
                    start_date = data.start_date
                    end_date = data.end_date
                    year_name = data.name
                }
            })
            let standard_name = getKeyValueMap(standardList, 'id', 'name')
            standard_name = standard_name[current_standard]
            let yearInformation = {
                year,
                year_name,
                start_date,
                end_date,
                standard_name,
                current_standard,
                is_video: is_video
            }
            let searchParam = "?" + new URLSearchParams(yearInformation).toString()
            this.props.history.push({
                pathname: Actions.set_quiz.create.url,
                search: searchParam,
            });
        }
        else if (!year) {
            alertData = <FormattedMessage {...commonMessages.selectAcademicYear} />
            error.year = alertData
        }
        else {
            alertData = <FormattedMessage {...commonMessages.selectAcademicYear} />
            error.current_standard = alertData
        }
        this.setState({
            open: true,
            alertData,
            error
        })
    }

    onChangeHandleView = (value) => {
        if (value) {
            this.getQuizList()
        }
        this.setState({
            is_quiz_list: value
        })
    }

    geFilterOptions = () => {
        let { quiz_type } = this.state;
        return <Fragment>
            <Box className='margin-top-20'>
                <Dropdown
                    data={quizTypeList}
                    name='quiz_type'
                    value={quiz_type}
                    onChange={(e) => this.handleStandardChange(e)}
                    label='Quiz Type'
                    hideSelect={true}
                />
            </Box>
        </Fragment>;
    }

    render() {
        let { standardList, current_standard, yearList, year, quizList, tableUpdating, loading, blankPageMessage, searchStudent,
            pagination, openMenu, anchorEl, error, is_quiz_list, standard_name
        } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            download: false,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            customFilterDialogFooter: () => {
                return this.geFilterOptions();
            },
            onFilterChange: (onFilterChange, filterList, type) => {
                this.onFilterChangeHandler(type, onFilterChange);
            },
            onDownload: (buildHead, buildBody, columns, data) => {
                let temp = { enquiry_num: [] }
                const bodyData = data.map((data_value, i) => {
                    temp['enquiry_num'] = data_value.data[4].split('###')
                    data_value.data[4] = temp['enquiry_num'][1]
                    data_value.data[2] = data_value.data[2] + ''
                    return data_value;
                })
                columns.forEach(column_name => {
                    column_name.label = getFormatMessage(column_name.label)
                })
                return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
            },
            downloadOptions: {
                filename: "Enquiry_Students.csv",
                filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                },
            },
        };

        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                {Actions.set_quiz.view.label}
                            </Box>
                        </Grid>
                        <Grid item lg={6} md={3} xs={12} >
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                {isUserHasPermission('set_quiz', 'create') && <Button
                                    variant="contained"
                                    onClick={this.handleClick}
                                    className='editbutton-view'
                                >{Actions.set_quiz.create.label} <MoreVertIcon className='visibility-icon' /> </Button>}
                            </Box>
                            <Menu
                                id="long-menu"
                                anchorEl={anchorEl}
                                keepMounted
                                open={Boolean(anchorEl)}
                                className='paper-custom-top'
                                onClose={this.handleCloseMenu}
                                PaperProps={{
                                    style: {
                                        maxHeight: ITEM_HEIGHT * 7,
                                        width: 150,
                                    },
                                }}
                            >
                                <MenuItem onClick={() => this.handleAddButton(false)}>
                                    {'Quiz'}
                                </MenuItem>
                                <MenuItem onClick={() => this.handleAddButton(true)}>
                                    {'Video Quiz'}
                                </MenuItem>
                            </Menu>
                        </Grid>
                    </Grid>
                    <Grid container className='m-bt-15px'>
                        <Grid item lg={3} md={6} xs={12}>
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
                        <Grid item lg={3} md={6} xs={12}>
                            <Box className='header-align p-l-20px'>
                                <Dropdown
                                    data={standardList}
                                    name='current_standard'
                                    value={current_standard}
                                    onChange={(e) => this.handleStandardChange(e)}
                                    label={<FormattedMessage {...commonMessages.standard} />}
                                    hideSelect={true}
                                    error={error.current_standard}
                                />
                            </Box>
                        </Grid>
                        {year && current_standard &&
                            <Grid item md={6} xs={12} className='margin-top-10 end-flex-prop'>
                                <Box className='attend-quiz-tab header-align'>
                                    <Button className={is_quiz_list === true ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                        onClick={(e) => this.onChangeHandleView(true)}
                                        disabled={is_quiz_list === true}>
                                        <Box className={is_quiz_list === true ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>Quiz List</Box>
                                        <Icon className={classNames(is_quiz_list === true ? 'list-selected-toggle-icon' : 'grid-selected-toggle-icon', "fa fa-bars")} />

                                    </Button>
                                    <Button className={is_quiz_list === false ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                        onClick={(e) => this.onChangeHandleView(false)}
                                        disabled={is_quiz_list === false}>
                                        <Box className={is_quiz_list === false ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>Summary</Box>
                                        <Icon className={classNames(is_quiz_list === false ? 'list-selected-toggle-icon' : 'grid-selected-toggle-icon', "fa fa-th-large")} />
                                    </Button>
                                </Box>
                            </Grid>
                        }
                    </Grid>


                    <Box className='header-align'>
                        {current_standard ?
                            is_quiz_list ?
                                <>
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
                                </>
                                :
                                <StaffSummaryQuiz
                                    year={year}
                                    current_standard={current_standard}
                                />
                            :
                            <BlankPagewithIcon data={blankPageMessage} />
                        }
                    </Box>
                </Paper >
            )
        }
    }
}
export default withRouter(QuizList)
