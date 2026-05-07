import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import Swal from 'sweetalert2'
import moment from 'moment';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import _ from 'lodash';
import { withRouter } from 'react-router-dom';
import { DateRange } from 'Components/DateRange';
import { Dropdown } from 'Components/DropDown';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls'
import StudentListActions from 'Includes/StudentListActions'
import { Actions } from 'Constants/permissions';
import {
    isUserHasPermission, getUrlParam, getPaginationProps, dateFormat, getFormatMessage, numberWithCommas, getFullName
} from 'Includes/functions';
import { options, minDate, DEFAULT_PAGINATION_PROPS_ID_LIST, maxDate } from 'Constants';
import { image_formats } from 'Containers/Expenses/Constants';
import { Today } from '@material-ui/icons';

class NotificationList extends Component {
    constructor() {
        super()
        this.state = {
            bulkNotificationList: [],
            loading: true,
            tableUpdating: false,
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            id: '',
            bank_name: '',
            account_num: '',
            fee_name: '',
            dateRangeValue: {},
            largeImagePreview: '',
            isOpenedDateRange: false,
            dateRangeDropdownList: [{ id: 'l1m', name: 'Last 1 Month' }, { id: 'l3m', name: 'Last 3 Months' }, { id: 'l6m', name: 'Last 6 Months' }, { id: 'l1y', name: 'Last 1 Year' }],
            isDateRange: false,
            dateRangeDropdown: 'l1m',
            enabledActions: [],
            columns: [
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
                    name: "schedule",
                    label: "schedule",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: "heading",
                    label: "Title",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "created",
                    label: "Created",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "notification_medium_name",
                    label: "Notification Medium",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "reciever",
                    label: "Reciever",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "schedule_type",
                    label: "Is Scheduled",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <StudentListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteBulkNotification}
                                    delete_label='Cancel Schedule'
                                    editURL={Actions.bulk_notification.update.url}
                                    viewURL={Actions.bulk_notification_individual.view.url}
                                    enabledActions={this.getEnabledActions(tableMeta.rowData[1])}
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

    getEnabledActions = (schedule) => {
        const { enabledActions } = this.state;
        let return_data = []
        const today = moment(new Date())
        let fromValue = moment(schedule)
        if (schedule && fromValue.diff(today, 'seconds') > 0 && (enabledActions.includes('edit') || enabledActions.includes('delete'))) {
            return_data = enabledActions
        }
        else if (enabledActions.includes('view')) {
            return_data = ['view']
        }
        return return_data
    }

    deleteBulkNotification = async (id, index) => {
        this.setState({ tableUpdating: true }) 
        let { bulkNotificationList, columns } = this.state
        const del_url = DEL_URL.bulknotification.api;
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                let temp_list=[...bulkNotificationList.data_list]
                temp_list.splice(index, 1)
                bulkNotificationList['data_list']=[...temp_list]
                this.setState({
                    bulkNotificationList,
                    columns: [...columns] 
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        })
        this.setState({ tableUpdating: false })
    }


    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('bulk_notification_individual', 'view')
        const hasEditPermission = isUserHasPermission('bulk_notification', 'update')
        const hasDeletePermission = isUserHasPermission('bulk_notification', 'delete')
        let enabledActions = [];
        if (hasViewPermission) {
            enabledActions.push('view')
        }
        if (hasEditPermission) {
            enabledActions.push('edit')
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
        }
        if (enabledActions.length === 0) {
            test = false;
        }
        if (name === 'display') {
            return test
        }
        else {
            this.setState({
                enabledActions: enabledActions,
                columns: this.state.columns
            })
        }
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
        let { dateRangeValue } = this.state;
        dateRangeValue.start = dateFormat(moment(new Date()).subtract(1, 'months'), 'YYYY-MM-DD')
        dateRangeValue.end = dateFormat(new Date(), 'YYYY-MM-DD')
        this.setState({
            options: _.cloneDeep(options),
            dateRangeValue
        }, () => {
            this.getbulkNotificationList()
        })
        this.updatePermissions()
    }


    handleChangeDateRange = (value, isOpened) => {
        let { pagination, dateRangeDropdown, dateRangeDropdownList } = this.state;
        if (isOpened) {
            let isCustomExist = false
            let temp = { id: 'custom', name: 'Custom Date Range' }
            dateRangeDropdownList.map((data) => {
                if (data.id === 'custom') {
                    isCustomExist = true
                }
            })
            if (!isCustomExist) {
                dateRangeDropdownList.push(temp)
            }
            dateRangeDropdown = 'custom'
        }
        else {
            dateRangeDropdownList.map((data, index) => {
                if (data.id === 'custom') {
                    dateRangeDropdownList.splice(index, 1)
                }
            })
        }
        this.setState({
            dateRangeValue: value,
            dateRangeDropdown,
            dateRangeDropdownList
        }, () => {
            this.getbulkNotificationList(pagination)
        })
    }

    getbulkNotificationList = (paginationProps) => {
        this.setState({ tableUpdating: true })
        let { pagination, id, dateRangeValue } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, is_active: true }
        if (!_.isEmpty(dateRangeValue)) {
            let temp = {}
            temp['from_date'] = `${dateRangeValue.start} 00:00:00`
            temp['to_date'] = `${dateRangeValue.end} 23:59:59`
            params = { ...params, ...temp }
        }
        const url = GET_URL.bulknotification.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                this.callApi = true
                response.data.data.data_list.map((data, index) => {
                    data['schedule_type'] = data['schedule'] ? `Yes [${dateFormat(data.schedule, 'DD-MM-YYYY hh:mm A')}]` : 'No'
                    data['reciever'] = this.getReceiver(data)
                    data['created'] = dateFormat(data.created, 'DD-MM-YYYY hh:mm A')
                })
                this.setState({
                    bulkNotificationList: response.data.data,
                    loading: false,
                    tableUpdating: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                });
            }
        });
    };

    getReceiver = (data) => {
        if (data['group_ids']) {
            return 'Group'
        }
        else if (data['standard_section_ids']) {
            return 'Standard Section'
        }
        else if (data['user_ids']) {
            return 'Student / Staff'
        }
    }

    onChangeDateRangeDropdown = (e) => {
        let { name, value } = e.target;
        let { dateRangeValue, pagination } = this.state;
        let start, end;
        end = dateFormat(new Date(), 'YYYY-MM-DD')
        if (value === 'l1m') {
            start = dateFormat(moment(new Date()).subtract(1, 'months'), 'YYYY-MM-DD')
        }
        else if (value === 'l3m') {
            start = dateFormat(moment(new Date()).subtract(3, 'months'), 'YYYY-MM-DD')
        }
        else if (value === 'l6m') {
            start = dateFormat(moment(new Date()).subtract(6, 'months'), 'YYYY-MM-DD')
        }
        else if (value === 'l1y') {
            start = dateFormat(moment(new Date()).subtract(12, 'months'), 'YYYY-MM-DD')
        }
        dateRangeValue.start = start
        dateRangeValue.end = end
        this.setState({
            dateRangeValue,
            [name]: value,
            isDropDownDateRange: true
        }, () => {
            let startDate = moment(start)
            let endDate = moment(end)
            this.dateRange.current.onChange(moment.range(startDate.clone(), endDate.clone()));
            this.getbulkNotificationList(pagination)
        })
    }

    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    handleAddExpensesButton = () => {
        this.props.history.push({
            pathname: Actions.bulk_notification.create.url,
        });
    }

    render() {
        const { loading, bulkNotificationList,
            columns, pagination, dateRangeDropdownList, dateRangeDropdown, dateRangeValue, tableUpdating } = this.state
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
                filename: "Bulk_Notifications.csv",
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
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Bulk Notification List
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('bulk_notification', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddExpensesButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.bulk_notification.create.label}</Button>
                                    }
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid item md={4} xs={12} className='margin-top-15'>
                                <Dropdown
                                    data={dateRangeDropdownList}
                                    name='dateRangeDropdown'
                                    value={dateRangeDropdown}
                                    onChange={this.onChangeDateRangeDropdown}
                                    label='Select Date Range'
                                    hideSelect={true}
                                />
                            </Grid>
                            <Grid item md={4} xs={12}>
                                <DateRange
                                    handleChange={this.handleChangeDateRange}
                                    minDate={minDate}
                                    maxDate={maxDate}
                                    label='Notification date range'
                                    ref={this.dateRange}
                                    hideClearIcon={true}
                                />
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={bulkNotificationList.data_list}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> :
                                            `${dateFormat(dateRangeValue.start, 'DD-MM-YYYY')} TO ${dateFormat(dateRangeValue.end, 'DD-MM-YYYY')}`}
                                        data={bulkNotificationList.data_list}
                                        columns={columns}
                                        options={options}
                                        onTableChange={this.getbulkNotificationList}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={bulkNotificationList.count}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(NotificationList)