import React, { Component } from "react";
import {
    Paper, Box, Grid, Button, Avatar,
    Table, TableContainer, TableHead, TableCell,
    TableRow, TableBody, Typography,
    CircularProgress,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import VisibilityOutlined from "@material-ui/icons/VisibilityOutlined";
import Swal from "sweetalert2";
import classNames from "classnames";
import { getRequest, postRequest, postRequestOnConfirm } from "Includes/api/apicall";
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
import WarningIcon from "@material-ui/icons/Warning";
import StaffSalaryDetail from "Containers/Payroll/Components/StaffSalaryDetail";
import moment from "moment";
import "./styles.scss";

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class AddSalaryPaymentFormula extends Component {
    constructor(props) {
        super(props);
        let {
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
            formulaLoading: false,
            open: false,
            alertData: "",
            error: false,
            errorMessage: "",
            submitDisable: false,
            submitPermission: isUserHasPermission("payroll_salarypayment", "create"),
            isDetailedReport: false,
            salaryDetailedReport: {},
            smYear: salaryMonth ? Number(salaryMonth.split("-")[0]) : null,
            smMonth: salaryMonth ? Number(salaryMonth.split("-")[1]) : null,
            formulas: [],
            selectedFormula: "",
            previewData: null,
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
        const { selectedFormula, staff_id, smYear, smMonth } = this.state;
        if (!selectedFormula || !staff_id) return;

        this.setState({ formulaLoading: true });
        postRequest(POST_URL.formulapayrollgenerate.api, {
            action: "formula_preview",
            formula: selectedFormula,
            staff: staff_id,
            salary_month: smYear && smMonth ? `${smYear}-${smMonth.toString().padStart(2, '0')}` : undefined
        }, this.props).then((res) => {
            if (res && res.status === 200) {
                const data = res.data.data || res.data;
                this.setState({
                    previewData: data,
                    formulaLoading: false,
                });
            } else {
                this.setState({ formulaLoading: false });
            }
        }).catch(() => {
            this.setState({ formulaLoading: false });
        });
    };

    getComputedTotals = () => {
        const { previewData } = this.state;
        if (!previewData || !previewData.steps) {
            return { gross_earnings: 0, total_deductions: 0, net_pay: 0 };
        }
        const activeSteps = previewData.steps.filter((s) => s.is_active);
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

    viewPage = () => {
        let { salaryMonth, salaryMonthName, month } = this.state;
        let params = {
            salaryMonth: salaryMonth,
            salaryMonthName: salaryMonthName,
            month: month,
        };
        let searchParam = "?" + new URLSearchParams(params).toString();
        this.props.history.push({
            pathname: Actions.payroll_salarypayment.view.url,
            search: searchParam,
        });
    };

    handleClose = () => {
        this.setState({ open: false });
    };

    handleOpenDetailed = () => {
        this.setState({ isDetailedReport: !this.state.isDetailedReport });
    };

    saveData = () => {
        const { staff_id, salaryMonth, previewData } = this.state;
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

        const salary_plan = previewData.steps
            .filter((s) => s.is_active)
            .map((step) => ({
                salary_component: step.salary_component,
                salary_component_name: step.component,
                amount: step.prorated_value,
                is_deduction: step.is_deduction,
            }));

        const post_data = {
            staff: staff_id,
            salary_month: salaryMonth,
            salary_plan: salary_plan,
        };

        this.setState({ submitDisable: true });
        postRequestOnConfirm(
            POST_URL.salaryemployeemonthplan.api,
            post_data,
            this.props,
            "PaySalary"
        ).then((response) => {
            if (response && response.status === 200) {
                Swal.fire({
                    position: "top-end",
                    icon: "success",
                    title: "Salary has been paid successfully",
                    showConfirmButton: false,
                    timer: 1500,
                });
                this.viewPage();
            }
            this.setState({ submitDisable: false });
        });
    };

    renderProfileCard = () => {
        const { staffDetails, salaryMonthName } = this.state;
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

    renderAttendanceInfo = () => {
        const { previewData } = this.state;
        if (!previewData || !previewData.attendance) return null;
        const { working_days, present_days } = previewData.attendance;

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
                            {previewData.totals && previewData.totals.total_lop > 0 && (
                                <Typography style={{ fontSize: 12, color: '#c62828', fontWeight: 500 }}>
                                    (₹ {numberWithCommasWithoutSymbol(previewData.totals.total_lop)})
                                </Typography>
                            )}
                        </Box>
                    </Box>
                )}
            </Box>
        );
    };

    renderEarningsTable = () => {
        const { previewData } = this.state;
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
                        </colgroup>
                        <TableHead>
                            <TableRow className="salary-formula-table-header">
                                <TableCell className="salary-formula-header-cell">Component</TableCell>
                                <TableCell className="salary-formula-header-cell" align="right">
                                    Amount (₹)
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {earnings.map((step, idx) => (
                                <TableRow
                                    key={idx}
                                    className="salary-formula-data-row"
                                >
                                    <TableCell className="salary-formula-cell">
                                        {step.component}
                                    </TableCell>
                                    <TableCell className="salary-formula-cell" align="right" style={{ fontWeight: 500 }}>
                                        {numberWithCommasWithoutSymbol(step.prorated_value)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="salary-formula-total-row">
                                <TableCell className="salary-formula-total-cell">
                                    <strong>Gross Earnings (A)</strong>
                                </TableCell>
                                <TableCell className="salary-formula-total-cell" align="right">
                                    <strong>{numberWithCommasWithoutSymbol(totals.gross_earnings)}</strong>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    renderDeductionsTable = () => {
        const { previewData } = this.state;
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
                        </colgroup>
                        <TableHead>
                            <TableRow className="salary-formula-table-header">
                                <TableCell className="salary-formula-header-cell">Component</TableCell>
                                <TableCell className="salary-formula-header-cell" align="right">
                                    Amount (₹)
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {deductions.map((step, idx) => (
                                <TableRow
                                    key={idx}
                                    className="salary-formula-data-row"
                                >
                                    <TableCell className="salary-formula-cell">
                                        {step.component}
                                    </TableCell>
                                    <TableCell className="salary-formula-cell" align="right" style={{ fontWeight: 500 }}>
                                        {numberWithCommasWithoutSymbol(step.prorated_value)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="salary-formula-total-row">
                                <TableCell className="salary-formula-total-cell">
                                    <strong>Gross Deductions (B)</strong>
                                </TableCell>
                                <TableCell className="salary-formula-total-cell" align="right">
                                    <strong>{numberWithCommasWithoutSymbol(totals.total_deductions)}</strong>
                                </TableCell>
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


    // ─── MAIN RENDER ─────────────────────────────────────

    render() {
        const {
            loading,
            formulaLoading,
            previewData,
            submitDisable,
            alertData,
            open,
            salaryIsPaid,
            error,
            errorMessage,
            submitPermission,
            salaryMonthName,
            isDetailedReport,
            salaryDetailedReport,
            staffDetails,
            staff_id,
        } = this.state;

        if (loading) {
            return <LoadingGif />;
        }

        return (
            <Paper className={classNames("paper-background")}>
                {/* Header */}
                <Grid container>
                    <Grid item md={6} xs={12} className={classNames("header-align")}>
                        <Box className="heading">Salary Payment</Box>
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <Box className={classNames("header-align", "end-flex-prop")}>
                            <Button
                                variant="contained"
                                onClick={() => this.viewPage()}
                                className="editbutton-view"
                            >
                                <VisibilityOutlined className="visibility-icon" />
                                Salary Payment
                            </Button>
                        </Box>
                    </Grid>

                    <Box className="year-std-box mr-40">
                        <Box className="academic-std-head ">Salary Month</Box>
                        <Box className="aca-std-white-background">{salaryMonthName}</Box>
                    </Box>
                </Grid>

                {/* Error message */}
                {error && (
                    <Box display="flex" justifyContent="flex-end" className="waring-margin">
                        <Box display="flex" className="warning-message-salary warning-width">
                            <WarningIcon className="warning-text" /> {errorMessage}
                        </Box>
                    </Box>
                )}

                {/* Centered body content */}
                <Box className="salary-body-wrapper" style={{ marginTop: 12 }}>
                    {/* Profile Card */}
                    {this.renderProfileCard()}

                    {/* Attendance Info */}
                    <Box style={{ marginTop: 10 }}>
                        {this.renderAttendanceInfo()}
                    </Box>

                    {/* Formula-driven content */}
                    <Box style={{ marginTop: 20 }}>
                        {formulaLoading ? (
                            <Box display="flex" justifyContent="center" alignItems="center" py={6}>
                                <CircularProgress size={32} />
                                <Typography style={{ marginLeft: 12, color: '#777' }}>
                                    Loading salary preview...
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
                            !error && (
                                <Box display="flex" justifyContent="center" py={6}>
                                    <Typography style={{ color: '#999' }}>
                                        No formula data available. Please configure a default formula for this financial year.
                                    </Typography>
                                </Box>
                            )
                        )}
                    </Box>

                    {/* Submit / Pay Now Button */}
                    {!error && !salaryIsPaid && submitPermission && previewData && (
                        <Box
                            display="flex"
                            justifyContent="flex-end"
                            style={{ padding: '24px 0 16px' }}
                            className="submit-button-padding"
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
                                Pay Now
                            </Button>
                        </Box>
                    )}
                </Box>

                {/* Detailed Report Modal */}
                {isDetailedReport && (
                    <StaffSalaryDetail
                        closeInParent={this.handleOpenDetailed}
                        salaryDetailedReport={salaryDetailedReport}
                        salaryMonthName={salaryMonthName}
                        details={staffDetails}
                        staff_id={staff_id}
                    />
                )}

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

export default withRouter(AddSalaryPaymentFormula);
