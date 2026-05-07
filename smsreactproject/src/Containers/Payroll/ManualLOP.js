import React, { Component } from 'react'
import {
    Paper, Box, Button, Grid, TextField, Typography, CircularProgress,
    Table, TableHead, TableRow, TableCell, TableBody, Chip
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getRequest, postRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';
import LoadingGif from 'Components/LoadingGif';
import { SUCCESS_MSG_PROPS } from 'Constants';

// Get the max allowed month (previous month in YYYY-MM format)
function getMaxMonth() {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = prev.getFullYear();
    const month = String(prev.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function getPreviousMonth() {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = prev.getFullYear();
    const month = String(prev.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

class ManualLOP extends Component {

    constructor() {
        super();
        this.state = {
            salaryMonth: getPreviousMonth(),
            records: [],
            loading: false,
            saving: false,
            editedRecords: {},
            noPlans: false,
            hasStaffAttendance: false,
        };
    }

    formatMonthToDate = (monthStr) => {
        return monthStr + '-01';
    }

    loadData = () => {
        const { salaryMonth } = this.state;
        if (!salaryMonth) return;

        this.setState({ loading: true, noPlans: false });

        // POST auto-creates records for staff with salary plans if not exist, then returns all
        postRequest(POST_URL.staffmanualattendance.api, {
            salary_month: this.formatMonthToDate(salaryMonth),
        }, this.props).then(response => {
            if (response && response.status === 200) {
                const data = response.data || {};
                const records = data.data || [];
                const recordList = Array.isArray(records) ? records : [];
                this.setState({
                    records: recordList,
                    loading: false,
                    editedRecords: {},
                    noPlans: recordList.length === 0,
                    hasStaffAttendance: data.has_staff_attendance || false,
                });
            } else {
                this.setState({ loading: false, records: [], noPlans: true });
            }
        }).catch((err) => {
            const detail = err?.response?.data?.detail || err?.response?.data?.[0] || '';
            this.setState({ loading: false, records: [], noPlans: true });
            if (detail && detail.includes('past months')) {
                Swal.fire({ icon: 'warning', title: 'Month Not Allowed', text: detail });
            }
        });
    }

    handleMonthChange = (e) => {
        const value = e.target.value;
        const maxMonth = getMaxMonth();
        if (value > maxMonth) {
            Swal.fire({
                icon: 'warning',
                title: 'Month Not Allowed',
                text: 'Attendance can only be marked for past months. Current and future months are not allowed.',
            });
            return;
        }
        this.setState({ salaryMonth: value, records: [], editedRecords: {} }, () => {
            this.loadData();
        });
    }

    handlePresentDaysChange = (recordId, value) => {
        this.setState(prev => ({
            editedRecords: {
                ...prev.editedRecords,
                [recordId]: value,
            }
        }));
    }

    handleSubmit = () => {
        const { editedRecords, records, hasStaffAttendance } = this.state;
        const updates = Object.entries(editedRecords).map(([id, present_days]) => ({
            id: parseInt(id),
            present_days: parseFloat(present_days),
        })).filter(u => !isNaN(u.present_days));

        if (updates.length === 0) {
            Swal.fire({ icon: 'info', title: 'No changes to save' });
            return;
        }

        const hasOverride = updates.some(u => {
            const rec = records.find(r => r.id === u.id);
            return rec && rec.attendance_source === 'staff_attendance';
        });

        if (hasOverride || hasStaffAttendance) {
            Swal.fire({
                icon: 'warning',
                title: 'Override Staff Attendance?',
                text: 'Staff attendance is already marked from the Staff Attendance module. Do you want to override with manual values?',
                showCancelButton: true,
                confirmButtonText: 'Yes, Override',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#d32f2f',
            }).then(result => {
                if (result.value) {
                    this.doSubmit(updates);
                }
            });
        } else {
            this.doSubmit(updates);
        }
    }

    doSubmit = (updates) => {
        this.setState({ saving: true });

        putRequest(PUT_URL.staffmanualattendance.api + `1/?is_bulk=true`, {
            updates: updates,
        }, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({ saving: false, editedRecords: {} });
                Swal.fire({ ...SUCCESS_MSG_PROPS, title: response.data?.Reason || 'Saved!' });
                this.loadData();
            } else {
                this.setState({ saving: false });
                Swal.fire({ icon: 'error', title: 'Error saving' });
            }
        }).catch(err => {
            this.setState({ saving: false });
            Swal.fire({ icon: 'error', title: 'Error saving', text: err?.response?.data?.detail || 'Something went wrong' });
        });
    }

    componentDidMount() {
        this.loadData();
    }

    getStatusChip = (source) => {
        switch (source) {
            case 'manual':
                return <Chip size="small" label="Manual" style={{ backgroundColor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }} />;
            case 'staff_attendance':
                return <Chip size="small" label="Staff Attendance" style={{ backgroundColor: '#fff3e0', color: '#e65100', fontWeight: 600 }} />;
            default:
                return <Chip size="small" label="Not Marked" style={{ backgroundColor: '#ffebee', color: '#c62828', fontWeight: 600 }} />;
        }
    }

    render() {
        const { salaryMonth, records, loading, saving, editedRecords, noPlans } = this.state;
        const hasChanges = Object.keys(editedRecords).length > 0;
        const maxMonth = getMaxMonth();

        return (
            <Paper style={{ padding: 24 }}>
                <Typography variant="h5" gutterBottom>
                    Manual Attendance
                </Typography>

                <Grid container spacing={2} alignItems="center" style={{ marginBottom: 16 }}>
                    <Grid item>
                        <TextField
                            label="Select Month"
                            type="month"
                            value={salaryMonth}
                            onChange={this.handleMonthChange}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ max: maxMonth }}
                            variant="outlined"
                            size="small"
                        />
                    </Grid>
                    {hasChanges && (
                        <Grid item>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={this.handleSubmit}
                                disabled={saving}
                                style={{ fontWeight: 600 }}
                            >
                                {saving ? <CircularProgress size={20} /> : `Submit (${Object.keys(editedRecords).length})`}
                            </Button>
                        </Grid>
                    )}
                </Grid>

                {loading ? (
                    <LoadingGif />
                ) : noPlans ? (
                    <Box py={4} textAlign="center">
                        <Typography color="textSecondary">
                            No staff salary plan found. Please generate salary plans first.
                        </Typography>
                    </Box>
                ) : records.length === 0 ? (
                    <Box py={4} textAlign="center">
                        <Typography color="textSecondary">
                            Select a month to view attendance records.
                        </Typography>
                    </Box>
                ) : (
                    <Box style={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell style={{ fontWeight: 'bold' }}>#</TableCell>
                                    <TableCell style={{ fontWeight: 'bold' }}>Staff Name</TableCell>
                                    <TableCell style={{ fontWeight: 'bold', textAlign: 'center' }}>Status</TableCell>
                                    <TableCell style={{ fontWeight: 'bold', textAlign: 'center' }}>Working Days</TableCell>
                                    <TableCell style={{ fontWeight: 'bold', textAlign: 'center' }}>Present Days</TableCell>
                                    <TableCell style={{ fontWeight: 'bold', textAlign: 'center' }}>Absent Days</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {records.map((record, index) => {
                                    const editedVal = editedRecords[record.id];
                                    const presentDays = editedVal !== undefined ? parseFloat(editedVal) : record.present_days;
                                    const absentDays = Math.max(0, record.working_days - (isNaN(presentDays) ? 0 : presentDays));
                                    return (
                                        <TableRow key={record.id} style={editedVal !== undefined ? { backgroundColor: '#fff8e1' } : {}}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{record.staff_name}</TableCell>
                                            <TableCell style={{ textAlign: 'center' }}>
                                                {this.getStatusChip(record.attendance_source)}
                                            </TableCell>
                                            <TableCell style={{ textAlign: 'center' }}>
                                                {record.working_days}
                                            </TableCell>
                                            <TableCell style={{ textAlign: 'center' }}>
                                                <TextField
                                                    type="number"
                                                    value={editedVal !== undefined ? editedVal : record.present_days}
                                                    onChange={(e) => this.handlePresentDaysChange(record.id, e.target.value)}
                                                    inputProps={{ min: 0, max: record.working_days, step: 0.5 }}
                                                    variant="outlined"
                                                    size="small"
                                                    style={{ width: 80 }}
                                                />
                                            </TableCell>
                                            <TableCell style={{
                                                textAlign: 'center',
                                                color: absentDays > 0 ? '#d32f2f' : '#2e7d32',
                                                fontWeight: 'bold'
                                            }}>
                                                {absentDays}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Paper>
        );
    }
}

export default withRouter(ManualLOP);
