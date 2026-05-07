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
import { DropDownWithSearch } from 'Components/DropDownWithSearch';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import {
    isUserHasPermission, getUrlParam, getPaginationProps, dateFormat, getFormatMessage, numberWithCommas, getFullName
} from 'Includes/functions';
import { options, minDate, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import { image_formats } from 'Containers/Expenses/Constants';
import { Today } from '@material-ui/icons';

const transactionTypeOptions = [
    { id: 1, name: 'Deposit', value: 1, label: 'Deposit' },
    { id: 2, name: 'Withdraw', value: 2, label: 'Withdraw' },
    { id: 3, name: 'Transaction', value: 3, label: 'Transaction' }
];

class ViewBankTransactions extends Component {
    constructor() {
        super()
        this.state = {
            feeTypeBankMapList: {
                data_list: [],
                count: 0
            },
            loading: false,
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
            transactionTypeFilter: transactionTypeOptions[2],
            userBankFilter: null,
            bankList: [],
            staffList: [],
            combinedUserBankList: [],
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
                            if (!value) {
                                return (
                                    <Box className='mui-table-custom-value-left-align' display='flex'>
                                        <Box>N/A</Box>
                                    </Box>
                                );
                            }
                            const formattedDate = dateFormat(value, 'DD-MM-YYYY');
                            return (
                                <Box className='mui-table-custom-value-left-align' display='flex'>
                                    <Box>
                                        {formattedDate !== 'Invalid date' ? formattedDate : value}
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
                            const rowData = tableMeta.tableData[tableMeta.rowIndex];
                            const transferType = rowData?.transfer_type || '';
                            const transactionTypeValue = rowData?.transaction_type_value;
                            const transactionFromLabel = rowData?.transaction_from_label || '';

                            let displayText = '';
                            let className = '';

                            // Use transaction_type label from serializer
                            if (transferType) {
                                // Convert to string and capitalize first letter
                                const transferTypeStr = String(transferType);
                                displayText = transferTypeStr.charAt(0).toUpperCase() + transferTypeStr.slice(1);
                                // For transaction type 3, check transaction_from to determine if it's a transfer
                                if (transactionTypeValue === 3) {
                                    if (transactionFromLabel === 'Banktobank/cash_in_hand') {
                                        // This is a transfer, keep the transfer type display
                                        className = 'deposit-transaction';
                                    } else {
                                        displayText = 'Transaction';
                                        className = 'deposit-transaction';
                                    }
                                } else if (transferTypeStr.toLowerCase() === 'deposit') {
                                    displayText = 'Deposit';
                                    className = 'deposit-transaction';
                                } else if (transferTypeStr.toLowerCase() === 'withdraw') {
                                    displayText = 'Withdraw';
                                    className = 'withdraw-transaction';
                                } else {
                                    className = 'deposit-transaction';
                                }
                            } else {
                                // Fallback to is_deposit
                                const isDeposit = value;
                                if (isDeposit === true || isDeposit === 'true') {
                                    displayText = 'Deposit';
                                    className = 'deposit-transaction';
                                } else {
                                    displayText = 'Withdraw';
                                    className = 'withdraw-transaction';
                                }
                            }

                            return (
                                <Box className='mui-table-custom-value-left-align' display='flex'>
                                    <Box className={className}>{displayText}</Box>
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
                            const amount = parseFloat(value) || 0;
                            return (
                                <Box className='mui-table-custom-value-left-align' display='flex'>
                                    <Box>
                                        {numberWithCommas(amount.toFixed(2))}
                                    </Box>
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "from_account",
                    label: "From",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box className='mui-table-custom-value-left-align' display='flex'>
                                    <Box>
                                        {value || 'N/A'}
                                    </Box>
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "to_account",
                    label: "To",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box className='mui-table-custom-value-left-align' display='flex'>
                                    <Box>
                                        {value || 'N/A'}
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
                        display: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box className='mui-table-custom-value-left-align' display='flex'>
                                    <Box>
                                        {value || 'N/A'}
                                    </Box>
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "particulars",
                    label: "Comment",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        display: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            const comment = value || 'N/A';
                            return (
                                <Box className='left-align-width-100' display='flex'>
                                    <Tooltip title={comment} enterDelay={500}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Box className='handle-comment-name-overflow'>
                                            {comment}
                                        </Box>
                                    </Tooltip>
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "denominations",
                    label: "Denominations",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            if (!value || value.length === 0) {
                                return (
                                    <Box className='mui-table-custom-value-left-align' display='flex'>
                                        <Box>{"------"}</Box>
                                    </Box>
                                );
                            }

                            return (
                                <Box className='left-align-width-100' display='flex'>
                                    <Box className='mui-table-custom-value-left-align'>
                                        {value.map((denom, idx) => (
                                            <div key={idx} style={{ fontSize: '0.9em' }}>
                                                ₹ {denom.denomination_amount} x {denom.count}
                                            </div>
                                        ))}
                                    </Box>
                                </Box>
                            );
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
                        display: true,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            const hasFile = value && value.file && typeof value.file === 'string';
                            return (
                                <Box >
                                    {hasFile &&
                                        <Box style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                            <Box onClick={() => this.handleViewImage(value)} className='view-expenses-image-view'>
                                                {`[View]`}
                                            </Box>
                                            <a
                                                href={value.file}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ cursor: "pointer", color: "#1976d2", textDecoration: "none" }}
                                            >
                                                {"[Download]"}
                                            </a>
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

        // Set current month's start and end date
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const dateRangeValue = {
            start: dateFormat(firstDayOfMonth, 'YYYY-MM-DD'),
            end: dateFormat(lastDayOfMonth, 'YYYY-MM-DD')
        };

        // Set state with URL params if available, otherwise use empty values
        this.setState({
            options: _.cloneDeep(options),
            bank_id: bank_id || '',
            id: id || '',
            bank_name: bank_name || '',
            account_num: account_num || '',
            fee_name: fee_name || '',
            dateRangeValue: dateRangeValue
        }, () => {
            // Fetch bank and staff lists, then fetch transaction data
            Promise.all([this.getBankList(), this.getStaffList()]).then(() => {
                this.prepareUserBankList();
                this.getFeeTypeBankMapList();
            });
        });
    }

    getBankList = () => {
        return new Promise((resolve) => {
            const url = GET_URL.bankdetail.api;
            const params = { is_active: true };
            getRequest(url, params, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        const bankList = (response.data.data || []).map((bank) => ({
                            id: bank.id,
                            name: bank.display_name || bank.bank_name,
                            type: 'bank',
                            label: bank.display_name || bank.bank_name
                        }));
                        this.setState({ bankList }, () => resolve());
                    } else {
                        resolve();
                    }
                })
                .catch(() => {
                    resolve();
                });
        });
    };

    getStaffList = () => {
        return new Promise((resolve) => {
            const url = GET_URL.staff.api;
            const params = { is_active: true };
            getRequest(url, params, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        const staffList = (response.data.data || []).map((staff) => ({
                            id: staff.user_id,
                            name: getFullName(
                                staff.first_name,
                                staff.middle_name,
                                staff.last_name
                            ) || staff.username || 'N/A',
                            type: 'user',
                            label: getFullName(
                                staff.first_name,
                                staff.middle_name,
                                staff.last_name
                            ) || staff.username || 'N/A'
                        }));
                        this.setState({ staffList }, () => resolve());
                    } else {
                        resolve();
                    }
                })
                .catch(() => {
                    resolve();
                });
        });
    };

    prepareUserBankList = () => {
        const { bankList, staffList } = this.state;
        const combinedList = [
            ...bankList.map(bank => ({
                ...bank,
                name: `${bank.name} (Bank)`,
                label: `${bank.name} (Bank)`
            })),
            ...staffList.map(staff => ({
                ...staff,
                name: `${staff.name} (User)`,
                label: `${staff.name} (User)`
            }))
        ];
        this.setState({ combinedUserBankList: combinedList });
    };

    handleTransactionTypeChange = (e, newValue) => {
        this.setState({ transactionTypeFilter: newValue }, () => {
            this.getFeeTypeBankMapList();
        });
    };

    handleUserBankChange = (e, newValue) => {
        this.setState({ userBankFilter: newValue }, () => {
            this.getFeeTypeBankMapList();
        });
    };


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
        let { pagination, id, dateRangeValue, bank_id, transactionTypeFilter, userBankFilter } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let post_data = {
            transaction_history: true,
            ...pagination_params
        }

        // Add bank_id if available
        if (bank_id) {
            post_data.from_bank = bank_id;
        }

        // Add transaction type filter
        if (transactionTypeFilter) {
            const typeValue = transactionTypeFilter.value;
            if (typeValue === 1) {
                post_data.transaction_type = 1; // Deposit
            } else if (typeValue === 2) {
                post_data.transaction_type = 2; // Withdraw
            } else if (typeValue === 3) {
                post_data.transaction_type = 3; // Transaction
            }
        }

        // Add user/bank filter - check both from and to fields
        if (userBankFilter) {
            if (userBankFilter.type === 'bank') {
                post_data.bank_from = userBankFilter.id;
                post_data.bank_to = userBankFilter.id;
            } else if (userBankFilter.type === 'user') {
                post_data.user_from = userBankFilter.id;
                post_data.user_to = userBankFilter.id;
            }
        }

        // Add date range if available
        if (!_.isEmpty(dateRangeValue)) {
            if (dateRangeValue.start) {
                post_data['from_date'] = dateRangeValue.start;
            }
            if (dateRangeValue.end) {
                post_data['to_date'] = dateRangeValue.end;
            }
        }

        const url = GET_URL.depositdata.api;
        getRequest(url, post_data, this.props).then((response) => {
            if (response && response.status === 200) {
                this.callApi = true
                const responseData = response.data.data || response.data || {};
                const dataList = responseData.data_list || responseData.transaction_list || responseData.results || [];
                const count = responseData.count || responseData.total_count || 0;

                // Map and format the data properly for the table using serializer fields
                const formattedDataList = dataList.map((item, index) => {
                    // Get transaction type from serializer - check both transaction_type_display and transaction_type
                    const transactionTypeDisplay = item.transaction_type_display || {};
                    const transactionTypeLabel = transactionTypeDisplay.label || item.transaction_type || '';
                    const transactionTypeValue = transactionTypeDisplay.value !== undefined ? transactionTypeDisplay.value : (item.transaction_type || '');

                    // Determine is_deposit based on transaction_type value
                    // 1: deposit, 2: withdraw, 3: transaction
                    let isDeposit = transactionTypeValue === 1 || transactionTypeValue === 3;
                    if (transactionTypeValue === 2) {
                        isDeposit = false;
                    }

                    // Get transaction from label - check both transaction_from_display and transaction_from
                    const transactionFromDisplay = item.transaction_from_display || {};
                    const transactionFromLabel = transactionFromDisplay.label || '';
                    const transactionFromValue = transactionFromDisplay.value !== undefined ? transactionFromDisplay.value : (item.transaction_from || '');

                    // Get staff name
                    const staffName = item.staff_name || getFullName(
                        item.staff_first_name || item.staff?.first_name || item.staff_firstname || '',
                        item.staff_middle_name || item.staff?.middle_name || item.staff_middlename || '',
                        item.staff_last_name || item.staff?.last_name || item.staff_lastname || ''
                    ) || item.staff?.full_name || item.staff_full_name || '';

                    // Format date properly
                    let formattedDate = item.date || item.transaction_date || item.created || item.created_at || '';
                    if (formattedDate && typeof formattedDate === 'string') {
                        try {
                            const dateObj = new Date(formattedDate);
                            if (isNaN(dateObj.getTime())) {
                                formattedDate = '';
                            }
                        } catch (e) {
                            formattedDate = '';
                        }
                    }

                    // Format amount
                    const formattedAmount = parseFloat(item.amount || item.transfer_amount || item.amount_transferred || 0) || 0;

                    // Get From account using serializer fields
                    let fromAccount = 'N/A';
                    if (item.bank_from_name) {
                        fromAccount = item.bank_from_name;
                    } else if (item.user_from_username) {
                        fromAccount = item.user_from_username;
                    } else if (item.user_from_name) {
                        fromAccount = item.user_from_name;
                    } else {
                        // Fallback to old field names if serializer fields not available
                        fromAccount = item.from_bank_name || item.from_bank_details?.bank_name || item.from_bank?.bank_name ||
                            item.from_staff_name || item.from_cash_in_hand_name || 'N/A';
                    }

                    // If fromAccount is still N/A, use transaction_from label
                    if (fromAccount === 'N/A' && transactionFromLabel) {
                        fromAccount = transactionFromLabel;
                    }

                    // Get To account using serializer fields
                    let toAccount = 'N/A';
                    if (item.bank_to_name) {
                        toAccount = item.bank_to_name;
                    } else if (item.user_to_username) {
                        toAccount = item.user_to_username;
                    } else if (item.user_to_name) {
                        toAccount = item.user_to_name;
                    } else {
                        // Fallback to old field names if serializer fields not available
                        toAccount = item.to_bank_name || item.to_bank_details?.bank_name || item.to_bank?.bank_name ||
                            item.to_staff_name || item.to_cash_in_hand_name || 'N/A';
                    }

                    // Format attachment
                    let attachmentDetails = null;
                    if (item.attachment_details) {
                        attachmentDetails = item.attachment_details;
                    } else if (item.attachment) {
                        attachmentDetails = typeof item.attachment === 'object' ? item.attachment : { file: item.attachment };
                    } else if (item.attachment_data) {
                        attachmentDetails = item.attachment_data;
                    }

                    const formattedItem = {
                        id: item.id || `temp_${index}`,
                        date: formattedDate,
                        is_deposit: isDeposit,
                        transfer_type: transactionTypeLabel || (isDeposit ? 'Deposit' : 'Withdraw'),
                        transaction_type_value: transactionTypeValue,
                        transaction_from_label: transactionFromLabel,
                        transaction_from_value: transactionFromValue,
                        amount: formattedAmount,
                        from_account: fromAccount,
                        to_account: toAccount,
                        staff_name: staffName || 'N/A',
                        particulars: item.particulars || item.comment || item.remarks || item.description || item.note || 'N/A',
                        attachment_details: attachmentDetails,
                        ref_number: item.ref_number || item.reference_number || item.ref_num || 'N/A',
                        denominations: item.denominations || [],
                    };
                    return formattedItem;
                });

                this.setState({
                    feeTypeBankMapList: {
                        data_list: formattedDataList,
                        count: count
                    },
                    loading: false,
                    tableUpdating: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                });
            }
        }).catch((error) => {
            console.error('Error fetching transaction history:', error);
            this.setState({
                tableUpdating: false,
                loading: false,
                feeTypeBankMapList: {
                    data_list: [],
                    count: 0
                }
            });
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
            largeImagePreview, columns, pagination, dateRangeDropdownList, dateRangeDropdown, dateRangeValue, tableUpdating, bank_id, bank_name, account_num, fee_name, transactionTypeFilter, userBankFilter, combinedUserBankList } = this.state
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
                    // Format transaction type (index 2 is transfer_type)
                    const transactionType = data_value.data[2];
                    if (transactionType) {
                        // Capitalize first letter if it's a string
                        if (typeof transactionType === 'string') {
                            data_value.data[2] = transactionType.charAt(0).toUpperCase() + transactionType.slice(1);
                        } else {
                            data_value.data[2] = transactionType;
                        }
                    } else {
                        // Fallback based on is_deposit
                        const isDeposit = data_value.data[3]; // is_deposit is at index 3
                        data_value.data[2] = isDeposit ? 'Deposit' : 'Withdraw';
                    }
                    // Format date (index 1 is date)
                    data_value.data[1] = dateFormat(data_value.data[1], 'DD-MM-YYYY');
                    return data_value;
                });
                columns.forEach(column_name => {
                    column_name.label = getFormatMessage(column_name.label);
                });
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
                                    Transaction Overview
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('fee_type_bank_balance', 'view') &&
                                        <Button
                                            variant="contained"
                                            component={Link} to={Actions.bank_transfers.create.url}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.bank_transfers.create.label}</Button>
                                    }
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container spacing={1} className='margin-top-15' alignItems="center">
                            <Grid item md={4} xs={12}>
                                <DateRange
                                    handleChange={this.handleChangeDateRange}
                                    minDate={minDate}
                                    maxDate={new Date()}
                                    label='Transaction date range'
                                    ref={this.dateRange}
                                    hideClearIcon={true}
                                    size="small"
                                />
                            </Grid>
                            <Grid item md={4} xs={12}>
                                <DropDownWithSearch
                                    options={transactionTypeOptions}
                                    optionValue="label"
                                    name="transactionTypeFilter"
                                    value={transactionTypeFilter}
                                    onChange={this.handleTransactionTypeChange}
                                    label="Transaction Type"
                                    hideClearIcon={false}
                                    size="small"
                                />
                            </Grid>
                            <Grid item md={4} xs={12}>
                                <DropDownWithSearch
                                    options={combinedUserBankList}
                                    optionValue="label"
                                    name="userBankFilter"
                                    value={userBankFilter}
                                    onChange={this.handleUserBankChange}
                                    label="User / Bank"
                                    hideClearIcon={false}
                                    size="small"
                                />
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        title={tableUpdating ? 'Loading...' :
                                            `${dateFormat(dateRangeValue.start, 'DD-MM-YYYY')} TO ${dateFormat(dateRangeValue.end, 'DD-MM-YYYY')}`}
                                        data={feeTypeBankMapList.data_list || []}
                                        columns={columns}
                                        options={options}
                                        onTableChange={this.getFeeTypeBankMapList}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={feeTypeBankMapList.count || 0}
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