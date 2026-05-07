import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { Dropdown } from 'Components/DropDown';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameWithQuoteRegex, bankAccountNumberRegex, bankIfscRegex, amountRegexWithDecimals, numberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, numberWithCommas, checkLocalFinancialYear, SetFinancialYear } from 'Includes/functions';
import { options } from 'Constants';

const fieldDetails = [
    {
        label: 'Bank Name', regex: nameWithQuoteRegex, name: 'bank_name', md: 6, maxLength: '25', className: 'width-95-mt-30px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true
    },
    {
        label: 'Bank ID', regex: numberRegex, name: 'bank_id', md: 6, maxLength: '10', className: 'width-95-mt-30px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false,
    },
    {
        label: 'Account Number', regex: bankAccountNumberRegex, name: 'account_num', md: 6, maxLength: '18', className: 'width-95-mt-30px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false,
    },
    {
        label: 'IFSC Code', regex: bankIfscRegex, name: 'ifsc', md: 6, maxLength: '15', className: 'width-95-mt-30px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true
    },
    {
        label: 'Opening Balance', regex: amountRegexWithDecimals, name: 'opening_balance', md: 6, maxLength: '15', className: 'width-95-mt-30px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'amount', autoFocus: false, isDuplicateAllow: true
    },
    {
        label: 'Opening Balance Type', regex: '', name: 'opening_balance_type', md: 6, className: 'width-95-mt-30px', required: true,
        id: 'outlined-select', default: { id: 'DEBIT', name: 'Debit' }, type: 'dropDownWithSearch', autoFocus: false,
        list: [{ id: 'DEBIT', name: 'Debit' }, { id: 'CREDIT', name: 'Credit' }], isDuplicateAllow: true
    },
]

