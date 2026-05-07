import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import {
    Paper,
    Box,
    Grid,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    CircularProgress,
    TextField,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Chip,
    IconButton,
    Tooltip,
    Tabs,
    Tab,
    InputAdornment,
    Menu,
    ListItemIcon,
    ListItemText,
    Checkbox
} from '@material-ui/core';
import CalendarTodayIcon from '@material-ui/icons/CalendarToday';
import PersonIcon from '@material-ui/icons/Person';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import AccessTimeIcon from '@material-ui/icons/AccessTime';
import SaveIcon from '@material-ui/icons/Save';
import LockIcon from '@material-ui/icons/Lock';
import EditIcon from '@material-ui/icons/Edit';
import CloseIcon from '@material-ui/icons/Close';
import WarningIcon from '@material-ui/icons/Warning';
import SearchIcon from '@material-ui/icons/Search';
import ClearIcon from '@material-ui/icons/Clear';
import SortIcon from '@material-ui/icons/Sort';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import InfiniteScroll from 'react-infinite-scroller';

import { getRequest, postRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';
import LoadingGif from 'Components/LoadingGif';
import SummaryCard from '../Finance/Components/SummaryCard';
import Swal from 'sweetalert2';

import './styles.scss';

const DEBOUNCE_DELAY = 500;

const CATEGORY_TABS = [
    { value: '', label: 'All' },
    { value: 'SCHOOL', label: 'School' },
    { value: 'PU_COLLEGE', label: 'PU College' },
    { value: 'DEGREE_COLLEGE', label: 'Degree' },
    { value: 'MCOM', label: 'M.Com' },
];

class MonthlyAttendance extends Component {
    constructor(props) {
        super(props);
        const currentDate = new Date();
        const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        this.state = {
            month: prevMonth.getMonth() + 1,
            year: prevMonth.getFullYear(),
            attendanceData: [],
            loading: true,
            tableUpdating: false,
            initializing: false,
            generating: false,
            hasMore: true,
            page: 1,
            totalCount: 0,
            workingDays: 0,
            salaryAlreadyGenerated: false,
            editingId: null,
            editingValue: null,
            savingId: null,
            isFetchingMore: false,
            confirmDialogOpen: false,
            confirmDialogType: null,

            activeTab: 0,
            categoryFilter: '',
            searchTerm: '',
            presentDaysMin: '',
            presentDaysMax: '',
            ordering: 'staff_name',
            sortAnchorEl: null,

            bulkEditMode: false,
            bulkValues: {},
            bulkApplyValue: '',
            bulkUpdating: false,
        };
        this.searchDebounceTimer = null;
    }

    componentDidMount() {
        this.fetchAttendance(true);
    }

    getMonthOptions = () => {
        return [
            { value: 1, label: 'January' },
            { value: 2, label: 'February' },
            { value: 3, label: 'March' },
            { value: 4, label: 'April' },
            { value: 5, label: 'May' },
            { value: 6, label: 'June' },
            { value: 7, label: 'July' },
            { value: 8, label: 'August' },
            { value: 9, label: 'September' },
            { value: 10, label: 'October' },
            { value: 11, label: 'November' },
            { value: 12, label: 'December' },
        ];
    };

    getYearOptions = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let y = currentYear - 2; y <= currentYear + 1; y++) {
            years.push({ value: y, label: y.toString() });
        }
        return years;
    };

    getMonthName = (month) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1] || '';
    };

    fetchAttendance = (reset = false) => {
        const { month, year, isFetchingMore, categoryFilter, searchTerm, presentDaysMin, presentDaysMax, ordering } = this.state;

        if (!month || !year) {
            Swal.fire('Warning', 'Please select month and year', 'warning');
            return;
        }

        if (!reset && isFetchingMore) return;

        if (reset) {
            this.setState({
                tableUpdating: true,
                attendanceData: [],
                page: 1,
                hasMore: true
            });
        } else {
            this.setState({ isFetchingMore: true });
        }

        const page = reset ? 1 : this.state.page;
        const params = {
            month,
            year,
            pageno: page,
            limit: 10,
        };

        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (categoryFilter) params.staff_category = categoryFilter;
        if (presentDaysMin) params.present_days_min = presentDaysMin;
        if (presentDaysMax) params.present_days_max = presentDaysMax;
        if (ordering) params.ordering = ordering;

        getRequest(GET_URL.staffmonthlyattendance.api, params, this.props)
            .then((response) => {
                if (response && response.data && response.data.data) {
                    const responseData = response.data.data;
                    const newData = responseData.data_list || [];
                    const attendanceData = reset ? newData : [...this.state.attendanceData, ...newData];
                    const hasMore = !!responseData.next;

                    this.setState({
                        attendanceData,
                        loading: false,
                        tableUpdating: false,
                        isFetchingMore: false,
                        hasMore,
                        page: page + 1,
                        totalCount: responseData.count || attendanceData.length,
                        workingDays: responseData.working_days || (attendanceData[0]?.working_days || 0),
                        salaryAlreadyGenerated: attendanceData.some(a => a.is_finalized),
                    });
                } else {
                    this.setState({ loading: false, tableUpdating: false, isFetchingMore: false, hasMore: false });
                }
            })
            .catch((error) => {
                Swal.fire('Error', error?.message || 'Failed to fetch attendance', 'error');
                this.setState({ loading: false, tableUpdating: false, isFetchingMore: false, hasMore: false });
            });
    };

    handleMonthChange = (e) => {
        this.setState({ month: e.target.value, attendanceData: [], page: 1, hasMore: true }, () => {
            this.fetchAttendance(true);
        });
    };

    handleYearChange = (e) => {
        this.setState({ year: e.target.value, attendanceData: [], page: 1, hasMore: true }, () => {
            this.fetchAttendance(true);
        });
    };

    openConfirmDialog = (type) => {
        this.setState({ confirmDialogOpen: true, confirmDialogType: type });
    };

    closeConfirmDialog = () => {
        this.setState({ confirmDialogOpen: false, confirmDialogType: null });
    };

    handleConfirm = () => {
        const { confirmDialogType } = this.state;
        this.closeConfirmDialog();

        if (confirmDialogType === 'initialize') {
            this.doInitializeAttendance();
        } else if (confirmDialogType === 'generate') {
            this.doGenerateSalary();
        }
    };

    doInitializeAttendance = () => {
        const { month, year } = this.state;

        this.setState({ initializing: true });

        const data = { month, year };
        postRequest(POST_URL.staffmonthlyattendance.api, data, this.props)
            .then((response) => {
                this.setState({ initializing: false });
                if (response?.status === 200) {
                    Swal.fire('Success', response?.data?.Reason || 'Attendance initialized successfully', 'success');
                    this.fetchAttendance(true);
                }
            })
            .catch((error) => {
                this.setState({ initializing: false });
                Swal.fire('Error', error?.message || 'Failed to initialize attendance', 'error');
            });
    };

    doGenerateSalary = () => {
        const { month, year } = this.state;

        this.setState({ generating: true });

        const data = { month, year };
        postRequest(GET_URL.generatestaffsalary.api, data, this.props)
            .then((response) => {
                this.setState({ generating: false, salaryAlreadyGenerated: true });
                if (response?.status === 200) {
                    Swal.fire('Success', response?.data?.Reason || 'Salary generated successfully', 'success');
                    this.fetchAttendance(true);
                }
            })
            .catch((error) => {
                this.setState({ generating: false });
                Swal.fire('Error', error?.message || 'Failed to generate salary', 'error');
            });
    };

    startEditing = (record) => {
        if (record.is_finalized) {
            Swal.fire('Warning', 'Cannot edit finalized attendance', 'warning');
            return;
        }
        this.setState({
            editingId: record.id,
            editingValue: record.present_days,
        });
    };

    cancelEditing = () => {
        this.setState({ editingId: null, editingValue: null });
    };

    handlePresentDaysChange = (e) => {
        this.setState({ editingValue: parseInt(e.target.value) || 0 });
    };

    saveAttendance = (record) => {
        const { editingValue } = this.state;

        if (editingValue === null || editingValue === record.present_days) {
            this.cancelEditing();
            return;
        }

        if (editingValue < 0 || editingValue > record.working_days) {
            Swal.fire('Warning', `Present days must be between 0 and ${record.working_days}`, 'warning');
            return;
        }

        this.setState({ savingId: record.id });

        const url = `${PUT_URL.staffmonthlyattendance.api}${record.id}/`;

        const data = {
            salary_setup: record.salary_setup?.id || record.salary_setup,
            staff_name: record.staff_name,
            year: record.year,
            month: record.month,
            working_days: record.working_days,
            present_days: editingValue,
            is_finalized: record.is_finalized || false
        };

        putRequest(url, data, this.props)
            .then((response) => {
                this.setState({ savingId: null, editingId: null, editingValue: null });
                Swal.fire('Success', 'Attendance updated successfully', 'success');

                const updatedData = this.state.attendanceData.map(item => {
                    if (item.id === record.id) {
                        return { ...item, present_days: editingValue };
                    }
                    return item;
                });
                this.setState({ attendanceData: updatedData });
            })
            .catch((error) => {
                this.setState({ savingId: null });
                Swal.fire('Error', error?.message || 'Failed to update attendance', 'error');
            });
    };

    handleTabChange = (event, newValue) => {
        const category = CATEGORY_TABS[newValue]?.value || '';
        this.setState({
            activeTab: newValue,
            categoryFilter: category,
            attendanceData: [],
            page: 1,
            hasMore: true
        }, () => this.fetchAttendance(true));
    };

    handleSearchChange = (e) => {
        const value = e.target.value;
        this.setState({ searchTerm: value });

        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        this.searchDebounceTimer = setTimeout(() => {
            this.setState({ attendanceData: [], page: 1, hasMore: true }, () => this.fetchAttendance(true));
        }, DEBOUNCE_DELAY);
    };

    clearSearch = () => {
        this.setState({ searchTerm: '', attendanceData: [], page: 1, hasMore: true }, () => this.fetchAttendance(true));
    };

    handlePresentDaysMinChange = (e) => {
        this.setState({ presentDaysMin: e.target.value });
    };

    handlePresentDaysMaxChange = (e) => {
        this.setState({ presentDaysMax: e.target.value });
    };

    applyPresentDaysRange = () => {
        this.setState({ attendanceData: [], page: 1, hasMore: true }, () => this.fetchAttendance(true));
    };

    clearFilters = () => {
        this.setState({
            searchTerm: '',
            presentDaysMin: '',
            presentDaysMax: '',
            ordering: 'staff_name',
            attendanceData: [],
            page: 1,
            hasMore: true
        }, () => this.fetchAttendance(true));
    };

    // Sort By menu handlers
    handleSortMenuOpen = (event) => {
        this.setState({ sortAnchorEl: event.currentTarget });
    };

    handleSortMenuClose = () => {
        this.setState({ sortAnchorEl: null });
    };

    handleSortChange = (ordering) => {
        this.setState({
            ordering,
            sortAnchorEl: null,
            attendanceData: [],
            page: 1,
            hasMore: true
        }, () => this.fetchAttendance(true));
    };

    getSortLabel = () => {
        const { ordering } = this.state;
        const labels = {
            'staff_name': 'Name (A-Z)',
            '-staff_name': 'Name (Z-A)',
            'present_days': 'Present (Low→High)',
            '-present_days': 'Present (High→Low)',
        };
        return labels[ordering] || 'Sort';
    };

    // Bulk edit handlers
    toggleBulkEditMode = () => {
        const { bulkEditMode, attendanceData } = this.state;
        if (!bulkEditMode) {
            // Initialize bulk values
            const initialValues = {};
            attendanceData.forEach(item => {
                if (!item.is_finalized) {
                    initialValues[item.id] = item.present_days;
                }
            });
            this.setState({
                bulkEditMode: true,
                bulkValues: initialValues,
            });
        } else {
            // Cancel
            this.setState({
                bulkEditMode: false,
                bulkValues: {},
            });
        }
    };

    handleBulkChange = (id, value) => {
        this.setState(prev => ({
            bulkValues: {
                ...prev.bulkValues,
                [id]: value
            }
        }));
    };

    handleBulkUpdate = () => {
        const { bulkValues, attendanceData } = this.state;

        // Prepare updates
        const updates = [];
        for (const [id, val] of Object.entries(bulkValues)) {
            const original = attendanceData.find(i => i.id === parseInt(id));
            if (!original) continue;

            // Basic validation
            let presentDays = parseInt(val);
            if (isNaN(presentDays)) presentDays = 0; // or handle empty as 0

            if (presentDays < 0 || presentDays > original.working_days) {
                Swal.fire('Warning', `Invalid present days for ${original.staff_name}. Max allowed: ${original.working_days}`, 'warning');
                return;
            }
            updates.push({ id: parseInt(id), present_days: presentDays });
        }

        if (updates.length === 0) {
            this.toggleBulkEditMode();
            return;
        }

        this.setState({ bulkUpdating: true });
        const url = `${PUT_URL.staffmonthlyattendance.api}0/?is_bulk=true`;

        putRequest(url, { updates }, this.props)
            .then(response => {
                this.setState({ bulkUpdating: false });
                if (response?.status === 200) {
                    Swal.fire('Success', response.data?.Reason || 'Attendance updated successfully', 'success');
                    this.setState({ bulkEditMode: false, bulkValues: {} });
                    this.fetchAttendance(true);
                }
            })
            .catch(error => {
                this.setState({ bulkUpdating: false });
                Swal.fire('Error', error?.response?.data?.detail || error?.message || 'Failed to update', 'error');
            });
    };

    renderSummaryCards = () => {
        const { attendanceData, workingDays, salaryAlreadyGenerated, totalCount } = this.state;
        const totalPresentDays = attendanceData.reduce((sum, a) => sum + (a.present_days || 0), 0);

        const cards = [
            { label: 'Total Staff', value: totalCount, color: '#2196F3' },
            { label: 'Working Days', value: workingDays, color: '#4CAF50' },
            { label: 'Total Present Days', value: totalPresentDays, color: '#4CAF50' },
            { label: 'Status', value: salaryAlreadyGenerated ? 'Finalized' : 'Pending', color: salaryAlreadyGenerated ? '#f44336' : '#FF9800' },
        ];

        return (
            <Grid container spacing={2} style={{ marginBottom: 24 }}>
                {cards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <SummaryCard
                            label={card.label}
                            value={card.value}
                            color={card.color}
                        />
                    </Grid>
                ))}
            </Grid>
        );
    };

    renderTable = () => {
        const { editingId, editingValue, savingId, salaryAlreadyGenerated, attendanceData, bulkEditMode, bulkValues } = this.state;

        return (
            <div style={{ overflowX: 'auto' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: '#fff', width: 50 }}>#</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: '#fff' }}>Staff Name</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: '#fff', width: 120 }} align="center">Working Days</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: '#fff', width: 180 }} align="center">Present Days</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: '#fff', width: 100 }} align="center">Absent Days</TableCell>
                            <TableCell style={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: '#fff', width: 120 }} align="center">Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {attendanceData.map((item, index) => {
                            const isEditing = editingId === item.id;

                            // Determine display value for Absent Days:
                            // If bulk editing, calculate dynamically from input. 
                            // Else use stored values.
                            let presentDaysVal = item.present_days;
                            if (bulkEditMode && !item.is_finalized && bulkValues[item.id] !== undefined) {
                                presentDaysVal = parseInt(bulkValues[item.id]) || 0;
                            }
                            const absentDays = item.working_days - presentDaysVal;

                            return (
                                <TableRow key={item.id} hover>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{item.staff_name}</TableCell>
                                    <TableCell align="center">{item.working_days}</TableCell>
                                    <TableCell align="center">
                                        {bulkEditMode && !item.is_finalized ? (
                                            <TextField
                                                type="number"
                                                size="small"
                                                variant="outlined"
                                                value={bulkValues[item.id] !== undefined ? bulkValues[item.id] : ''}
                                                onChange={(e) => this.handleBulkChange(item.id, e.target.value)}
                                                inputProps={{ min: 0, max: item.working_days }}
                                                style={{ width: 80 }}
                                            />
                                        ) : isEditing ? (
                                            <Box display="flex" alignItems="center" justifyContent="center">
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    variant="outlined"
                                                    value={editingValue}
                                                    onChange={this.handlePresentDaysChange}
                                                    inputProps={{ min: 0, max: item.working_days }}
                                                    style={{ width: 70, marginRight: 8 }}
                                                    autoFocus
                                                />
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => this.saveAttendance(item)}
                                                    disabled={savingId === item.id}
                                                >
                                                    {savingId === item.id ? <CircularProgress size={16} /> : <SaveIcon />}
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={this.cancelEditing}
                                                >
                                                    <CloseIcon />
                                                </IconButton>
                                            </Box>
                                        ) : (
                                            <Tooltip title={item.is_finalized ? 'Finalized - Cannot edit' : 'Click to edit'}>
                                                <span
                                                    style={{
                                                        cursor: item.is_finalized || bulkEditMode ? 'default' : 'pointer', // Disable click when bulk mode is on
                                                        color: item.is_finalized ? '#999' : '#1976d2',
                                                        textDecoration: item.is_finalized || bulkEditMode ? 'none' : 'underline',
                                                        display: 'inline-flex',
                                                        alignItems: 'center'
                                                    }}
                                                    onClick={() => !item.is_finalized && !bulkEditMode && this.startEditing(item)}
                                                >
                                                    {item.present_days}
                                                    {!item.is_finalized && !bulkEditMode && <EditIcon fontSize="small" style={{ marginLeft: 4, fontSize: 14 }} />}
                                                </span>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={absentDays}
                                            size="small"
                                            style={{
                                                backgroundColor: absentDays > 0 ? '#f44336' : '#4CAF50',
                                                color: '#fff'
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        {item.is_finalized ? (
                                            <Chip
                                                icon={<LockIcon style={{ color: '#fff', fontSize: 14 }} />}
                                                label="Finalized"
                                                size="small"
                                                style={{ backgroundColor: '#757575', color: '#fff' }}
                                            />
                                        ) : (
                                            <Chip
                                                label="Editable"
                                                size="small"
                                                color="primary"
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    };

    renderConfirmDialog = () => {
        const { confirmDialogOpen, confirmDialogType, month, year, attendanceData } = this.state;

        let title = '';
        let content = '';

        if (confirmDialogType === 'initialize') {
            title = 'Initialize Attendance?';
            content = `This will create attendance records for all active staff for ${this.getMonthName(month)} ${year}. Present days will default to working days.`;
        } else if (confirmDialogType === 'generate') {
            title = 'Generate Salary?';
            content = `This will generate salary for ${attendanceData.length} staff members for ${this.getMonthName(month)} ${year}. Once generated, attendance cannot be edited.`;
        }

        return (
            <Dialog open={confirmDialogOpen} onClose={this.closeConfirmDialog}>
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{content}</DialogContentText>
                    {confirmDialogType === 'generate' && (
                        <Box mt={2} p={1} style={{ backgroundColor: '#fff3e0', borderRadius: 4 }}>
                            <Typography variant="body2" style={{ color: '#e65100', display: 'flex', alignItems: 'center' }}>
                                <WarningIcon style={{ marginRight: 8 }} />
                                Attendance will be finalized and cannot be edited after salary generation.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.closeConfirmDialog}>Cancel</Button>
                    <Button
                        onClick={this.handleConfirm}
                        color={confirmDialogType === 'generate' ? 'secondary' : 'primary'}
                        variant="contained"
                    >
                        {confirmDialogType === 'initialize' ? 'Initialize' : 'Generate Salary'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };



    handleBulkApplyChange = (e) => {
        this.setState({ bulkApplyValue: e.target.value });
    };

    applyBulkValueToAll = () => {
        const { bulkApplyValue, attendanceData } = this.state;
        const val = parseInt(bulkApplyValue);

        if (isNaN(val)) return;

        const newBulkValues = {};
        attendanceData.forEach(item => {
            if (!item.is_finalized) {
                // Clamp value to working days to prevent errors
                newBulkValues[item.id] = Math.min(val, item.working_days);
            }
        });

        this.setState({ bulkValues: newBulkValues });
    };

    render() {
        const {
            month,
            year,
            attendanceData,
            loading,
            tableUpdating,
            initializing,
            generating,
            hasMore,
            salaryAlreadyGenerated,
            isFetchingMore,
            totalCount
        } = this.state;

        if (loading) {
            return <LoadingGif />;
        }

        return (
            <Fragment>
                <Paper className="payroll-monthly-table">
                    <Box p={3}>
                        <Grid container spacing={2} alignItems="center" style={{ marginBottom: 24 }}>
                            <Grid item xs={12} md={4}>
                                <Typography variant="h5" style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                    <CalendarTodayIcon style={{ marginRight: 8 }} />
                                    Staff Monthly Attendance
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Month"
                                    value={month}
                                    onChange={this.handleMonthChange}
                                    variant="outlined"
                                    size="small"
                                >
                                    {this.getMonthOptions().map(opt => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Year"
                                    value={year}
                                    onChange={this.handleYearChange}
                                    variant="outlined"
                                    size="small"
                                >
                                    {this.getYearOptions().map(opt => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="primary"
                                    startIcon={initializing ? <CircularProgress size={16} color="inherit" /> : <CalendarTodayIcon />}
                                    onClick={() => this.openConfirmDialog('initialize')}
                                    disabled={initializing || salaryAlreadyGenerated}
                                >
                                    Initialize
                                </Button>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="secondary"
                                    startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                                    onClick={() => this.openConfirmDialog('generate')}
                                    disabled={generating || attendanceData.length === 0 || salaryAlreadyGenerated}
                                >
                                    Generate Salary
                                </Button>
                            </Grid>
                        </Grid>

                        {salaryAlreadyGenerated && (
                            <Box mb={2} p={2} style={{ backgroundColor: '#e3f2fd', borderRadius: 4, border: '1px solid #1976d2' }}>
                                <Typography style={{ display: 'flex', alignItems: 'center', color: '#1565c0' }}>
                                    <LockIcon style={{ marginRight: 8 }} />
                                    Salary Already Generated - Attendance has been finalized for this month. No further edits are allowed.
                                </Typography>
                            </Box>
                        )}

                        {this.renderSummaryCards()}

                        <Box mb={2}>
                            <Tabs
                                value={this.state.activeTab}
                                onChange={this.handleTabChange}
                                indicatorColor="primary"
                                textColor="primary"
                                variant="scrollable"
                                scrollButtons="auto"
                            >
                                {CATEGORY_TABS.map((tab, idx) => (
                                    <Tab key={tab.value} label={tab.label} />
                                ))}
                            </Tabs>
                        </Box>

                        <Grid container spacing={2} style={{ marginBottom: 16 }} alignItems="center">
                            <Grid item xs={12} sm={4} md={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    placeholder="Search by staff name..."
                                    value={this.state.searchTerm}
                                    onChange={this.handleSearchChange}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon color="action" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: this.state.searchTerm && (
                                            <InputAdornment position="end">
                                                <IconButton size="small" onClick={this.clearSearch}>
                                                    <ClearIcon fontSize="small" />
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            </Grid>
                            <Grid item xs={6} sm={3} md={2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    type="number"
                                    placeholder="Min Days"
                                    value={this.state.presentDaysMin}
                                    onChange={this.handlePresentDaysMinChange}
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                            <Grid item xs={6} sm={3} md={2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    type="number"
                                    placeholder="Max Days"
                                    value={this.state.presentDaysMax}
                                    onChange={this.handlePresentDaysMaxChange}
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                            <Grid item xs={6} sm={2} md={1}>
                                <Button
                                    fullWidth
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    onClick={this.applyPresentDaysRange}
                                >
                                    Apply
                                </Button>
                            </Grid>
                            <Grid item xs={6} sm={2} md={2}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<SortIcon />}
                                    onClick={this.handleSortMenuOpen}
                                >
                                    {this.getSortLabel()}
                                </Button>
                                <Menu
                                    anchorEl={this.state.sortAnchorEl}
                                    open={Boolean(this.state.sortAnchorEl)}
                                    onClose={this.handleSortMenuClose}
                                >
                                    <MenuItem onClick={() => this.handleSortChange('staff_name')}>
                                        <ListItemIcon><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText>Name (A-Z)</ListItemText>
                                    </MenuItem>
                                    <MenuItem onClick={() => this.handleSortChange('-staff_name')}>
                                        <ListItemIcon><ArrowDownwardIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText>Name (Z-A)</ListItemText>
                                    </MenuItem>
                                    <MenuItem onClick={() => this.handleSortChange('-present_days')}>
                                        <ListItemIcon><ArrowDownwardIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText>Present (High→Low)</ListItemText>
                                    </MenuItem>
                                    <MenuItem onClick={() => this.handleSortChange('present_days')}>
                                        <ListItemIcon><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText>Present (Low→High)</ListItemText>
                                    </MenuItem>
                                </Menu>
                            </Grid>

                            <Grid item xs={12} sm={4} md={5}>
                                {!this.state.bulkEditMode ? (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        startIcon={<EditIcon />}
                                        onClick={this.toggleBulkEditMode}
                                    >
                                        Bulk Edit
                                    </Button>
                                ) : (
                                    <Box display="flex" alignItems="center">
                                        <Box display="flex" alignItems="center" mr={2} style={{ backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: 4 }}>
                                            <TextField
                                                type="number"
                                                size="small"
                                                variant="outlined"
                                                placeholder="All"
                                                value={this.state.bulkApplyValue}
                                                onChange={this.handleBulkApplyChange}
                                                style={{ width: 80, marginRight: 8, backgroundColor: '#fff' }}
                                                inputProps={{ min: 0 }}
                                            />
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                                onClick={this.applyBulkValueToAll}
                                            >
                                                Apply
                                            </Button>
                                        </Box>

                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="primary"
                                            onClick={this.handleBulkUpdate}
                                            disabled={this.state.bulkUpdating}
                                            style={{ marginRight: 8 }}
                                        >
                                            {this.state.bulkUpdating ? <CircularProgress size={24} color="inherit" /> : 'Save'}
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="secondary"
                                            onClick={this.toggleBulkEditMode}
                                            disabled={this.state.bulkUpdating}
                                        >
                                            Cancel
                                        </Button>
                                    </Box>
                                )}
                            </Grid>
                            {(this.state.searchTerm || this.state.presentDaysMin || this.state.presentDaysMax) && (
                                <Grid item xs={12} sm={2} md={2}>
                                    <Button
                                        size="small"
                                        onClick={this.clearFilters}
                                        startIcon={<ClearIcon />}
                                    >
                                        Clear Filters
                                    </Button>
                                </Grid>
                            )}
                        </Grid>

                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="subtitle1" color="textSecondary">
                                Showing {attendanceData.length} of {totalCount} records
                            </Typography>
                        </Box>

                        {tableUpdating ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : attendanceData.length === 0 ? (
                            <Box textAlign="center" py={4}>
                                <Typography color="textSecondary">
                                    No attendance records. Click "Initialize" to create records for all active staff.
                                </Typography>
                            </Box>
                        ) : (
                            <div style={{ maxHeight: 500, overflow: 'auto' }}>
                                <InfiniteScroll
                                    pageStart={0}
                                    loadMore={() => !isFetchingMore && this.fetchAttendance(false)}
                                    hasMore={hasMore && !isFetchingMore}
                                    useWindow={false}
                                    threshold={100}
                                >
                                    {this.renderTable()}
                                    {isFetchingMore && (
                                        <Box display="flex" justifyContent="center" py={2}>
                                            <CircularProgress size={24} />
                                        </Box>
                                    )}
                                </InfiniteScroll>
                            </div>
                        )}

                        {hasMore && !isFetchingMore && attendanceData.length > 0 && (
                            <Box display="flex" justifyContent="center" mt={2}>
                                <Button
                                    variant="outlined"
                                    onClick={() => this.fetchAttendance(false)}
                                >
                                    Show More
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Paper>

                {this.renderConfirmDialog()}


            </Fragment>
        );
    }
}

const mapStateToProps = (state) => ({
    ...state,
});

export default connect(mapStateToProps)(MonthlyAttendance);
