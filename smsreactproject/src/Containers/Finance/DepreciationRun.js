import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, Button, TextField, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, Chip, Tooltip, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@material-ui/core';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';

import EditIcon from '@material-ui/icons/Edit';
import UndoIcon from '@material-ui/icons/Undo';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import classNames from 'classnames';
import Swal from 'sweetalert2';
import InfiniteScroll from 'react-infinite-scroller';

import loadingBar from 'images/loading.gif'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions';

const SNAPSHOT_STATE = {
    NONE: 'none',
    DRAFT: 'draft',
    LOCKED: 'locked'
};

class DepreciationRun extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            submitting: false,
            checkingSnapshots: false,
            financial_year: '',
            financialYearOptions: [],
            snapshotState: SNAPSHOT_STATE.NONE,
            snapshotsData: [],
            previewData: null,
            editMode: false,
            editedValues: {},
            showManualModal: false,
            previewEditedValues: {},


            currentPage: 1,
            hasMore: true,
            loadingMore: false,
            totalCount: 0,
        }
    }

    componentDidMount = () => {
        this.loadFinancialYears()
    }

    handleGoBack = () => {
        this.props.history.push('/finance/combined-asset-dashboard');
    };


    loadFinancialYears = () => {
        const url = GET_URL.financialyear.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const options = response.data.data || response.data || []
                let currentFyId = ''

                const today = new Date()
                const currentFy = options.find(fy => {
                    const start = new Date(fy.start_date)
                    const end = new Date(fy.end_date)
                    return today >= start && today <= end
                })

                if (currentFy) {
                    currentFyId = currentFy.id
                } else if (options.length > 0) {
                    currentFyId = options[0].id
                }

                this.setState({
                    financialYearOptions: options,
                    financial_year: currentFyId,
                    loading: false
                }, () => {
                    if (currentFyId) {
                        this.checkExistingSnapshots(currentFyId)
                    }
                })
            } else {
                this.setState({ loading: false })
            }
        })
    }

    handleFYChange = (e) => {
        const fyId = e.target.value;
        this.setState({
            financial_year: fyId,
            snapshotState: SNAPSHOT_STATE.NONE,
            snapshotsData: [],
            previewData: null,
            editMode: false,
            editedValues: {},
            showManualModal: false,
            previewEditedValues: {},
            currentPage: 1,
            hasMore: true,
            totalCount: 0
        }, () => {
            if (fyId) {
                this.checkExistingSnapshots(fyId);
            }
        });
    }

    checkExistingSnapshots = (fyId, append = false) => {
        const { snapshotsData, loadingMore } = this.state;

        if (append && loadingMore) return;

        const limit = 10;
        const offset = append ? snapshotsData.length : 0;

        this.setState({ checkingSnapshots: !append, loadingMore: append });
        const url = GET_URL.depreciation.api;
        const pageno = Math.floor(offset / limit) + 1;
        const params = { financial_year: fyId, limit: limit, pageno: pageno };

        getRequest(url, params, this.props).then(response => {
            this.setState({ checkingSnapshots: false, loadingMore: false });
            if (response && response.status === 200) {
                const data = response.data.data || response.data || {};
                const snapshots = data.data_list || data || [];
                const totalCount = data.count || snapshots.length;

                let newSnapshots;
                if (append) {
                    const existingIds = new Set(snapshotsData.map(s => s.id));
                    const uniqueNewSnapshots = snapshots.filter(s => !existingIds.has(s.id));
                    newSnapshots = [...snapshotsData, ...uniqueNewSnapshots];
                } else {
                    newSnapshots = snapshots;
                }

                const hasMore = newSnapshots.length < totalCount;

                if (newSnapshots.length > 0) {
                    const isLocked = newSnapshots.some(s => s.is_locked);
                    this.setState({
                        snapshotState: isLocked ? SNAPSHOT_STATE.LOCKED : SNAPSHOT_STATE.DRAFT,
                        snapshotsData: newSnapshots,
                        previewData: null,
                        totalCount: totalCount,
                        hasMore: hasMore,
                    });
                } else {
                    this.setState({
                        snapshotState: SNAPSHOT_STATE.NONE,
                        snapshotsData: [],
                        previewData: null,
                        totalCount: 0,
                        hasMore: false,
                    });
                }
            }
        });
    }

    loadMoreSnapshots = () => {
        const { financial_year, loadingMore, hasMore, snapshotsData, totalCount } = this.state;
        if (loadingMore || !hasMore || !financial_year || snapshotsData.length >= totalCount) return;

        this.checkExistingSnapshots(financial_year, true);
    }

    extractErrorMessage = (response, defaultMsg) => {
        const data = response?.data;
        if (Array.isArray(data) && data.length > 0) {
            return data[0];
        }
        if (data?.Reason) return data.Reason;
        if (data?.detail) return data.detail;
        if (data?.message) return data.message;
        if (typeof data === 'string') return data;
        return defaultMsg;
    }

    handlePreview = () => {
        const { financial_year, snapshotState } = this.state;

        if (snapshotState !== SNAPSHOT_STATE.NONE) {
            Swal.fire({ icon: 'warning', title: 'Preview Not Available', text: 'Preview is not available after snapshots are generated.' });
            return;
        }

        if (!financial_year) {
            Swal.fire({ icon: 'warning', title: 'Select Financial Year', text: 'Please select a financial year first' });
            return;
        }

        this.setState({ submitting: true });
        const url = POST_URL.depreciation.api;
        const payload = { action: 'preview', financial_year: parseInt(financial_year) };

        postRequest(url, payload, this.props).then(response => {
            this.setState({ submitting: false });
            if (response && response.status === 200) {
                const responseData = response.data.data || response.data || {};
                const assets = responseData.assets || [];
                const hasManual = assets.some(a => a.calculation_method === 'MANUAL');
                this.setState({
                    previewData: assets,
                    showManualModal: hasManual
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: this.extractErrorMessage(response, 'Failed to calculate depreciation')
                });
            }
        });
    }

    handleGenerate = () => {
        const { financial_year, previewEditedValues } = this.state;
        this.setState({ submitting: true, editMode: false, editedValues: {}, showManualModal: false });
        const url = POST_URL.depreciation.api;
        const payload = { action: 'generate', financial_year: parseInt(financial_year) };

        // Include manual edits from preview if any
        const manualEdits = Object.values(previewEditedValues);
        if (manualEdits.length > 0) {
            payload.edits = manualEdits;
        }

        postRequest(url, payload, this.props).then(response => {
            this.setState({ submitting: false, previewEditedValues: {} });
            if (response && response.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: 'Depreciation snapshots generated',
                    showConfirmButton: false,
                    timer: 1500
                });
                this.checkExistingSnapshots(financial_year);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: this.extractErrorMessage(response, 'Failed to generate snapshots')
                });
            }
        });
    }

    handleLock = () => {
        const { financial_year, snapshotsData } = this.state;

        const pendingManuals = snapshotsData.filter(row =>
            row.calculation_method === 'MANUAL' &&
            !row.is_manual_depreciation &&
            parseFloat(row.depreciation_amount) === 0
        );

        if (pendingManuals.length > 0) {
            Swal.fire({
                title: 'Manual Depreciation Required',
                text: `${pendingManuals.length} asset(s) with Manual method need depreciation values. Use the "Enter Value" button in the Actions column for each asset.`,
                icon: 'warning',
                confirmButtonText: 'OK'
            });
            return;
        }

        Swal.fire({
            title: 'Lock Depreciation?',
            text: 'This action is permanent. Locked depreciation cannot be modified or recalculated.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f44336',
            confirmButtonText: 'Yes, Lock It',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.value) {
                this.setState({ submitting: true });
                const url = POST_URL.depreciation.api;
                const payload = { action: 'lock', financial_year: parseInt(financial_year) };

                postRequest(url, payload, this.props).then(response => {
                    this.setState({ submitting: false });
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Depreciation locked',
                            showConfirmButton: false,
                            timer: 1500
                        });
                        this.checkExistingSnapshots(financial_year);
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: this.extractErrorMessage(response, 'Failed to lock snapshots')
                        });
                    }
                });
            }
        });
    }

    handleUnlock = () => {
        const { financial_year } = this.state;

        Swal.fire({
            title: 'Unlock Depreciation?',
            text: 'This will allow modifications to the depreciation values. This action will be logged.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Unlock',
            cancelButtonText: 'Cancel',
            input: 'text',
            inputLabel: 'Reason for unlocking (optional)',
            inputPlaceholder: 'Enter reason...'
        }).then((result) => {
            const isConfirmed = result.isConfirmed || (result.value !== undefined && !result.dismiss);

            if (isConfirmed) {
                this.setState({ submitting: true });
                const url = POST_URL.depreciation.api;
                const remarks = (typeof result.value === 'string') ? result.value : '';

                const payload = {
                    action: 'unlock',
                    financial_year: parseInt(financial_year),
                    remarks: remarks
                };

                postRequest(url, payload, { ...this.props, return_error: true }).then(response => {
                    this.setState({ submitting: false });
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Depreciation unlocked',
                            showConfirmButton: false,
                            timer: 1500
                        });
                        this.checkExistingSnapshots(financial_year);
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: this.extractErrorMessage(response, 'Failed to unlock snapshots')
                        });
                    }
                });
            }
        });
    }

    toggleEditMode = () => {
        this.setState(prev => ({
            editMode: !prev.editMode,
            editedValues: {}
        }));
    }

    openManualModal = () => {
        this.setState({ showManualModal: true });
    }

    closeManualModal = () => {
        this.setState({ showManualModal: false });
    }

    handlePreviewEdit = (row, newValue) => {
        const depreciation = parseFloat(newValue) || 0;
        const opening = parseFloat(row.opening_value) || 0;
        const closing = Math.max(opening - depreciation, 0);

        this.setState(prev => ({
            previewEditedValues: {
                ...prev.previewEditedValues,
                [row.asset_id]: {
                    asset_id: row.asset_id,
                    depreciation_amount: depreciation,
                    closing_value: closing
                }
            }
        }));
    }

    handleEditDepreciation = (row, newValue) => {
        const depreciation = parseFloat(newValue) || 0;
        const opening = parseFloat(row.opening_value) || 0;
        const closing = opening - depreciation;

        this.setState(prev => ({
            editedValues: {
                ...prev.editedValues,
                [row.id]: {
                    snapshot_id: row.id,
                    depreciation_amount: depreciation,
                    closing_value: closing > 0 ? closing : 0
                }
            }
        }));
    }

    handleSaveEdits = () => {
        const { financial_year, editedValues } = this.state;
        const edits = Object.values(editedValues);

        if (edits.length === 0) {
            Swal.fire({ icon: 'warning', title: 'No Changes', text: 'No depreciation values were modified.' });
            return;
        }

        this.setState({ submitting: true });
        const url = POST_URL.depreciation.api;
        const payload = {
            action: 'edit',
            financial_year: parseInt(financial_year),
            edits: edits
        };

        postRequest(url, payload, this.props).then(response => {
            this.setState({ submitting: false });
            if (response && response.status === 200) {
                const data = response.data.data || response.data || {};
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: `${data.snapshots_updated || edits.length} snapshot(s) updated`,
                    showConfirmButton: false,
                    timer: 1500
                });
                this.setState({ editMode: false, editedValues: {} });
                this.checkExistingSnapshots(financial_year);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: this.extractErrorMessage(response, 'Failed to save changes')
                });
            }
        });
    }

    handleResetSnapshot = (row) => {
        const isManualMethod = row.calculation_method === 'MANUAL';

        const manualConfig = {
            title: 'Calculate Depreciation',
            text: 'This asset is set to Manual depreciation. Choose a method to calculate:',
            input: 'radio',
            inputOptions: {
                'SLM': 'Straight Line Method',
                'WDV': 'Written Down Value'
            },
            inputValidator: (value) => {
                if (!value) {
                    return 'You must choose a method!'
                }
            },
            showCancelButton: true,
            confirmButtonText: 'Next',
            cancelButtonText: 'Cancel'
        };

        const standardConfig = {
            title: 'Reset to Calculated Value?',
            text: 'This will recalculate the depreciation based on system rules and remove the manual flag.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Reset',
            cancelButtonText: 'Cancel'
        };

        Swal.fire(isManualMethod ? manualConfig : standardConfig).then((result) => {
            if (result.value) {
                const selectedMethod = isManualMethod ? result.value : null;

                if (selectedMethod === 'WDV') {
                    Swal.fire({
                        title: 'Enter Depreciation Rate',
                        text: 'Provide the annual depreciation rate for WDV calculation:',
                        input: 'number',
                        inputLabel: 'Depreciation Rate (%)',
                        inputValue: '',
                        inputAttributes: {
                            min: 0,
                            max: 100,
                            step: '0.01'
                        },
                        inputValidator: (value) => {
                            if (!value || isNaN(parseFloat(value))) {
                                return 'Please enter a valid rate'
                            }
                            if (parseFloat(value) <= 0 || parseFloat(value) > 100) {
                                return 'Rate must be between 0 and 100'
                            }
                        },
                        showCancelButton: true,
                        confirmButtonText: 'Calculate',
                        cancelButtonText: 'Cancel'
                    }).then((rateResult) => {
                        if (rateResult.value) {
                            this.executeResetCalculation(row, selectedMethod, parseFloat(rateResult.value));
                        }
                    });
                } else {
                    this.executeResetCalculation(row, selectedMethod, null);
                }
            }
        });
    }

    executeResetCalculation = (row, method, depreciationRate) => {
        this.setState({ submitting: true });
        const url = POST_URL.depreciation.api;

        let payload = { action: 'reset', snapshot_id: row.id };
        if (method) {
            payload.calculation_method = method;
        }
        if (depreciationRate !== null) {
            payload.depreciation_rate = depreciationRate;
        }

        postRequest(url, payload, this.props).then(response => {
            this.setState({ submitting: false });
            if (response && response.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: method ? 'Depreciation calculated successfully' : 'Snapshot reset to calculated value',
                    showConfirmButton: false,
                    timer: 1500
                });
                this.checkExistingSnapshots(this.state.financial_year);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: this.extractErrorMessage(response, 'Failed to reset snapshot')
                });
            }
        });
    }

    handleEnterManualValue = (row) => {
        Swal.fire({
            title: 'Enter Depreciation Value',
            text: `Asset: ${row.asset_code} - ${row.asset_name}`,
            input: 'number',
            inputLabel: 'Depreciation Amount',
            inputValue: parseFloat(row.depreciation_amount) || 0,
            inputAttributes: {
                min: 0,
                step: '0.01'
            },
            inputValidator: (value) => {
                if (value === '' || value === null || isNaN(parseFloat(value))) {
                    return 'Please enter a valid amount'
                }
                if (parseFloat(value) < 0) {
                    return 'Amount cannot be negative'
                }
            },
            showCancelButton: true,
            confirmButtonText: 'Save',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.value !== undefined && !result.dismiss) {
                const depreciation = parseFloat(result.value);
                const opening = parseFloat(row.opening_value) || 0;
                const closing = Math.max(opening - depreciation, 0);

                this.setState({ submitting: true });
                const url = POST_URL.depreciation.api;
                const payload = {
                    action: 'edit',
                    financial_year: parseInt(this.state.financial_year),
                    edits: [{
                        snapshot_id: row.id,
                        depreciation_amount: depreciation,
                        closing_value: closing
                    }]
                };

                postRequest(url, payload, this.props).then(response => {
                    this.setState({ submitting: false });
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Depreciation saved',
                            showConfirmButton: false,
                            timer: 1500
                        });
                        this.checkExistingSnapshots(this.state.financial_year);
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: this.extractErrorMessage(response, 'Failed to save depreciation')
                        });
                    }
                });
            }
        });
    }



    renderTable = (data, isPreview = false) => {
        const {
            editMode,
            editedValues,
            previewEditedValues,
            snapshotState,
            hasMore,
            loadingMore,
            totalCount
        } = this.state;

        const isDraft = snapshotState === SNAPSHOT_STATE.DRAFT;
        const isSnapshotView = snapshotState !== SNAPSHOT_STATE.NONE;

        if (!data || data.length === 0) {
            return (
                <Box p={3} textAlign="center">
                    <Typography color="textSecondary">
                        No assets found for depreciation in this financial year.
                    </Typography>
                </Box>
            );
        }

        const tableContent = (
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Asset Code</TableCell>
                        <TableCell>Asset Name</TableCell>
                        <TableCell>Group</TableCell>
                        <TableCell align="right">Opening Value</TableCell>
                        <TableCell align="right">Depreciation</TableCell>
                        <TableCell align="right">Closing Value</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Months</TableCell>
                        {isDraft && <TableCell>Actions</TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map(row => {
                        const rowKey = row.id || row.asset_id;
                        const isManualRow = row.calculation_method === 'MANUAL';

                        // For draft edit mode, use snapshot editedValues keyed by row.id
                        const editedRow = editedValues[row.id];
                        // For preview edit mode, use previewEditedValues keyed by row.asset_id
                        const previewEditedRow = previewEditedValues[row.asset_id];

                        let displayDepreciation, displayClosing;
                        if (isPreview && previewEditedRow) {
                            displayDepreciation = previewEditedRow.depreciation_amount;
                            displayClosing = previewEditedRow.closing_value;
                        } else if (editedRow) {
                            displayDepreciation = editedRow.depreciation_amount;
                            displayClosing = editedRow.closing_value;
                        } else {
                            displayDepreciation = row.depreciation_amount;
                            displayClosing = row.closing_value;
                        }

                        const isEditableDraftCell = editMode && isDraft;

                        return (
                            <TableRow key={rowKey}>
                                <TableCell>{row.asset_code}</TableCell>
                                <TableCell>{row.asset_name}</TableCell>
                                <TableCell>{row.asset_group_name}</TableCell>
                                <TableCell align="right">
                                    {numberWithCommas(row.opening_value)}
                                </TableCell>
                                <TableCell align="right">
                                    {isEditableDraftCell ? (
                                        <TextField
                                            type="number"
                                            size="small"
                                            value={displayDepreciation}
                                            onChange={e =>
                                                this.handleEditDepreciation(
                                                    row,
                                                    e.target.value
                                                )
                                            }
                                            inputProps={{ min: 0, step: '0.01' }}
                                            style={{ width: 120 }}
                                        />
                                    ) : (
                                        <>
                                            {numberWithCommas(displayDepreciation)}
                                            {(row.is_manual_depreciation || (isPreview && isManualRow && previewEditedValues[row.asset_id])) && (
                                                <Chip
                                                    size="small"
                                                    label="Manual"
                                                    style={{
                                                        marginLeft: 6,
                                                        background: '#ff9800',
                                                        color: '#fff'
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    {numberWithCommas(displayClosing)}
                                </TableCell>
                                <TableCell>{row.calculation_method}</TableCell>
                                <TableCell>{row.months_depreciated}</TableCell>

                                {isDraft && (
                                    <TableCell>
                                        {row.calculation_method === 'MANUAL' &&
                                            !row.is_manual_depreciation &&
                                            !editMode && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() =>
                                                        this.handleEnterManualValue(
                                                            row
                                                        )
                                                    }
                                                >
                                                    Enter Value
                                                </Button>
                                            )}

                                        {row.is_manual_depreciation &&
                                            !editMode && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        this.handleResetSnapshot(row)
                                                    }
                                                >
                                                    <UndoIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        );

        return (
            <>
                {/* 🔒 Sticky counter (never scrolls away) */}
                {isSnapshotView && totalCount > 0 && (
                    <Box
                        position="sticky"
                        top={0}
                        zIndex={3}
                        bgcolor="#fff"
                        px={2}
                        py={1}
                        borderBottom="1px solid #eee"
                    >
                        <Typography variant="caption" color="textSecondary">
                            Showing {data.length} of {totalCount} assets
                        </Typography>
                    </Box>
                )}

                {/* 🧭 Scroll container */}
                <Box
                    id="depreciation-scroll-container"
                    style={{
                        maxHeight: '75vh',
                        overflowY: 'auto'
                    }}
                >
                    {isSnapshotView ? (
                        <InfiniteScroll
                            pageStart={0}
                            loadMore={this.loadMoreSnapshots}
                            hasMore={hasMore && !loadingMore}
                            useWindow={false}
                            getScrollParent={() =>
                                document.getElementById(
                                    'depreciation-scroll-container'
                                )
                            }
                            threshold={150}
                            loader={
                                <Box
                                    key="loader"
                                    display="flex"
                                    justifyContent="center"
                                    p={2}
                                >
                                    <Typography color="textSecondary">
                                        Loading more assets…
                                    </Typography>
                                </Box>
                            }
                        >
                            {tableContent}
                        </InfiniteScroll>
                    ) : (
                        tableContent
                    )}

                    {/* 🟦 Fallback button */}
                    {hasMore && !loadingMore && (
                        <Box display="flex" justifyContent="center" p={2}>
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={this.loadMoreSnapshots}
                            >
                                Show More
                            </Button>
                        </Box>
                    )}

                    {loadingMore && (
                        <Box display="flex" justifyContent="center" p={2}>
                            <Typography color="textSecondary">
                                Loading…
                            </Typography>
                        </Box>
                    )}
                </Box>
            </>
        );
    };




    renderManualModal = () => {
        const { showManualModal, previewData, previewEditedValues } = this.state;
        if (!previewData) return null;

        const manualRows = previewData.filter(r => r.calculation_method === 'MANUAL');
        if (manualRows.length === 0) return null;

        const editedCount = Object.keys(previewEditedValues).length;

        return (
            <Dialog open={showManualModal} onClose={this.closeManualModal} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Manual Depreciation Values</Typography>
                        <Chip
                            size="small"
                            label={`${manualRows.length} asset(s)`}
                            style={{ backgroundColor: '#ff9800', color: '#fff' }}
                        />
                    </Box>
                    <Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
                        Enter depreciation amounts for assets with Manual depreciation method. Values default to 0.
                    </Typography>
                </DialogTitle>
                <DialogContent style={{ padding: 0 }}>
                    <Box style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Asset Code</TableCell>
                                    <TableCell>Asset Name</TableCell>
                                    <TableCell>Group</TableCell>
                                    <TableCell align="right">Opening Value</TableCell>
                                    <TableCell align="right" style={{ minWidth: 140 }}>Depreciation</TableCell>
                                    <TableCell align="right">Closing Value</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {manualRows.map(row => {
                                    const edited = previewEditedValues[row.asset_id];
                                    const depValue = edited ? edited.depreciation_amount : (parseFloat(row.depreciation_amount) || 0);
                                    const closingValue = edited ? edited.closing_value : (parseFloat(row.closing_value) || parseFloat(row.opening_value) || 0);

                                    return (
                                        <TableRow key={row.asset_id}>
                                            <TableCell>{row.asset_code}</TableCell>
                                            <TableCell>{row.asset_name}</TableCell>
                                            <TableCell>{row.asset_group_name}</TableCell>
                                            <TableCell align="right">
                                                {numberWithCommas(row.opening_value)}
                                            </TableCell>
                                            <TableCell align="right">
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    variant="outlined"
                                                    value={depValue}
                                                    onChange={e => this.handlePreviewEdit(row, e.target.value)}
                                                    inputProps={{ min: 0, step: '0.01' }}
                                                    style={{ width: 130 }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                {numberWithCommas(closingValue)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Box>
                </DialogContent>
                <DialogActions style={{ padding: '12px 20px' }}>
                    {editedCount > 0 && (
                        <Typography variant="body2" color="textSecondary" style={{ marginRight: 'auto' }}>
                            {editedCount} value(s) modified
                        </Typography>
                    )}
                    <Button onClick={this.closeManualModal} color="primary">
                        Done
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    render() {
        const {
            loading, submitting, checkingSnapshots, financial_year, financialYearOptions,
            snapshotState, snapshotsData, previewData, editMode, editedValues,
            previewEditedValues
        } = this.state;

        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            );
        }

        const showPreview = snapshotState === SNAPSHOT_STATE.NONE && !previewData;
        const showGenerateFromPreview = snapshotState === SNAPSHOT_STATE.NONE && previewData && previewData.length > 0;
        const showGenerateFromDraft = snapshotState === SNAPSHOT_STATE.DRAFT;
        const showLock = snapshotState === SNAPSHOT_STATE.DRAFT && !editMode;
        const showUnlock = snapshotState === SNAPSHOT_STATE.LOCKED;
        const isLocked = snapshotState === SNAPSHOT_STATE.LOCKED;
        const isDraft = snapshotState === SNAPSHOT_STATE.DRAFT;
        const hasEdits = Object.keys(editedValues).length > 0;
        const hasManualPreviewRows = previewData && previewData.some(r => r.calculation_method === 'MANUAL');

        const tableData = snapshotState !== SNAPSHOT_STATE.NONE ? snapshotsData : previewData;
        const showTable = tableData && tableData.length >= 0 && (snapshotState !== SNAPSHOT_STATE.NONE || previewData);

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={12} xs={12} className={classNames('header-align')}>
                            <Box display="flex" alignItems="center">
                                <IconButton
                                    onClick={this.handleGoBack}
                                    style={{ marginRight: 8 }}
                                >
                                    <ArrowBackIcon />
                                </IconButton>
                                <Box className='heading'>Run Depreciation</Box>
                            </Box>
                        </Grid>
                    </Grid>

                    <Grid container spacing={3} style={{ padding: '20px' }}>
                        <Grid item md={3} xs={12}>
                            <TextField
                                fullWidth
                                select
                                label="Financial Year"
                                name="financial_year"
                                value={financial_year}
                                onChange={this.handleFYChange}
                                variant="outlined"
                                required
                                disabled={checkingSnapshots}
                            >
                                {financialYearOptions.map(fy => (
                                    <MenuItem key={fy.id} value={fy.id}>{fy.name || `${fy.start_date} - ${fy.end_date}`}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item md={9} xs={12}>
                            <Box display="flex" alignItems="center" height="100%" flexWrap="wrap">
                                {checkingSnapshots && (
                                    <Typography color="textSecondary" style={{ marginRight: 10 }}>
                                        Checking snapshots...
                                    </Typography>
                                )}

                                {showPreview && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={this.handlePreview}
                                        disabled={submitting || !financial_year || checkingSnapshots}
                                        style={{ marginRight: 10, marginBottom: 5 }}
                                    >
                                        {submitting ? 'Processing...' : 'Preview Calculation'}
                                    </Button>
                                )}

                                {(showGenerateFromPreview || showGenerateFromDraft) && !editMode && (
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={this.handleGenerate}
                                        disabled={submitting}
                                        style={{ marginRight: 10, marginBottom: 5 }}
                                    >
                                        {showGenerateFromDraft ? 'Recalculate Snapshots' : 'Generate Snapshots'}
                                    </Button>
                                )}

                                {showGenerateFromPreview && hasManualPreviewRows && (
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        onClick={this.openManualModal}
                                        disabled={submitting}
                                        style={{ marginRight: 10, marginBottom: 5 }}
                                        startIcon={<EditIcon />}
                                    >
                                        Edit Manual Values
                                    </Button>
                                )}

                                {isDraft && (
                                    <Button
                                        variant="outlined"
                                        color={editMode ? 'default' : 'primary'}
                                        onClick={this.toggleEditMode}
                                        disabled={submitting}
                                        style={{ marginRight: 10, marginBottom: 5 }}
                                        startIcon={<EditIcon />}
                                    >
                                        {editMode ? 'Cancel Edit' : 'Edit Depreciation'}
                                    </Button>
                                )}

                                {editMode && hasEdits && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={this.handleSaveEdits}
                                        disabled={submitting}
                                        style={{ marginRight: 10, marginBottom: 5 }}
                                    >
                                        Save Changes ({Object.keys(editedValues).length})
                                    </Button>
                                )}

                                {showLock && (
                                    <Button
                                        variant="contained"
                                        style={{ backgroundColor: '#f44336', color: 'white', marginRight: 10, marginBottom: 5 }}
                                        onClick={this.handleLock}
                                        disabled={submitting}
                                    >
                                        Lock Snapshots
                                    </Button>
                                )}

                                {showUnlock && (
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        onClick={this.handleUnlock}
                                        disabled={submitting}
                                        style={{ marginRight: 10, marginBottom: 5 }}
                                        startIcon={<LockOpenIcon />}
                                    >
                                        Unlock Snapshots
                                    </Button>
                                )}



                                {snapshotState === SNAPSHOT_STATE.DRAFT && (
                                    <Chip
                                        label="Draft – Not Locked"
                                        style={{ backgroundColor: '#ff9800', color: 'white', marginBottom: 5 }}
                                    />
                                )}
                                {isLocked && (
                                    <Chip
                                        label="Final – Locked"
                                        color="secondary"
                                        style={{ marginBottom: 5 }}
                                    />
                                )}
                            </Box>
                        </Grid>
                    </Grid>

                    {showTable && (
                        <Box>
                            <Box style={{ padding: '0 20px' }}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold' }}>
                                    {snapshotState === SNAPSHOT_STATE.LOCKED && 'Depreciation (Final – Locked)'}
                                    {snapshotState === SNAPSHOT_STATE.DRAFT && 'Depreciation (Draft – Not Locked)'}
                                    {snapshotState === SNAPSHOT_STATE.NONE && previewData && 'Preview Calculation'}
                                </Typography>
                            </Box>
                            {this.renderTable(tableData, snapshotState === SNAPSHOT_STATE.NONE)}
                        </Box>
                    )}
                </Paper>


                {this.renderManualModal()}
            </Box>
        );
    }
}

export default withRouter(DepreciationRun)
