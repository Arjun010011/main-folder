import React, { Component } from 'react'
import {
    Paper, Box, Button, Grid, IconButton, Menu, MenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Table, TableHead, TableRow, TableCell, TableBody,
    TextField, Typography, CircularProgress
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import AllMUIDataTable from 'Components/AllMUIDataTable';

import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import EditOutlinedIcon from '@material-ui/icons/EditOutlined';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import VisibilityIcon from '@material-ui/icons/Visibility';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import SaveIcon from '@material-ui/icons/Save';
import CloseIcon from '@material-ui/icons/Close';
import Swal from 'sweetalert2';
import { getRequest, deleteRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, PUT_URL } from 'Includes/urls'
import LoadingGif from 'Components/LoadingGif';
import { Actions } from 'Constants/permissions';
import { options, SUCCESS_MSG_PROPS } from 'Constants';
import { updatePermissions, isUserHasPermission } from 'Includes/functions';
import { Link } from "react-router-dom";

const PAGE_SIZE = 15;

class ViewStaffSalary extends Component {

    constructor() {
        super();

        this.permission = updatePermissions('payroll_staffsalary', ['delete']);
        this.fetchLock = false;

        this.state = {
            staffSalaryList: [],
            loading: true,
            tableLoading: false,
            addPermission: isUserHasPermission('payroll_staffsalary', 'create'),
            editPermission: isUserHasPermission('payroll_staffsalary', 'update'),
            deletePermission: isUserHasPermission('payroll_staffsalary', 'delete'),

            // Action menu
            anchorEl: null,
            selectedRow: null,

            // View dialog
            viewDialogOpen: false,
            viewData: null,

            // Bulk edit mode
            bulkEditMode: false,
            bulkData: [],
            bulkEdits: {},       // { id: { salary, from_date, comments } }
            bulkPageNo: 1,
            bulkTotalCount: 0,
            bulkHasMore: true,
            bulkFetching: false,
            bulkSaving: false,
        }
    }

    componentDidMount() {
        this.getStaffSalaryList();
    }

    getStaffSalaryList = () => {
        this.setState({ tableLoading: true, staffSalaryList: [] });

        let params = { is_active: true, limit: 500, pageno: 1 };

        getRequest(GET_URL.staffsalary.api, params, this.props).then(response => {
            if (response && response.status === 200) {
                const responseData = response.data || {};
                let staffSalaryList = [];
                if (responseData.data) {
                    if (responseData.data.data_list) {
                        staffSalaryList = responseData.data.data_list;
                    } else if (Array.isArray(responseData.data)) {
                        staffSalaryList = responseData.data;
                    }
                }

                this.setState({
                    staffSalaryList,
                    loading: false,
                    tableLoading: false
                })
            } else {
                this.setState({ loading: false, tableLoading: false })
            }
        }).catch(() => {
            this.setState({ loading: false, tableLoading: false })
        })
    }

    // ─── Action Menu ─────────────────────────────────────
    handleMenuOpen = (e, rowData) => {
        this.setState({ anchorEl: e.currentTarget, selectedRow: rowData })
    }

    handleMenuClose = () => {
        this.setState({ anchorEl: null, selectedRow: null })
    }

    handleView = () => {
        const { selectedRow } = this.state
        this.handleMenuClose()
        if (selectedRow) {
            this.setState({ viewDialogOpen: true, viewData: selectedRow })
        }
    }

    handleEdit = () => {
        const { selectedRow } = this.state
        this.handleMenuClose()
        if (selectedRow) {
            this.props.history.push(`${Actions.payroll_staffsalary.create.url}?id=${selectedRow.id}`)
        }
    }

    handleDelete = () => {
        const { selectedRow } = this.state
        this.handleMenuClose()
        if (!selectedRow) return

        Swal.fire({
            title: 'Delete Salary?',
            text: `Are you sure you want to delete salary for "${selectedRow.staff_name || 'this staff'}"?`,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.value) {
                deleteRequest(`${DEL_URL.staffsalary.api}${selectedRow.id}/`, {}, this.props, true)
                    .then(res => {
                        if (res && res.status === 200) {
                            Swal.fire({
                                ...SUCCESS_MSG_PROPS,
                                title: 'Deleted!',
                                text: 'Salary record has been deleted.',
                            })
                            this.getStaffSalaryList()
                        }
                    })
            }
        })
    }

    handleCloseViewDialog = () => {
        this.setState({ viewDialogOpen: false, viewData: null })
    }

    // ═══════════════════════════════════════════
    //  BULK EDIT
    // ═══════════════════════════════════════════

    enterBulkEdit = () => {
        this.fetchLock = false;
        this.setState({
            bulkEditMode: true,
            bulkData: [],
            bulkEdits: {},
            bulkPageNo: 1,
            bulkTotalCount: 0,
            bulkHasMore: true,
            bulkFetching: true,
        }, () => {
            this.loadBulkPage(1);
        });
    }

    exitBulkEdit = () => {
        this.fetchLock = false;
        this.setState({
            bulkEditMode: false,
            bulkData: [],
            bulkEdits: {},
            bulkPageNo: 1,
            bulkTotalCount: 0,
            bulkHasMore: true,
            bulkFetching: false,
        });
        this.getStaffSalaryList();
    }

    loadBulkPage = (pageNo) => {
        const params = {
            is_active: true,
            limit: PAGE_SIZE,
            pageno: pageNo,
        };

        getRequest(GET_URL.staffsalary.api, params, this.props)
            .then(res => {
                this.fetchLock = false;
                if (res?.status === 200) {
                    const resData = res.data?.data || {};
                    const pageData = resData.data_list || (Array.isArray(resData) ? resData : []);
                    const count = resData.count || pageData.length;

                    this.setState(prev => ({
                        bulkData: [...prev.bulkData, ...pageData],
                        bulkTotalCount: count,
                        bulkHasMore: (prev.bulkData.length + pageData.length) < count,
                        bulkPageNo: pageNo,
                        bulkFetching: false,
                    }));
                } else {
                    this.setState({ bulkFetching: false });
                }
            })
            .catch(() => {
                this.fetchLock = false;
                this.setState({ bulkFetching: false });
            });
    }

    loadMoreBulk = () => {
        if (this.state.bulkFetching || !this.state.bulkHasMore || this.fetchLock) return;
        this.fetchLock = true;
        const nextPage = this.state.bulkPageNo + 1;
        this.setState({ bulkFetching: true });
        this.loadBulkPage(nextPage);
    }

    handleBulkFieldChange = (id, field) => (e) => {
        const val = e.target.value;
        this.setState(prev => {
            const existing = prev.bulkEdits[id] || {};
            const row = prev.bulkData.find(r => r.id === id);
            // Initialize from original data if first edit on this row
            if (!prev.bulkEdits[id]) {
                existing.salary = row?.salary || '';
                existing.from_date = row?.from_date || '';
                existing.comments = row?.comments || '';
                existing.staff = row?.staff || '';
            }
            return {
                bulkEdits: {
                    ...prev.bulkEdits,
                    [id]: { ...existing, [field]: val }
                }
            };
        });
    }

    getEditValue = (row, field) => {
        const edit = this.state.bulkEdits[row.id];
        if (edit && edit[field] !== undefined) return edit[field];
        return row[field] || '';
    }

    saveBulkEdits = async () => {
        const { bulkEdits, bulkData } = this.state;
        const editIds = Object.keys(bulkEdits);

        if (editIds.length === 0) {
            Swal.fire({ icon: 'info', text: 'No changes to save.' });
            return;
        }

        this.setState({ bulkSaving: true });
        let successCount = 0;
        let failCount = 0;

        for (const id of editIds) {
            const edit = bulkEdits[id];
            const row = bulkData.find(r => r.id === Number(id) || r.id === id);
            if (!row) continue;

            const payload = {
                staff: edit.staff || row.staff,
                salary: Number(edit.salary),
                from_date: edit.from_date,
                comments: edit.comments || '',
            };

            if (!payload.salary || !payload.from_date) {
                failCount++;
                continue;
            }

            try {
                const res = await putRequest(`${PUT_URL.staffsalary.api}${id}/`, payload, this.props);
                if (res && res.status === 200) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        this.setState({ bulkSaving: false });

        if (failCount === 0) {
            Swal.fire({
                position: 'top-end',
                type: 'success',
                title: `${successCount} record(s) updated!`,
                showConfirmButton: false,
                timer: 1500,
            });
            this.exitBulkEdit();
        } else {
            Swal.fire({
                icon: 'warning',
                text: `${successCount} saved, ${failCount} failed. Please review.`,
            });
        }
    }

    // ─── Table Columns (Normal View) ────────────────────
    getColumns = () => {
        return [
            {
                name: 'id',
                label: 'id',
                options: { display: false }
            },
            {
                name: 'staff_name',
                label: 'Staff Name',
                options: {
                    filter: true,
                    sort: true,
                    customBodyRender: (value) => {
                        return value || <span style={{ color: '#999' }}>—</span>
                    }
                }
            },
            {
                name: 'salary',
                label: 'Salary',
                options: {
                    filter: true,
                    sort: true,
                    customBodyRender: (value) => {
                        const formatted = value ? Number(value).toLocaleString('en-IN') : '0'
                        return (
                            <Box style={{ fontWeight: 600 }}>
                                ₹ {formatted}
                            </Box>
                        )
                    }
                }
            },
            {
                name: 'from_date',
                label: 'From Date',
                options: {
                    filter: true,
                    sort: true,
                    customBodyRender: (value) => {
                        if (!value) return <span style={{ color: '#999' }}>—</span>
                        try {
                            return new Date(value).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric'
                            })
                        } catch {
                            return value
                        }
                    }
                }
            },
            {
                name: 'to_date',
                label: 'To Date',
                options: {
                    filter: true,
                    sort: false,
                    customBodyRender: (value) => {
                        if (!value) return <span style={{ color: '#4caf50', fontWeight: 600 }}>Active</span>
                        try {
                            return new Date(value).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric'
                            })
                        } catch {
                            return value
                        }
                    }
                }
            },
            {
                name: 'actions',
                label: 'Actions',
                options: {
                    filter: false,
                    sort: false,
                    empty: true,
                    customBodyRenderLite: (dataIndex) => {
                        const row = this.state.staffSalaryList[dataIndex]
                        if (!row) return null
                        return (
                            <IconButton size="small" onClick={(e) => this.handleMenuOpen(e, row)}>
                                <MoreVertIcon fontSize="small" />
                            </IconButton>
                        )
                    }
                }
            }
        ]
    }

    renderViewDialog = () => {
        const { viewDialogOpen, viewData } = this.state
        if (!viewData) return null

        const formatDate = (val) => {
            if (!val) return '—'
            try {
                return new Date(val).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                })
            } catch {
                return val
            }
        }

        const rows = [
            ['Staff Name', viewData.staff_name || '—'],
            ['Salary', viewData.salary ? `₹ ${Number(viewData.salary).toLocaleString('en-IN')}` : '—'],
            ['From Date', formatDate(viewData.from_date)],
            ['To Date', viewData.to_date ? formatDate(viewData.to_date) : 'Active'],
            ['Comments', viewData.comments || '—'],
        ]

        return (
            <Dialog open={viewDialogOpen} onClose={this.handleCloseViewDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Salary Details</DialogTitle>
                <DialogContent dividers>
                    <Table size="small">
                        <TableBody>
                            {rows.map(([label, value], idx) => (
                                <TableRow key={idx}>
                                    <TableCell style={{ fontWeight: 600, width: '40%', color: '#555' }}>{label}</TableCell>
                                    <TableCell>{value}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleCloseViewDialog} color="primary">Close</Button>
                </DialogActions>
            </Dialog>
        )
    }

    // ─── Bulk Edit Table ────────────────────────────────
    renderBulkEditView = () => {
        const { bulkData, bulkTotalCount, bulkHasMore, bulkFetching, bulkSaving, bulkEdits } = this.state;
        const editedCount = Object.keys(bulkEdits).length;

        return (
            <Paper className='paper-background'>
                {/* Header */}
                <Grid container>
                    <Grid item md={6} xs={12} className='header-align'>
                        <Box className='heading'>
                            Bulk Edit — Staff Salary
                        </Box>
                        <Box className='sub-heading'>
                            Edit salary, from date, or comments for any staff. Only changed rows will be saved.
                        </Box>
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <Box className='header-align end-flex-prop'>
                            <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                                <Button
                                    variant="outlined"
                                    onClick={this.exitBulkEdit}
                                    startIcon={<CloseIcon />}
                                    style={{ borderRadius: 20, height: 42, marginTop: 8, textTransform: 'none', fontWeight: 500, fontSize: 15 }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={this.saveBulkEdits}
                                    disabled={bulkSaving || editedCount === 0}
                                    startIcon={bulkSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                                    className='editbutton-view'
                                >
                                    {bulkSaving ? 'Saving...' : `Save ${editedCount > 0 ? `(${editedCount})` : ''}`}
                                </Button>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>

                {/* Counter */}
                <Box display="flex" justifyContent="space-between" alignItems="center" px={2} pt={2}>
                    <Typography variant="body2" color="textSecondary">
                        Showing <strong>{bulkData.length}</strong> of <strong>{bulkTotalCount}</strong> staff
                    </Typography>
                    {bulkFetching && <CircularProgress size={20} />}
                </Box>

                {/* Scrollable Table */}
                <Box px={2} pb={2} pt={1}>
                    <div
                        style={{ maxHeight: '60vh', overflowY: 'auto' }}
                        onScroll={(e) => {
                            const { scrollTop, scrollHeight, clientHeight } = e.target;
                            if (scrollHeight - scrollTop - clientHeight < 150) {
                                this.loadMoreBulk();
                            }
                        }}
                    >
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell style={{ fontWeight: 700, width: 50 }}>#</TableCell>
                                    <TableCell style={{ fontWeight: 700, minWidth: 180 }}>Staff Name</TableCell>
                                    <TableCell style={{ fontWeight: 700, minWidth: 140 }}>Salary *</TableCell>
                                    <TableCell style={{ fontWeight: 700, minWidth: 140 }}>From Date *</TableCell>
                                    <TableCell style={{ fontWeight: 700, minWidth: 160 }}>Comments</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bulkData.map((row, idx) => {
                                    const isEdited = !!bulkEdits[row.id];
                                    return (
                                        <TableRow key={row.id} hover
                                            style={{
                                                backgroundColor: isEdited ? '#fffde7' : undefined,
                                            }}
                                        >
                                            <TableCell style={{ color: '#888' }}>{idx + 1}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" style={{ fontWeight: 500 }}>
                                                    {row.staff_name || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    variant="outlined"
                                                    size="small"
                                                    type="number"
                                                    value={this.getEditValue(row, 'salary')}
                                                    onChange={this.handleBulkFieldChange(row.id, 'salary')}
                                                    fullWidth
                                                    inputProps={{ min: 0, style: { padding: '6px 10px' } }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    variant="outlined"
                                                    size="small"
                                                    type="date"
                                                    value={this.getEditValue(row, 'from_date')}
                                                    onChange={this.handleBulkFieldChange(row.id, 'from_date')}
                                                    fullWidth
                                                    InputLabelProps={{ shrink: true }}
                                                    inputProps={{ style: { padding: '6px 10px' } }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    variant="outlined"
                                                    size="small"
                                                    value={this.getEditValue(row, 'comments')}
                                                    onChange={this.handleBulkFieldChange(row.id, 'comments')}
                                                    placeholder="Optional"
                                                    fullWidth
                                                    inputProps={{ style: { padding: '6px 10px' } }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {bulkData.length === 0 && !bulkFetching && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Typography color="textSecondary">No salary records found.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        {bulkFetching && (
                            <Box display="flex" justifyContent="center" py={2}>
                                <CircularProgress size={24} />
                            </Box>
                        )}
                    </div>
                </Box>
            </Paper>
        );
    }

    render() {
        let { loading, staffSalaryList, tableLoading, addPermission, editPermission, deletePermission,
            anchorEl, bulkEditMode } = this.state;

        if (loading) {
            return <LoadingGif />
        }

        // ─── Bulk Edit Mode ─────────────────────
        if (bulkEditMode) {
            return this.renderBulkEditView();
        }

        // ─── Normal View ────────────────────────
        const columns = this.getColumns()

        let option = {
            ...options,
            textLabels: {
                body: {
                    noMatch: tableLoading
                        ? 'Loading...'
                        : 'No salary data available',
                },
            }
        }

        return (
            <>
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={6} xs={12} className='header-align'>
                            <Box className='heading'>
                                Staff Salary
                            </Box>
                        </Grid>

                        <Grid item md={6} xs={12}>
                            <Box className='header-align end-flex-prop'>
                                <Box display="flex" style={{ gap: 8 }}>
                                    {editPermission && (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={this.enterBulkEdit}
                                            className='editbutton-view'
                                        >
                                            <EditOutlinedIcon className="visibility-icon" />{" "}
                                            Bulk Edit
                                        </Button>
                                    )}
                                    {addPermission && (
                                        <Button
                                            variant="contained"
                                            component={Link}
                                            to={Actions.payroll_staffsalary.create.url}
                                            className='editbutton-view'
                                        >
                                            <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                                            Add Salary
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    <Grid container spacing={3} className='flex-justify-center' style={{ marginTop: 16 }}>
                        <Grid item md={12} xs={12}>
                            <Paper>
                                <AllMUIDataTable
                                    data={staffSalaryList}
                                    columns={columns}
                                    options={option}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>

                {/* ── Action Menu (3-dots) ── */}
                <Menu
                    anchorEl={anchorEl}
                    keepMounted
                    open={Boolean(anchorEl)}
                    onClose={this.handleMenuClose}
                    getContentAnchorEl={null}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <MenuItem onClick={this.handleView}>
                        <VisibilityIcon fontSize="small" style={{ marginRight: 8, color: '#1565c0' }} />
                        View
                    </MenuItem>
                    {editPermission && (
                        <MenuItem onClick={this.handleEdit}>
                            <EditIcon fontSize="small" style={{ marginRight: 8, color: '#2e7d32' }} />
                            Edit
                        </MenuItem>
                    )}
                    {deletePermission && (
                        <MenuItem onClick={this.handleDelete}>
                            <DeleteIcon fontSize="small" style={{ marginRight: 8, color: '#c62828' }} />
                            Delete
                        </MenuItem>
                    )}
                </Menu>

                {this.renderViewDialog()}
            </>
        )
    }
}

export default withRouter(ViewStaffSalary);
