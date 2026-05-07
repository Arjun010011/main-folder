import React, { Component } from 'react';
import {
    Paper, Box, Grid, Button, Typography,
    Table, TableHead, TableRow, TableCell, TableBody,
    TableContainer, TextField, CircularProgress
} from '@material-ui/core';
import Swal from 'sweetalert2';
import classNames from 'classnames';
import InfiniteScroll from 'react-infinite-scroller';

import { Dropdown } from 'Components/DropDown';
import loadingBar from 'images/loading.gif';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { numberWithCommas } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import './styles.scss';


class BankBalanceCarryForward extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            submitting: false,
            financialYearList: [],
            sourceFinancialYear: '',
            targetFinancialYear: '',
            banks: [],
            fetched: false,
            currentPage: 1,
            hasMore: true,
            loadingMore: false,
            totalCount: 0,
        };
    }

    componentDidMount() {
        this.getFinancialYearList();
    }

    getFinancialYearList = () => {
        const url = GET_URL.financialyear.api;
        const params = { is_active: true };
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const list = response.data?.data || response.data || [];
                const dataList = Array.isArray(list) ? list : (list.data_list || []);
                const formattedList = dataList.map(fy => ({
                    ...fy,
                    display_name: `${new Date(fy.start_date).getFullYear()}-${new Date(fy.end_date).getFullYear()}`
                }));
                this.setState({ financialYearList: formattedList, loading: false });
            } else {
                this.setState({ loading: false });
            }
        });
    }

    handleSourceFYChange = (e) => {
        this.setState({
            sourceFinancialYear: e.target.value,
            banks: [],
            fetched: false,
            currentPage: 1,
            hasMore: true,
            totalCount: 0,
        });
    }

    handleTargetFYChange = (e) => {
        this.setState({ targetFinancialYear: e.target.value });
    }

    fetchBankBalances = (append = false) => {
        const { sourceFinancialYear, banks, loadingMore } = this.state;
        if (!sourceFinancialYear) {
            Swal.fire({ type: 'warning', title: 'Please select a Source Financial Year' });
            return;
        }

        if (append && loadingMore) return;

        const limit = 10;
        const offset = append ? banks.length : 0;
        const pageno = Math.floor(offset / limit) + 1;

        this.setState({
            fetched: append ? true : false,
            loadingMore: append,
        });

        const url = GET_URL.bankBalanceCarryForward.api;
        const params = {
            financial_year_id: sourceFinancialYear,
            limit: limit,
            pageno: pageno,
        };

        getRequest(url, params, this.props).then(response => {
            this.setState({ loadingMore: false });
            if (response && response.status === 200) {
                const data = response.data?.data || {};
                const dataList = data.data_list || [];
                const totalCount = data.count || dataList.length;

                const newBanks = dataList.map(bank => ({
                    ...bank,
                    new_opening_balance: bank.closing_balance,
                }));

                let updatedBanks;
                if (append) {
                    const existingIds = new Set(banks.map(b => b.bank_id || b.id));
                    const uniqueNew = newBanks.filter(b => !existingIds.has(b.bank_id || b.id));
                    updatedBanks = [...banks, ...uniqueNew];
                } else {
                    updatedBanks = newBanks;
                }

                const hasMore = updatedBanks.length < totalCount;

                this.setState({
                    banks: updatedBanks,
                    fetched: true,
                    totalCount: totalCount,
                    hasMore: hasMore,
                });
            }
        });
    }

    loadMore = () => {
        const { loadingMore, hasMore, banks, totalCount } = this.state;
        if (loadingMore || !hasMore || banks.length >= totalCount) return;
        this.fetchBankBalances(true);
    }

    handleNewOpeningBalanceChange = (bankId, value) => {
        const { banks } = this.state;
        const updatedBanks = banks.map(bank => {
            if ((bank.bank_id || bank.id) === bankId) {
                return { ...bank, new_opening_balance: value };
            }
            return bank;
        });
        this.setState({ banks: updatedBanks });
    }

    handleSubmit = () => {
        const { sourceFinancialYear, targetFinancialYear, banks } = this.state;

        if (!sourceFinancialYear || !targetFinancialYear) {
            Swal.fire({ type: 'warning', title: 'Please select both Source and Target Financial Years' });
            return;
        }

        if (sourceFinancialYear === targetFinancialYear) {
            Swal.fire({ type: 'warning', title: 'Source and Target Financial Year cannot be the same' });
            return;
        }

        Swal.fire({
            title: 'Confirm Carry Forward',
            text: 'This will update the opening balances for the target financial year. Continue?',
            type: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Carry Forward',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.value) {
                this.setState({ submitting: true });

                const payload = {
                    source_financial_year_id: sourceFinancialYear,
                    target_financial_year_id: targetFinancialYear,
                    banks: banks.map(bank => ({
                        bank_id: bank.bank_id || bank.id,
                        closing_balance: parseFloat(bank.closing_balance || 0),
                        new_opening_balance: parseFloat(bank.new_opening_balance || 0),
                    })),
                };

                const url = POST_URL.bankBalanceCarryForward.api;
                postRequest(url, payload, this.props).then(response => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data?.message || 'Carry forward completed successfully',
                            showConfirmButton: false,
                            timer: 2000,
                        });
                        this.setState({ submitting: false, banks: [], fetched: false, hasMore: true, totalCount: 0 });
                    } else {
                        Swal.fire({ type: 'error', title: 'Failed to carry forward' });
                        this.setState({ submitting: false });
                    }
                }).catch(() => {
                    Swal.fire({ type: 'error', title: 'An error occurred' });
                    this.setState({ submitting: false });
                });
            }
        });
    }

    render() {
        const {
            loading, submitting, financialYearList,
            sourceFinancialYear, targetFinancialYear, banks, fetched,
            hasMore, loadingMore, totalCount
        } = this.state;

        if (loading) {
            return (
                <Box display="flex" justifyContent="center" p={4}>
                    <img src={loadingBar} className='loading' alt="Loading..." />
                </Box>
            );
        }

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                Bank Balance Carry Forward
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                <Button
                                    variant="contained"
                                    component={Link}
                                    to={Actions.manage_banks.view.url}
                                    className='editbutton-view'
                                >
                                    <ArrowBackIcon className='visibility-icon' /> Back to Banks
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Grid container spacing={2} style={{ padding: '20px' }}>
                        <Grid item md={4} xs={12}>
                            <Dropdown
                                data={financialYearList}
                                name="sourceFinancialYear"
                                value={sourceFinancialYear || 0}
                                onChange={this.handleSourceFYChange}
                                label="Source Financial Year (From)"
                                customId="id"
                                customName="display_name"
                            />
                        </Grid>
                        <Grid item md={4} xs={12}>
                            <Dropdown
                                data={financialYearList}
                                name="targetFinancialYear"
                                value={targetFinancialYear || 0}
                                onChange={this.handleTargetFYChange}
                                label="Target Financial Year (To)"
                                customId="id"
                                customName="display_name"
                            />
                        </Grid>
                        <Grid item md={4} xs={12} style={{ display: 'flex', alignItems: 'center' }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => this.fetchBankBalances(false)}
                                disabled={!sourceFinancialYear}
                            >
                                Fetch Balances
                            </Button>
                        </Grid>
                    </Grid>

                    {fetched && banks.length > 0 && (
                        <Box p={2}>
                            <Paper style={{ marginBottom: '20px' }}>
                                <Box p={2}>
                                    <Typography variant="h6" gutterBottom style={{ fontWeight: 'bold' }}>
                                        Bank Balances for Selected Financial Year
                                    </Typography>

                                    {totalCount > 0 && (
                                        <Box px={0} py={1}>
                                            <Typography variant="caption" color="textSecondary">
                                                Showing {banks.length} of {totalCount} banks
                                            </Typography>
                                        </Box>
                                    )}

                                    <Box
                                        id="carry-forward-scroll-container"
                                        style={{ maxHeight: '65vh', overflowY: 'auto' }}
                                    >
                                        <InfiniteScroll
                                            pageStart={0}
                                            loadMore={this.loadMore}
                                            hasMore={hasMore && !loadingMore}
                                            useWindow={false}
                                            getScrollParent={() =>
                                                document.getElementById('carry-forward-scroll-container')
                                            }
                                            threshold={150}
                                            loader={
                                                <Box key="loader" display="flex" justifyContent="center" p={2}>
                                                    <Typography color="textSecondary">
                                                        Loading more banks…
                                                    </Typography>
                                                </Box>
                                            }
                                        >
                                            <TableContainer>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                                            <TableCell style={{ fontWeight: 700, fontSize: '0.95rem' }}>Bank Name</TableCell>
                                                            <TableCell style={{ fontWeight: 700, fontSize: '0.95rem' }}>Account Number</TableCell>
                                                            <TableCell align="right" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1976d2' }}>
                                                                Opening Balance
                                                            </TableCell>
                                                            <TableCell align="right" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2e7d32' }}>
                                                                Credit
                                                            </TableCell>
                                                            <TableCell align="right" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#d32f2f' }}>
                                                                Debit
                                                            </TableCell>
                                                            <TableCell align="right" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#e65100' }}>
                                                                Closing Balance
                                                            </TableCell>
                                                            <TableCell align="right" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#7b1fa2' }}>
                                                                New Opening Balance
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {banks.map((bank) => (
                                                            <TableRow key={bank.bank_id || bank.id} hover>
                                                                <TableCell style={{ fontWeight: 500 }}>{bank.bank_name}</TableCell>
                                                                <TableCell>{bank.account_num || 'N/A'}</TableCell>
                                                                <TableCell align="right" style={{ color: '#1976d2', fontWeight: 600 }}>
                                                                    {numberWithCommas(parseFloat(bank.opening_balance || 0).toFixed(2))}
                                                                </TableCell>
                                                                <TableCell align="right" style={{ color: '#2e7d32', fontWeight: 600 }}>
                                                                    {numberWithCommas(parseFloat(bank.credit || 0).toFixed(2))}
                                                                </TableCell>
                                                                <TableCell align="right" style={{ color: '#d32f2f', fontWeight: 600 }}>
                                                                    {numberWithCommas(parseFloat(bank.debit || 0).toFixed(2))}
                                                                </TableCell>
                                                                <TableCell align="right" style={{ color: '#e65100', fontWeight: 600 }}>
                                                                    {numberWithCommas(parseFloat(bank.closing_balance || 0).toFixed(2))}
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <TextField
                                                                        type="number"
                                                                        variant="outlined"
                                                                        size="small"
                                                                        value={bank.new_opening_balance}
                                                                        onChange={(e) => this.handleNewOpeningBalanceChange(bank.bank_id || bank.id, e.target.value)}
                                                                        style={{ width: '150px' }}
                                                                        inputProps={{ style: { textAlign: 'right', fontWeight: 600 } }}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </InfiniteScroll>

                                        {hasMore && !loadingMore && (
                                            <Box display="flex" justifyContent="center" p={2}>
                                                <Button
                                                    variant="outlined"
                                                    color="primary"
                                                    onClick={this.loadMore}
                                                >
                                                    Load More
                                                </Button>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </Paper>

                            <Box display="flex" justifyContent="flex-end" p={1}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={this.handleSubmit}
                                    disabled={submitting || !targetFinancialYear}
                                    style={{ minWidth: '180px' }}
                                >
                                    {submitting ? <CircularProgress size={24} style={{ color: '#fff' }} /> : 'Carry Forward'}
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {fetched && banks.length === 0 && (
                        <Box p={4} textAlign="center">
                            <Typography variant="body1" color="textSecondary">
                                No active bank accounts found.
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Box>
        );
    }
}

export default BankBalanceCarryForward;
