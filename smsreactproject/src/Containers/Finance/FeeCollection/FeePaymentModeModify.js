/* eslint-disable react/display-name */
import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
    Button, Box, Dialog, DialogTitle, DialogActions,
    DialogContentText, DialogContent, TextField, IconButton,
    CircularProgress
} from '@material-ui/core';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { numberWithCommas } from 'Includes/functions';
import { nameAndNumberRegex, numberRegex } from 'Constants/regularExpression';

// Redux
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { makeModeOfPaymentList } from 'Components/CommonComponent/selectors';
import { setModeOfPaymentList } from 'Components/CommonComponent/actions';

const useStyles = makeStyles((theme) => ({
    appBar: {
        position: 'relative',
        backgroundColor: '#4680FF'
    },
    title: {
        marginLeft: theme.spacing(2),
        flex: 1,
    },
    paymentRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '15px',
        flexWrap: 'wrap',
    },
    totalInfo: {
        background: '#f5f5f5',
        padding: '10px 15px',
        borderRadius: '5px',
        marginBottom: '20px',
    },
    errorText: {
        color: 'red',
        fontSize: '12px',
        marginTop: '5px',
    }
}));

function FeePaymentModeModify(props) {
    const classes = useStyles();
    const { totalAmount, existingPayments } = props;
    
    const [payments, setPayments] = useState([]);
    const [errors, setErrors] = useState({});
    const [disableButton, setDisableButton] = useState(false);
    const [modeOfPaymentList, setModeOfPaymentListState] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generalError, setGeneralError] = useState('');

    // Payment modes configuration
    const paymentModesConfig = [
        { name: 'Cash', refRequired: false, alias: 'Cash' },
        { name: 'PhonePe', alias: 'Phone Pe', refRequired: true },
        { name: 'Gpay', alias: 'Google Pay', refRequired: true },
        { name: 'NetBanking', refRequired: true, alias: 'Net Banking' },
        { name: 'UPIPayments', refRequired: true, alias: 'UPI Payments' },
        { name: 'Cheque', refRequired: true, alias: 'Cheque' },
        { name: 'Online', refRequired: true, alias: 'Online' },
        { name: 'Debit', refRequired: true, alias: 'Debit Card' },
        { name: 'Credit', refRequired: true, alias: 'Credit Card' },
    ];

    useEffect(() => {
        getModeOfPaymentList();
    }, []);

    // Initialize payments after mode list is loaded
    useEffect(() => {
        if (modeOfPaymentList.length > 0) {
            initializePayments(modeOfPaymentList);
        }
    }, [modeOfPaymentList]);

    const initializePayments = (modes) => {
        // Initialize from existing payments or create default
        if (existingPayments && existingPayments.length > 0) {
            const initialPayments = existingPayments.map(p => {
                // Match mode_of_payment with the mode object from API
                const matchedMode = modes.find(m => m.name === p.mode_of_payment);
                return {
                    mode_of_payment: p.mode_of_payment || '',
                    amount: p.amount || 0,
                    payment_ref_num: p.payment_ref_num || '',
                    paymentValue: matchedMode || null
                };
            });
            setPayments(initialPayments);
        } else {
            // Default to Cash with total amount
            const cashMode = modes.find(m => m.name === 'Cash');
            setPayments([{
                mode_of_payment: 'Cash',
                amount: totalAmount || 0,
                payment_ref_num: '',
                paymentValue: cashMode || null
            }]);
        }
    };

    const getModeOfPaymentList = () => {
        let storedModeOfPaymentList = props.getModeOfPayments;
        if (!storedModeOfPaymentList) {
            const params = { allowed_app_types: 'staff_web' };
            getRequest(GET_URL.modeofpayment.api, params, props).then((response) => {
                if (response && response.status === 200) {
                    const modes = response.data.data;
                    props.setModeOfPaymentList(modes);
                    setModeOfPaymentListState(modes);
                }
                setLoading(false);
            });
        } else {
            setModeOfPaymentListState(storedModeOfPaymentList);
            setLoading(false);
        }
    };

    const handleModeChange = (index, newValue) => {
        const newPayments = [...payments];
        newPayments[index].paymentValue = newValue;
        newPayments[index].mode_of_payment = newValue?.name || '';
        
        // Check if the new mode requires a reference number
        const modeConfig = paymentModesConfig.find(m => m.name === newValue?.name);
        // If mode doesn't require ref (like Cash), clear the payment_ref_num
        if (!modeConfig?.refRequired) {
            newPayments[index].payment_ref_num = '';
        }
        
        // Clear ref num error when mode changes
        const newErrors = { ...errors };
        delete newErrors[`mode_${index}`];
        delete newErrors[`ref_${index}`];
        
        setPayments(newPayments);
        setErrors(newErrors);
        setGeneralError('');
    };

    const handleAmountChange = (index, value) => {
        if (value && !numberRegex.value.test(value)) {
            return;
        }
        const newPayments = [...payments];
        newPayments[index].amount = value;
        
        const newErrors = { ...errors };
        delete newErrors[`amount_${index}`];
        
        setPayments(newPayments);
        setErrors(newErrors);
        setGeneralError('');
    };

    const handleRefNumChange = (index, value) => {
        if (value && !nameAndNumberRegex.value.test(value)) {
            return;
        }
        const newPayments = [...payments];
        newPayments[index].payment_ref_num = value;
        
        const newErrors = { ...errors };
        delete newErrors[`ref_${index}`];
        
        setPayments(newPayments);
        setErrors(newErrors);
    };

    const addPayment = () => {
        setPayments([...payments, {
            mode_of_payment: '',
            amount: 0,
            payment_ref_num: '',
            paymentValue: null
        }]);
    };

    const removePayment = (index) => {
        if (payments.length > 1) {
            const newPayments = payments.filter((_, i) => i !== index);
            setPayments(newPayments);
            
            // Clear any errors for this and re-index
            const newErrors = {};
            setErrors(newErrors);
        }
    };

    const validatePayments = () => {
        const newErrors = {};
        let isValid = true;
        let sumAmount = 0;
        const usedModes = {};

        payments.forEach((payment, index) => {
            // Validate mode
            if (!payment.paymentValue || !payment.mode_of_payment) {
                newErrors[`mode_${index}`] = 'Select payment mode';
                isValid = false;
            } else {
                // Check for duplicate modes
                if (usedModes[payment.mode_of_payment]) {
                    newErrors[`mode_${index}`] = 'Duplicate payment mode';
                    isValid = false;
                }
                usedModes[payment.mode_of_payment] = true;
            }

            // Validate amount
            if (!payment.amount || parseFloat(payment.amount) <= 0) {
                newErrors[`amount_${index}`] = 'Amount required';
                isValid = false;
            } else {
                sumAmount += parseFloat(payment.amount);
            }

            // Validate ref num for non-cash
            const modeConfig = paymentModesConfig.find(m => m.name === payment.mode_of_payment);
            if (modeConfig?.refRequired && !payment.payment_ref_num) {
                newErrors[`ref_${index}`] = 'Reference number required';
                isValid = false;
            }
        });

        // Validate sum equals total
        if (isValid && Math.abs(sumAmount - parseFloat(totalAmount)) > 0.01) {
            setGeneralError(`Payment total (₹${numberWithCommas(sumAmount)}) must equal bill amount (₹${numberWithCommas(totalAmount)})`);
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = () => {
        if (validatePayments()) {
            setDisableButton(true);
            
            // Build payload per API contract
            const paymentPayload = payments.map(p => {
                const item = {
                    mode_of_payment: p.mode_of_payment,
                    amount: parseFloat(p.amount),
                    // Always send payment_ref_num, use empty string for Cash or when not provided
                    payment_ref_num: p.payment_ref_num || ""
                };
                return item;
            });

            props.updatePaymentMode(paymentPayload);
        }
    };

    const getCurrentSum = () => {
        return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    };

    const getRefRequired = (modeName) => {
        const config = paymentModesConfig.find(m => m.name === modeName);
        return config?.refRequired || false;
    };

    return (
        <Dialog 
            className='action-basic-detail-width' 
            open={true}
            maxWidth="md"
            fullWidth
            aria-labelledby="form-dialog-title"
        >
            <DialogTitle id="form-dialog-title">Edit Payment Mode</DialogTitle>
            <DialogContent>
                <DialogContentText className='align-items-center'>
                    Update Mode of Payment
                </DialogContentText>

                {/* Total Amount Info */}
                <Box className={classes.totalInfo}>
                    <Box display="flex" justifyContent="space-between">
                        <span>Total Bill Amount:</span>
                        <strong>₹ {numberWithCommas(totalAmount)}</strong>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mt={1}>
                        <span>Current Payment Sum:</span>
                        <strong style={{ color: Math.abs(getCurrentSum() - totalAmount) > 0.01 ? 'red' : 'green' }}>
                            ₹ {numberWithCommas(getCurrentSum())}
                        </strong>
                    </Box>
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* Payment Rows */}
                        {payments.map((payment, index) => (
                            <Box key={index} className={classes.paymentRow}>
                                {/* Delete Button */}
                                {payments.length > 1 && (
                                    <IconButton 
                                        size="small" 
                                        color="secondary"
                                        onClick={() => removePayment(index)}
                                    >
                                        <DeleteOutlineIcon />
                                    </IconButton>
                                )}

                                {/* Amount */}
                                <TextField
                                    variant="outlined"
                                    size="small"
                                    label="Amount"
                                    value={payment.amount}
                                    onChange={(e) => handleAmountChange(index, e.target.value)}
                                    inputProps={{ maxLength: 9 }}
                                    style={{ width: '120px' }}
                                    error={Boolean(errors[`amount_${index}`])}
                                    helperText={errors[`amount_${index}`]}
                                />

                                {/* Mode of Payment */}
                                <Box style={{ minWidth: '180px' }}>
                                    <DropDownWithSearch
                                        options={modeOfPaymentList}
                                        optionValue="label"
                                        name="mode_of_payment"
                                        value={payment.paymentValue}
                                        onChange={(e, newValue) => handleModeChange(index, newValue)}
                                        label="Mode Of Payment"
                                        hideClearIcon
                                        size="small"
                                        error={errors[`mode_${index}`]}
                                    />
                                </Box>

                                {/* Reference Number (if required) */}
                                {getRefRequired(payment.mode_of_payment) && (
                                    <TextField
                                        variant="outlined"
                                        size="small"
                                        label="Ref No."
                                        value={payment.payment_ref_num}
                                        onChange={(e) => handleRefNumChange(index, e.target.value)}
                                        inputProps={{ maxLength: 50 }}
                                        style={{ width: '150px' }}
                                        error={Boolean(errors[`ref_${index}`])}
                                        helperText={errors[`ref_${index}`]}
                                    />
                                )}
                            </Box>
                        ))}

                        {/* Add Payment Button */}
                        <Box mt={2}>
                            <Button
                                startIcon={<AddCircleOutlineIcon />}
                                onClick={addPayment}
                                color="primary"
                                size="small"
                            >
                                Add Split Payment
                            </Button>
                        </Box>

                        {/* Error Messages */}
                        {generalError && (
                            <Box className={classes.errorText} mt={2}>
                                {generalError}
                            </Box>
                        )}
                        {props.paymentError && (
                            <Box className={classes.errorText} mt={1}>
                                {props.paymentError}
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button 
                    color="secondary" 
                    style={{ textTransform: 'capitalize', fontWeight: 'bold' }} 
                    disabled={disableButton || loading}
                    onClick={handleSubmit}
                >
                    Update
                </Button>
                <Button 
                    color='secondary' 
                    style={{ textTransform: 'uppercase' }} 
                    onClick={props.handlePaymentModeClose}
                >
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}

const mapStateToProps = createStructuredSelector({
    getModeOfPayments: makeModeOfPaymentList(),
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ setModeOfPaymentList }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(FeePaymentModeModify);
