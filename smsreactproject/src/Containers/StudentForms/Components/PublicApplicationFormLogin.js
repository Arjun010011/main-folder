import React, { Component } from 'react';
import {
    Paper, TextField, Button, Typography, Box, CircularProgress,
    Snackbar, InputAdornment, IconButton
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import MuiAlert from '@material-ui/lab/Alert';
import PhoneIcon from '@material-ui/icons/Phone';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import Swal from 'sweetalert2';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class PublicApplicationFormLogin extends Component {
    constructor(props) {
        super(props);
        this.state = {
            mobile_num: '',
            otp: '',
            step: 'mobile', // 'mobile' or 'otp'
            loading: false,
            openSnackbar: false,
            alertData: '',
            errorStatus: 'success',
            countdown: 0,
            showPassword: false
        };
        this.countdownInterval = null;
    }

    componentDidMount() {
        localStorage.clear();
    }

    componentWillUnmount() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }

    handleChange = (e) => {
        const { name, value } = e.target;
        this.setState({
            [name]: value,
            [name + '_error']: ''
        });
    }

    validateMobile = () => {
        const { mobile_num } = this.state;
        if (!mobile_num || mobile_num.trim() === '') {
            this.setState({ mobile_num_error: 'Mobile number is required' });
            return false;
        }
        if (mobile_num.length < 10) {
            this.setState({ mobile_num_error: 'Please enter a valid mobile number' });
            return false;
        }
        return true;
    }

    validateOTP = () => {
        const { otp } = this.state;
        if (!otp || otp.trim() === '') {
            this.setState({ otp_error: 'OTP is required' });
            return false;
        }
        if (otp.length !== 6) {
            this.setState({ otp_error: 'Please enter a valid 6-digit OTP' });
            return false;
        }
        return true;
    }

    startCountdown = () => {
        this.setState({ countdown: 60 });
        this.countdownInterval = setInterval(() => {
            this.setState((prevState) => {
                if (prevState.countdown <= 1) {
                    clearInterval(this.countdownInterval);
                    return { countdown: 0 };
                }
                return { countdown: prevState.countdown - 1 };
            });
        }, 1000);
    }

    sendOTP = async () => {
        if (!this.validateMobile()) {
            return;
        }

        this.setState({ loading: true });
        const url = POST_URL.applicationformotp?.api || 'forms/applicationformotp/';
        const postData = {
            mobile_num: this.state.mobile_num.trim()
        };

        const props = { ...this.props, return_error: true, return_error_message: true, usePublicAPI: true };

        try {
            const response = await postRequest(url, postData, props);
            if (response && response.status === 200) {
                this.setState({
                    step: 'otp',
                    loading: false,
                    openSnackbar: true,
                    alertData: 'OTP sent successfully to your mobile number',
                    errorStatus: 'success'
                });
                this.startCountdown();
            } else {
                // Handle error response
                let errorMessage = 'Failed to send OTP. Please try again.';
                if (response && response.data) {
                    if (typeof response.data === 'string') {
                        errorMessage = response.data;
                    } else if (response.data.Reason) {
                        errorMessage = response.data.Reason;
                    } else if (response.data.error) {
                        errorMessage = response.data.error;
                    } else if (response.data.message) {
                        errorMessage = response.data.message;
                    }
                }
                this.setState({
                    loading: false,
                    openSnackbar: true,
                    alertData: errorMessage,
                    errorStatus: 'error'
                });
            }
        } catch (error) {
            // Handle network or other errors
            let errorMessage = 'Failed to send OTP. Please try again.';
            if (error && error.response && error.response.data) {
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.Reason) {
                    errorMessage = error.response.data.Reason;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            }
            this.setState({
                loading: false,
                openSnackbar: true,
                alertData: errorMessage,
                errorStatus: 'error'
            });
        }
    }

    verifyOTP = async () => {
        if (!this.validateOTP()) {
            return;
        }

        this.setState({ loading: true });
        const url = POST_URL.applicationformotp?.api || 'forms/applicationformotp/';
        const postData = {
            mobile_num: this.state.mobile_num.trim(),
            otp: this.state.otp.trim(),
            is_verify: 1
        };

        const props = { ...this.props, return_error: true, return_error_message: true, usePublicAPI: true };

        try {
            const response = await postRequest(url, postData, props);
            if (response && response.status === 200) {
                // Store token for application form session
                if (response.data && response.data.data && response.data.data.token) {
                    localStorage.setItem('application_form_token', response.data.data.token);
                    localStorage.setItem('application_form_mobile', this.state.mobile_num);
                    localStorage.setItem('application_form_expiry', response.data.data.expiry);
                    
                    // Redirect to application form
                    this.props.history.push('/apply/application');
                } else {
                    this.setState({
                        loading: false,
                        openSnackbar: true,
                        alertData: 'Invalid response from server',
                        errorStatus: 'error'
                    });
                }
            } else {
                // Handle error response
                let errorMessage = 'Invalid OTP. Please try again.';
                if (response && response.data) {
                    if (typeof response.data === 'string') {
                        errorMessage = response.data;
                    } else if (response.data.Reason) {
                        errorMessage = response.data.Reason;
                    } else if (response.data.error) {
                        errorMessage = response.data.error;
                    } else if (response.data.message) {
                        errorMessage = response.data.message;
                    }
                }
                this.setState({
                    loading: false,
                    openSnackbar: true,
                    alertData: errorMessage,
                    errorStatus: 'error'
                });
            }
        } catch (error) {
            // Handle network or other errors
            let errorMessage = 'Invalid OTP. Please try again.';
            if (error && error.response && error.response.data) {
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.Reason) {
                    errorMessage = error.response.data.Reason;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            }
            this.setState({
                loading: false,
                openSnackbar: true,
                alertData: errorMessage,
                errorStatus: 'error'
            });
        }
    }

    resendOTP = () => {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        this.setState({ otp: '', countdown: 0 });
        this.sendOTP();
    }

    handleCloseSnackbar = () => {
        this.setState({ openSnackbar: false });
    }

    render() {
        const { step, mobile_num, otp, loading, openSnackbar, alertData, errorStatus, countdown, mobile_num_error, otp_error } = this.state;

        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '20px'
                }}
            >
                <Paper
                    elevation={10}
                    style={{
                        padding: '40px',
                        maxWidth: '450px',
                        width: '100%',
                        borderRadius: '10px'
                    }}
                >
                    <Box textAlign="center" marginBottom="30px">
                        <Typography variant="h4" style={{ fontWeight: 600, color: '#667eea', marginBottom: '10px' }}>
                            Application Form Login
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Enter your mobile number to receive OTP and fill the application form
                        </Typography>
                    </Box>

                    {step === 'mobile' ? (
                        <Box>
                            <TextField
                                fullWidth
                                label="Mobile Number"
                                name="mobile_num"
                                value={mobile_num}
                                onChange={this.handleChange}
                                error={!!mobile_num_error}
                                helperText={mobile_num_error}
                                variant="outlined"
                                margin="normal"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PhoneIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                                inputProps={{
                                    maxLength: 10,
                                    pattern: '[0-9]*'
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        this.sendOTP();
                                    }
                                }}
                            />
                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                size="large"
                                onClick={this.sendOTP}
                                disabled={loading}
                                style={{
                                    marginTop: '20px',
                                    padding: '12px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }}
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : 'Send OTP'}
                            </Button>
                        </Box>
                    ) : (
                        <Box>
                            <TextField
                                fullWidth
                                label="Enter OTP"
                                name="otp"
                                value={otp}
                                onChange={this.handleChange}
                                error={!!otp_error}
                                helperText={otp_error}
                                variant="outlined"
                                margin="normal"
                                inputProps={{
                                    maxLength: 6,
                                    pattern: '[0-9]*'
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        this.verifyOTP();
                                    }
                                }}
                            />
                            <Box marginTop="10px" marginBottom="20px">
                                <Typography variant="body2" color="textSecondary" align="center">
                                    OTP sent to {mobile_num}
                                </Typography>
                            </Box>
                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                size="large"
                                onClick={this.verifyOTP}
                                disabled={loading}
                                style={{
                                    marginTop: '10px',
                                    padding: '12px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }}
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify OTP & Continue'}
                            </Button>
                            <Box marginTop="15px" textAlign="center">
                                {countdown > 0 ? (
                                    <Typography variant="body2" color="textSecondary">
                                        Resend OTP in {countdown} seconds
                                    </Typography>
                                ) : (
                                    <Button
                                        variant="text"
                                        color="primary"
                                        onClick={this.resendOTP}
                                        disabled={loading}
                                    >
                                        Resend OTP
                                    </Button>
                                )}
                            </Box>
                            <Box marginTop="10px" textAlign="center">
                                <Button
                                    variant="text"
                                    color="default"
                                    onClick={() => this.setState({ step: 'mobile', otp: '', countdown: 0 })}
                                    disabled={loading}
                                >
                                    Change Mobile Number
                                </Button>
                            </Box>
                        </Box>
                    )}

                    <Snackbar
                        open={openSnackbar}
                        autoHideDuration={4000}
                        onClose={this.handleCloseSnackbar}
                        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    >
                        <Alert onClose={this.handleCloseSnackbar} severity={errorStatus}>
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Paper>
            </Box>
        );
    }
}

export default withRouter(PublicApplicationFormLogin);









