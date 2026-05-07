import React, { Component } from 'react'
import {
    Paper, Box, Grid, TextField, Typography, Button,
    Table, TableHead, TableRow, TableCell, TableBody
} from '@material-ui/core';
import GetAppIcon from '@material-ui/icons/GetApp';
import { withRouter } from 'react-router-dom';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import LoadingGif from 'Components/LoadingGif';

class PayrollSummaryTable extends Component {

    constructor() {
        super();
        this.state = {
            salaryMonth: (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); return `${y}-${m}`; })(),
            staffList: [],
            componentColumns: [],
            loading: false,
            prerequisites: null,
        };
    }

    fetchData = () => {
        const { salaryMonth } = this.state;
        if (!salaryMonth) return;

        this.setState({ loading: true });

        getRequest(
            GET_URL.payrollsummary.api,
            { salary_month: salaryMonth },
            this.props
        ).then(response => {
            if (response && response.status === 200) {
                const responseData = response.data || {};
                const dataList = responseData.data || [];
                const columns = responseData.columns || [];
                const prerequisites = responseData.prerequisites || null;

                this.setState({
                    staffList: dataList,
                    componentColumns: columns,
                    loading: false,
                    prerequisites: prerequisites,
                });
            } else {
                this.setState({ loading: false, staffList: [], componentColumns: [], prerequisites: null });
            }
        }).catch(() => {
            this.setState({ loading: false, staffList: [], componentColumns: [], prerequisites: null });
        });
    }

    handleMonthChange = (e) => {
        this.setState({ salaryMonth: e.target.value, staffList: [], componentColumns: [], prerequisites: null }, () => {
            this.fetchData();
        });
    }

    handleDownloadExcel = () => {
        const { salaryMonth } = this.state;
        const url = `/api/${GET_URL.payrollsummary.api}download/?salary_month=${salaryMonth}&extn=xlsx`;
        window.open(url, '_blank');
    }

    componentDidMount() {
        this.fetchData();
    }

    render() {
        const { salaryMonth, staffList, componentColumns, loading, prerequisites } = this.state;

        const earningCols = componentColumns.filter(c => c.type === 'EARNING');
        const deductionCols = componentColumns.filter(c => c.type === 'DEDUCTION');

        const attendanceDone = prerequisites?.attendance_done;
        const salaryGenerated = prerequisites?.salary_generated;
        const attendanceSource = prerequisites?.attendance_source;

        let infoBanners = [];
        if (prerequisites && !attendanceDone) {
            infoBanners.push('Attendance not marked for this month. Please mark attendance (via Manual Attendance or Staff Attendance).');
        }
        if (prerequisites && !salaryGenerated && staffList.length === 0) {
            infoBanners.push('Salary not generated for this month. Please generate salary first.');
        }

        return (
            <Paper style={{ padding: 24 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5">
                        Payroll Summary
                    </Typography>

                    <Box display="flex" alignItems="center" style={{ gap: 12 }}>
                        <TextField
                            label="Select Month"
                            type="month"
                            value={salaryMonth}
                            onChange={this.handleMonthChange}
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                            size="small"
                        />
                        {staffList.length > 0 && (
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<GetAppIcon />}
                                onClick={this.handleDownloadExcel}
                                size="small"
                            >
                                Download Excel
                            </Button>
                        )}
                    </Box>
                </Box>

                {prerequisites && attendanceSource && attendanceSource !== 'none' && (
                    <Box mb={1}>
                        <Typography variant="body2" style={{ color: '#1565c0' }}>
                            Attendance source: <strong>{attendanceSource === 'manual' ? 'Manual Attendance' : 'Staff Attendance Module'}</strong>
                        </Typography>
                    </Box>
                )}

                {infoBanners.length > 0 && (
                    <Box mb={2}>
                        {infoBanners.map((msg, i) => (
                            <Box key={i} py={0.5} px={2} mb={1} style={{ backgroundColor: '#fff3e0', borderRadius: 4, border: '1px solid #ffe0b2' }}>
                                <Typography variant="body2" style={{ color: '#e65100' }}>
                                    ⚠ {msg}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}

                {loading ? (
                    <LoadingGif />
                ) : staffList.length === 0 ? (
                    <Box py={4} textAlign="center">
                        <Typography color="textSecondary" style={{ fontSize: 16 }}>
                            {infoBanners.length > 0
                                ? 'Complete the above steps to view payroll summary.'
                                : 'No payroll data found for this month.'}
                        </Typography>
                    </Box>
                ) : (
                    <Box style={{ overflowX: 'auto' }}>
                        <Table size="small" style={{ minWidth: 800 }}>
                            <TableHead>
                                <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell style={{ fontWeight: 'bold', position: 'sticky', left: 0, backgroundColor: '#f5f5f5', zIndex: 2 }}>#</TableCell>
                                    <TableCell style={{ fontWeight: 'bold', position: 'sticky', left: 30, backgroundColor: '#f5f5f5', zIndex: 2, minWidth: 150 }}>Staff Name</TableCell>
                                    <TableCell style={{ fontWeight: 'bold', textAlign: 'right' }}>Gross Salary</TableCell>
                                    {earningCols.map(col => (
                                        <TableCell key={col.name} style={{ fontWeight: 'bold', textAlign: 'right', color: '#2e7d32', whiteSpace: 'nowrap' }}>
                                            {col.name}
                                        </TableCell>
                                    ))}
                                    <TableCell style={{ fontWeight: 'bold', textAlign: 'right', color: '#2e7d32' }}>Total Earnings</TableCell>
                                    {deductionCols.map(col => (
                                        <TableCell key={col.name} style={{ fontWeight: 'bold', textAlign: 'right', color: '#d32f2f', whiteSpace: 'nowrap' }}>
                                            {col.name}
                                        </TableCell>
                                    ))}
                                    <TableCell style={{ fontWeight: 'bold', textAlign: 'right', color: '#d32f2f' }}>Total Deductions</TableCell>
                                    <TableCell style={{ fontWeight: 'bold', textAlign: 'right', color: '#1565c0' }}>Net Pay</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {staffList.map((staff, index) => {
                                    const compMap = {};
                                    if (staff.components) {
                                        staff.components.forEach(c => { compMap[c.component_name] = c.amount; });
                                    }
                                    return (
                                        <TableRow key={staff.staff_id} hover>
                                            <TableCell style={{ position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 1 }}>{index + 1}</TableCell>
                                            <TableCell style={{ position: 'sticky', left: 30, backgroundColor: '#fff', zIndex: 1, whiteSpace: 'nowrap' }}>
                                                {staff.staff_name}
                                            </TableCell>
                                            <TableCell style={{ textAlign: 'right' }}>
                                                {parseFloat(staff.gross_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            {earningCols.map(col => (
                                                <TableCell key={col.name} style={{ textAlign: 'right', color: '#2e7d32' }}>
                                                    {parseFloat(compMap[col.name] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            ))}
                                            <TableCell style={{ textAlign: 'right', fontWeight: 'bold', color: '#2e7d32' }}>
                                                {parseFloat(staff.total_earnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            {deductionCols.map(col => (
                                                <TableCell key={col.name} style={{ textAlign: 'right', color: '#d32f2f' }}>
                                                    {parseFloat(compMap[col.name] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            ))}
                                            <TableCell style={{ textAlign: 'right', fontWeight: 'bold', color: '#d32f2f' }}>
                                                {parseFloat(staff.total_deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell style={{ textAlign: 'right', fontWeight: 'bold', color: '#1565c0' }}>
                                                {parseFloat(staff.net_pay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

export default withRouter(PayrollSummaryTable);
