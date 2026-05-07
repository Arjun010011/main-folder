import React, { Component, Fragment } from 'react'
import { Paper, Box, Button, Grid, MenuItem, Menu, CircularProgress, Tooltip, Icon } from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames'
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
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

const user = localStorage.getItem("user")!='undefined'?JSON.parse(localStorage.getItem("user")):'';


const ITEM_HEIGHT = 35;


class StaffSummaryQuiz extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('set_quiz', ['update', 'delete'])
        this.state = {
            quizList: [],
            AllquizList: [],
            dataReady: false,
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
            columns: [
                {
                    name: "student_standard_rank",
                    label: <FormattedMessage {...messages.rank} />,
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "full_name",
                    label: <FormattedMessage {...commonMessages.studentName} />,
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "total_attended_quiz",
                    label: 'Total Attended Quiz',
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "total_percentage",
                    label: 'Average Percentage',
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "total_points_earned",
                    label: 'Total Points Earned',
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                    }
                },
            ]
        }
        this.dateRange = React.createRef();
    }


    handleStandardChange = (e) => {
        let { value } = e.target;
        const { pagination, standardList } = this.state;
        let standard_name = getKeyValueMap(standardList, 'id', 'name')
        standard_name = standard_name[value]
        this.setState({
            current_standard: value,
            standard_name,
            error: {}
        }, () => {
            this.getQuizList(pagination)
        })
    }

    componentDidMount() {
        if (user['is_staff']) {
            this.getQuizList();
        }
        else {
            this.props.history.push('/dashboard')
        }
    }

    getQuizList = (paginationProps) => {
        let { pagination } = this.state;
        let { year, current_standard } = this.props;
        this.setState({ tableUpdating: true })
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        pagination_params['ordering'] = 'student_standard_rank'
        let params = { ...pagination_params, academic_year: year, standard: current_standard, };
        const url = GET_URL.responsesummary.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const quizList = response.data;
                quizList.data.data_list.map((data) => {
                    data['full_name'] = getFullName(data['student_first_name'], data['student_middle_name'], data['student_last_name'])
                })
                this.setState({
                    quizList: quizList.data,
                    AllquizList: quizList.data,
                    dataReady: true,
                    tableUpdating: false,
                    pagination: this.currentPagination,
                });
            }
        });
    };



    render() {
        let { quizList, tableUpdating, loading, pagination } = this.state
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

        return (
            <Box className='header-align'>
                <AllMUIDataTable
                    data={quizList.data_list}
                    key={quizList.data_list}
                    title={tableUpdating ? <CircularProgress className='white-text' /> : 'Rank List'}
                    columns={this.state.columns}
                    options={options}
                    onTableChange={this.getQuizList}
                    serverSide={true}
                    pagination={pagination}
                    count={quizList.count}
                />
            </Box>
        )
    }
}
export default withRouter(StaffSummaryQuiz)
