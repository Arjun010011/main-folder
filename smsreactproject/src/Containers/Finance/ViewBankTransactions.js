import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import Swal from 'sweetalert2'
import moment from 'moment';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import _ from 'lodash';
import { withRouter } from 'react-router-dom';
import { DateRange } from 'Components/DateRange';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import { Dropdown } from 'Components/DropDown';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import {
    isUserHasPermission, getUrlParam, getPaginationProps, dateFormat, getFormatMessage, numberWithCommas, getFullName
} from 'Includes/functions';
import { options, minDate, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import { image_formats } from 'Containers/Expenses/Constants';
import { Today } from '@material-ui/icons';

class ViewBankTransactions extends Component {
    constructor() {
        super()
        this.state = {
            feeTypeBankMapList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            bankLoaded: false,
            fieldDetails: null,
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            bank_id: '',
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
                    name: "date",
                    label: "Transaction Date",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box className='mui-table-custom-value-left-align' display='flex'>
                                    <Box>
                                        {dateFormat(value, 'DD-MM-YYYY')}
                                    </Box>
                                </Box>

                            )

                        }
                    }
                },
                {
                    name: "is_deposit",
                    label: "Transaction Type",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box className='mui-table-custom-value-left-align' display='flex'>
                                    {value &&
                                        <Box className='deposit-transaction'>Deposit</Box>
                                    }
                                    {!value &&
                                        <Box className='withdraw-transaction'>Withdraw</Box>
                                    }
                                </Box>

                            )

                        }
                    }
                },
                {
                    name: "amount",
                    label: "Amount",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box className='mui-table-custom-value-left-align' display='flex'>
                                    <Box>
                                        {numberWithCommas(value)}
                                    </Box>
                                </Box>

                            )

                        }
                    }
                },
                {
                    name: "balance",
                    label: "Balance",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box className='mui-table-custom-value-left-align' display='flex'>
                                    <Box>
                                        {numberWithCommas(value)}
                                    </Box>
                                </Box>

                            )

                        }
                    }
                },
                {
                    name: "staff_name",
                    label: "Staff Name",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                    }
                },
                {
                    name: "particulars",
                    label: "Comment",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box className='left-align-width-100' display='flex'>
                                    <Tooltip title={value} enterDelay={500}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Box className='handle-comment-name-overflow'
                                        >
                                            {value}
                                        </Box>
                                    </Tooltip>
                                    <Box className='handle-comment-name-overflow'>{`------`}</Box>
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "attachment_details",
                    label: "Attachment",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            const hasFile = value && value.file && typeof value.file === 'string';
                            return (
                                <Box >
                                    {hasFile &&
                                        <Box onClick={() => this.handleViewImage(value)} className='view-expenses-image-view'>
                                            {`[View]`}
                                        </Box>
                                    }
                                    {!hasFile &&
                                        <Box>
                                            {`------`}
                                        </Box>
                                    }

                                </Box>
                            )
                        }
                    }
                },

            ]
        }
        this.dateRange = React.createRef();
    }

    handleViewImage = (attachment_details) => {
        if (!attachment_details || !attachment_details.file || typeof attachment_details.file !== 'string') {
            return;
        }
        const file = attachment_details.file;
        const file_extension = `${file.slice((Math.max(0, file.lastIndexOf(".")) || Infinity) + 1)}`;
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
        let { bank_id, id, bank_name, account_num, fee_name } = getUrlParam();
        if (bank_id && id && bank_name && account_num && fee_name) {
            let { dateRangeValue } = this.state;
            dateRangeValue.start = dateFormat(moment(new Date()).subtract(1, 'months'), 'YYYY-MM-DD')
            dateRangeValue.end = dateFormat(new Date(), 'YYYY-MM-DD')
            this.setState({
                options: _.cloneDeep(options),
                bank_id: bank_id,
                id: id,
                bank_name: bank_name,
                account_num: account_num,
                fee_name: fee_name,
                dateRangeValue
            }, () => {
                this.getFeeTypeBankMapList()
            })
        }
        else {
            this.props.history.push(Actions.fee_type_bank_balance.view.url)
        }
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
            this.getFeeTypeBankMapList(pagination)
        })
    }

    getFeeTypeBankMapList = (paginationProps) => {
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
            temp['from_date'] = dateRangeValue.start
            temp['to_date'] = dateRangeValue.end
            params = { ...params, ...temp }
        }
        const url = GET_URL.banktransaction.api + id + '/'
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                this.callApi = true
                response.data.data.data_list.map((data, index) => {
                    data['staff_name'] = getFullName(data['staff_first_name'], data['staff_middle_name'], data['staff_last_name'])
                })
                this.setState({
                    feeTypeBankMapList: response.data.data,
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
            this.getFeeTypeBankMapList(pagination)
        })
    }

    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    render() {
        const { loading, feeTypeBankMapList,
            largeImagePreview, columns, pagination, dateRangeDropdownList, dateRangeDropdown, dateRangeValue, tableUpdating, bank_id, bank_name, account_num, fee_name } = this.state
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
                    if (data_value.data[1]) {
                        data_value.data[1] = 'Deposite'
                    }
                    else {
                        data_value.data[1] = 'Withdraw'
                    }
                    data_value.data[0] = dateFormat(data_value.data[0], 'DD-MM-YYYY')
                    return data_value
                })
                columns.forEach(column_name => {
                    column_name.label = getFormatMessage(column_name.label)
                })
                return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
            },
            downloadOptions: {
                filename: "Bank_Transactions.csv",
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
                        {largeImagePreview &&
                            <Box className='set-question-large-image-preview-box'>
                                <img src={largeImagePreview} alt='Image Preview' className='set-question-large-image-preview' />
                                <Tooltip title='Close Image' placement='top-start'>
                                    <Box className='set-question-large-image-remove-icon-box'
                                        onClick={this.handleCloseLargeImage}>
                                        <HighlightOffIcon className='set-question-large-image-remove-icon' />
                                    </Box>
                                </Tooltip>
                            </Box>
                        }
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Fee Type Transaction Overview
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('fee_type_bank_balance', 'view') &&
                                        <Button
                                            variant="contained"
                                            component={Link} to={Actions.fee_type_bank_balance.view.url}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.fee_type_bank_balance.view.label}</Button>
                                    }
                                </Box>

                            </Grid>
                        </Grid>
                        <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                            <Box className="year-std-box mr-40">
                                <Box className="academic-std-head "> Fee Type</Box>
                                <Box className=" aca-std-white-background">{fee_name}</Box>
                            </Box>
                            <Box className="year-std-box mr-40">
                                <Box className="academic-std-head "> Bank ID and Information</Box>
                                <Box className=" aca-std-white-background">{bank_id}</Box>
                                <Box className=" aca-std-white-background">{bank_name}</Box>
                                <Box className=" aca-std-white-background">{account_num}</Box>
                            </Box>
                        </Box>
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
                                    maxDate={new Date()}
                                    label='Transaction date range'
                                    ref={this.dateRange}
                                    hideClearIcon={true}
                                />
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={feeTypeBankMapList.data_list}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> :
                                            `${dateFormat(dateRangeValue.start, 'DD-MM-YYYY')} TO ${dateFormat(dateRangeValue.end, 'DD-MM-YYYY')}`}
                                        data={feeTypeBankMapList.data_list}
                                        columns={columns}
                                        options={options}
                                        onTableChange={this.getFeeTypeBankMapList}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={feeTypeBankMapList.count}
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
export default withRouter(ViewBankTransactions)