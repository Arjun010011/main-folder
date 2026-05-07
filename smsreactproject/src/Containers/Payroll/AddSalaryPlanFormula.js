import React, { Component } from "react";
import {
    Paper, Box, Grid, Button, Avatar,
    Table, TableContainer, TableHead, TableCell,
    TableRow, TableBody, Switch, Tooltip, Chip, Typography,
    CircularProgress, Select, MenuItem, FormControl, InputLabel,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import VisibilityOutlined from "@material-ui/icons/VisibilityOutlined";
import Swal from "sweetalert2";
import classNames from "classnames";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import {
    isUserHasPermission,
    numberWithCommas,
    numberWithCommasWithoutSymbol,
    getFullName,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { Actions } from "Constants/permissions";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import moment from "moment";
import "./styles.scss";

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class AddSalaryPlanFormula extends Component {
    constructor(props) {
        super(props);
        let { year, id, salaryIsApproved, yearName } = this.props.location.state;
        this.state = {
            staffDetails: {},
            salaryIsApproved: salaryIsApproved,
            year: year,
            yearName: yearName,
            staff_id: id,
            loading: true,
            formulaLoading: false,
            open: false,
            alertData: "",
            submitDisable: false,
            submitPermission: isUserHasPermission("payroll_salaryplan", "create"),
            // Formula data
            formulas: [],
            selectedFormula: "",
            previewData: null,
            optInStatus: {},  // { sequence: boolean } — true = opted in
        };
    }

    componentDidMount() {
        this.getStaffDetails();
        this.loadFormulas();
    }

    getStaffDetails = () => {
        const { staff_id } = this.state;
        const url = GET_URL.staffalldetail.api + staff_id + "/";
        getRequest(url, {}, this.props).then((response) => {
            if (response && response.status === 200) {
                this.setState({
                    staffDetails: response.data.data,
                    loading: false,
                });
            }
        });
    };

    loadFormulas = () => {
        getRequest(GET_URL.salaryformula.api, {}, this.props).then((res) => {
            if (res && res.status === 200) {
                const formulas = Array.isArray(res.data.data || res.data)
                    ? (res.data.data || res.data) : [];
                // Auto-select the default or first formula
                const defaultFormula = formulas.find(f => f.is_default && f.is_active) || formulas[0];
                this.setState({
                    formulas,
                    selectedFormula: defaultFormula ? defaultFormula.id : "",
                }, () => {
                    if (this.state.selectedFormula) {
                        this.loadFormulaPreview();
                    }
                });
            }
        });
    };

    loadFormulaPreview = () => {
        const { selectedFormula, staff_id } = this.state;
        if (!selectedFormula || !staff_id) return;

        this.setState({ formulaLoading: true });
        postRequest(POST_URL.formulapayrollgenerate.api, {
            action: "formula_preview",
            formula: selectedFormula,
            staff: staff_id,
        }, this.props).then((res) => {
            if (res && res.status === 200) {
                const data = res.data.data || res.data;
                // Initialize opt-in status: all opted in by default
                const optInStatus = {};
                if (data.steps) {
                    data.steps.forEach((step) => {
                        if (step.is_optional) {
                            optInStatus[step.sequence] = true; // default: opted-in
                        }
                    });
                }
                this.setState({
                    previewData: data,
                    optInStatus,
                    formulaLoading: false,
                });
            } else {
                this.setState({ formulaLoading: false });
            }
        }).catch(() => {
            this.setState({ formulaLoading: false });
        });
    };

    toggleOptIn = (sequence) => {
        this.setState((prevState) => ({
            optInStatus: {
                ...prevState.optInStatus,
                [sequence]: !prevState.optInStatus[sequence],
            },
        }));
    };

    isOptedIn = (step) => {
        if (!step.is_optional) return true; // non-optional rules are always included
        return this.state.optInStatus[step.sequence] !== false;
    };

    getComputedTotals = () => {
        const { previewData } = this.state;
        if (!previewData || !previewData.steps) {
            return { gross_earnings: 0, total_deductions: 0, net_pay: 0 };
        }
        const activeSteps = previewData.steps.filter(
            (s) => s.is_active && this.isOptedIn(s)
        );
        const gross_earnings = activeSteps
            .filter((s) => !s.is_deduction)
            .reduce((sum, s) => sum + s.prorated_value, 0);
        const total_deductions = activeSteps
            .filter((s) => s.is_deduction)
            .reduce((sum, s) => sum + s.prorated_value, 0);
        return {
            gross_earnings: Math.round(gross_earnings * 100) / 100,
            total_deductions: Math.round(total_deductions * 100) / 100,
            net_pay: Math.round((gross_earnings - total_deductions) * 100) / 100,
        };
    };

    saveData = () => {
        const { staff_id, year, previewData } = this.state;
        if (!previewData || !previewData.steps) {
            this.setState({ open: true, alertData: "No formula data to save." });
            return;
        }

        const totals = this.getComputedTotals();
        if (totals.net_pay <= 0) {
            this.setState({
                open: true,
                alertData: "Net pay must be greater than 0.",
            });
            return;
        }

        // Build salary_plan array from opted-in active steps
        const salary_plan = previewData.steps
            .filter((s) => s.is_active && this.isOptedIn(s))
            .map((step) => ({
                salary_component: step.salary_component,
                salary_component_name: step.component,
                amount: step.prorated_value,
                is_deduction: step.is_deduction,
                is_approved: true,
                is_optional: step.is_optional || false,
                opted_in: this.isOptedIn(step),
            }));

        const post_data = {
            staff: staff_id,
            financial_year: year,
            salary_plan: salary_plan,
            formula: this.state.selectedFormula,
            use_formula: true,
            opted_out_sequences: Object.entries(this.state.optInStatus)
                .filter(([, v]) => v === false)
                .map(([seq]) => parseInt(seq)),
        };

        this.setState({ submitDisable: true });
        postRequest(POST_URL.salaryemployeeplan.api, post_data, this.props).then(
            (response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: "top-end",
                        icon: "success",
                        title: "Salary plan saved successfully",
                        showConfirmButton: false,
                        timer: 1500,
                    });
                    this.viewPage();
                }
                this.setState({ submitDisable: false });
            }
        );
    };

    viewPage = () => {
        this.props.history.push(Actions.payroll_salaryplan.view.url);
    };

    handleClose = () => {
        this.setState({ open: false });
    };

    // ─── RENDER HELPERS ─────────────────────────────────
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
                            {numberWithCommas(staffDetails.salary)}
                        </Typography>
                    </Box>
                    <Box className="salary-profile-h-detail-item">
                        <Typography className="salary-profile-h-label">Monthly Salary</Typography>
                        <Typography className="salary-profile-h-value salary-profile-h-salary">
                            {numberWithCommas(Math.round(staffDetails.salary / 12))}
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        );
    };

    renderEarningsTable = () => {
        const { previewData, salaryIsApproved } = this.state;
        if (!previewData || !previewData.steps) return null;

        const earnings = previewData.steps.filter(
            (s) => !s.is_deduction && s.is_active
        );
        const totals = this.getComputedTotals();

        return (
            <Box className="salary-formula-section">
                <Typography className="salary-formula-section-title salary-formula-earnings-title">
                    Earnings
                </Typography>
                <TableContainer>
                    <Table size="small" className="salary-formula-table">
                        <colgroup>
                            <col />
                            <col className="salary-formula-col-amount" style={{ width: 140 }} />
                            <col className="salary-formula-col-optin" style={{ width: 100 }} />
                        </colgroup>
                        <TableHead>
                            <TableRow className="salary-formula-table-header">
                                <TableCell className="salary-formula-header-cell">Component</TableCell>
                                <TableCell className="salary-formula-header-cell" align="right">
                                    Amount (₹)
                                </TableCell>
                                <TableCell className="salary-formula-header-cell" align="center" style={{ width: 100 }}>
                                    Opt In/Out
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {earnings.map((step, idx) => {
                                const optedIn = this.isOptedIn(step);
                                return (
                                    <TableRow
                                        key={idx}
                                        className="salary-formula-data-row"
                                        style={{ opacity: optedIn ? 1 : 0.45 }}
                                    >
                                        <TableCell className="salary-formula-cell">
                                            <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                                                <span>{step.component}</span>
                                                {step.is_optional && (
                                                    <Chip
                                                        label="Optional"
                                                        size="small"
                                                        style={{
                                                            backgroundColor: optedIn ? '#e8f5e9' : '#ffebee',
                                                            color: optedIn ? '#2e7d32' : '#c62828',
                                                            fontWeight: 500,
                                                            fontSize: 10,
                                                            height: 20,
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell className="salary-formula-cell" align="right" style={{ fontWeight: 500 }}>
                                            {optedIn
                                                ? numberWithCommasWithoutSymbol(step.prorated_value)
                                                : "—"
                                            }
                                        </TableCell>
                                        <TableCell className="salary-formula-cell" align="center">
                                            {step.is_optional ? (
                                                <Tooltip title={optedIn ? "Opt out of this component" : "Opt in to this component"}>
                                                    <Switch
                                                        size="small"
                                                        checked={optedIn}
                                                        onChange={() => this.toggleOptIn(step.sequence)}
                                                        color="primary"
                                                        disabled={salaryIsApproved}
                                                    />
                                                </Tooltip>
                                            ) : (
                                                <Typography variant="caption" style={{ color: '#aaa' }}>—</Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            <TableRow className="salary-formula-total-row">
                                <TableCell className="salary-formula-total-cell">
                                    <strong>Gross Earnings (A)</strong>
                                </TableCell>
                                <TableCell className="salary-formula-total-cell" align="right">
                                    <strong>{numberWithCommasWithoutSymbol(totals.gross_earnings)}</strong>
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    renderDeductionsTable = () => {
        const { previewData, salaryIsApproved } = this.state;
        if (!previewData || !previewData.steps) return null;

        const deductions = previewData.steps.filter(
            (s) => s.is_deduction && s.is_active
        );
        const totals = this.getComputedTotals();

        return (
            <Box className="salary-formula-section">
                <Typography className="salary-formula-section-title salary-formula-deductions-title">
                    Deductions
                </Typography>
                <TableContainer>
                    <Table size="small" className="salary-formula-table">
                        <colgroup>
                            <col />
                            <col className="salary-formula-col-amount" style={{ width: 140 }} />
                            <col className="salary-formula-col-optin" style={{ width: 100 }} />
                        </colgroup>
                        <TableHead>
                            <TableRow className="salary-formula-table-header">
                                <TableCell className="salary-formula-header-cell">Component</TableCell>
                                <TableCell className="salary-formula-header-cell" align="right">
                                    Amount (₹)
                                </TableCell>
                                <TableCell className="salary-formula-header-cell" align="center" style={{ width: 100 }}>
                                    Opt In/Out
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {deductions.map((step, idx) => {
                                const optedIn = this.isOptedIn(step);
                                return (
                                    <TableRow
                                        key={idx}
                                        className="salary-formula-data-row"
                                        style={{ opacity: optedIn ? 1 : 0.45 }}
                                    >
                                        <TableCell className="salary-formula-cell">
                                            <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                                                <span>{step.component}</span>
                                                {step.is_optional && (
                                                    <Chip
                                                        label="Optional"
                                                        size="small"
                                                        style={{
                                                            backgroundColor: optedIn ? '#e8f5e9' : '#ffebee',
                                                            color: optedIn ? '#2e7d32' : '#c62828',
                                                            fontWeight: 500,
                                                            fontSize: 10,
                                                            height: 20,
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell className="salary-formula-cell" align="right" style={{ fontWeight: 500 }}>
                                            {optedIn
                                                ? numberWithCommasWithoutSymbol(step.prorated_value)
                                                : "—"
                                            }
                                        </TableCell>
                                        <TableCell className="salary-formula-cell" align="center">
                                            {step.is_optional ? (
                                                <Tooltip title={optedIn ? "Opt out of this deduction" : "Opt in to this deduction"}>
                                                    <Switch
                                                        size="small"
                                                        checked={optedIn}
                                                        onChange={() => this.toggleOptIn(step.sequence)}
                                                        color="primary"
                                                        disabled={salaryIsApproved}
                                                    />
                                                </Tooltip>
                                            ) : (
                                                <Typography variant="caption" style={{ color: '#aaa' }}>—</Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            <TableRow className="salary-formula-total-row">
                                <TableCell className="salary-formula-total-cell">
                                    <strong>Gross Deductions (B)</strong>
                                </TableCell>
                                <TableCell className="salary-formula-total-cell" align="right">
                                    <strong>{numberWithCommasWithoutSymbol(totals.total_deductions)}</strong>
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    renderNetPayCard = () => {
        const totals = this.getComputedTotals();
        const isNegative = totals.net_pay < 0;

        return (
            <Box className="salary-summary-card">
                <Box className="salary-summary-row">
                    <Typography className="salary-summary-label">
                        Gross Earnings (A)
                    </Typography>
                    <Typography className="salary-summary-value">
                        ₹ {numberWithCommasWithoutSymbol(totals.gross_earnings)}
                    </Typography>
                </Box>

                <Box className="salary-summary-row">
                    <Typography className="salary-summary-label">
                        Gross Deductions (B)
                    </Typography>
                    <Typography className="salary-summary-value">
                        ₹ {numberWithCommasWithoutSymbol(totals.total_deductions)}
                    </Typography>
                </Box>

                <Box className="salary-summary-divider" />

                <Box className="salary-summary-row salary-summary-net">
                    <Typography className="salary-summary-net-label">
                        Net Pay
                    </Typography>
                    <Typography
                        className={`salary-summary-net-value ${isNegative ? "salary-summary-negative" : ""
                            }`}
                    >
                        ₹ {numberWithCommasWithoutSymbol(totals.net_pay)}
                    </Typography>
                </Box>
            </Box>
        );
    };


    render() {
        const {
            loading,
            formulaLoading,
            previewData,
            submitDisable,
            alertData,
            open,
            salaryIsApproved,
            submitPermission,
        } = this.state;

        if (loading) {
            return <LoadingGif />;
        }

        return (
            <Paper className={classNames("paper-background")}>
                {/* Header */}
                <Grid container>
                    <Grid item md={6} xs={12} className={classNames("header-align")}>
                        <Box className="heading">Salary Plan</Box>
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <Box className={classNames("header-align", "end-flex-prop")}>
                            <Button
                                variant="contained"
                                onClick={() => this.viewPage()}
                                className="editbutton-view"
                            >
                                <VisibilityOutlined className="visibility-icon" />
                                Salary Plan
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                {/* Centered body content */}
                <Box className="salary-body-wrapper" style={{ marginTop: 12 }}>
                    {/* Profile Card */}
                    {this.renderProfileCard()}

                    {/* Formula Selector */}
                    <Box style={{ marginTop: 16, marginBottom: 8 }}>
                        <FormControl variant="outlined" style={{ minWidth: 320 }}>
                            <InputLabel id="formula-select-label">Salary Formula</InputLabel>
                            <Select
                                labelId="formula-select-label"
                                id="formula-select"
                                value={this.state.selectedFormula}
                                onChange={(e) => {
                                    this.setState(
                                        { selectedFormula: e.target.value },
                                        () => this.loadFormulaPreview()
                                    );
                                }}
                                label="Salary Formula"
                                disabled={salaryIsApproved}
                            >
                                {this.state.formulas
                                    .filter((f) => f.is_active)
                                    .map((f) => (
                                        <MenuItem key={f.id} value={f.id}>
                                            {f.name}
                                            {f.is_default ? " (Default)" : ""}
                                        </MenuItem>
                                    ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Formula-driven content */}
                    <Box style={{ marginTop: 20 }}>
                        {formulaLoading ? (
                            <Box display="flex" justifyContent="center" alignItems="center" py={6}>
                                <CircularProgress size={32} />
                                <Typography style={{ marginLeft: 12, color: '#777' }}>
                                    Loading formula preview...
                                </Typography>
                            </Box>
                        ) : previewData ? (
                            <Box>
                                <Box className="salary-panels-grid">
                                    <Box className="salary-panel-card">
                                        {this.renderEarningsTable()}
                                    </Box>
                                    <Box className="salary-panel-card">
                                        {this.renderDeductionsTable()}
                                    </Box>
                                </Box>
                                {this.renderNetPayCard()}
                            </Box>
                        ) : (
                            <Box display="flex" justifyContent="center" py={6}>
                                <Typography style={{ color: '#999' }}>
                                    No formula data available. Please configure a default formula for this financial year.
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Submit Button */}
                    {!salaryIsApproved && submitPermission && previewData && (
                        <Box
                            display="flex"
                            justifyContent="flex-end"
                            style={{ padding: '24px 0 16px' }}
                        >
                            <Button
                                variant="contained"
                                className="submit"
                                disabled={submitDisable}
                                onClick={() => this.saveData()}
                                style={{
                                    backgroundColor: '#4caf50',
                                    color: '#fff',
                                    fontWeight: 600,
                                    padding: '8px 32px',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                }}
                            >
                                Approve and Submit
                            </Button>
                        </Box>
                    )}
                </Box>

                <Snackbar
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    open={open}
                    autoHideDuration={3000}
                    onClose={this.handleClose}
                >
                    <Alert onClose={this.handleClose} severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>
            </Paper>
        );
    }
}

export default withRouter(AddSalaryPlanFormula);
