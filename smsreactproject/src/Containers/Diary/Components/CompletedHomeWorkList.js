import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import Swal from 'sweetalert2'
import moment from 'moment';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import _,{cloneDeep} from 'lodash';
import { withRouter } from 'react-router-dom';
import { DateRange } from 'Components/DateRange';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import { Dropdown } from 'Components/DropDown';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import HomeWorkListAction from "./HomeWorkListAction";
import EvaluateStudentHomeWork from "Containers/Diary/EvaluateStudentHomeWork";

import {
    isUserHasPermission, updatePermissions, getPaginationProps, dateFormat, getFormatMessage, getUrlParam, getFullName
} from 'Includes/functions';
import { options, minDate, DEFAULT_PAGINATION_PROPS_ID_LIST, maxDate } from 'Constants';
import { image_formats } from 'Containers/Expenses/Constants';
import { Today } from '@material-ui/icons';

class HomeWorkList extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('diary_managehomework', ['update', 'delete'])
        this.state = {
            homeWorkList: [],
            loading: false,
            selectedToDelete: [],
            tableUpdating: false,
            bankLoaded: false,
            fieldDetails: null,
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            currentTab: 'HomeWorkList',
            bank_id: '',
            id: '',
            bank_name: '',
            account_num: '',
            fee_name: '',
            dateRangeValue: {},
            largeImagePreview: '',
            isOpenedDateRange: false,
            dateRangeDropdownList: [{ id: 'today', name: 'Today' }, { id: 'tom', name: 'Tomorrow' }, { id: 'week', name: 'This week' }, { id: 'custom', name: 'Custom Date Range' ,hide:true}],
            isDateRange: false,
            dateRangeDropdown: 'week',
            hasEvaluatePermission: false,
            evaluate_list: [],
            standardList: [],
            isInitialPageRender:true,
            homework: {},
            completed_list: {}
        }
        this.columns = [
            {
                name: "id",
                label: "id",
                options: {
                    filter: false,
                    sort: false,
                    viewColumns: false,
                    display: false,
                    download: false
                }
            },
            {
                name: "title",
                label: "Title",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                }
            },
            {
                name: "subject_name",
                label: "Subject",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                }
            },
            {
                name: "staff_first_name",
                label: "Staff Name",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                }
            },
            {
                name: "due_date",
                label: "Due Date",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        return (
                            <Box>
                                {dateFormat(value, 'DD-MM-YYYY')}
                            </Box>

                        )

                    }
                }
            },
            {
                name: "update",
                label: "Staff Name",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                    display: false,
                    download: false
                }
            },
            {
                name: "evaluate",
                label: "Staff Name",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                    display: false,
                    download: false
                }
            },
            {
                name: "total_student",
                label: "Total Students",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                }
            },
            {
                name: "actions",
                label: "Action",
                options: {
                    filter: false,
                    sort: false,
                    search: false,
                    download: false,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        return (
                            <Box>
                                <Button
                                    className='add-modify-button'
                                    onClick={() => this.goToEvaluatePage(tableMeta.rowData[0], tableMeta.rowIndex)}
                                > {`View`}
                                </Button>
                            </Box>
                        )
                    }
                }
            },
        ]
        this.dateRange = React.createRef();
        this.createEditHomeWorkRef = React.createRef();
    }
 
    goToEvaluatePage = (id) => {
        const { dateRangeValue, dateRangeDropdown } = this.state
        let sectionInformation = {
            'dateRangeValueStart': dateRangeValue.start,
            'dateRangeValueEnd': dateRangeValue.end,
            'dateRangeDropdownParam': dateRangeDropdown,
            'id':id
        }
        let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
        this.props.history.push({
            pathname: Actions.diary_managehomework_completed_student.view.url,
            search: searchParam,
        });
    }

    handleViewImage = (attachment_details) => {
        let file = attachment_details.file
        let file_extension = `${file.slice((Math.max(0, file.lastIndexOf(".")) || Infinity) + 1)}`;
        if (image_formats.includes(file_extension)) {
            this.setState({
                largeImagePreview: file
            })
        }
        else {
            window.open(file);
        }
    }

    componentDidMount = () => {
        let { dateRangeValue, dateRangeDropdown, dateRangeDropdownList } = this.state;
        let { parentDateRangeValue, parentDateRangeDropdown } = this.props;
        let { expanded } = getUrlParam();
        let dropdownlist=cloneDeep(dateRangeDropdownList)
        expanded = parentDateRangeDropdown
        if (expanded) {
            let start, end;
            if (parentDateRangeValue.start && parentDateRangeValue.end) {
                start = parentDateRangeValue.start
                end = parentDateRangeValue.end
            }
            else if (expanded === 'today') {
                start = dateFormat(new Date(), 'YYYY-MM-DD')
                end = dateFormat(new Date(), 'YYYY-MM-DD')
            }
            else if (expanded === 'tom') {
                start = dateFormat(moment(new Date()).add(1, 'days'), 'YYYY-MM-DD')
                end = dateFormat(moment(new Date()).add(1, 'days'), 'YYYY-MM-DD')
            }
            else if (expanded === 'week') {
                start = dateFormat(new Date(), 'YYYY-MM-DD')
                end = dateFormat(moment(new Date()).add(7, 'days'), 'YYYY-MM-DD')
            }
            if (expanded === 'custom') {
                dropdownlist[3]['hide']=false
            }
            dateRangeValue.start = start
            dateRangeValue.end = end
            dateRangeDropdown = expanded
        }
        else {
            dateRangeValue.start = dateFormat(new Date(), 'YYYY-MM-DD')
            dateRangeValue.end = dateFormat(moment(new Date()).add(7, 'days'), 'YYYY-MM-DD')
        }
        this.permission.unshift('View')
        const hasEvaluatePermission = isUserHasPermission(
            "diary_evaluatestudentshomework",
            "create"
        );
        this.getStandard();
        this.setState({
            options: _.cloneDeep(options),
            dateRangeValue,
            hasEvaluatePermission,
            dateRangeDropdown,
            dateRangeDropdownList:[...dropdownlist]
        }, () => {
            let startDate = moment(dateRangeValue.start)
            let endDate = moment(dateRangeValue.end)
            this.dateRange.current.onChange(moment.range(startDate.clone(), endDate.clone()));
        })
    }

    getStandard = () => {
        const params = { is_active: true };
        getRequest(GET_URL.getstandardandsection.api, params, this.props).then(
            (response) => {
                if (response && response.status === 200) {
                    const standardList = response.data.data;
                    this.setState({
                        standardList,
                    });
                }
            }
        );
    };



    handleChangeDateRange = (value, isOpened) => {
        let { dateRangeDropdown, dateRangeDropdownList ,isInitialPageRender} = this.state;
        let { parentDateRangeDropdown} = this.props;
        if (isOpened || (isInitialPageRender && parentDateRangeDropdown === 'custom')) {
            dateRangeDropdownList[dateRangeDropdownList.length-1]['hide']=false
            dateRangeDropdown = 'custom'
        }
        else {
            dateRangeDropdownList[dateRangeDropdownList.length-1]['hide']=true
        }
        this.setState({
            dateRangeValue: value,
            dateRangeDropdown,
            dateRangeDropdownList,
            tableUpdating: true,
            isInitialPageRender:false
        }, () => {
            this.props.updateDateRange(value, dateRangeDropdown)
            this.getCompletedHomeWorkList()
        })
    }

    getCompletedHomeWorkList = (paginationProps) => {
        let { pagination, dateRangeValue } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let url = GET_URL.diary.api;
        let params = { ...pagination_params, status: 'COMPLETED', evaluate_data: 0 };
        if (!_.isEmpty(dateRangeValue)) {
            let temp = {}
            temp['from_date'] = dateRangeValue.start
            temp['to_date'] = dateRangeValue.end
            params = { ...params, ...temp }
        }
        getRequest(url, params).then((response) => {
            if (response && response.status === 200) {
                const completed_list = response.data.data;
                this.setState({
                    completed_list,
                    tableUpdating: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                });
            }
        });
    };

    onChangeDateRangeDropdown = (e) => {
        let { name, value } = e.target;
        let { dateRangeValue, pagination } = this.state;
        let start, end;
        if (value === 'today') {
            start = dateFormat(new Date(), 'YYYY-MM-DD')
            end = dateFormat(new Date(), 'YYYY-MM-DD')
        }
        else if (value === 'tom') {
            start = dateFormat(moment(new Date()).add(1, 'days'), 'YYYY-MM-DD')
            end = dateFormat(moment(new Date()).add(1, 'days'), 'YYYY-MM-DD')
        }
        else if (value === 'week') {
            start = dateFormat(new Date(), 'YYYY-MM-DD')
            end = dateFormat(moment(new Date()).add(7, 'days'), 'YYYY-MM-DD')
        }
        dateRangeValue.start = start
        dateRangeValue.end = end
        this.setState({
            dateRangeValue,
            [name]: value,
            isDropDownDateRange: true,
            tableUpdating: true
        }, () => {
            let startDate = moment(start)
            let endDate = moment(end)
            this.dateRange.current.onChange(moment.range(startDate.clone(), endDate.clone()));
        })
    }

    editHomeWork = (id) => {
        let url = `${GET_URL.diary.api}${id}/`;
        let { getHomeWork } = this.state;
        getRequest(url, { from_diary: 1 }).then((response) => {
            if (response && response.status === 200) {
                getHomeWork = response.data.data;
                const data = {
                    id: id,
                    title: getHomeWork.title,
                    description: getHomeWork.description,
                    points: getHomeWork.marks,
                    duedate: moment(getHomeWork.due_date).format("YYYY-MM-DD"),
                    selected_standard: getHomeWork?.standard_details[0].standard,
                    selected_sections: getHomeWork.standard_details.map((data) => {
                        return {
                            name: data.section_name,
                            id: data.section,
                            standard_section: data.standard_section,
                        };
                    }),
                    selected_subject: getHomeWork.subject, 
                };
                const studentIds = getHomeWork.student_details.map(
                    (data) => data.student
                );
                const staffData = {};
                // eslint-disable-next-line no-unused-vars
                for (const data of getHomeWork.staff_details) {
                    staffData[data.staff] = {
                        view: data.view,
                        update: data.update,
                        evaluate: data.evaluate,
                    };
                }
                this.createEditHomeWorkRef.current.updateEditData(
                    data,
                    studentIds,
                    staffData,
                    getHomeWork
                );
            }
        });
    };

    viewHomeWork = (id) => {
        let searchState = { id: id, expanded: this.state.expanded };
        let searchParam = "?" + new URLSearchParams(searchState).toString();
        this.props.history.push({
            pathname: Actions.diary_viewhomework.view.url,
            search: searchParam,
        });
    };

    deleteHomeWork = async (id, index) => {
        let { homeWorkList } = this.state;
        const url = DEL_URL.diary.api + id + "/";
        deleteRequest(url, {}, this.props).then((response) => {
            if (response && response.status === 200) {
                homeWorkList['data_list'].splice(index, 1)
                this.setState({ homeWorkList })
                Swal.fire({
                    position: "top-end",
                    type: "success",
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500,
                });
            }
        });
    };


    evaluatehomework = () => {
        this.setState({
            isEvaluatePage: false
        })
        this.getCompletedHomeWorkList()
    }


    render() {
        const { loading, homeWorkList, standardList, isEdit, currentTab, hasEvaluatePermission, evaluate_list,
            largeImagePreview, pagination, dateRangeDropdownList, dateRangeDropdown, dateRangeValue,
            tableUpdating, isEvaluatePage, homework, completed_list } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            downloadOptions: {
                filename: "Complete_home_work_list.csv",
                filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                },
            },
        };
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Grid container spacing={2}>
                        <Grid item md={4} xs={12} className='margin-top-15'>
                            <Dropdown
                                data={dateRangeDropdownList}
                                name='dateRangeDropdown'
                                value={dateRangeDropdown}
                                onChange={this.onChangeDateRangeDropdown}
                                label='Due date range type'
                                hideSelect={true}
                            />
                        </Grid>
                        <Grid item md={4} xs={12}>
                            <DateRange
                                handleChange={this.handleChangeDateRange}
                                minDate={minDate}
                                maxDate={maxDate}
                                label='Custom due date range'
                                ref={this.dateRange}
                                hideClearIcon={true}
                            />
                        </Grid>
                    </Grid>
                    <Grid container className={classNames('header-align')}>
                        <Grid item md={12} xs={12}>
                            <AllMUIDataTable
                                key={completed_list.data_list}
                                title={tableUpdating ? <CircularProgress className='white-text' /> :
                                    `${dateFormat(dateRangeValue.start, 'DD-MM-YYYY')} TO ${dateFormat(dateRangeValue.end, 'DD-MM-YYYY')}`}
                                data={completed_list.data_list}
                                columns={this.columns}
                                options={options}
                                onTableChange={this.getCompletedHomeWorkList}
                                serverSide={true}
                                pagination={pagination}
                                count={completed_list.count}
                            />
                        </Grid>
                    </Grid>
                    {isEvaluatePage &&
                        <EvaluateStudentHomeWork
                            id={homework.id}
                            homework={homework.homeWorkData}
                            evaluatehomework={this.evaluatehomework}
                            completedTab={true}
                        />
                    }
                </Box>
            )
        }
    }
}
export default withRouter(HomeWorkList)