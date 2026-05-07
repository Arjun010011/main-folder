import React, { Component, Fragment } from 'react'
import { Paper, Box, Button, Grid, FormControlLabel, CircularProgress, Switch, Tooltip } from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames'
import Swal from 'sweetalert2'
import _ from 'lodash';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest, postRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, DEL_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';
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
import EvaluateStudentQuiz from './EvaluateStudentQuiz';

const evaluateStatusList = [
    { id: 'all', name: 'All' },
    { id: 'true', name: 'Evaluated' },
    { id: 'false', name: 'Not Evaluated' },
]

class ResponsesList extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('application_student_list', ['update', 'delete'])
        this.state = {
            responseList: [],
            AllresponseList: [],
            dataReady: false,
            loading: true,
            tableUpdating: false,
            enabledActions: [],
            error: {},
            filterList: [],
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            dateRangeValue: {},
            dateRangeValueDefault: {},
            current_standard: null,
            start_date: '',
            end_date: '',
            year_name: '',
            blankPageMessage: 'Select year and standard',
            error: {},
            status: 'all',
            section: 'all',
            submitDisable: false,
            is_evaluated_all: false,
            is_submitted: true,
            columns: [
                {
                    name: "id",
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
                    name: "full_name",
                    label: 'Student name',
                    options: {
                        filter: false,
                        sort: true,
                        search: true,

                    }
                },
                {
                    name: "section_name",
                    label: 'Section',
                    options: {
                        filter: false,
                        sort: true,
                        search: true,

                    }
                },
                {
                    name: "number_of_attended_questions",
                    label: 'No. of questions attended',
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <Tooltip
                                    title={this.getShowContentQuestions(value, tableMeta.rowData[7])}
                                    enterDelay={400}
                                    enterNextDelay={400} placement='top-start'
                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Box className='pointer'>
                                        {`${value} / ${tableMeta.rowData[7]}`}
                                    </Box>
                                </Tooltip>
                            </div>
                            )
                        }

                    }
                },
                {
                    name: "score_obtained",
                    label: 'Points Obtained',
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <Tooltip
                                    title={this.getShowContentMarks(value, tableMeta.rowData[8])}
                                    enterDelay={400}
                                    enterNextDelay={400} placement='top-start'
                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Box className='pointer'>
                                        {`${value} / ${tableMeta.rowData[8]}`}
                                    </Box>
                                </Tooltip>
                            </div>
                            )
                        }
                    }
                },
                {
                    name: "submitted_time",
                    label: 'Submited Time',
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
                    name: "student",
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
                    name: "total_score",
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
                    name: "is_evaluated",
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
                            return (<div className='text-align-center'>
                                {this.state.is_submitted ?
                                    <Button
                                        className='add-modify-button'
                                        onClick={() => this.goToEvaluatePage(this.props.quizDetails['form_code'], tableMeta.rowData[6])}
                                    > {tableMeta.rowData[9] ? `View` : `Evaluate`}
                                    </Button>
                                    :
                                    <Button
                                        disabled={this.state.submitDisable}
                                        className='apply-leave-reset-button '
                                        onClick={e => this.deleteStudent(tableMeta.rowData[0])}>Delete
                                    </Button>
                                }
                            </div>
                            );
                        },
                        customHeadRender: (columnMeta, updateDirection) => (
                            <th key={0} onClick={() => updateDirection(0)} className='mui-table-custom-header-center-align'>
                                {columnMeta.label}
                            </th>
                        )
                    }
                }
            ]
        }
        this.dateRange = React.createRef();
    }

    deleteStudent = (id) => {
        this.setState({ submitDisable: true })
        const url = DEL_URL.response.api + id + '/'
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.getQuizList()
            }
            this.setState({ submitDisable: false })
        })
    }

    goToEvaluatePage = (form_code, student) => {
        let sectionInformation = {
            'form_code': form_code,
            'student': student,
        }
        let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
        this.props.history.push({
            pathname: Actions.evaluate_student.view.url,
            search: searchParam,
        });
    }

    componentDidMount() {
        const { quizDetails } = this.props;
        let sectionList = [...quizDetails.form_standard_section_mapping_form]
        let temp = { standard_section: 'all', standard_section_name: 'All' }
        sectionList.unshift(temp)
        this.setState({
            sectionList: sectionList,
            loading: false
        })
        this.getQuizList()
    }

    getShowContentQuestions = (value, total) => {
        return (
            <Box>
                <Box>{`Total Questions : ${total}`}</Box>
                <Box>{`Attended Questions : ${value}`}</Box>
            </Box>
        )
    }

    getShowContentMarks = (value, total) => {
        return (
            <Box>
                <Box>{`Total Points : ${total}`}</Box>
                <Box>{`Obtainer Points : ${value}`}</Box>
            </Box>
        )
    }

    getQuizList = (paginationProps) => {
        let { pagination, section, status, is_submitted } = this.state;
        let { quizDetails } = this.props;

        this.setState({ tableUpdating: true })
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, form: quizDetails.id, is_submitted: is_submitted };
        if (section !== 'all')
            params['standard_section'] = section
        if (status !== 'all')
            params['is_evaluated'] = status
        const url = GET_URL.response.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const responseList = response.data.data;
                responseList.data_list.map((data) => {
                    data['full_name'] = getFullName(data['student_first_name'], data['student_middle_name'], data['student_last_name'])
                    data['section_name'] = data['section_details'] && data['section_details']['standard_section__section__name']
                })
                this.setState({
                    responseList: responseList.data_list,
                    AllresponseList: responseList.data_list,
                    dataReady: true,
                    loading: false,
                    tableUpdating: false,
                    pagination: this.currentPagination,
                    is_evaluated_all: responseList.is_allevaluated
                });
            }
        });
    };

    onChange = (e) => {
        let { name, value } = e.target;
        this.setState({
            [name]: value
        }, () => {
            this.getQuizList()
        })
    }

    evaluateAll = () => {
        Swal.fire({
            title: "<strong>Are you sure want to Evaluate All</strong>",
            text: "You won't be able to update/edit  evaluate!",
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
                let { quizDetails } = this.props;
                this.setState({
                    submitDisable: true
                })
                let postData = {
                    'form': quizDetails.id
                }
                let url = POST_URL.evaluate.api;
                postRequest(url, postData, this.props)
                    .then((response) => {
                        if (response && response.status === 200) {
                            Swal.fire({
                                position: 'top-end',
                                type: 'success',
                                title: response.data.Reason,
                                showConfirmButton: false,
                                timer: 1500
                            })
                            this.getQuizList()
                        }
                        this.setState({
                            submitDisable: false
                        })
                    });
            }
        })
    }

    handleIsSubmitted = () => {
        this.setState({
            is_submitted: !this.state.is_submitted
        }, () => {
            this.getQuizList()
        })
    }

    render() {
        let { responseList, tableUpdating, submitDisable, is_submitted, loading, pagination, status, section, sectionList,
            is_evaluated_all, error } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            onDownload: (buildHead, buildBody, columns, data) => {
                const bodyData = data.map((data_value, i) => {
                    return data_value;
                })
                columns.forEach(column_name => {
                    column_name.label = getFormatMessage(column_name.label)
                })
                return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
            },
            downloadOptions: {
                filename: "ResponseList.csv",
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
                    <Grid container className='m-bt-15px align-items-center'>
                        <Grid item lg={3} md={3} xs={12}>
                            <Box className='header-align p-r-20px'>
                                <Dropdown
                                    data={sectionList}
                                    name='section'
                                    value={section}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...commonMessages.section} />}
                                    error={error.section}
                                    hideSelect={true}
                                    customName='standard_section_name'
                                    customId='standard_section'
                                />
                            </Box>
                        </Grid>
                        <Grid item lg={3} md={3} xs={12}>
                            <Box className='header-align p-l-20px'>
                                <Dropdown
                                    data={evaluateStatusList}
                                    name='status'
                                    value={status}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...messages.evaluateStatus} />}
                                    hideSelect={true}
                                    error={error.status}
                                />
                            </Box>
                        </Grid>
                        <Grid item lg={3} md={3} xs={12}>
                            <Box className='header-align p-l-20px'>
                                <FormControlLabel
                                    control={<Switch checked={!is_submitted}
                                        name="is_submitted"
                                        value={!is_submitted}
                                        color="secondary"
                                        onChange={(e) => this.handleIsSubmitted(e)} />}
                                    label="Partially Submitted"
                                />
                            </Box>
                        </Grid>
                        <Grid item lg={3} md={3} xs={12} className='align-self-center text-align-right '>
                            {!tableUpdating && status !== 'true' && (responseList.length > 0) && is_submitted &&
                                (is_evaluated_all ?
                                    <Box className='schedule-exam-approved-box  fs-18'>
                                        Evaluated All
                                    </Box>
                                    :
                                    <Box className='text-align-right '>
                                        <Button variant='contained'
                                            color='primary' className='submit'
                                            disabled={submitDisable}
                                            onClick={() => this.evaluateAll()}>Evaluate All
                                        </Button>
                                    </Box>
                                )
                            }
                        </Grid>
                    </Grid>
                    <Box className='header-align'>
                        <AllMUIDataTable
                            data={responseList}
                            key={responseList}
                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                            columns={this.state.columns}
                            options={options}
                            onTableChange={this.getQuizList}
                            serverSide={true}
                            pagination={pagination}
                            count={responseList.count}
                        />
                    </Box>
                </Paper >
            )
        }
    }
}
export default withRouter(ResponsesList)
