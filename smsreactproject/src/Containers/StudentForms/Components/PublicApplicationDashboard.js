import React, { Component } from 'react';
import {
    Box, Paper, Typography, Button, Grid, Card, CardContent, 
    List, ListItem, ListItemIcon, ListItemText, Divider,
    CircularProgress, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import GetAppIcon from '@material-ui/icons/GetApp';
import PaymentIcon from '@material-ui/icons/Payment';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import PersonIcon from '@material-ui/icons/Person';
import ReceiptIcon from '@material-ui/icons/Receipt';
import CloseIcon from '@material-ui/icons/Close';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import moment from 'moment';
import Swal from 'sweetalert2';

class PublicApplicationDashboard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            applications: [],
            payments: [],
            totalApplications: 0,
            totalPayments: 0,
            selectedApplication: null,
            dialogOpen: false,
            activeSection: 'dashboard',
            downloadLoadingId: null
        };
    }

    componentDidMount() {
        // Check if user is logged in
        const token = localStorage.getItem('application_form_token');
        if (!token) {
            this.props.history.push('/apply/login');
            return;
        }
        
        this.fetchDashboardData();
    }

    fetchDashboardData = async () => {
        try {
            const url = GET_URL.applicationuserdashboard?.api || 'forms/applicationuserdashboard/';
            const response = await getRequest(url, this.props);
            
            if (response && response.status === 200 && response.data && response.data.data) {
                this.setState({
                    applications: response.data.data.applications || [],
                    payments: response.data.data.payments || [],
                    totalApplications: response.data.data.total_applications || 0,
                    totalPayments: response.data.data.total_payments || 0,
                    loading: false
                });
            } else {
                this.setState({ loading: false });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            this.setState({ loading: false });
        }
    }

    handleNavigation = (section) => {
        if (section === 'application') {
            // Navigate to application form
            this.props.history.push('/apply/application');
        } else {
            this.setState({ activeSection: section });
            
            if (section === 'payment') {
                // Show payment section
                this.setState({ activeSection: 'payment' });
            } else if (section === 'download') {
                // Show download section
                this.setState({ activeSection: 'download' });
            }
        }
    }

    handleLogout = () => {
        localStorage.removeItem('application_form_token');
        localStorage.removeItem('application_form_mobile');
        localStorage.removeItem('application_form_expiry');
        this.props.history.push('/apply/login');
    }

    handleViewApplication = (application) => {
        this.setState({
            selectedApplication: application,
            dialogOpen: true
        });
    }

    handleCloseDialog = () => {
        this.setState({
            dialogOpen: false,
            selectedApplication: null
        });
    }

    handleDownloadPDF = (application) => {
        const id = application?.id;
        if (!id) return;
        const baseUrl = GET_URL.applicationuserdashboard?.api || 'forms/applicationuserdashboard/';
        const pdfUrl = `${baseUrl}${id}/`;
        this.setState({ downloadLoadingId: id });
        const prop = { ...this.props, responseType: 'blob' };
        getRequest(pdfUrl, {}, prop)
            .then((response) => {
                this.setState({ downloadLoadingId: null });
                if (response && response.status === 200 && response.data) {
                    const blob = new Blob([response.data], { type: 'application/pdf' });
                    const fileURL = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = fileURL;
                    link.download = `application-${id}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(fileURL);
                    Swal.fire({
                        position: 'top-end',
                        icon: 'success',
                        title: 'PDF downloaded successfully',
                        showConfirmButton: false,
                        timer: 1500
                    });
                } else {
                    Swal.fire({ icon: 'error', title: 'Failed to download PDF' });
                }
            })
            .catch(() => {
                this.setState({ downloadLoadingId: null });
                Swal.fire({ icon: 'error', title: 'Failed to download PDF' });
            });
    }

    handleDownloadReceipt = (payment) => {
        const id = payment?.id;
        if (!id) return;
        const baseUrl = GET_URL.applicationuserdashboard?.api || 'forms/applicationuserdashboard/';
        const pdfUrl = `${baseUrl}${id}/`;
        this.setState({ downloadLoadingId: 'receipt-' + id });
        const prop = { ...this.props, responseType: 'blob' };
        getRequest(pdfUrl, { receipt: 1 }, prop)
            .then((response) => {
                this.setState({ downloadLoadingId: null });
                if (response && response.status === 200 && response.data) {
                    const blob = new Blob([response.data], { type: 'application/pdf' });
                    const fileURL = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = fileURL;
                    link.download = `receipt-${id}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(fileURL);
                    Swal.fire({
                        position: 'top-end',
                        icon: 'success',
                        title: 'Receipt downloaded successfully',
                        showConfirmButton: false,
                        timer: 1500
                    });
                } else {
                    Swal.fire({ icon: 'error', title: 'Failed to download receipt' });
                }
            })
            .catch(() => {
                this.setState({ downloadLoadingId: null });
                Swal.fire({ icon: 'error', title: 'Failed to download receipt' });
            });
    }

    renderSidebar = () => {
        const { activeSection } = this.state;
        
        return (
            <Box
                style={{
                    width: '280px',
                    backgroundColor: '#1e3a8a',
                    color: 'white',
                    minHeight: '100vh',
                    padding: '20px 0',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 1000
                }}
            >
                <Box padding="20px" borderBottom="1px solid rgba(255,255,255,0.1)">
                    <Typography variant="h6" style={{ fontWeight: 600 }}>
                        APPLICATION FORM
                    </Typography>
                </Box>
                
                <Box style={{ flex: 1, overflowY: 'auto' }}>
                    <List style={{ paddingTop: '10px' }}>
                        <ListItem
                            button
                            selected={activeSection === 'dashboard'}
                            onClick={() => this.handleNavigation('dashboard')}
                            style={{
                                backgroundColor: activeSection === 'dashboard' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                borderLeft: activeSection === 'dashboard' ? '4px solid #60a5fa' : '4px solid transparent',
                                paddingLeft: '20px'
                            }}
                        >
                            <ListItemIcon style={{ color: 'white', minWidth: '40px' }}>
                                <CheckCircleIcon />
                            </ListItemIcon>
                            <ListItemText primary="Admission Form" />
                        </ListItem>
                        
                        <ListItem
                            button
                            selected={activeSection === 'download'}
                            onClick={() => this.handleNavigation('download')}
                            style={{
                                backgroundColor: activeSection === 'download' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                borderLeft: activeSection === 'download' ? '4px solid #60a5fa' : '4px solid transparent',
                                paddingLeft: '20px'
                            }}
                        >
                            <ListItemIcon style={{ color: 'white', minWidth: '40px' }}>
                                <GetAppIcon />
                            </ListItemIcon>
                            <ListItemText primary="Download/Pdf" />
                        </ListItem>
                        
                        <ListItem
                            button
                            selected={activeSection === 'payment'}
                            onClick={() => this.handleNavigation('payment')}
                            style={{
                                backgroundColor: activeSection === 'payment' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                borderLeft: activeSection === 'payment' ? '4px solid #60a5fa' : '4px solid transparent',
                                paddingLeft: '20px'
                            }}
                        >
                            <ListItemIcon style={{ color: 'white', minWidth: '40px' }}>
                                <PaymentIcon />
                            </ListItemIcon>
                            <ListItemText primary="Payment" />
                        </ListItem>
                        
                        <ListItem
                            button
                            onClick={() => this.handleNavigation('application')}
                            style={{
                                paddingLeft: '20px'
                            }}
                        >
                            <ListItemIcon style={{ color: 'white', minWidth: '40px' }}>
                                <AddCircleIcon />
                            </ListItemIcon>
                            <ListItemText primary="Add New Application" />
                        </ListItem>
                    </List>
                </Box>
                
                <Box 
                    padding="20px" 
                    style={{ 
                        width: '100%',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        marginTop: 'auto'
                    }}
                >
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={this.handleLogout}
                        style={{
                            color: 'white',
                            borderColor: 'white',
                            textTransform: 'none',
                            padding: '10px'
                        }}
                    >
                        Logout
                    </Button>
                </Box>
            </Box>
        );
    }

    renderDashboard = () => {
        const { applications, payments, loading } = this.state;
        
        if (loading) {
            return (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            );
        }

        return (
            <Box>
                <Typography variant="h5" style={{ marginBottom: '20px', fontWeight: 600 }}>
                    My Applications & Payments
                </Typography>
                
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" color="primary" gutterBottom>
                                    Applications ({this.state.totalApplications})
                                </Typography>
                                {applications.length > 0 ? (
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Application #</TableCell>
                                                    <TableCell>Student Name</TableCell>
                                                    <TableCell>Class</TableCell>
                                                    <TableCell>Date</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    <TableCell>Action</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {applications.map((app) => (
                                                    <TableRow key={app.id}>
                                                        <TableCell>{app.application_num || `APP-${app.id}`}</TableCell>
                                                        <TableCell>{app.first_name} {app.last_name || ''}</TableCell>
                                                        <TableCell>{app.current_standard_name || app.current_standard?.name || 'N/A'}</TableCell>
                                                        <TableCell>{moment(app.application_date).format('DD/MM/YYYY')}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={app.is_approved ? 'Approved' : 'Pending'}
                                                                color={app.is_approved ? 'primary' : 'default'}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                size="small"
                                                                onClick={() => this.handleViewApplication(app)}
                                                            >
                                                                View
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body2" color="textSecondary">
                                        No applications submitted yet.
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" color="primary" gutterBottom>
                                    Payments ({this.state.totalPayments})
                                </Typography>
                                {payments.length > 0 ? (
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Receipt #</TableCell>
                                                    <TableCell>Amount</TableCell>
                                                    <TableCell>Date</TableCell>
                                                    <TableCell>Mode</TableCell>
                                                    <TableCell>Status</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {payments.map((payment) => (
                                                    <TableRow key={payment.id}>
                                                        <TableCell>{payment.receipt_num || `RCP-${payment.id}`}</TableCell>
                                                        <TableCell>₹{payment.amount_paid?.toFixed(2) || '0.00'}</TableCell>
                                                        <TableCell>{moment(payment.transaction_date).format('DD/MM/YYYY')}</TableCell>
                                                        <TableCell>{payment.mode_of_payment || 'N/A'}</TableCell>
                                                        <TableCell>
                                                            <Chip label="Paid" color="primary" size="small" />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body2" color="textSecondary">
                                        No payments made yet.
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        );
    }

    renderPaymentSection = () => {
        const { payments } = this.state;
        
        return (
            <Box>
                <Typography variant="h5" style={{ marginBottom: '20px', fontWeight: 600 }}>
                    Payment History
                </Typography>
                
                <Card>
                    <CardContent>
                        {payments.length > 0 ? (
                            <TableContainer>
                                <Table>
                                        <TableHead>
                                                <TableRow>
                                                    <TableCell>Receipt Number</TableCell>
                                                    <TableCell>Application Number</TableCell>
                                                    <TableCell>Student Name</TableCell>
                                                    <TableCell>Amount Paid</TableCell>
                                                    <TableCell>Transaction Date</TableCell>
                                                    <TableCell>Payment Mode</TableCell>
                                                    <TableCell>Reference Number</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {payments.map((payment) => (
                                                    <TableRow key={payment.id}>
                                                        <TableCell>{payment.receipt_num || `RCP-${payment.id}`}</TableCell>
                                                        <TableCell>{payment.application_num || 'N/A'}</TableCell>
                                                        <TableCell>{payment.student_name || 'N/A'}</TableCell>
                                                        <TableCell>₹{payment.amount_paid?.toFixed(2) || '0.00'}</TableCell>
                                                        <TableCell>{moment(payment.transaction_date).format('DD/MM/YYYY')}</TableCell>
                                                        <TableCell>{payment.mode_of_payment || 'N/A'}</TableCell>
                                                        <TableCell>{payment.payment_ref_num || 'N/A'}</TableCell>
                                                    </TableRow>
                                                ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography variant="body1" color="textSecondary" align="center" style={{ padding: '40px' }}>
                                No payment history available.
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Box>
        );
    }

    renderDownloadSection = () => {
        const { applications } = this.state;
        
        return (
            <Box>
                <Typography variant="h5" style={{ marginBottom: '20px', fontWeight: 600 }}>
                    Download Application Forms
                </Typography>
                
                <Grid container spacing={3}>
                    {applications.length > 0 ? (
                        applications.map((app) => (
                            <Grid item xs={12} md={6} key={app.id}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            {app.application_num || `Application #${app.id}`}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" gutterBottom>
                                            Student: {app.first_name} {app.last_name || ''}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" gutterBottom>
                                            Class: {app.current_standard_name || app.current_standard?.name || 'N/A'}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" gutterBottom>
                                            Date: {moment(app.application_date).format('DD/MM/YYYY')}
                                        </Typography>
                                        <Box marginTop="15px" display="flex" flexWrap="wrap" style={{ gap: 12 }}>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                startIcon={this.state.downloadLoadingId === 'receipt-' + app.id ? <CircularProgress size={18} color="inherit" /> : <ReceiptIcon />}
                                                onClick={() => this.handleDownloadReceipt(app)}
                                                disabled={!!this.state.downloadLoadingId}
                                            >
                                                {this.state.downloadLoadingId === 'receipt-' + app.id ? 'Downloading...' : 'Download Receipt'}
                                            </Button>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                startIcon={this.state.downloadLoadingId === app.id ? <CircularProgress size={18} color="inherit" /> : <GetAppIcon />}
                                                onClick={() => this.handleDownloadPDF(app)}
                                                disabled={!!this.state.downloadLoadingId}
                                            >
                                                {this.state.downloadLoadingId === app.id ? 'Downloading...' : 'Download Application PDF'}
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))
                    ) : (
                        <Grid item xs={12}>
                            <Typography variant="body1" color="textSecondary" align="center" style={{ padding: '40px' }}>
                                No applications available for download.
                            </Typography>
                        </Grid>
                    )}
                </Grid>
            </Box>
        );
    }

    render() {
        const { activeSection, dialogOpen, selectedApplication } = this.state;
        
        return (
            <Box display="flex" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
                {this.renderSidebar()}
                
                <Box
                    style={{
                        marginLeft: '280px',
                        padding: '30px',
                        width: 'calc(100% - 280px)'
                    }}
                >
                    <Paper style={{ padding: '30px', minHeight: 'calc(100vh - 60px)' }}>
                        {activeSection === 'dashboard' && this.renderDashboard()}
                        {activeSection === 'payment' && this.renderPaymentSection()}
                        {activeSection === 'download' && this.renderDownloadSection()}
                    </Paper>
                </Box>
                
                {/* Application Detail Dialog */}
                <Dialog
                    open={dialogOpen}
                    onClose={this.handleCloseDialog}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6">Application Details</Typography>
                            <IconButton onClick={this.handleCloseDialog}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        {selectedApplication && (
                            <Box>
                                <Typography variant="body1"><strong>Application Number:</strong> {selectedApplication.application_num || `APP-${selectedApplication.id}`}</Typography>
                                <Typography variant="body1"><strong>Student Name:</strong> {selectedApplication.first_name} {selectedApplication.last_name || ''}</Typography>
                                <Typography variant="body1"><strong>Date of Birth:</strong> {selectedApplication.dob ? moment(selectedApplication.dob).format('DD/MM/YYYY') : 'N/A'}</Typography>
                                <Typography variant="body1"><strong>Class:</strong> {selectedApplication.current_standard_name || selectedApplication.current_standard?.name || 'N/A'}</Typography>
                                <Typography variant="body1"><strong>Application Date:</strong> {moment(selectedApplication.application_date).format('DD/MM/YYYY')}</Typography>
                                <Typography variant="body1"><strong>Status:</strong> {selectedApplication.is_approved ? 'Approved' : 'Pending'}</Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleCloseDialog}>Close</Button>
                        {selectedApplication && (
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={this.state.downloadLoadingId === selectedApplication.id ? <CircularProgress size={18} color="inherit" /> : <GetAppIcon />}
                                onClick={() => this.handleDownloadPDF(selectedApplication)}
                                disabled={!!this.state.downloadLoadingId}
                            >
                                {this.state.downloadLoadingId === selectedApplication.id ? 'Downloading...' : 'Download PDF'}
                            </Button>
                        )}
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

export default withRouter(PublicApplicationDashboard);