class ViewBank extends Component {
    constructor() {
        super()
        this.state = {
            bankList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            financialYearList: [],
            selectedFinancialYear: '',
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: false
                    }
                },
                {
                    name: "bank_name",
                    label: "Bank Name",
                },
                {
                    name: "bank_id",
                    label: "Bank ID",
                },
                {
                    name: "account_num",
                    label: "Account Number",
                },
                {
                    name: "ifsc",
                    label: "IFSC Code",
                },
                {
                    name: "opening_balance",
                    label: "Opening Balance",
                    options: {
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                numberWithCommas(value)
                            )
                        }
                    }
                },
                {
                    name: "opening_balance_type",
                    label: "Type",
                    options: {
                        sort: false,
                        customBodyRender: (value) => {
                            return value === 'CREDIT'
                                ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>Credit</span>
                                : <span style={{ color: '#d32f2f', fontWeight: 600 }}>Debit</span>
                        }
                    }
                },
                {
                    name: "current_balance",
                    label: "Current Balance",
                    options: {
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                numberWithCommas(value || 0)
                            )
                        }
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: true,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[1], tableMeta.rowData[2], tableMeta.rowData[3], tableMeta.rowData[4], tableMeta.rowData[5], tableMeta.rowData[6])}
                                    label='Edit Bank Details'
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.bankdetail.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.bankdetail.api}
                                    deleteType={this.deleteType}
                                    baseClassName='action-view-bank-width'
                                    enabledActions={this.state.enabledActions}
                                />
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }


    fieldValues(bank_name, bank_id, account_num, ifsc, opening_balance, opening_balance_type) {
        let fieldValues = [];
        fieldValues.push(bank_name);
        fieldValues.push(bank_id);
        fieldValues.push(account_num);
        fieldValues.push(ifsc);
        fieldValues.push(opening_balance);
        fieldValues.push(opening_balance_type ? { id: opening_balance_type, name: opening_balance_type === 'CREDIT' ? 'Credit' : 'Debit' } : { id: 'DEBIT', name: 'Debit' });
        return fieldValues
    }


    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('manage_banks', 'update')
        const hasDeletePermission = isUserHasPermission('manage_banks', 'delete')
        let enabledActions = []
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

    componentDidMount = () => {
        this.getFinancialYearList();
        this.updatePermissions('actions');
        options['rowsPerPageOptions'] = [5, 10, 15, 30, 50, 100]
        options['rowsPerPage'] = '10'
        this.setState({
            options: options
        })
    }

    getFinancialYearList = () => {
        const url = GET_URL.financialyear.api;
        const params = { is_active: true };
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let fromYear = '';
                let ToYear = '';
                const financialYearList = (response.data?.data || []).map((data) => {
                    fromYear = data.start_date.split('-');
                    ToYear = data.end_date.split('-');
                    return {
                        ...data,
                        name: fromYear[0] + '-' + ToYear[0]
                    };
                });

                let selectedYear = checkLocalFinancialYear(financialYearList);
                if (!selectedYear && financialYearList.length > 0) {
                    selectedYear = financialYearList[0].id;
                }

                this.setState({
                    financialYearList: financialYearList,
                    selectedFinancialYear: selectedYear || ''
                }, () => {
                    this.getBankList();
                });
            } else {
                this.setState({ loading: false });
            }
        });
    }

    handleFinancialYearChange = (e) => {
        const { value } = e.target;
        if (value !== 0 && value !== '') {
            this.setState({ selectedFinancialYear: value }, () => {
                SetFinancialYear(value);
                this.getBankList();
            });
        }
    }

    updatePostFormat = (newData) => {
        let payload = {
            bank_name: newData.bank_name,
            ifsc: newData.ifsc,
            opening_balance: parseFloat(newData.opening_balance),
            opening_balance_type: newData.opening_balance_type?.id || newData.opening_balance_type || 'DEBIT',
            bank_id: parseInt(newData.bank_id),
            account_num: newData.account_num
        }
        return payload
    }

    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let bank = this.state.bankList
        bank.map((data, index) => {
            if (data.id === id) {
                bank[index].name = newData.name
                bank[index].bank_name = newData.bank_name
                bank[index].ifsc = newData.ifsc
                bank[index].opening_balance = parseFloat(newData.opening_balance)
                bank[index].opening_balance_type = newData.opening_balance_type?.id || newData.opening_balance_type || 'DEBIT'
                bank[index].bank_id = parseInt(newData.bank_id)
                bank[index].account_num = newData.account_num
            }
        })
        this.setState({
            bankList: [...bank],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }


    getBankList = () => {
        const url = GET_URL.bankdetail.api
        const params = { is_active: true }
        if (this.state.selectedFinancialYear) {
            params.financial_year_id = this.state.selectedFinancialYear;
        }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const isCurrentFY = response.data.is_current_fy !== false;
                const columns = this.state.columns.map(col => {
                    if (col.name === 'current_balance' || col.name === 'closing_balance') {
                        return {
                            ...col,
                            name: isCurrentFY ? 'current_balance' : 'closing_balance',
                            label: isCurrentFY ? 'Current Balance' : 'Closing Balance',
                        };
                    }
                    return col;
                });
                this.setState({
                    bankList: response.data.data,
                    loading: false,
                    columns: columns,
                })

            }
        })
    }

    deleteType = async (id) => {
        let bank = this.state.bankList
        bank.map((data, index) => {
            if (data.id === id) {
                bank.splice(index, 1)
            }
        })
        this.setState({
            bankList: bank,
        })
    }

    render() {
        const { loading, bankList, columns, options, tableUpdating, financialYearList, selectedFinancialYear } = this.state
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
                                    Bank List
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('bank_balance_carry_forward', 'view') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.bank_balance_carry_forward.view.url}
                                        className='editbutton-view'
                                        style={{ marginRight: 10 }}
                                    >Carry Forward</Button>}
                                    {isUserHasPermission('manage_banks', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.manage_banks.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.manage_banks.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container spacing={2} style={{ padding: '10px 20px' }}>
                            <Grid item md={4} xs={12}>
                                <Dropdown
                                    data={financialYearList}
                                    name="selectedFinancialYear"
                                    value={selectedFinancialYear || 0}
                                    onChange={this.handleFinancialYearChange}
                                    label="Financial Year"
                                    customName="name"
                                    customId="id"
                                    hideSelect={true}
                                />
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={bankList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={bankList}
                                        columns={columns}
                                        options={options}
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
export default ViewBank
