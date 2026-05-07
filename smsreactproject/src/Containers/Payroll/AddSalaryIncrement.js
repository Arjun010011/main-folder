import React, { Component } from "react";
import {
    Paper, Box, Grid, Button, Avatar,
    Table, TableContainer, TableHead, TableCell,
    TableRow, TableBody, Typography, TextField,
    IconButton, Tooltip, Chip, MenuItem, Select,
    InputLabel, FormControl, Checkbox, FormControlLabel,
    Radio, RadioGroup, CircularProgress, Divider,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import VisibilityOutlined from "@material-ui/icons/VisibilityOutlined";
import DeleteOutlinedIcon from "@material-ui/icons/DeleteOutlined";
import TrendingUpIcon from "@material-ui/icons/TrendingUp";
import TrendingDownIcon from "@material-ui/icons/TrendingDown";
import CardGiftcardIcon from "@material-ui/icons/CardGiftcard";
import CheckBoxOutlineBlankIcon from "@material-ui/icons/CheckBoxOutlineBlank";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import Swal from "sweetalert2";
import classNames from "classnames";
import moment from "moment";
import { getRequest, postRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, DEL_URL } from "Includes/urls";
import {
    getFullName, numberWithCommasWithoutSymbol,
    getFinancialYear, SetFinancialYear,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { Actions } from "Constants/permissions";
import { Dropdown } from "Components/DropDown";
import AllMUIDataTable from "Components/AllMUIDataTable";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import "./styles.scss";

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class AddSalaryIncrement extends Component {
    constructor(props) {
        super(props);
        this.state = {
            // Financial year
            yearList: [],
            year: 0,
            yearName: "",
            // Staff list
            staffList: [],
            staffLoading: false,
            selectedStaff: {}, // { staffId: staffObj }
            selectAll: false,
            // Increment form
            incrementType: "INCREMENT",
            calculationMode: "AMOUNT",
            incrementValue: "",
            effectiveDate: moment().format("YYYY-MM-DD"),
            reason: "",
            bonusName: "",
            submitting: false,
            // History (infinite scroll)
            incrementHistory: [],
            historyLoading: false,
            historyPage: 1,
            historyHasMore: true,
            historyTotal: 0,
            // UI
            loading: true,
            snackOpen: false,
            snackMessage: "",
            snackSeverity: "error",
        };
        this.historyRef = React.createRef();
    }

    componentDidMount() {
        this.getFinancialYear();
    }

    // ─── DATA LOADING ────────────────────────────────────

    getFinancialYear = () => {
        getRequest(GET_URL.getfinancialyear.api, {}, this.props).then((response) => {
            if (response && response.status === 200) {
                const yearList = response.data.data;
                let year = getFinancialYear();
                year = year ? parseInt(year) : 0;
                this.setState({ yearList, year, loading: false }, () => {
                    if (year) this.getStaffList();
                    this.loadIncrementHistory(true);
                });
            }
        });
    };

    onChange = (e) => {
        const { value, name } = e.target;
        if (value) {
            this.setState({ [name]: value }, () => {
                if (name === "year") {
                    SetFinancialYear(value);
                    this.getStaffList();
                }
            });
        }
    };

    getStaffList = () => {
        this.setState({ staffLoading: true, staffList: [], selectedStaff: {}, selectAll: false });
        const { year } = this.state;
        const params = {
            salary_is_approved: "1",
            financial_year: year,
            employee_status: "F",
        };
        getRequest(GET_URL.staff.api, params).then((response) => {
            if (response && response.status === 200) {
                const staffList = response.data.data || [];
                // Fetch all salaries via paginated accumulation (limit: 15)
                this.fetchAllSalaries([], 1).then((salaryData) => {
                    const salaryMap = {};
                    (Array.isArray(salaryData) ? salaryData : []).forEach((s) => {
                        if (!s.to_date && s.staff) {
                            salaryMap[s.staff] = parseFloat(s.salary) || 0;
                        }
                    });
                    const enrichedStaffList = staffList.map((staff) => ({
                        ...staff,
                        salary: salaryMap[staff.id] !== undefined ? salaryMap[staff.id] : (staff.salary || 0),
                    }));
                    this.setState({ staffList: enrichedStaffList, staffLoading: false });
                }).catch(() => {
                    this.setState({ staffList, staffLoading: false });
                });
            }
        });
    };

    fetchAllSalaries = (accumulated, page) => {
        return getRequest(GET_URL.staffsalary.api, { is_active: true, limit: 15, pageno: page }, this.props)
            .then((res) => {
                if (res && res.status === 200) {
                    const resData = res.data?.data || {};
                    const pageData = resData.data_list || (Array.isArray(resData) ? resData : []);
                    const all = [...accumulated, ...pageData];
                    const totalCount = resData.count || pageData.length;
                    if (all.length < totalCount && pageData.length > 0) {
                        return this.fetchAllSalaries(all, page + 1);
                    }
                    return all;
                }
                return accumulated;
            });
    };

    loadIncrementHistory = (reset = false) => {
        if (this.state.historyLoading) return;
        const page = reset ? 1 : this.state.historyPage;
        this.setState({ historyLoading: true });

        const params = { pageno: page, limit: 10 };

        getRequest(GET_URL.salaryincrement.api, params, this.props).then((res) => {
            if (res?.status === 200) {
                const respData = res.data?.data || res.data;
                const results = respData?.results || (Array.isArray(respData) ? respData : []);
                const count = respData?.count || results.length;
                const hasMore = respData?.next ? true : false;

                this.setState((prev) => ({
                    incrementHistory: reset ? results : [...prev.incrementHistory, ...results],
                    historyPage: page + 1,
                    historyHasMore: hasMore,
                    historyTotal: count,
                    historyLoading: false,
                }));
            } else {
                this.setState({ historyLoading: false });
            }
        });
    };

    // ─── SELECTION ───────────────────────────────────────

    toggleStaffSelection = (staff) => {
        this.setState((prev) => {
            const selected = { ...prev.selectedStaff };
            if (selected[staff.id]) {
                delete selected[staff.id];
            } else {
                selected[staff.id] = staff;
            }
            return {
                selectedStaff: selected,
                selectAll: Object.keys(selected).length === prev.staffList.length,
            };
        });
    };

    toggleSelectAll = () => {
        this.setState((prev) => {
            if (prev.selectAll) {
                return { selectedStaff: {}, selectAll: false };
            } else {
                const selected = {};
                prev.staffList.forEach((s) => { selected[s.id] = s; });
                return { selectedStaff: selected, selectAll: true };
            }
        });
    };

    // ─── FORM HANDLERS ──────────────────────────────────

    handleFormChange = (field) => (e) => {
        this.setState({ [field]: e.target.value });
    };

    computeNewGross = (currentSalary) => {
        const { incrementType, calculationMode, incrementValue } = this.state;
        const val = parseFloat(incrementValue);
        if (!val || val <= 0 || incrementType === "BONUS") return currentSalary;
        const current = parseFloat(currentSalary) || 0;
        if (incrementType === "DECREMENT") {
            if (calculationMode === "PERCENTAGE") {
                return Math.max(0, Math.round(current - (current * val / 100)));
            }
            return Math.max(0, Math.round(current - val));
        }
        if (calculationMode === "PERCENTAGE") {
            return Math.round(current + (current * val / 100));
        }
        return Math.round(current + val);
    };

    computeIncrementAmount = (currentSalary) => {
        const { calculationMode, incrementValue } = this.state;
        const val = parseFloat(incrementValue);
        if (!val || val <= 0) return 0;
        if (calculationMode === "PERCENTAGE") {
            return Math.round((parseFloat(currentSalary) || 0) * val / 100);
        }
        return val;
    };

    handleSubmit = async () => {
        const {
            selectedStaff, incrementType, calculationMode,
            incrementValue, effectiveDate, reason, bonusName,
        } = this.state;

        const selectedIds = Object.keys(selectedStaff);
        if (selectedIds.length === 0) {
            this.showSnack("Please select at least one staff member.", "warning");
            return;
        }
        if (!incrementValue || isNaN(incrementValue) || Number(incrementValue) <= 0) {
            this.showSnack("Please enter a valid value.", "warning");
            return;
        }
        if (!effectiveDate) {
            this.showSnack("Please select an effective date.", "warning");
            return;
        }
        if (incrementType === "BONUS" && !bonusName.trim()) {
            this.showSnack("Please enter a bonus name.", "warning");
            return;
        }

        this.setState({ submitting: true });
        let successCount = 0;
        let failCount = 0;

        for (const staffId of selectedIds) {
            const postData = {
                staff: staffId,
                increment_type: incrementType,
                calculation_mode: calculationMode,
                effective_date: effectiveDate,
                reason: reason.trim(),
                bonus_name: incrementType === "BONUS" ? bonusName.trim() : "",
            };

            if (calculationMode === "PERCENTAGE") {
                postData.percentage = Number(incrementValue);
                postData.amount = this.computeIncrementAmount(selectedStaff[staffId].salary);
            } else {
                postData.amount = Number(incrementValue);
            }

            try {
                const res = await postRequest(POST_URL.salaryincrement.api, postData, this.props);
                if (res?.status === 200 || res?.status === 201) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        this.setState({ submitting: false });

        Swal.fire({
            position: "top-end",
            icon: failCount === 0 ? "success" : "warning",
            title: `${successCount} of ${selectedIds.length} ${incrementType.toLowerCase()}(s) applied`,
            text: failCount > 0 ? `${failCount} failed.` : undefined,
            showConfirmButton: false,
            timer: 2500,
        });

        // Reset
        this.setState({
            incrementValue: "",
            reason: "",
            bonusName: "",
            selectedStaff: {},
            selectAll: false,
        });
        this.getStaffList();
        this.loadIncrementHistory(true);
    };

    handleDeleteIncrement = (incrementId) => {
        deleteRequest(DEL_URL.salaryincrement.api + incrementId + "/", {}, {
            confirmButtonText: "Yes, delete",
        }).then((res) => {
            if (res?.status === 200 || res?.status === 204) {
                this.loadIncrementHistory(true);
            }
        });
    };

    // ─── NAVIGATION ──────────────────────────────────────

    viewPage = () => {
        this.props.history.push({
            pathname: Actions.payroll_salaryincrement.view.url,
        });
    };

    // ─── UTILS ───────────────────────────────────────────

    showSnack = (message, severity = "error") => {
        this.setState({ snackOpen: true, snackMessage: message, snackSeverity: severity });
    };

    handleSnackClose = () => {
        this.setState({ snackOpen: false });
    };

    handleHistoryScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop - clientHeight < 50 && this.state.historyHasMore && !this.state.historyLoading) {
            this.loadIncrementHistory(false);
        }
    };

    // ─── RENDER: INCREMENT FORM ──────────────────────────

    renderIncrementForm = () => {
        const {
            incrementType, calculationMode, incrementValue,
            effectiveDate, reason, bonusName, submitting, selectedStaff,
        } = this.state;
        const selectedCount = Object.keys(selectedStaff).length;

        return (
            <Box className="override-section-card" style={{ marginBottom: 20 }}>
                <Typography className="override-section-title" style={{ marginBottom: 12 }}>
                    Apply Salary Increment / Bonus / Decrement
                    {selectedCount > 0 && (
                        <Chip
                            size="small"
                            label={`${selectedCount} staff selected`}
                            style={{
                                marginLeft: 12, backgroundColor: '#e3f2fd',
                                color: '#1565c0', fontWeight: 600, fontSize: 11,
                            }}
                        />
                    )}
                </Typography>

                <Grid container spacing={2}>
                    {/* Type */}
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl variant="outlined" size="small" fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={incrementType}
                                onChange={this.handleFormChange("incrementType")}
                                label="Type"
                            >
                                <MenuItem value="INCREMENT">
                                    <Box display="flex" alignItems="center" style={{ gap: 6 }}>
                                        <TrendingUpIcon fontSize="small" style={{ color: '#2e7d32' }} />
                                        Salary Increment
                                    </Box>
                                </MenuItem>
                                <MenuItem value="BONUS">
                                    <Box display="flex" alignItems="center" style={{ gap: 6 }}>
                                        <CardGiftcardIcon fontSize="small" style={{ color: '#e65100' }} />
                                        One-time Bonus
                                    </Box>
                                </MenuItem>
                                <MenuItem value="DECREMENT">
                                    <Box display="flex" alignItems="center" style={{ gap: 6 }}>
                                        <TrendingDownIcon fontSize="small" style={{ color: '#d32f2f' }} />
                                        Salary Decrement
                                    </Box>
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Calculation Mode */}
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl component="fieldset" size="small">
                            <RadioGroup
                                row
                                value={calculationMode}
                                onChange={this.handleFormChange("calculationMode")}
                            >
                                <FormControlLabel
                                    value="AMOUNT"
                                    control={<Radio size="small" color="primary" />}
                                    label={<span style={{ fontSize: 13 }}>₹ Amount</span>}
                                />
                                <FormControlLabel
                                    value="PERCENTAGE"
                                    control={<Radio size="small" color="primary" />}
                                    label={<span style={{ fontSize: 13 }}>% Percentage</span>}
                                />
                            </RadioGroup>
                        </FormControl>
                    </Grid>

                    {/* Value */}
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            label={calculationMode === "PERCENTAGE" ? "Percentage (%)" : "Amount (₹)"}
                            size="small"
                            variant="outlined"
                            type="number"
                            value={incrementValue}
                            onChange={this.handleFormChange("incrementValue")}
                            inputProps={{ min: 0.01, step: "any" }}
                            fullWidth
                        />
                    </Grid>

                    {/* Effective Date */}
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            label="Effective Date"
                            size="small"
                            variant="outlined"
                            type="date"
                            value={effectiveDate}
                            onChange={this.handleFormChange("effectiveDate")}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Grid>

                    {/* Reason */}
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            label="Reason"
                            size="small"
                            variant="outlined"
                            value={reason}
                            onChange={this.handleFormChange("reason")}
                            fullWidth
                        />
                    </Grid>

                    {/* Bonus Name (only for BONUS type) */}
                    {incrementType === "BONUS" && (
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Bonus Name *"
                                size="small"
                                variant="outlined"
                                value={bonusName}
                                onChange={this.handleFormChange("bonusName")}
                                placeholder="e.g. Diwali Bonus, Performance Bonus"
                                fullWidth
                            />
                        </Grid>
                    )}
                </Grid>

                {/* Info notes */}
                {incrementType === "INCREMENT" && (
                    <Box style={{
                        marginTop: 12, padding: '6px 12px',
                        background: '#e8f5e9', borderRadius: 6,
                        border: '1px solid #c8e6c9',
                    }}>
                        <Typography style={{ fontSize: 11, color: '#2e7d32' }}>
                            <strong>Increment</strong> permanently increases gross salary.
                            {calculationMode === "PERCENTAGE" && " Amount = Current Salary × Percentage / 100."}
                        </Typography>
                    </Box>
                )}
                {incrementType === "BONUS" && (
                    <Box style={{
                        marginTop: 12, padding: '6px 12px',
                        background: '#fff3e0', borderRadius: 6,
                        border: '1px solid #ffe0b2',
                    }}>
                        <Typography style={{ fontSize: 11, color: '#e65100' }}>
                            <strong>Bonus</strong> is a one-time payment and does not change base salary.
                        </Typography>
                    </Box>
                )}
                {incrementType === "DECREMENT" && (
                    <Box style={{
                        marginTop: 12, padding: '6px 12px',
                        background: '#ffebee', borderRadius: 6,
                        border: '1px solid #ffcdd2',
                    }}>
                        <Typography style={{ fontSize: 11, color: '#d32f2f' }}>
                            <strong>Decrement</strong> permanently decreases gross salary.
                            {calculationMode === "PERCENTAGE" && " Amount = Current Salary × Percentage / 100."}
                        </Typography>
                    </Box>
                )}

                <Box style={{ marginTop: 16, textAlign: 'right' }}>
                    <Button
                        variant="contained"
                        onClick={this.handleSubmit}
                        disabled={submitting || selectedCount === 0}
                        style={{
                            background: selectedCount > 0
                                ? 'linear-gradient(135deg, #1565c0 0%, #5c6bc0 100%)'
                                : '#ccc',
                            color: '#fff',
                            fontWeight: 600,
                            padding: '8px 28px',
                            borderRadius: 8,
                            textTransform: 'none',
                            fontSize: 14,
                        }}
                    >
                        {submitting
                            ? "Applying..."
                            : `Apply ${incrementType === "BONUS" ? "Bonus" : incrementType === "DECREMENT" ? "Decrement" : "Increment"} to ${selectedCount} Staff`}
                    </Button>
                </Box>
            </Box>
        );
    };

    // ─── RENDER: STAFF LIST TABLE ────────────────────────

    renderStaffTable = () => {
        const {
            staffList, staffLoading, selectedStaff, selectAll,
            incrementType, calculationMode, incrementValue,
        } = this.state;

        const hasValue = incrementValue && !isNaN(incrementValue) && Number(incrementValue) > 0;

        return (
            <Box className="override-section-card" style={{ marginBottom: 20 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" style={{ marginBottom: 8 }}>
                    <Typography className="override-section-title">
                        Select Staff ({Object.keys(selectedStaff).length} of {staffList.length} selected)
                    </Typography>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={selectAll}
                                onChange={this.toggleSelectAll}
                                color="primary"
                                size="small"
                            />
                        }
                        label={<span style={{ fontSize: 12, fontWeight: 600 }}>Select All</span>}
                    />
                </Box>

                {staffLoading ? (
                    <Box style={{ textAlign: 'center', padding: 30 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : staffList.length === 0 ? (
                    <Box style={{ textAlign: 'center', padding: 20 }}>
                        <Typography style={{ color: '#90a4ae', fontSize: 13 }}>
                            No approved staff found. Select a financial year above.
                        </Typography>
                    </Box>
                ) : (
                    <TableContainer style={{ maxHeight: 400, overflow: 'auto' }}>
                        <Table stickyHeader size="small" className="salary-formula-table">
                            <TableHead>
                                <TableRow className="salary-formula-table-header">
                                    <TableCell className="salary-formula-header-cell" padding="checkbox" style={{ width: 40 }} />
                                    <TableCell className="salary-formula-header-cell">Staff Name</TableCell>
                                    <TableCell className="salary-formula-header-cell">Employee ID</TableCell>
                                    <TableCell className="salary-formula-header-cell" align="right">Current Gross (₹)</TableCell>
                                    {hasValue && (incrementType === "INCREMENT" || incrementType === "DECREMENT") && (
                                        <>
                                            <TableCell className="salary-formula-header-cell" align="right">
                                                {incrementType === "DECREMENT" ? "Decrement (₹)" : "Increment (₹)"}
                                            </TableCell>
                                            <TableCell className="salary-formula-header-cell" align="right">New Gross (₹)</TableCell>
                                        </>
                                    )}
                                    {hasValue && incrementType === "BONUS" && (
                                        <TableCell className="salary-formula-header-cell" align="right">Bonus Amount (₹)</TableCell>
                                    )}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {staffList.map((staff) => {
                                    const isSelected = !!selectedStaff[staff.id];
                                    const currentSalary = staff.salary || 0;
                                    const incAmount = hasValue ? this.computeIncrementAmount(currentSalary) : 0;
                                    const newGross = hasValue ? this.computeNewGross(currentSalary) : currentSalary;

                                    return (
                                        <TableRow
                                            key={staff.id}
                                            hover
                                            onClick={() => this.toggleStaffSelection(staff)}
                                            style={{
                                                cursor: 'pointer',
                                                backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                                            }}
                                            className="salary-formula-data-row"
                                        >
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    checked={isSelected}
                                                    color="primary"
                                                    size="small"
                                                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                                                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                                                />
                                            </TableCell>
                                            <TableCell className="salary-formula-cell">
                                                <Typography style={{ fontSize: 13, fontWeight: 500 }}>
                                                    {getFullName(staff.first_name, staff.middle_name, staff.last_name)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell className="salary-formula-cell">
                                                <Typography style={{ fontSize: 12, color: '#777' }}>
                                                    {staff.employee_id || "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell className="salary-formula-cell" align="right">
                                                <Typography style={{ fontSize: 13, fontWeight: 600 }}>
                                                    {numberWithCommasWithoutSymbol(currentSalary)}
                                                </Typography>
                                            </TableCell>
                                            {hasValue && (incrementType === "INCREMENT" || incrementType === "DECREMENT") && (
                                                <>
                                                    <TableCell className="salary-formula-cell" align="right">
                                                        <Typography style={{
                                                            fontSize: 13, fontWeight: 600,
                                                            color: incrementType === "DECREMENT" ? '#d32f2f' : '#2e7d32',
                                                        }}>
                                                            {incrementType === "DECREMENT" ? "- " : "+ "}
                                                            {numberWithCommasWithoutSymbol(incAmount)}
                                                            {calculationMode === "PERCENTAGE" && (
                                                                <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>
                                                                    ({incrementValue}%)
                                                                </span>
                                                            )}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell className="salary-formula-cell" align="right">
                                                        <Typography style={{
                                                            fontSize: 13, fontWeight: 700, color: '#1565c0',
                                                        }}>
                                                            {numberWithCommasWithoutSymbol(newGross)}
                                                        </Typography>
                                                    </TableCell>
                                                </>
                                            )}
                                            {hasValue && incrementType === "BONUS" && (
                                                <TableCell className="salary-formula-cell" align="right">
                                                    <Typography style={{
                                                        fontSize: 13, fontWeight: 600, color: '#e65100',
                                                    }}>
                                                        + {numberWithCommasWithoutSymbol(incAmount)}
                                                        {calculationMode === "PERCENTAGE" && (
                                                            <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>
                                                                ({incrementValue}%)
                                                            </span>
                                                        )}
                                                    </Typography>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        );
    };

    // ─── RENDER: INCREMENT HISTORY (INFINITE SCROLL) ────

    renderIncrementHistory = () => {
        const { incrementHistory, historyLoading, historyHasMore, historyTotal } = this.state;

        return (
            <Box className="override-section-card" style={{ marginTop: 24 }}>
                <Typography className="override-section-title" style={{ marginBottom: 8 }}>
                    Increment &amp; Bonus History
                    {historyTotal > 0 && (
                        <span style={{ fontSize: 12, color: '#999', fontWeight: 400, marginLeft: 8 }}>
                            ({historyTotal} total)
                        </span>
                    )}
                </Typography>

                {incrementHistory.length === 0 && !historyLoading ? (
                    <Box style={{ textAlign: 'center', padding: 20 }}>
                        <Typography style={{ color: '#90a4ae', fontSize: 13 }}>
                            No increment or bonus records found.
                        </Typography>
                    </Box>
                ) : (
                    <Box
                        ref={this.historyRef}
                        onScroll={this.handleHistoryScroll}
                        style={{ maxHeight: 500, overflow: 'auto' }}
                    >
                        <TableContainer>
                            <Table size="small" className="salary-formula-table">
                                <TableHead>
                                    <TableRow className="salary-formula-table-header">
                                        <TableCell className="salary-formula-header-cell">Staff</TableCell>
                                        <TableCell className="salary-formula-header-cell">Type</TableCell>
                                        <TableCell className="salary-formula-header-cell">Mode</TableCell>
                                        <TableCell className="salary-formula-header-cell" align="right">Amount (₹)</TableCell>
                                        <TableCell className="salary-formula-header-cell" align="right">Old Gross (₹)</TableCell>
                                        <TableCell className="salary-formula-header-cell" align="right">New Gross (₹)</TableCell>
                                        <TableCell className="salary-formula-header-cell">Date</TableCell>
                                        <TableCell className="salary-formula-header-cell">Reason / Bonus Name</TableCell>
                                        <TableCell className="salary-formula-header-cell" align="center">Status</TableCell>
                                        <TableCell className="salary-formula-header-cell" align="center" style={{ width: 60 }}>Del</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {incrementHistory.map((inc) => (
                                        <TableRow key={inc.id} className="salary-formula-data-row">
                                            <TableCell className="salary-formula-cell">
                                                <Typography style={{ fontSize: 12, fontWeight: 500 }}>
                                                    {inc.staff_name || "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell className="salary-formula-cell">
                                                <Chip
                                                    size="small"
                                                    icon={inc.increment_type === "INCREMENT"
                                                        ? <TrendingUpIcon style={{ fontSize: 13, color: '#fff' }} />
                                                        : <CardGiftcardIcon style={{ fontSize: 13, color: '#fff' }} />}
                                                    label={inc.increment_type === "INCREMENT" ? "Increment" : "Bonus"}
                                                    style={{
                                                        backgroundColor: inc.increment_type === "INCREMENT" ? '#2e7d32' : '#e65100',
                                                        color: '#fff', fontWeight: 600, fontSize: 10,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell className="salary-formula-cell">
                                                <Typography style={{ fontSize: 11, color: '#555' }}>
                                                    {inc.calculation_mode === "PERCENTAGE"
                                                        ? `${inc.percentage}%`
                                                        : "Fixed"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell className="salary-formula-cell" align="right">
                                                <Typography style={{
                                                    fontSize: 12, fontWeight: 600,
                                                    color: inc.increment_type === "INCREMENT" ? '#2e7d32' : '#e65100',
                                                }}>
                                                    + {numberWithCommasWithoutSymbol(inc.amount)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell className="salary-formula-cell" align="right">
                                                <Typography style={{ fontSize: 12, color: '#777' }}>
                                                    {inc.old_gross ? numberWithCommasWithoutSymbol(inc.old_gross) : "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell className="salary-formula-cell" align="right">
                                                <Typography style={{
                                                    fontSize: 12, fontWeight: 600,
                                                    color: inc.new_gross ? '#1565c0' : '#777',
                                                }}>
                                                    {inc.new_gross ? numberWithCommasWithoutSymbol(inc.new_gross) : "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell className="salary-formula-cell">
                                                <Typography style={{ fontSize: 11 }}>
                                                    {inc.effective_date
                                                        ? moment(inc.effective_date).format("DD-MM-YYYY")
                                                        : "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell className="salary-formula-cell">
                                                <Typography style={{ fontSize: 11, color: '#555', whiteSpace: 'normal' }}>
                                                    {inc.increment_type === "BONUS" && inc.bonus_name
                                                        ? <><strong>{inc.bonus_name}</strong>{inc.reason ? ` — ${inc.reason}` : ""}</>
                                                        : inc.reason || "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell className="salary-formula-cell" align="center">
                                                <Chip
                                                    size="small"
                                                    label={inc.applied ? "Applied" : "Pending"}
                                                    style={{
                                                        backgroundColor: inc.applied ? '#e8f5e9' : '#fff3e0',
                                                        color: inc.applied ? '#2e7d32' : '#e65100',
                                                        fontWeight: 600, fontSize: 10,
                                                        border: `1px solid ${inc.applied ? '#c8e6c9' : '#ffe0b2'}`,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell className="salary-formula-cell" align="center">
                                                {!inc.applied && (
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => this.handleDeleteIncrement(inc.id)}
                                                        >
                                                            <DeleteOutlinedIcon fontSize="small" style={{ color: '#f44336' }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {historyLoading && (
                            <Box style={{ textAlign: 'center', padding: 12 }}>
                                <CircularProgress size={20} />
                            </Box>
                        )}
                        {!historyHasMore && incrementHistory.length > 0 && (
                            <Box style={{ textAlign: 'center', padding: 10 }}>
                                <Typography style={{ fontSize: 11, color: '#bbb' }}>
                                    — End of history —
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        );
    };

    // ─── MAIN RENDER ─────────────────────────────────────

    render() {
        const {
            loading, yearList, year,
            snackOpen, snackMessage, snackSeverity,
        } = this.state;

        if (loading) return <LoadingGif />;

        return (
            <Paper className={classNames("paper-background")}>
                {/* Header */}
                <Grid container>
                    <Grid item md={6} xs={12} className={classNames("header-align")}>
                        <Box className="heading">Salary Increment & Bonus</Box>
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <Box className={classNames("header-align", "end-flex-prop")}>
                            <Button
                                variant="contained"
                                onClick={this.viewPage}
                                className="editbutton-view"
                            >
                                <VisibilityOutlined className="visibility-icon" />
                                Increment List
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                {/* Financial Year Filter */}
                <Grid container spacing={2} className={classNames("header-align")} style={{ marginTop: 8 }}>
                    <Grid item lg={3} md={4} xs={6}>
                        <Dropdown
                            data={yearList}
                            name="year"
                            value={year}
                            required={true}
                            hideSelect={true}
                            onChange={this.onChange}
                            label="Financial Year"
                        />
                    </Grid>
                </Grid>

                <Box style={{ marginTop: 16 }}>
                    {/* Increment Form */}
                    {this.renderIncrementForm()}

                    {/* Staff List Table */}
                    {year > 0 && this.renderStaffTable()}

                    {/* Increment History */}
                    {this.renderIncrementHistory()}
                </Box>

                {/* Snackbar */}
                <Snackbar
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    open={snackOpen}
                    autoHideDuration={3000}
                    onClose={this.handleSnackClose}
                >
                    <Alert onClose={this.handleSnackClose} severity={snackSeverity}>
                        {snackMessage}
                    </Alert>
                </Snackbar>
            </Paper>
        );
    }
}

export default withRouter(AddSalaryIncrement);
