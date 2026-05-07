import React, { Component } from "react";
import {
    Paper, Box, Grid, Button, Avatar, Switch, MenuItem,
    Table, TableContainer, TableHead, TableCell,
    TableRow, TableBody, Typography, TextField,
    IconButton, Tooltip, Chip,
    CircularProgress, FormControlLabel,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import VisibilityOutlined from "@material-ui/icons/VisibilityOutlined";
import DeleteOutlinedIcon from "@material-ui/icons/DeleteOutlined";
import SaveOutlinedIcon from "@material-ui/icons/SaveOutlined";
import EditOutlinedIcon from "@material-ui/icons/EditOutlined";
import WarningIcon from "@material-ui/icons/Warning";
import Swal from "sweetalert2";
import classNames from "classnames";
import moment from "moment";
import { getRequest, postRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, DEL_URL } from "Includes/urls";
import { getFullName, numberWithCommasWithoutSymbol } from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { Actions } from "Constants/permissions";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import "./styles.scss";

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class AddSalaryOverride extends Component {
    constructor(props) {
        super(props);
        const {
            year, id, salaryIsPaid, yearName,
            salaryMonth, salaryMonthName, month,
        } = this.props.location.state;
        this.state = {
            staffDetails: {},
            salaryIsPaid: salaryIsPaid,
            year: year,
            yearName: yearName,
            salaryMonth: salaryMonth,
            salaryMonthName: salaryMonthName,
            month: month,
            staff_id: id,
            loading: true,
            // Parsed year/month integers
            smYear: null,
            smMonth: null,
            // Salary breakdown (from approved plan)
            earnings: [],
            deductions: [],
            grossEarnings: 0,
            grossDeductions: 0,
            netPay: 0,
            // Existing overrides keyed by salary_component id
            overrideMap: {},
            totalLop: 0,
            // Inline edit state: { [componentId]: { amount, reason, is_permanent } }
            editingRows: {},
            savingRows: {},
            // Feedback
            snackOpen: false,
            snackMessage: "",
            snackSeverity: "error",
            // Attendance info
            attendanceData: null,
        };
    }

    componentDidMount() {
        this.loadInitialData();
    }

    // ─── DATA LOADING ────────────────────────────────────

    loadInitialData = () => {
        const { staff_id, salaryMonth } = this.state;
        const [smYear, smMonth] = (salaryMonth || "").split("-").map(Number);

        // Load staff details first
        getRequest(GET_URL.staffalldetail.api + staff_id + "/", {}, this.props).then((staffRes) => {
            const staffDetails = staffRes?.status === 200 ? staffRes.data.data || staffRes.data : {};

            this.setState({
                staffDetails,
                smYear,
                smMonth,
            }, () => {
                this.loadFormulaPreview();
                this.loadOverrides();
            });
        });
    };

    loadFormulaPreview = () => {
        const { staff_id, smYear, smMonth } = this.state;

        // First get the default formula
        getRequest(GET_URL.salaryformula.api, {}, this.props).then((res) => {
            if (res && res.status === 200) {
                const formulas = Array.isArray(res.data.data || res.data)
                    ? (res.data.data || res.data) : [];
                const defaultFormula = formulas.find(f => f.is_default && f.is_active) || formulas[0];
                if (defaultFormula) {
                    postRequest(POST_URL.formulapayrollgenerate.api, {
                        action: "formula_preview",
                        formula: defaultFormula.id,
                        staff: staff_id,
                        salary_month: smYear && smMonth ? `${smYear}-${smMonth.toString().padStart(2, '0')}` : undefined
                    }, this.props).then((previewRes) => {
                        if (previewRes && previewRes.status === 200) {
                            const data = previewRes.data.data || previewRes.data;
                            const steps = data.steps || [];
                            const activeSteps = steps.filter(s => s.is_active);

                            // Build earnings and deductions from formula steps
                            const earnings = activeSteps
                                .filter(s => !s.is_deduction)
                                .map(s => ({
                                    salary_component: s.salary_component,
                                    salary_component_name: s.component,
                                    amount: s.prorated_value,
                                    lop_amount: s.lop_amount || 0,
                                }));

                            const deductions = activeSteps
                                .filter(s => s.is_deduction)
                                .map(s => ({
                                    salary_component: s.salary_component,
                                    salary_component_name: s.component,
                                    amount: s.prorated_value,
                                    lop_amount: s.lop_amount || 0,
                                }));

                            const totals = data.totals || {};
                            let totalLop = 0;
                            earnings.forEach(e => { totalLop += (e.lop_amount || 0); });

                            this.setState({
                                earnings,
                                deductions,
                                grossEarnings: totals.gross_earnings || 0,
                                grossDeductions: totals.total_deductions || 0,
                                netPay: totals.net_pay || 0,
                                totalLop,
                                attendanceData: data.attendance || null,
                                loading: false,
                            });
                        } else {
                            this.setState({ loading: false });
                        }
                    }).catch(() => {
                        this.setState({ loading: false });
                    });
                } else {
                    this.setState({ loading: false });
                }
            } else {
                this.setState({ loading: false });
            }
        });
    };

    loadOverrides = () => {
        const { staff_id, smYear, smMonth } = this.state;
        const params = { staff: staff_id, pageno: 1, limit: 10 };
        if (smMonth) params.salary_month = smMonth;
        if (smYear) params.salary_year = smYear;
        getRequest(GET_URL.salaryoverride.api, params, this.props).then((res) => {
            const overrides = res?.status === 200
                ? (Array.isArray(res.data.data || res.data) ? (res.data.data || res.data) : [])
                : [];
            const overrideMap = {};
            overrides.forEach((ov) => {
                overrideMap[ov.salary_component] = ov;
            });
            this.setState({ overrideMap });
        });
    };

    renderAttendanceInfo = () => {
        const { attendanceData } = this.state;
        if (!attendanceData) return null;
        const { working_days, present_days } = attendanceData;

        return (
            <Box className="salary-payment-attendance-bar">
                <Box className="salary-payment-attendance-item">
                    <Typography className="salary-payment-att-label">Working Days</Typography>
                    <Typography className="salary-payment-att-value">{working_days}</Typography>
                </Box>
                <Box className="salary-payment-attendance-item">
                    <Typography className="salary-payment-att-label">Present Days</Typography>
                    <Typography className="salary-payment-att-value">{present_days}</Typography>
                </Box>
                {working_days !== present_days && (
                    <Box className="salary-payment-attendance-item salary-payment-att-lop">
                        <Typography className="salary-payment-att-label">LOP Days</Typography>
                        <Box display="flex" alignItems="baseline" style={{ gap: 8 }}>
                            <Typography className="salary-payment-att-value" style={{ color: '#c62828' }}>
                                {Math.round((working_days - present_days) * 100) / 100}
                            </Typography>
                            {this.state.totalLop > 0 && (
                                <Typography style={{ fontSize: 12, color: '#c62828', fontWeight: 500 }}>
                                    (₹ {numberWithCommasWithoutSymbol(Math.round(this.state.totalLop * 100) / 100)})
                                </Typography>
                            )}
                        </Box>
                    </Box>
                )}
            </Box>
        );
    };

    startEdit = (componentId, existingOverride) => {
        this.setState((prev) => ({
            editingRows: {
                ...prev.editingRows,
                [componentId]: {
                    amount: existingOverride ? existingOverride.amount : "",
                    reason: existingOverride ? existingOverride.reason : "",
                    is_permanent: prev.salaryIsPaid ? true : (existingOverride ? existingOverride.is_permanent : false),
                },
            },
        }));
    };

    cancelEdit = (componentId) => {
        this.setState((prev) => {
            const next = { ...prev.editingRows };
            delete next[componentId];
            return { editingRows: next };
        });
    };

    handleEditChange = (componentId, field) => (e) => {
        const value = field === "is_permanent" ? e.target.checked : e.target.value;
        this.setState((prev) => ({
            editingRows: {
                ...prev.editingRows,
                [componentId]: {
                    ...prev.editingRows[componentId],
                    [field]: value,
                },
            },
        }));
    };

    handleSaveOverride = (componentId) => {
        const { editingRows, overrideMap, smYear, smMonth, staff_id } = this.state;
        const row = editingRows[componentId];

        if (!row.amount || isNaN(row.amount) || Number(row.amount) <= 0) {
            this.showSnack("Please enter a valid override amount.", "warning");
            return;
        }
        if (!row.reason || !row.reason.trim()) {
            this.showSnack("Reason is compulsory for every override.", "warning");
            return;
        }

        const existingOverride = overrideMap[componentId];

        this.setState((prev) => ({
            savingRows: { ...prev.savingRows, [componentId]: true },
        }));

        if (existingOverride) {
            // Delete old override then create new one (PUT might not be supported cleanly)
            deleteRequest(DEL_URL.salaryoverride.api + existingOverride.id + "/", {}, {
                showConfirm: false,
            }).then(() => {
                this.createOverride(componentId, row);
            }).catch(() => {
                this.setState((prev) => ({
                    savingRows: { ...prev.savingRows, [componentId]: false },
                }));
            });
        } else {
            this.createOverride(componentId, row);
        }
    };

    createOverride = (componentId, row) => {
        const { smYear, smMonth, staff_id, salaryMonth } = this.state;

        const postData = {
            staff: staff_id,
            salary_month_date: salaryMonth,  // "YYYY-M" format for backend lookup
            salary_component: componentId,
            amount: Number(row.amount),
            reason: row.reason.trim(),
            is_permanent: row.is_permanent,
        };

        postRequest(POST_URL.salaryoverride.api, postData, this.props)
            .then((res) => {
                this.setState((prev) => ({
                    savingRows: { ...prev.savingRows, [componentId]: false },
                }));
                if (res?.status === 200 || res?.status === 201) {
                    Swal.fire({
                        position: "top-end",
                        icon: "success",
                        title: "Override saved",
                        showConfirmButton: false,
                        timer: 1200,
                    });
                    this.cancelEdit(componentId);
                    this.loadOverrides();
                }
            })
            .catch(() => {
                this.setState((prev) => ({
                    savingRows: { ...prev.savingRows, [componentId]: false },
                }));
            });
    };

    handleDeleteOverride = (componentId) => {
        const { overrideMap } = this.state;
        const ov = overrideMap[componentId];
        if (!ov) return;
        deleteRequest(DEL_URL.salaryoverride.api + ov.id + "/", {}, {
            confirmButtonText: "Yes, remove override",
        }).then((res) => {
            if (res?.status === 200 || res?.status === 204) {
                this.cancelEdit(componentId);
                this.loadOverrides();
            }
        });
    };

    // ─── NAVIGATION ──────────────────────────────────────

    viewPage = () => {
        const { salaryMonth, salaryMonthName, month } = this.state;
        const params = { salaryMonth, salaryMonthName, month };
        const searchParam = "?" + new URLSearchParams(params).toString();
        this.props.history.push({
            pathname: Actions.payroll_salaryoverride.view.url,
            search: searchParam,
        });
    };

    // ─── UTILS ───────────────────────────────────────────

    showSnack = (message, severity = "error") => {
        this.setState({ snackOpen: true, snackMessage: message, snackSeverity: severity });
    };

    handleSnackClose = () => {
        this.setState({ snackOpen: false });
    };

    computeEffectiveNet = () => {
        const { earnings, deductions, overrideMap, salaryIsPaid } = this.state;
        let totalEarnings = 0;
        let totalDeductions = 0;
        earnings.forEach((e) => {
            const ov = overrideMap[e.salary_component];
            totalEarnings += (ov && !salaryIsPaid) ? Number(ov.amount) : Number(e.amount || 0);
        });
        deductions.forEach((d) => {
            const ov = overrideMap[d.salary_component];
            totalDeductions += (ov && !salaryIsPaid) ? Number(ov.amount) : Number(d.amount || 0);
        });
        return { totalEarnings, totalDeductions, effectiveNet: totalEarnings - totalDeductions };
    };

    // ─── RENDER: PROFILE CARD ────────────────────────────

    renderProfileCard = () => {
        const { staffDetails } = this.state;
        if (!staffDetails || !staffDetails.first_name) return null;

        const dateJoined = staffDetails.date_joined
            ? moment(staffDetails.date_joined).format("DD-MM-YYYY")
            : "N/A";

        return (
            <Paper className="salary-profile-horizontal" elevation={0}>
                <Box className="salary-profile-h-avatar">
                    {staffDetails.profile_pic_details ? (
                        <Avatar
                            alt="Profile"
                            src={staffDetails.profile_pic_details.file}
                            style={{ width: 52, height: 52 }}
                        />
                    ) : (
                        <Avatar style={{
                            width: 52, height: 52,
                            backgroundColor: '#5c6bc0',
                            fontSize: 22, fontWeight: 600,
                        }}>
                            {staffDetails.first_name && staffDetails.first_name.charAt(0).toUpperCase()}
                        </Avatar>
                    )}
                </Box>
                <Box className="salary-profile-h-info">
                    <Typography className="salary-profile-h-name">
                        {getFullName(
                            staffDetails.first_name,
                            staffDetails.middle_name,
                            staffDetails.last_name
                        )}
                    </Typography>
                    <Typography className="salary-profile-h-sub">
                        {staffDetails.designation || "Staff"}
                    </Typography>
                </Box>
                <Box className="salary-profile-h-details">
                    <Box className="salary-profile-h-detail-item">
                        <Typography className="salary-profile-h-label">Email</Typography>
                        <Typography className="salary-profile-h-value">{staffDetails.email || "—"}</Typography>
                    </Box>
                    <Box className="salary-profile-h-detail-item">
                        <Typography className="salary-profile-h-label">Phone</Typography>
                        <Typography className="salary-profile-h-value">{staffDetails.mobile_num || "—"}</Typography>
                    </Box>
                    <Box className="salary-profile-h-detail-item">
                        <Typography className="salary-profile-h-label">Joining Date</Typography>
                        <Typography className="salary-profile-h-value">{dateJoined}</Typography>
                    </Box>
                    <Box className="salary-profile-h-detail-item">
                        <Typography className="salary-profile-h-label">Annual Salary</Typography>
                        <Typography className="salary-profile-h-value salary-profile-h-salary">
                            {numberWithCommasWithoutSymbol(staffDetails.salary)}
                        </Typography>
                    </Box>
                    <Box className="salary-profile-h-detail-item">
                        <Typography className="salary-profile-h-label">Monthly Salary</Typography>
                        <Typography className="salary-profile-h-value salary-profile-h-salary">
                            {numberWithCommasWithoutSymbol(Math.round(staffDetails.salary / 12))}
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        );
    };

    // ─── RENDER: PAID BANNER ─────────────────────────────

    renderPaidBanner = () => {
        return (
            <Box className="override-paid-banner">
                <WarningIcon style={{ color: '#e65100', marginRight: 10, fontSize: 22 }} />
                <Typography style={{ fontSize: 14, color: '#5d4037', fontWeight: 500 }}>
                    Payment is already done for this month. Overrides can only be configured from next month.
                </Typography>
            </Box>
        );
    };

    // ─── RENDER: COMPONENT TABLE ─────────────────────────

    renderComponentRow = (comp, type) => {
        const { overrideMap, editingRows, savingRows, salaryIsPaid } = this.state;
        const compId = comp.salary_component;
        const originalAmount = Number(comp.amount || 0);
        const existingOv = overrideMap[compId];
        const isEditing = !!editingRows[compId];
        const isSaving = !!savingRows[compId];
        const editData = editingRows[compId] || {};

        // Effective amount (with override applied)
        // If the month is already paid, overrides shown here will not alter the effective amount for *this* month.
        const effectiveAmount = (existingOv && !salaryIsPaid) ? Number(existingOv.amount) : originalAmount;
        const diff = effectiveAmount - originalAmount;

        return (
            <TableRow key={compId} className="salary-formula-data-row">
                {/* Component Name */}
                <TableCell className="salary-formula-cell">
                    <Typography style={{ fontSize: 13, fontWeight: 500 }}>
                        {comp.salary_component_name || "—"}
                    </Typography>
                </TableCell>

                {/* Original Amount */}
                <TableCell className="salary-formula-cell" align="right">
                    <Typography style={{ fontSize: 13, color: '#555' }}>
                        {numberWithCommasWithoutSymbol(originalAmount)}
                    </Typography>
                </TableCell>

                {/* Override Amount */}
                <TableCell className="salary-formula-cell" align="right">
                    {isEditing ? (
                        <TextField
                            size="small"
                            variant="outlined"
                            type="number"
                            value={editData.amount}
                            onChange={this.handleEditChange(compId, "amount")}
                            inputProps={{ min: 0, step: "any", style: { textAlign: 'right', fontSize: 13, padding: '6px 8px' } }}
                            style={{ width: 120 }}
                            autoFocus
                        />
                    ) : existingOv ? (
                        <Box display="flex" alignItems="center" justifyContent="flex-end" style={{ gap: 6 }}>
                            <Typography style={{
                                fontSize: 13, fontWeight: 600,
                                color: diff > 0 ? '#2e7d32' : diff < 0 ? '#c62828' : '#333',
                            }}>
                                {numberWithCommasWithoutSymbol(existingOv.amount)}
                            </Typography>
                            {diff !== 0 && (
                                <Typography style={{
                                    fontSize: 11, fontWeight: 500,
                                    color: diff > 0 ? '#2e7d32' : '#c62828',
                                }}>
                                    ({diff > 0 ? "+" : ""}{numberWithCommasWithoutSymbol(diff)})
                                </Typography>
                            )}
                        </Box>
                    ) : (
                        <Typography style={{ fontSize: 12, color: '#aaa' }}>—</Typography>
                    )}
                </TableCell>

                {/* Permanent */}
                <TableCell className="salary-formula-cell" align="center">
                    {isEditing ? (
                        <TextField
                            select
                            size="small"
                            variant="outlined"
                            value={editData.is_permanent ? "permanent" : "this_month"}
                            onChange={(e) => {
                                const val = e.target.value === "permanent";
                                this.handleEditChange(compId, "is_permanent")({ target: { checked: val } });
                            }}
                            disabled={salaryIsPaid}
                            InputProps={{ style: { fontSize: 12, minWidth: 120 } }}
                        >
                            <MenuItem value="this_month" style={{ fontSize: 12 }}>This Month Only</MenuItem>
                            <MenuItem value="permanent" style={{ fontSize: 12 }}>Permanent</MenuItem>
                        </TextField>
                    ) : existingOv ? (
                        <Chip
                            size="small"
                            label={existingOv.is_permanent ? "Permanent" : "This Month"}
                            className={
                                existingOv.is_permanent
                                    ? "override-permanent-badge override-permanent-yes"
                                    : "override-permanent-badge override-permanent-no"
                            }
                        />
                    ) : null}
                </TableCell>

                {/* Reason */}
                <TableCell className="salary-formula-cell">
                    {isEditing ? (
                        <TextField
                            size="small"
                            variant="outlined"
                            placeholder="Reason (compulsory)"
                            value={editData.reason}
                            onChange={this.handleEditChange(compId, "reason")}
                            inputProps={{ style: { fontSize: 12, padding: '6px 8px' } }}
                            style={{ minWidth: 160 }}
                            fullWidth
                        />
                    ) : existingOv ? (
                        <Typography style={{ fontSize: 12, color: '#555', whiteSpace: 'normal' }}>
                            {existingOv.reason}
                        </Typography>
                    ) : null}
                </TableCell>

                {/* Actions */}
                <TableCell className="salary-formula-cell" align="center">
                    {isEditing ? (
                        <Box display="flex" justifyContent="center" style={{ gap: 4 }}>
                            <Tooltip title="Save override">
                                <IconButton
                                    size="small"
                                    onClick={() => this.handleSaveOverride(compId)}
                                    disabled={isSaving}
                                >
                                    {isSaving
                                        ? <CircularProgress size={16} />
                                        : <SaveOutlinedIcon fontSize="small" style={{ color: '#1565c0' }} />}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel">
                                <IconButton
                                    size="small"
                                    onClick={() => this.cancelEdit(compId)}
                                    disabled={isSaving}
                                >
                                    <Typography style={{ fontSize: 11, color: '#999' }}>✕</Typography>
                                </IconButton>
                            </Tooltip>
                        </Box>
                    ) : (
                        <Box display="flex" justifyContent="center" style={{ gap: 4 }}>
                            {(!existingOv || !salaryIsPaid || existingOv.is_permanent) && (
                                <Tooltip title={existingOv ? "Edit override" : "Add override"}>
                                    <IconButton
                                        size="small"
                                        onClick={() => this.startEdit(compId, existingOv)}
                                    >
                                        <EditOutlinedIcon fontSize="small" style={{ color: '#1565c0' }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {existingOv && (!salaryIsPaid || existingOv.is_permanent) && (
                                <Tooltip title="Remove override">
                                    <IconButton
                                        size="small"
                                        onClick={() => this.handleDeleteOverride(compId)}
                                    >
                                        <DeleteOutlinedIcon fontSize="small" style={{ color: '#f44336' }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    )}
                </TableCell>
            </TableRow>
        );
    };

    renderComponentTable = (items, title, isDeduction) => {
        const { salaryIsPaid, overrideMap } = this.state;
        if (!items || items.length === 0) return null;

        let originalTotal = 0;
        let effectiveTotal = 0;
        items.forEach((item) => {
            const orig = Number(item.amount || 0);
            const ov = overrideMap[item.salary_component];
            originalTotal += orig;
            effectiveTotal += (ov && !salaryIsPaid) ? Number(ov.amount) : orig;
        });

        return (
            <Box className="override-section-card" style={{ marginTop: 16 }}>
                <Typography className="override-section-title">
                    {title}
                </Typography>
                <TableContainer>
                    <Table size="small" className="salary-formula-table">
                        <colgroup>
                            <col />
                            <col style={{ width: 130 }} />
                            <col style={{ width: 160 }} />
                            <col style={{ width: 140 }} />
                            <col />
                            <col style={{ width: 90 }} />
                        </colgroup>
                        <TableHead>
                            <TableRow className="salary-formula-table-header">
                                <TableCell className="salary-formula-header-cell">Component</TableCell>
                                <TableCell className="salary-formula-header-cell" align="right">Original (₹)</TableCell>
                                <TableCell className="salary-formula-header-cell" align="right">Override (₹)</TableCell>
                                <TableCell className="salary-formula-header-cell" align="center">Type</TableCell>
                                <TableCell className="salary-formula-header-cell">Reason</TableCell>
                                <TableCell className="salary-formula-header-cell" align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((comp) => this.renderComponentRow(comp, isDeduction ? 'deduction' : 'earning'))}
                            {/* Totals row */}
                            <TableRow style={{ backgroundColor: '#f5f7fa' }}>
                                <TableCell className="salary-formula-cell" style={{ fontWeight: 700, fontSize: 13 }}>
                                    Total {title}
                                </TableCell>
                                <TableCell className="salary-formula-cell" align="right" style={{ fontWeight: 700, fontSize: 13 }}>
                                    {numberWithCommasWithoutSymbol(originalTotal)}
                                </TableCell>
                                <TableCell className="salary-formula-cell" align="right" style={{
                                    fontWeight: 700, fontSize: 13,
                                    color: effectiveTotal !== originalTotal
                                        ? (effectiveTotal > originalTotal ? '#2e7d32' : '#c62828')
                                        : '#333',
                                }}>
                                    {effectiveTotal !== originalTotal
                                        ? numberWithCommasWithoutSymbol(effectiveTotal)
                                        : "—"}
                                </TableCell>
                                <TableCell className="salary-formula-cell" />
                                <TableCell className="salary-formula-cell" />
                                <TableCell className="salary-formula-cell" />
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    // ─── RENDER: NET PAY SUMMARY ─────────────────────────

    renderNetPaySummary = () => {
        const { grossEarnings, grossDeductions, netPay, overrideMap, earnings, deductions } = this.state;
        const { totalEarnings, totalDeductions, effectiveNet } = this.computeEffectiveNet();
        const hasOverrides = Object.keys(overrideMap).length > 0;
        const netDiff = effectiveNet - netPay;

        return (
            <Box className="override-section-card" style={{ marginTop: 16 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                        <Box style={{ textAlign: 'center', padding: '12px 8px' }}>
                            <Typography style={{ fontSize: 12, color: '#777', textTransform: 'uppercase', letterSpacing: 1 }}>
                                Gross Earnings
                            </Typography>
                            <Typography style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32' }}>
                                ₹ {numberWithCommasWithoutSymbol(hasOverrides ? totalEarnings : grossEarnings)}
                            </Typography>
                            {hasOverrides && totalEarnings !== grossEarnings && (
                                <Typography style={{ fontSize: 11, color: '#999', textDecoration: 'line-through' }}>
                                    ₹ {numberWithCommasWithoutSymbol(grossEarnings)}
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Box style={{ textAlign: 'center', padding: '12px 8px' }}>
                            <Typography style={{ fontSize: 12, color: '#777', textTransform: 'uppercase', letterSpacing: 1 }}>
                                Total Deductions
                            </Typography>
                            <Typography style={{ fontSize: 20, fontWeight: 700, color: '#c62828' }}>
                                ₹ {numberWithCommasWithoutSymbol(hasOverrides ? totalDeductions : grossDeductions)}
                            </Typography>
                            {hasOverrides && totalDeductions !== grossDeductions && (
                                <Typography style={{ fontSize: 11, color: '#999', textDecoration: 'line-through' }}>
                                    ₹ {numberWithCommasWithoutSymbol(grossDeductions)}
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Box style={{
                            textAlign: 'center', padding: '12px 8px',
                            background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
                            borderRadius: 10,
                        }}>
                            <Typography style={{ fontSize: 12, color: '#777', textTransform: 'uppercase', letterSpacing: 1 }}>
                                Net Pay
                            </Typography>
                            <Typography style={{ fontSize: 22, fontWeight: 800, color: '#1a237e' }}>
                                ₹ {numberWithCommasWithoutSymbol(hasOverrides ? effectiveNet : netPay)}
                            </Typography>
                            {hasOverrides && netDiff !== 0 && (
                                <Typography style={{
                                    fontSize: 12, fontWeight: 600,
                                    color: netDiff > 0 ? '#2e7d32' : '#c62828',
                                }}>
                                    {netDiff > 0 ? "+" : ""}{numberWithCommasWithoutSymbol(netDiff)} from original
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        );
    };

    // ─── MAIN RENDER ─────────────────────────────────────

    render() {
        const {
            loading, salaryIsPaid, salaryMonthName,
            earnings, deductions,
            snackOpen, snackMessage, snackSeverity,
        } = this.state;

        if (loading) {
            return <LoadingGif />;
        }

        return (
            <Paper className={classNames("paper-background")}>
                {/* Header */}
                <Grid container>
                    <Grid item md={6} xs={12} className={classNames("header-align")}>
                        <Box className="heading">Salary Override</Box>
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <Box className={classNames("header-align", "end-flex-prop")}>
                            <Button
                                variant="contained"
                                onClick={() => this.viewPage()}
                                className="editbutton-view"
                            >
                                <VisibilityOutlined className="visibility-icon" />
                                Override List
                            </Button>
                        </Box>
                    </Grid>

                    <Box className="year-std-box mr-40">
                        <Box className="academic-std-head">Salary Month</Box>
                        <Box className="aca-std-white-background">{salaryMonthName}</Box>
                    </Box>
                </Grid>

                {/* Body */}
                <Box className="salary-body-wrapper" style={{ marginTop: 12 }}>
                    {/* Profile Card */}
                    {this.renderProfileCard()}

                    {/* Attendance Info */}
                    <Box style={{ marginTop: 10 }}>
                        {this.renderAttendanceInfo()}
                    </Box>

                    {/* Paid Banner */}
                    {salaryIsPaid && (
                        <Box style={{ marginTop: 16 }}>
                            {this.renderPaidBanner()}
                        </Box>
                    )}

                    {/* Net Pay Summary */}
                    {this.renderNetPaySummary()}

                    {/* Earnings Table */}
                    {this.renderComponentTable(earnings, "Earnings", false)}

                    {/* Deductions Table */}
                    {this.renderComponentTable(deductions, "Deductions", true)}

                    {/* No data */}
                    {earnings.length === 0 && deductions.length === 0 && (
                        <Box className="override-no-data" style={{ marginTop: 20 }}>
                            <Typography style={{ color: '#90a4ae', fontSize: 14 }}>
                                No salary components found for this month. Has the salary been generated?
                            </Typography>
                        </Box>
                    )}
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

export default withRouter(AddSalaryOverride);
