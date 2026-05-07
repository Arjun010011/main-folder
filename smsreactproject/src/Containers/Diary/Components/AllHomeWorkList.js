import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import Swal from 'sweetalert2'
import moment from 'moment';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import _, { cloneDeep } from 'lodash';
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

import {
    getUrlParam, updatePermissions, getPaginationProps, dateFormat, getFormatMessage, numberWithCommas, getFullName
} from 'Includes/functions';
import { options, minDate, DEFAULT_PAGINATION_PROPS_ID_LIST, maxDate } from 'Constants';
import { image_formats } from 'Containers/Expenses/Constants';
import { Today } from '@material-ui/icons';

class AllHomeWorkList extends Component {
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
            dateRangeDropdownList: [{ id: 'today', name: 'Today' }, { id: 'tom', name: 'Tomorrow' }, { id: 'week', name: 'This week' }, { id: 'custom', name: 'Custom Date Range', hide: true }],
            isDateRange: false,
            dateRangeDropdown: 'week',
            hasEvaluatePermission: false,
            evaluate_list: [],
            standardList: [],
            isInitialPageRender: true,
            homework: {}
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
                name: "is_view_only",
                label: "Is View",
                options: {
                    filter: false,
                    sort: false,
                    viewColumns: false,
                    display: false,
                    download: false
                }
            },
            {
                name: "standards",
                label: "Standard",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                    customBodyRender: (value) => {
                    if (!Array.isArray(value)) return "";
                        return value.map(s => s.standard_name).join(", ");
                    },
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
                            <HomeWorkListAction
                                id={tableMeta.rowData[0]}
                                index={tableMeta.rowIndex}
                                update={tableMeta.rowData[5]}
                                evaluate={tableMeta.rowData[6]}
                                isViewOnly={tableMeta.rowData[8]}
                                deleteHomeWork={() =>
                                    this.deleteHomeWork(
                                        tableMeta.rowData[0],
                                        tableMeta.rowIndex,
                                    )
                                }
                                viewHomeWork={() =>
                                    this.viewHomeWork(tableMeta.rowData[0], tableMeta.rowIndex)
                                }
                                editHomeWork={() =>
                                    this.editHomeWork(tableMeta.rowData[0], tableMeta.rowIndex)
                                }
                                options={this.permission}
                            />
                        )
                    }
                }
            },
        ]
        this.dateRange = React.createRef();
        this.createEditHomeWorkRef = React.createRef();
    }

    goToEvaluatePage = (id, index) => {
        const { evaluate_list } = this.state;
        let data = evaluate_list['data_list'][index]
        const homework = { id: id, homeWorkData: data }
        this.setState({
            homework,
            isEvaluatePage: true
        })
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
        let expanded = parentDateRangeDropdown
        let dropdownlist = cloneDeep(dateRangeDropdownList)
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
                dropdownlist[3]['hide'] = false
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
        this.getStandard();
        this.setState({
            options: _.cloneDeep(options),
            dateRangeValue,
            dateRangeDropdown,
            dateRangeDropdownList: [...dropdownlist]
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
        let { dateRangeDropdown, dateRangeDropdownList, isInitialPageRender } = this.state;
        let { parentDateRangeDropdown } = this.props;
        if (isOpened || (isInitialPageRender && parentDateRangeDropdown === 'custom')) {
            dateRangeDropdownList[dateRangeDropdownList.length - 1]['hide'] = false
            dateRangeDropdown = 'custom'
        }
        else {
            dateRangeDropdownList[dateRangeDropdownList.length - 1]['hide'] = true
        }
        this.setState({
            dateRangeValue: value,
            dateRangeDropdown,
            dateRangeDropdownList,
            tableUpdating: true,
            isInitialPageRender: false
        }, () => {
            this.props.updateDateRange(value, dateRangeDropdown)
            this.getAllHomeWorkList()
        })
    }

    getAllHomeWorkList = (paginationProps) => {
        let { pagination, id, dateRangeValue } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, is_active: true, }
        if (!_.isEmpty(dateRangeValue)) {
            let temp = {}
            temp['from_date'] = dateRangeValue.start
            temp['to_date'] = dateRangeValue.end
            params = { ...params, ...temp }
        }
        const url = GET_URL.diary.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                this.callApi = true
                response.data.data.data_list.map((data, index) => {
                    data['staff_name'] = getFullName(data['staff_first_name'], data['staff_middle_name'], data['staff_last_name'])
                    data['is_view_only'] = moment(dateFormat(data['due_date'], 'YYYY-MM-DD')).isBefore(dateFormat(new Date(), 'YYYY-MM-DD'))
                    data['due_date'] = dateFormat(data['due_date'], 'DD-MM-YYYY')

                })
                this.setState({
                    homeWorkList: response.data.data,
                    loading: false,
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
            this.props.updateDateRange(dateRangeValue, value)
        })
    }

    editHomeWork = (id) => {
        this.props.editHomeWork(id)
    };

    viewHomeWork = (id) => {
        // let searchState = { id: id, expanded: this.state.dateRangeDropdown };
        // let searchParam = "?" + new URLSearchParams(searchState).toString();
        // this.props.history.push({
        //     pathname: Actions.diary_viewhomework.view.url,
        //     search: searchParam,
        // });
        this.props.viewHomeWork(id)

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

    getDiaryReportList = () => {
        let prop = { ...this.props };
        prop.responseType = "blob";
        const url = GET_URL.diaryreport.api;
        let param = {
            is_active: true,
            download_pdf: 1,
        };
        getRequest(url, param, prop).then((response) => {
            if (response && response.status === 200) {
                const fileURL = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
                const link = document.createElement("a");
                link.href = fileURL;
                link.setAttribute("download", "diary_report.pdf");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        })
        return false;
    };

    render() {
        const { loading, homeWorkList, pagination, dateRangeDropdownList, dateRangeDropdown, dateRangeValue,
            tableUpdating } = this.state
        const { currentTab } = this.props;
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
                filename: "Homework_list.csv",
                filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                },
            },
            onDownload: () => {
                return this.getDiaryReportList("download");
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
                <Box className={currentTab === 'HomeWorkList' ? '' : 'display-none'}>
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
                                key={homeWorkList.data_list}
                                title={tableUpdating ? <CircularProgress className='white-text' /> :
                                    `${dateFormat(dateRangeValue.start, 'DD-MM-YYYY')} TO ${dateFormat(dateRangeValue.end, 'DD-MM-YYYY')}`}
                                data={homeWorkList.data_list}
                                columns={this.columns}
                                options={options}
                                onTableChange={this.getAllHomeWorkList}
                                serverSide={true}
                                pagination={pagination}
                                count={homeWorkList.count}
                            />
                        </Grid>
                    </Grid>
                </Box>
            )
        }
    }
}
export default withRouter(AllHomeWorkList)