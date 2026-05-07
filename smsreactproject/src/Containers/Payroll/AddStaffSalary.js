import React, { Component } from 'react';
import {
    Box, Paper, Grid, Button, TextField, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { withRouter } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import CancelIcon from '@material-ui/icons/Cancel';
import Swal from 'sweetalert2';
import './styles.scss';

import { getRequest, postRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import LoadingGif from 'Components/LoadingGif';

const EMPTY_ROW = () => ({
    staff: null,
    salary: '',
    from_date: '',
    comments: '',
    _isNew: true,
    _saving: false,
});

class AddStaffSalary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            staffList: [],
            rows: [EMPTY_ROW()],
            isEditMode: false,
            editId: null,
        };
    }

    componentDidMount() {
        const params = new URLSearchParams(this.props.location?.search || '');
        const editId = params.get('id');
        if (editId) {
            this.loadEditData(editId);
        } else {
            this.loadStaffList();
        }
    }

    loadStaffList = () => {
        getRequest(GET_URL.staff.api, {}, this.props)
            .then((res) => {
                if (res && res.status === 200) {
                    const staffList = res.data.data || [];
                    this.setState({ staffList, loading: false });
                } else {
                    this.setState({ loading: false });
                }
            })
            .catch(() => this.setState({ loading: false }));
    };

    loadEditData = (editId) => {
        getRequest(`${GET_URL.staffsalary.api}${editId}/`, {}, this.props)
            .then((res) => {
                if (res && res.status === 200) {
                    const data = res.data?.data || res.data || {};
                    this.setState({
                        isEditMode: true,
                        editId: editId,
                        rows: [{
                            staff: { id: data.staff, name: data.staff_name },
                            staff_name: data.staff_name || '',
                            salary: data.salary || '',
                            from_date: data.from_date || '',
                            comments: data.comments || '',
                            _isNew: false,
                            _saving: false,
                            _id: editId,
                        }],
                        loading: false,
                    });
                } else {
                    this.setState({ loading: false });
                }
            })
            .catch(() => this.setState({ loading: false }));
    };

    // ─── Row Management ─────────────────────────────────
    addRow = () => {
        this.setState((prev) => ({
            rows: [...prev.rows, EMPTY_ROW()],
        }));
    };

    removeRow = (idx) => {
        this.setState((prev) => {
            const rows = [...prev.rows];
            if (rows.length === 1) return {};
            rows.splice(idx, 1);
            return { rows };
        });
    };

    handleFieldChange = (idx, field) => (e) => {
        const val = e.target.value;
        this.setState((prev) => {
            const rows = [...prev.rows];
            rows[idx] = { ...rows[idx], [field]: val };
            return { rows };
        });
    };

    handleStaffChange = (idx) => (_, value) => {
        this.setState((prev) => {
            const rows = [...prev.rows];
            rows[idx] = {
                ...rows[idx],
                staff: value,
                from_date: value && value.date_joined ? value.date_joined : rows[idx].from_date,
            };
            return { rows };
        });
    };

    // ─── Validation ─────────────────────────────────────
    validateRow = (row, idx) => {
        if (!row.staff) {
            Swal.fire({ icon: 'warning', text: `Row ${idx + 1}: Please select a staff member.` });
            return false;
        }
        if (!row.salary || isNaN(row.salary) || Number(row.salary) <= 0) {
            Swal.fire({ icon: 'warning', text: `Row ${idx + 1}: Please enter a valid salary.` });
            return false;
        }
        if (!row.from_date) {
            Swal.fire({ icon: 'warning', text: `Row ${idx + 1}: Please select a from date.` });
            return false;
        }
        return true;
    };

    // ─── Save Single Row ────────────────────────────────
    saveRow = (idx) => {
        const row = this.state.rows[idx];
        if (!this.validateRow(row, idx)) return;

        this.setState((prev) => {
            const rows = [...prev.rows];
            rows[idx] = { ...rows[idx], _saving: true };
            return { rows };
        });

        const payload = {
            staff: row.staff.id,
            salary: Number(row.salary),
            from_date: row.from_date,
            comments: row.comments || '',
        };

        const isEdit = !row._isNew && row._id;
        const request = isEdit
            ? putRequest(`${PUT_URL.staffsalary.api}${row._id}/`, payload, this.props)
            : postRequest(POST_URL.staffsalary.api, payload, this.props);

        request.then((res) => {
            this.setState((prev) => {
                const rows = [...prev.rows];
                rows[idx] = { ...rows[idx], _saving: false };
                return { rows };
            });
            if (res && res.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: isEdit ? 'Salary updated successfully!' : 'Salary added successfully!',
                    showConfirmButton: false,
                    timer: 1500,
                });
                if (isEdit) {
                    this.props.history.push(Actions.payroll_staffsalary.view.url);
                } else {
                    // Mark as saved and reset the row
                    this.setState((prev) => {
                        const rows = [...prev.rows];
                        rows[idx] = { ...rows[idx], _isNew: false, _id: res.data?.data?.id };
                        return { rows };
                    });
                }
            } else {
                const errMsg = res?.data?.non_field_errors?.[0]
                    || res?.data?.detail
                    || (typeof res?.data === 'string' ? res.data : 'Failed to save. Please try again.');
                Swal.fire({ icon: 'error', text: errMsg });
            }
        }).catch(() => {
            this.setState((prev) => {
                const rows = [...prev.rows];
                rows[idx] = { ...rows[idx], _saving: false };
                return { rows };
            });
            Swal.fire({ icon: 'error', text: 'Network error. Please try again.' });
        });
    };

    // ─── Save All ───────────────────────────────────────
    saveAll = async () => {
        const { rows } = this.state;
        // Validate all rows first
        for (let i = 0; i < rows.length; i++) {
            if (!this.validateRow(rows[i], i)) return;
        }

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row._isNew && !row._id) continue; // already saved row without edit

            this.setState((prev) => {
                const rs = [...prev.rows];
                rs[i] = { ...rs[i], _saving: true };
                return { rows: rs };
            });

            const payload = {
                staff: row.staff.id,
                salary: Number(row.salary),
                from_date: row.from_date,
                comments: row.comments || '',
            };

            try {
                const isEdit = !row._isNew && row._id;
                const res = isEdit
                    ? await putRequest(`${PUT_URL.staffsalary.api}${row._id}/`, payload, this.props)
                    : await postRequest(POST_URL.staffsalary.api, payload, this.props);

                if (res && res.status === 200) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }

            this.setState((prev) => {
                const rs = [...prev.rows];
                rs[i] = { ...rs[i], _saving: false };
                return { rows: rs };
            });
        }

        if (failCount === 0) {
            Swal.fire({
                position: 'top-end',
                type: 'success',
                title: `${successCount} salary record(s) saved!`,
                showConfirmButton: false,
                timer: 1500,
            });
            this.props.history.push(Actions.payroll_staffsalary.view.url);
        } else {
            Swal.fire({
                icon: 'warning',
                text: `${successCount} saved, ${failCount} failed. Please review and retry.`,
            });
        }
    };

    viewPage = () => {
        this.props.history.push(Actions.payroll_staffsalary.view.url);
    };

    render() {
        const { loading, staffList, rows, isEditMode } = this.state;

        if (loading) return <LoadingGif />;

        return (
            <Box>
                <Paper className="paper-background">
                    {/* ─── Header ─── */}
                    <Grid container>
                        <Grid item md={8} xs={12} className="header-align">
                            <Box className="heading">
                                {isEditMode ? 'Edit Staff Salary' : 'Add Staff Salary'}
                            </Box>
                            <Box className="sub-heading">
                                {isEditMode
                                    ? 'Update salary details for the staff member below.'
                                    : 'Add salary for one or more staff members. Click + Add Row to add more.'}
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12} className="header-align">
                            <Box className="header-align end-flex-prop">
                                <Button
                                    variant="container"
                                    onClick={this.viewPage}
                                    className="editbutton-view"
                                >
                                    <VisibilityOutlinedIcon className="visibility-icon" />
                                    View Staff Salary
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* ─── Table ─── */}
                    <Paper className="header-align border-position" style={{ marginTop: 16 }}>
                        <TableContainer>
                            <Table size="small" className="salary-formula-table">
                                <TableHead>
                                    <TableRow className="salary-formula-table-header">
                                        <TableCell className="salary-formula-header-cell" style={{ width: 50 }}>#</TableCell>
                                        <TableCell className="salary-formula-header-cell" style={{ minWidth: 250 }}>Staff *</TableCell>
                                        <TableCell className="salary-formula-header-cell" style={{ minWidth: 150 }}>Salary (Annual CTC) *</TableCell>
                                        <TableCell className="salary-formula-header-cell" style={{ minWidth: 150 }}>From Date *</TableCell>
                                        <TableCell className="salary-formula-header-cell" style={{ minWidth: 180 }}>Comments</TableCell>
                                        {!isEditMode && rows.length > 1 && (
                                            <TableCell className="salary-formula-header-cell" align="center" style={{ width: 50 }}></TableCell>
                                        )}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row, idx) => (
                                        <TableRow key={idx} className="salary-formula-data-row">
                                            <TableCell className="salary-formula-cell" style={{ fontWeight: 600, color: '#555' }}>
                                                {idx + 1}
                                            </TableCell>

                                            {/* Staff */}
                                            <TableCell className="salary-formula-cell">
                                                {isEditMode ? (
                                                    <TextField
                                                        variant="outlined"
                                                        size="small"
                                                        value={row.staff_name || ''}
                                                        disabled
                                                        fullWidth
                                                        inputProps={{ style: { padding: '8px 12px' } }}
                                                    />
                                                ) : (
                                                    <Autocomplete
                                                        options={staffList}
                                                        getOptionLabel={(option) =>
                                                            option ? `${option.first_name || ''} ${option.last_name || ''}`.trim() || option.username || '' : ''
                                                        }
                                                        value={row.staff}
                                                        onChange={this.handleStaffChange(idx)}
                                                        renderInput={(params) => (
                                                            <TextField
                                                                {...params}
                                                                variant="outlined"
                                                                size="small"
                                                                placeholder="Select Staff"
                                                            />
                                                        )}
                                                        disableClearable={false}
                                                        size="small"
                                                    />
                                                )}
                                            </TableCell>

                                            {/* Salary */}
                                            <TableCell className="salary-formula-cell">
                                                <TextField
                                                    variant="outlined"
                                                    size="small"
                                                    type="number"
                                                    placeholder="e.g. 600000"
                                                    value={row.salary}
                                                    onChange={this.handleFieldChange(idx, 'salary')}
                                                    fullWidth
                                                    inputProps={{ min: 0, style: { padding: '8px 12px' } }}
                                                />
                                            </TableCell>

                                            {/* From Date */}
                                            <TableCell className="salary-formula-cell">
                                                <TextField
                                                    variant="outlined"
                                                    size="small"
                                                    type="date"
                                                    value={row.from_date}
                                                    onChange={this.handleFieldChange(idx, 'from_date')}
                                                    fullWidth
                                                    InputLabelProps={{ shrink: true }}
                                                    inputProps={{ style: { padding: '8px 12px' } }}
                                                />
                                            </TableCell>

                                            {/* Comments */}
                                            <TableCell className="salary-formula-cell">
                                                <TextField
                                                    variant="outlined"
                                                    size="small"
                                                    placeholder="Optional"
                                                    value={row.comments}
                                                    onChange={this.handleFieldChange(idx, 'comments')}
                                                    fullWidth
                                                    inputProps={{ style: { padding: '8px 12px' } }}
                                                />
                                            </TableCell>

                                            {/* Remove row button (add mode only, multiple rows) */}
                                            {!isEditMode && rows.length > 1 && (
                                                <TableCell className="salary-formula-cell" align="center">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => this.removeRow(idx)}
                                                        style={{ color: '#f44336' }}
                                                    >
                                                        <CancelIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Add Row Button */}
                        {!isEditMode && (
                            <Box p={2}>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                    onClick={this.addRow}
                                    startIcon={<AddCircleOutlineIcon />}
                                    style={{ borderRadius: 20 }}
                                >
                                    Add Row
                                </Button>
                            </Box>
                        )}
                    </Paper>

                    {/* ─── Submit All Button ─── */}
                    <Box className="submt-button-float-bottom" mt={3}>
                        <Button
                            variant="contained"
                            color="primary"
                            className="submit"
                            onClick={this.saveAll}
                        >
                            {isEditMode ? 'Update' : 'Submit'}
                        </Button>
                    </Box>
                </Paper>
            </Box>
        );
    }
}

export default withRouter(AddStaffSalary);
