import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Chip, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination } from '@material-ui/core';
import WarningIcon from '@material-ui/icons/Warning';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import HistoryIcon from '@material-ui/icons/History';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import CloseIcon from '@material-ui/icons/Close';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import InfoIcon from '@material-ui/icons/Info';
import { Skeleton, Alert } from '@material-ui/lab';
import classNames from 'classnames';

import { createStructuredSelector } from 'reselect'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { makeSelectAcademicYear } from 'Components/CommonComponent/selectors'
import { setAcademicYear } from 'Components/CommonComponent/actions'

import AllMUIDataTable from 'Components/AllMUIDataTable';
import { Dropdown } from 'Components/DropDown';
import LoadingGif from 'Components/LoadingGif';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { isUserHasPermission, numberWithCommas, checkLocalAcademicYear, SetAcademicYear } from 'Includes/functions';
import { options } from 'Constants';

class FeeMismatchList extends Component {
    constructor() {
        super()
        this.state = {
            dataList: [],
            loading: true,
            tableUpdating: false,
            page: 0,
            rowsPerPage: 10,
            count: 0,
            year: '',
            yearList: [],
            standard: '',
            standardList: [],
            loadingStd: false,
            previewModalOpen: false,
            previewLoading: false,
            previewData: null,
            selectedMismatch: null,
            selectedFeeType: '',
            feeTypeList: [],
            feeTypeLoading: false,
            reconcileReason: '',
            reconciling: false,
            reconcileError: '',
            historyModalOpen: false,
            historyList: [],
            historyLoading: false,
            historyPage: 0,
            historyRowsPerPage: 10,
            historyCount: 0,
            selectedHistoryLog: null,
            columns: [
                {
                    name: "student_id",
                    label: "ID",
                    options: { filter: false, sort: false, viewColumns: false, display: false }
                },
                {
                    name: "student_name",
                    label: "Student Name",
                    options: { filter: true, sort: true }
                },
                {
                    name: "student_reg_num",
                    label: "Reg No",
                    options: { filter: true, sort: true }
                },
                {
                    name: "current_student_group",
                    label: "Current Fee Type",
                    options: {
                        sort: true,
                        customBodyRender: (value) => value || '-'
                    }
                },
                {
                    name: "payment_student_group",
                    label: "Payment Fee Type",
                    options: {
                        sort: true,
                        customBodyRender: (value) => value || '-'
                    }
                },
                {
                    name: "current_is_new_student",
                    label: "Current New Student",
                    options: {
                        sort: true,
                        customBodyRender: (value) => value === true ? 'Yes' : value === false ? 'No' : '-'
                    }
                },
                {
                    name: "payment_is_new_student",
                    label: "Payment New Student",
                    options: {
                        sort: true,
                        customBodyRender: (value) => value === true ? 'Yes' : value === false ? 'No' : '-'
                    }
                },
                {
                    name: "total_paid",
                    label: "Total Paid",
                    options: {
                        sort: true,
                        customBodyRender: (value) => numberWithCommas(value || 0)
                    }
                },
                {
                    name: "mismatch_type",
                    label: "Mismatch Type",
                    options: {
                        sort: true,
                        customBodyRender: (value) => {
                            const isDict = value && typeof value === 'object';
                            const hasGroupMismatch = isDict ? value.student_group : value === 'student_group';
                            const hasNewStudentMismatch = isDict ? value.is_new_student : value === 'is_new_student';

                            return (
                                <Box display="flex" flexDirection="column" style={{ gap: 4 }}>
                                    {hasGroupMismatch && (
                                        <Chip
                                            icon={<WarningIcon style={{ color: '#fff' }} />}
                                            label="Student Group"
                                            style={{ backgroundColor: '#f44336', color: '#fff' }}
                                            size="small"
                                        />
                                    )}
                                    {hasNewStudentMismatch && (
                                        <Chip
                                            icon={<WarningIcon style={{ color: '#fff' }} />}
                                            label="New Student Status"
                                            style={{ backgroundColor: '#ff9800', color: '#fff' }}
                                            size="small"
                                        />
                                    )}
                                </Box>
                            );
                        }
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: isUserHasPermission('fee_mismatch', 'create'),
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            const rowData = this.state.dataList[tableMeta.rowIndex]
                            return (
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => this.openPreviewModal(rowData)}
                                    style={{ backgroundColor: '#4caf50', color: '#fff', borderRadius: '30px' }}
                                >
                                    Reconcile
                                </Button>
                            );
                        }
                    }
                }
            ]
        }
    }

    componentDidMount = () => {
        this.getAcademicYear()
    }

    getAcademicYear = () => {
        let storedYearList = this.props.getAcademicYearList;
        if (!storedYearList) {
            const params = { is_active: true };
            getRequest(GET_URL.getacademicyear.api, params, this.props).then(
                (response) => {
                    if (response && response.status === 200) {
                        const yearList = response.data.data;
                        this.setCompAcademicYear(yearList);
                        this.props.setAcademicYear(yearList);
                    }
                }
            );
        } else {
            this.setCompAcademicYear(storedYearList);
        }
    }

    setCompAcademicYear = (yearList) => {
        const year = checkLocalAcademicYear(yearList);
        this.setState({ yearList, year: year ? year : '', loading: false }, () => {
            if (year) {
                this.getStandardsList(year);
            }
        });
    }

    getStandardsList = (year) => {
        const params = { academic_year: year, is_active: true };
        this.setState({ loadingStd: true });
        getRequest(GET_URL.getstandard.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const standardList = response.data.data;
                this.setState({ standardList, loadingStd: false }, () => {
                    this.getDataList();
                });
            } else {
                this.setState({ loadingStd: false });
            }
        });
    }

    onChange = (e) => {
        const name = e.target.name;
        const value = e.target.value;

        if (name === 'year') {
            SetAcademicYear(value);
            this.setState({ year: value, standard: '', standardList: [], dataList: [] }, () => {
                if (value) {
                    this.getStandardsList(value);
                }
            });
        } else if (name === 'standard') {
            this.setState({ standard: value, page: 0 }, () => {
                this.getDataList();
            });
        }
    }

    getDataList = () => {
        const { year, standard, page, rowsPerPage } = this.state
        if (!year) return

        this.setState({ tableUpdating: true })

        const url = GET_URL.feeMismatch.api
        const params = {
            academic_year: year,
            pageno: (page || 0) + 1,
            limit: rowsPerPage || 10
        }
        if (standard) {
            params.standard = standard
        }

        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const responseData = response.data?.data || response.data
                const dataList = responseData.data_list || []
                const count = responseData.count || dataList.length
                this.setState({ dataList, count, tableUpdating: false })
            } else {
                this.setState({ tableUpdating: false, dataList: [], count: 0 })
            }
        }).catch(() => {
            this.setState({ tableUpdating: false })
        })
    }

    openPreviewModal = (mismatch) => {
        this.setState({
            previewModalOpen: true,
            selectedMismatch: mismatch,
            selectedFeeType: '',
            feeTypeList: [],
            reconcileReason: '',
            previewData: null,
            previewLoading: true,
            feeTypeLoading: true
        }, () => {
            this.fetchPreviewData(mismatch)
            this.fetchFeeTypes()
        })
    }

    fetchFeeTypes = () => {
        const url = GET_URL.addFeeType.api
        getRequest(url, this.props).then(response => {
            if (response && response.status === 200) {
                const feeTypes = response.data?.data || response.data || []
                this.setState({ feeTypeList: feeTypes, feeTypeLoading: false })
            } else {
                this.setState({ feeTypeLoading: false })
            }
        }).catch(() => {
            this.setState({ feeTypeLoading: false })
        })
    }


    fetchPreviewData = (mismatch, feeTypeId = null) => {
        const { year } = this.state
        const url = `${POST_URL.feeMismatch.api}?preview=true`
        const data = {
            student_id: mismatch.student_id,
            academic_year: year,
            new_student_group: mismatch.current_student_group_id
        }

        if (feeTypeId) {
            data.fee_type_id = feeTypeId
        }

        postRequest(url, data, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    previewData: response.data?.data || response.data,
                    previewLoading: false
                })
            } else {
                this.setState({ previewLoading: false })
            }
        }).catch(() => {
            this.setState({ previewLoading: false })
        })
    }

    handleFeeTypeChange = (e) => {
        const feeTypeId = e.target.value
        const { selectedMismatch } = this.state
        this.setState({ selectedFeeType: feeTypeId, previewLoading: true }, () => {
            this.fetchPreviewData(selectedMismatch, feeTypeId)
        })
    }

    handleFeeTypeSelect = (feeTypeId) => {
        this.setState({ selectedFeeType: feeTypeId })
    }

    getSelectedFeeTypeCanReconcile = () => {
        const { previewData, selectedFeeType } = this.state
        if (!previewData || !previewData.fee_type_options || !selectedFeeType) return false
        const selected = previewData.fee_type_options.find(ft => ft.key == selectedFeeType)
        return selected ? selected.can_allocate : false
    }

    closePreviewModal = () => {
        this.setState({
            previewModalOpen: false,
            selectedMismatch: null,
            selectedFeeType: '',
            reconcileReason: '',
            previewData: null,
            reconcileError: ''
        })
    }

    handleReconcile = () => {
        const { selectedMismatch, reconcileReason, year, selectedFeeType } = this.state
        if (!selectedMismatch) return
        if (!selectedFeeType || !this.getSelectedFeeTypeCanReconcile()) return

        this.setState({ reconciling: true, reconcileError: '' })

        const url = POST_URL.feeMismatch.api
        const data = {
            student_id: selectedMismatch.student_id,
            academic_year: year,
            original_student_group: selectedMismatch.payment_student_group_id,
            new_student_group: selectedMismatch.current_student_group_id,
            original_is_new_student: selectedMismatch.payment_is_new_student,
            new_is_new_student: selectedMismatch.current_is_new_student,
            total_paid: selectedMismatch.total_paid || 0,
            reason: reconcileReason,
            standard_fee_id: selectedFeeType,
            is_reconciled: true
        }

        postRequest(url, data, this.props).then(response => {
            if (response && (response.status === 200 || response.status === 201)) {
                if (response.data?.error) {
                    this.setState({ reconciling: false, reconcileError: response.data.error })
                    return
                }
                this.closePreviewModal()
                this.getDataList()
            } else if (response && response.data?.error) {
                this.setState({ reconciling: false, reconcileError: response.data.error })
            } else {
                this.setState({ reconciling: false, reconcileError: 'Failed to reconcile. Please try again.' })
            }
        }).catch((error) => {
            const errorMsg = error?.response?.data?.error || 'An error occurred during reconciliation'
            this.setState({ reconciling: false, reconcileError: errorMsg })
        })
    }


    openHistoryModal = () => {
        this.setState({ historyModalOpen: true, historyPage: 0 }, () => {
            this.getHistoryList()
        })
    }

    closeHistoryModal = () => {
        this.setState({
            historyModalOpen: false,
            historyList: [],
            selectedHistoryLog: null
        })
    }

    getHistoryList = () => {
        const { year, standard, historyPage, historyRowsPerPage } = this.state
        if (!year) return

        this.setState({ historyLoading: true })

        const url = GET_URL.feeMismatch.api
        const params = {
            academic_year: year,
            show_logs: true,
            pageno: (historyPage || 0) + 1,
            limit: historyRowsPerPage || 10
        }
        if (standard) {
            params.standard = standard
        }

        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const responseData = response.data?.data || response.data
                const historyList = responseData.data_list || []
                const historyCount = responseData.count || historyList.length
                this.setState({ historyList, historyCount, historyLoading: false })
            } else {
                this.setState({ historyLoading: false, historyList: [], historyCount: 0 })
            }
        }).catch(() => {
            this.setState({ historyLoading: false })
        })
    }

    handleHistoryPageChange = (event, newPage) => {
        this.setState({ historyPage: newPage }, () => {
            this.getHistoryList()
        })
    }

    handleHistoryRowsPerPageChange = (event) => {
        this.setState({ historyRowsPerPage: parseInt(event.target.value, 10), historyPage: 0 }, () => {
            this.getHistoryList()
        })
    }

    formatDate = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    render() {
        const {
            loading, dataList, columns, tableUpdating, count, page, rowsPerPage,
            year, yearList, standard, standardList, loadingStd,
            previewModalOpen, previewLoading, previewData, selectedMismatch, selectedFeeType, feeTypeList, feeTypeLoading, reconcileReason, reconciling, reconcileError,
            historyModalOpen, historyList, historyLoading, historyPage, historyRowsPerPage, historyCount, selectedHistoryLog
        } = this.state

        const tableOptions = {
            ...options,
            selectableRows: 'none',
            rowsPerPageOptions: [5, 10, 15, 30, 50],
            rowsPerPage: rowsPerPage,
            page: page,
            count: count,
            serverSide: true,
            onTableChange: (action, tableState) => {
                if (action === 'changePage') {
                    this.setState({ page: tableState.page, tableUpdating: true }, () => this.getDataList())
                } else if (action === 'changeRowsPerPage') {
                    this.setState({ rowsPerPage: tableState.rowsPerPage, page: 0, tableUpdating: true }, () => this.getDataList())
                }
            }
        }

        if (loading) return <LoadingGif />

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>Fee Mismatch Reconciliation</Box>
                        </Grid>
                        <Grid item md={6} xs={12} className={classNames('header-align')} style={{ justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<HistoryIcon />}
                                onClick={this.openHistoryModal}
                                disabled={!year}
                            >
                                View History
                            </Button>
                        </Grid>
                    </Grid>

                    <Box display="flex" className="header-align" style={{ marginBottom: '20px' }}>
                        <Box className="header-align">
                            <Dropdown
                                data={yearList}
                                name="year"
                                value={year}
                                onChange={this.onChange}
                                label="Academic Year"
                                hideSelect={true}
                            />
                        </Box>
                        <Box className="header-align margin-left-10">
                            {!loadingStd ? (
                                <Dropdown
                                    data={standardList}
                                    name="standard"
                                    value={standard}
                                    onChange={this.onChange}
                                    label="Standard"
                                />
                            ) : (
                                <Skeleton variant="rect" className="drop-down-skeleton" />
                            )}
                        </Box>
                    </Box>

                    {!year && (
                        <Box display="flex" justifyContent="center" p={4}>
                            <Typography variant="body1" color="textSecondary">
                                Please select an academic year to view fee mismatches
                            </Typography>
                        </Box>
                    )}

                    {year && (
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={dataList.length}
                                        title={tableUpdating ? <CircularProgress className='white-text' size={24} /> : ''}
                                        data={dataList}
                                        columns={columns}
                                        options={tableOptions}
                                        count={count}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    )}
                </Paper>

                <Dialog open={previewModalOpen} onClose={this.closePreviewModal} maxWidth="lg" fullWidth>
                    <DialogTitle>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6">Reconcile Fee Mismatch - Preview</Typography>
                            <IconButton onClick={this.closePreviewModal} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        {selectedMismatch && (
                            <Box mb={2} p={2} style={{ background: '#e3f2fd', borderRadius: '8px' }}>
                                <Typography variant="subtitle1">
                                    <strong>Student:</strong> {selectedMismatch.student_name} ({selectedMismatch.student_reg_num})
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Change:</strong> {selectedMismatch.payment_student_group || 'N/A'} → {selectedMismatch.current_student_group || 'N/A'}
                                </Typography>
                            </Box>
                        )}

                        {previewLoading ? (
                            <Box display="flex" justifyContent="center" p={4}>
                                <CircularProgress />
                            </Box>
                        ) : previewData ? (
                            <>
                                <Box mb={2} p={2} style={{ background: '#f5f5f5', borderRadius: '8px' }}>
                                    <Typography variant="body2">
                                        <strong>Total Amount Paid:</strong> {numberWithCommas(previewData.summary?.total_old_paid || 0)}
                                    </Typography>
                                </Box>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={5}>
                                        <Typography variant="subtitle2" gutterBottom style={{ color: '#f44336' }}>
                                            <strong>Current Payments (Old)</strong>
                                        </Typography>
                                        <TableContainer component={Paper} variant="outlined" style={{ maxHeight: 400 }}>
                                            <Table size="small" stickyHeader>
                                                <TableHead>
                                                    <TableRow style={{ backgroundColor: '#ffebee' }}>
                                                        <TableCell><strong>Fee Type</strong></TableCell>
                                                        <TableCell><strong>Term</strong></TableCell>
                                                        <TableCell align="right"><strong>Amount</strong></TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {previewData.old_distribution && previewData.old_distribution.map((item, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell>{item.fee_type}</TableCell>
                                                            <TableCell>{item.term}</TableCell>
                                                            <TableCell align="right">{numberWithCommas(item.amount_paid)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Grid>

                                    <Grid item xs={12} md={7}>
                                        <Typography variant="subtitle2" gutterBottom style={{ color: '#4caf50' }}>
                                            <strong>Select New Fee Type for Reconciliation</strong>
                                        </Typography>

                                        {previewData.fee_type_options && previewData.fee_type_options.length > 0 ? (
                                            <Box style={{ maxHeight: 400, overflowY: 'auto' }}>
                                                {previewData.fee_type_options.map((feeType, idx) => (
                                                    <Paper
                                                        key={feeType.key}
                                                        variant="outlined"
                                                        style={{
                                                            marginBottom: 12,
                                                            padding: 12,
                                                            border: selectedFeeType == feeType.key ? '2px solid #4caf50' : feeType.is_target_group ? '2px solid #2196f3' : '1px solid #e0e0e0',
                                                            backgroundColor: selectedFeeType == feeType.key ? '#f1f8e9' : feeType.is_target_group ? '#e3f2fd' : 'white',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => this.handleFeeTypeSelect(feeType.key)}
                                                    >
                                                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                                            <Box display="flex" alignItems="center">
                                                                <input
                                                                    type="radio"
                                                                    name="feeTypeSelection"
                                                                    checked={selectedFeeType == feeType.key}
                                                                    onChange={() => this.handleFeeTypeSelect(feeType.key)}
                                                                    style={{ marginRight: 8 }}
                                                                />
                                                                <Box>
                                                                    <Typography variant="subtitle1">
                                                                        <strong>{feeType.name}</strong>
                                                                    </Typography>
                                                                    <Typography variant="caption" color="textSecondary">
                                                                        {feeType.student_group}
                                                                        {feeType.is_target_group && (
                                                                            <Chip
                                                                                size="small"
                                                                                label="Target Group"
                                                                                style={{
                                                                                    marginLeft: 8,
                                                                                    backgroundColor: '#2196f3',
                                                                                    color: '#fff',
                                                                                    height: 18,
                                                                                    fontSize: 10
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                            <Box>
                                                                <Chip
                                                                    size="small"
                                                                    label={feeType.can_allocate ? 'Can Allocate' : `Overflow: ${numberWithCommas(feeType.overflow)}`}
                                                                    style={{
                                                                        backgroundColor: feeType.can_allocate ? '#4caf50' : '#f44336',
                                                                        color: '#fff'
                                                                    }}
                                                                />
                                                            </Box>
                                                        </Box>

                                                        <Typography variant="caption" color="textSecondary">
                                                            Total Rate: {numberWithCommas(feeType.total_rate)}
                                                        </Typography>

                                                        {/* Term allocation preview */}
                                                        <Table size="small" style={{ marginTop: 8 }}>
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell style={{ padding: '4px 8px' }}><strong>Term</strong></TableCell>
                                                                    <TableCell align="right" style={{ padding: '4px 8px' }}><strong>Rate</strong></TableCell>
                                                                    <TableCell align="right" style={{ padding: '4px 8px' }}><strong>Allocated</strong></TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {feeType.terms && feeType.terms.map((term, tIdx) => (
                                                                    <TableRow key={tIdx}>
                                                                        <TableCell style={{ padding: '4px 8px' }}>{term.term}</TableCell>
                                                                        <TableCell align="right" style={{ padding: '4px 8px', color: '#9e9e9e' }}>
                                                                            {numberWithCommas(term.rate)}
                                                                        </TableCell>
                                                                        <TableCell align="right" style={{ padding: '4px 8px' }}>
                                                                            <strong style={{ color: term.allocated > 0 ? '#4caf50' : '#9e9e9e' }}>
                                                                                {numberWithCommas(term.allocated)}
                                                                            </strong>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>

                                                        {!feeType.can_allocate && (
                                                            <Box mt={1} p={1} style={{ backgroundColor: '#ffebee', borderRadius: 4 }}>
                                                                <Typography variant="caption" style={{ color: '#f44336' }}>
                                                                    {numberWithCommas(feeType.overflow)} cannot be allocated. Contact Edubricz team.
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Paper>
                                                ))}
                                            </Box>
                                        ) : (
                                            <Box p={2} style={{ backgroundColor: '#ffebee', borderRadius: 8 }}>
                                                <Typography variant="body2" style={{ color: '#f44336' }}>
                                                    No fee types configured for target student group. Contact Edubricz team.
                                                </Typography>
                                            </Box>
                                        )}
                                    </Grid>
                                </Grid>

                                {/* Reason field */}
                                <Box mt={3}>
                                    {reconcileError && (
                                        <Box mb={2}>
                                            <Alert severity="error" onClose={() => this.setState({ reconcileError: '' })}>
                                                {reconcileError}
                                            </Alert>
                                        </Box>
                                    )}
                                    <TextField
                                        label="Reason for Reconciliation"
                                        multiline
                                        rows={2}
                                        fullWidth
                                        variant="outlined"
                                        value={reconcileReason}
                                        onChange={(e) => this.setState({ reconcileReason: e.target.value })}
                                    />
                                </Box>
                            </>
                        ) : (
                            <Box display="flex" justifyContent="center" p={4}>
                                <Typography variant="body1" color="textSecondary">Failed to load preview data</Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closePreviewModal} color="default">
                            Cancel
                        </Button>
                        <Button
                            onClick={this.handleReconcile}
                            color="primary"
                            variant="contained"
                            disabled={reconciling || !selectedFeeType || !this.getSelectedFeeTypeCanReconcile()}
                            startIcon={reconciling ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                        >
                            {reconciling ? 'Reconciling...' : 'Confirm Reconciliation'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* History Modal */}
                <Dialog open={historyModalOpen} onClose={this.closeHistoryModal} maxWidth="lg" fullWidth>
                    <DialogTitle>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box display="flex" alignItems="center">
                                <HistoryIcon style={{ marginRight: '8px' }} />
                                Reconciliation History
                            </Box>
                            <IconButton onClick={this.closeHistoryModal} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        {historyLoading ? (
                            <Box display="flex" justifyContent="center" p={4}>
                                <CircularProgress />
                            </Box>
                        ) : historyList.length === 0 ? (
                            <Box display="flex" justifyContent="center" p={4}>
                                <Typography variant="body1" color="textSecondary">
                                    No reconciliation history found
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                                <TableCell><strong>Student</strong></TableCell>
                                                <TableCell><strong>From Group</strong></TableCell>
                                                <TableCell></TableCell>
                                                <TableCell><strong>To Group</strong></TableCell>
                                                <TableCell><strong>Reason</strong></TableCell>
                                                <TableCell><strong>Reconciled By</strong></TableCell>
                                                <TableCell><strong>Date</strong></TableCell>
                                                <TableCell><strong>Details</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {historyList.map((log, index) => (
                                                <React.Fragment key={log.id || index}>
                                                    <TableRow hover>
                                                        <TableCell>
                                                            <Typography variant="body2">{log.student_name}</Typography>
                                                            <Typography variant="caption" color="textSecondary">{log.student_reg_num}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={log.original_student_group_name || 'N/A'} size="small" style={{ backgroundColor: '#ffcdd2' }} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <ArrowForwardIcon fontSize="small" color="action" />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={log.new_student_group_name || 'N/A'} size="small" style={{ backgroundColor: '#c8e6c9' }} />
                                                        </TableCell>
                                                        <TableCell style={{ maxWidth: '200px' }}>
                                                            <Typography variant="body2" noWrap title={log.reason}>
                                                                {log.reason || '-'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>{log.reconciled_by_name || '-'}</TableCell>
                                                        <TableCell>{this.formatDate(log.created)}</TableCell>
                                                        <TableCell>
                                                            {log.payment_changes && log.payment_changes.length > 0 && (
                                                                <Button
                                                                    size="small"
                                                                    color="primary"
                                                                    onClick={() => this.setState({
                                                                        selectedHistoryLog: selectedHistoryLog?.id === log.id ? null : log
                                                                    })}
                                                                >
                                                                    {selectedHistoryLog?.id === log.id ? 'Hide' : `${log.payment_changes.length} changes`}
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                    {selectedHistoryLog?.id === log.id && log.payment_changes && (
                                                        <TableRow>
                                                            <TableCell colSpan={8} style={{ backgroundColor: '#fafafa', padding: '16px' }}>
                                                                <Typography variant="subtitle2" gutterBottom>
                                                                    <strong>Payment Detail Changes:</strong>
                                                                </Typography>
                                                                <Table size="small">
                                                                    <TableHead>
                                                                        <TableRow>
                                                                            <TableCell><strong>Payment ID</strong></TableCell>
                                                                            <TableCell><strong>Old Fee Plan</strong></TableCell>
                                                                            <TableCell></TableCell>
                                                                            <TableCell><strong>New Fee Plan</strong></TableCell>
                                                                            <TableCell><strong>Amount</strong></TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {log.payment_changes.map((change, idx) => (
                                                                            <TableRow key={idx}>
                                                                                <TableCell>{change.payment_detail_id}</TableCell>
                                                                                <TableCell>
                                                                                    <Typography variant="body2" color="error">
                                                                                        {change.old_fee_plan_name} (ID: {change.old_fee_plan_id})
                                                                                    </Typography>
                                                                                </TableCell>
                                                                                <TableCell><ArrowForwardIcon fontSize="small" /></TableCell>
                                                                                <TableCell>
                                                                                    <Typography variant="body2" style={{ color: 'green' }}>
                                                                                        {change.new_fee_plan_name} (ID: {change.new_fee_plan_id})
                                                                                    </Typography>
                                                                                </TableCell>
                                                                                <TableCell>{numberWithCommas(change.amount_paid || 0)}</TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <TablePagination
                                    component="div"
                                    count={historyCount}
                                    page={historyPage}
                                    onPageChange={this.handleHistoryPageChange}
                                    rowsPerPage={historyRowsPerPage}
                                    onRowsPerPageChange={this.handleHistoryRowsPerPageChange}
                                    rowsPerPageOptions={[5, 10, 25]}
                                />
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </Box>
        )
    }
}

const mapStateToProps = createStructuredSelector({
    getAcademicYearList: makeSelectAcademicYear(),
})

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setAcademicYear }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(FeeMismatchList)