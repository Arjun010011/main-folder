import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import Grid from '@material-ui/core/Grid';
import DialogContent from '@material-ui/core/DialogContent';
import IconButton from '@material-ui/core/IconButton'
import CloseIcon from '@material-ui/icons/Close'
import { withStyles } from '@material-ui/core/styles';
import { Divider, CircularProgress } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import FormControl from '@material-ui/core/FormControl';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio from '@material-ui/core/Radio';
import { Box, Button, TextField } from '@material-ui/core';
import { numberWithCommas } from 'Includes/functions';
import { nameRegex, nameAndNumberRegex, } from 'Constants/regularExpression';
import { BUTTONCOLOR } from '../actions/constants';
import { withRouter } from 'react-router-dom';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import Swal from 'sweetalert2';


const styles = theme => ({
  root: {
    padding: `${theme.spacing.unit * 6}px ${theme.spacing.unit * 3}px 0`,
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing.unit / 2,
    top: theme.spacing.unit / 2,
    color: theme.palette.grey[500],
  },
  rightPartGrid: {
    background: "#f1f3ff"
  },
  amountDetails: {
    fontSize: "20px",
    display: "flex",
    margin: "10px 5px"
  },
  blueText: {
    color: "#4680FF",
  },
  paymentModeHead: {
    fontFamily: "Roboto",
    fontStyle: "normal",
    fontWeight: "500",
    fontSize: "20px",
    lineHeight: "20px",
    letterSpacing: "-0.05px",
    marginTop: "10px"
  },
  paymentInput: {
    margin: "10px 0",
  },
  payNow: {

    fontWeight: "bold",
    borderRadius: "30px",
    padding: "8px 25px",
    color: "white",
    margin: "auto",
    display: "block",
    background: BUTTONCOLOR,
    '&:hover': {
      background: BUTTONCOLOR
    }
  }
})

class PaymentGatewayModel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: true,
      loading: false,
      fieldValues: {
        paymentValue: 'Cash',
        payeeName: props.amountDetails?.student ?? '',
        refNo: "",
      },
      error: { payeeName: '', refNo: '' }

    };
    this.paymentModes = {
      Cash: { name: 'Cash', refRequired: false, alias: "" },
      Netbanking: { name: 'Net banking', refRequired: true, alias: '' },
      Upipayment: { name: 'Upi Payments', refRequired: true, alias: '' },
      Cheque: { name: 'Cheque', refRequired: true, alias: "" },
    };
  }

  handleClose = () => {
    this.props.closeFeePaymentModal();
  };

  onChangeFeeDetails = (e, field) => {
    const { value } = e.target;
    let { error } = this.state;
    let fieldValues = { ...this.state.fieldValues };
    if (field === 'payeeName' && !nameRegex.value.test(value)) {
      error['payeeName'] = nameRegex.errorText
    }
    else if (field === 'refNo' && !nameAndNumberRegex.value.test(value)) {
      error['refNo'] = nameRegex.errorText
    }
    else {
      fieldValues[field] = value;
    }
    delete error[field]
    this.setState({ fieldValues, error });
  }

  handleChange = event => {
    const { value } = event.target;
    let fieldValues = { ...this.state.fieldValues };
    fieldValues['paymentValue'] = value;
    this.setState({ fieldValues, });
  }
  validateFieldValues = () => {
    let { error } = this.state;
    if (this.paymentModes[this.state.fieldValues.paymentValue].refRequired && this.state.fieldValues.refNo === "") {
      error['refNo'] = 'Please Enter Ref Number'
      this.setState({ error })
      return false;
    }
    if (this.state.fieldValues.payeeName === "") {
      error['payeeName'] = 'Please Enter Payee Name'
      this.setState({ error })
      return false;
    }
    return true
  }
  payFees = () => {
    const testFieldValues = this.validateFieldValues();
    if (testFieldValues) {
      this.props.payFees(this.state.fieldValues);
    } 
  }

  ONE_PAY_REDIRECT_URL = 'https://pay.1pay.in/payment/payprocessorV2';

  redictedToPaymentUrl = async () => {
    const { student, amountDetails, paymentGatewayId: propGatewayId, application_plan, createApplicationBeforePayment } = this.props;
    this.setState({ loading: true });

    let applicationStudentId = student?.id ?? student?.application_student_id;

    try {
      // Resolve payment gateway ID from payments/payment_gateway API, use gateway with code "onepay"
      let paymentGatewayId = propGatewayId;
      if (!paymentGatewayId) {
        const gwResponse = await getRequest(GET_URL.payment_gateway.api, {}, { ...this.props, return_error: true });
        if (gwResponse && gwResponse.status === 200) {
          const gwData = gwResponse.data?.data ?? gwResponse.data;
          const gateways = Array.isArray(gwData) ? gwData : (gwData?.results ?? gwData?.data_list ?? []) || [];
          const list = Array.isArray(gateways) ? gateways : [];
          const onepayGateway = list.find(g =>
            String(g.code || g.name || '').toLowerCase() === 'onepay'
          );
          paymentGatewayId = onepayGateway?.id ?? paymentGatewayId;
        }
      }
      // paymentGatewayId = paymentGatewayId || 3;

      // 1. POST application with is_active = 0 first, then create order and redirect
      if (typeof createApplicationBeforePayment === 'function') {
        const studentWithFees = {
          ...student,
          fees: student?.fees || {
            application_plan: application_plan?.id ?? application_plan,
            amount: amountDetails?.amount,
          },
        };
        const result = await createApplicationBeforePayment(studentWithFees);
        applicationStudentId = result?.application_student_id ?? result?.id ?? applicationStudentId;
      }

      const feePlanId = application_plan?.id ?? application_plan;
      const totalAmount = Number(amountDetails?.amount) || 0;
      const studentName = typeof amountDetails?.student === 'string'
        ? amountDetails.student
        : [student?.first_name, student?.middle_name, student?.last_name].filter(Boolean).join(' ').trim();

      const payload = {
        ...(applicationStudentId ? { application_student_id: applicationStudentId } : {}),
        payload: {
          standard_fee: feePlanId ? [{
            fee_plan: feePlanId,
            amount_paid: totalAmount,
            pending_amount: 0,
            additional_charge_data: [],
          }] : [],
          student_name: studentName || '',
          total_amount: totalAmount,
          academic_year: student?.entry_academic_year ?? null,
          mode_of_payment: 'Online',
          payment_ref_num: student?.fees?.payment_ref_num ?? '',
          additionalCharge: 0,
          student_standard: student?.current_standard ?? null,
          total_payable_amount: totalAmount.toFixed(2),
          application_student_id: applicationStudentId
        },
        entity_name: 'AF',
        payment_gateway_id: paymentGatewayId,
      };

      const paymentUrl = POST_URL['order-online-payment']?.api || 'payments/order-online-payment/';
      const response = await postRequest(paymentUrl, payload, { ...this.props, return_error: true });
      
      if (response && response.status === 200) {
        const responseData = response.data?.data ?? response.data;
        const redirectUrl = responseData?.redirect_url ?? responseData?.payment_url ?? responseData?.url ?? this.ONE_PAY_REDIRECT_URL;
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = redirectUrl;
        if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
          Object.keys(responseData).forEach(key => {
            if (key !== 'redirect_url' && key !== 'payment_url' && key !== 'url' && responseData[key] != null) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = typeof responseData[key] === 'object' ? JSON.stringify(responseData[key]) : responseData[key];
              form.appendChild(input);
            }
          });
        }
        document.body.appendChild(form);
        form.submit();
      } else {
        const errorMessage = response?.data?.Reason ?? response?.data?.error ?? response?.data?.message ?? 'Failed to create payment order';
        Swal.fire({
          type: 'error',
          title: 'Payment Error',
          text: errorMessage,
        });
        this.setState({ loading: false });
      }
    } catch (error) {
      console.error('Payment gateway error:', error);
      Swal.fire({
        type: 'error',
        title: 'Payment Error',
        text: error.message || 'An error occurred while processing payment. Please try again.',
      });
      this.setState({ loading: false });
    }
  } 

  render() {
    const { classes, amountDetails, isTaxHide } = this.props;
    const { fieldValues, error } = this.state;
    return (
      <Dialog
        open={true}
        onClose={() => this.handleClose()}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="md"
        fullWidth={true}
      >
        <Grid container>
          <Grid item xs={7} md={7}>
            <DialogContent>
              <Box pt={4} pb={6} pr={4} pl={4}>
                <Typography
                  style={{
                    color: "black",
                    fontSize: "26px",
                    margin: "20px 0"
                  }}
                  className={classes.paymentModeHead}
                >
                  Payment
                </Typography>
                <Box className={classes.amountDetails}>
                  <Box width="50%">Amount</Box>
                  <Box>Rs. {numberWithCommas(amountDetails?.amount || 0)}</Box>
                </Box>
                {!isTaxHide &&
                  <Box className={classes.amountDetails}>
                    <Box width="50%">Tax</Box>
                    <Box>Rs. {0}</Box>
                  </Box>
                }
                <Divider />
                <Box className={classes.amountDetails}>
                  <Box width="50%">Amount To Pay:</Box>
                  <Box className={classes.blueText}>Rs. {numberWithCommas(amountDetails?.amount || 0,0)}</Box>
                </Box>
              </Box>
            </DialogContent>
          </Grid>
          <Grid item xs={5} md={5} className={`${classes.rightPartGrid} pb-20`}>
            <DialogContent>
              <Box pt={6} pb={6} plr={4} pl={4}>
                <Typography
                  style={{
                    color: "black",
                    fontSize: "26px",
                    margin: "20px 0"
                  }}
                  className={classes.paymentModeHead}
                >
                  {this.paymentModes[this.state.fieldValues.paymentValue].alias} Payment Details
                </Typography>
                <TextField
                  className={classes.paymentInput}
                  label="Payee Name"
                  value={fieldValues.payeeName}
                  inputProps={{ maxLength: '100' }}
                  onChange={(e) => this.onChangeFeeDetails(e, 'payeeName')}
                  helperText={Boolean(error['payeeName']) && (error['payeeName'] === "" ? "" : error['payeeName'])}
                  error={Boolean(error['payeeName']) && (error['payeeName'] === "" ? false : true)}
                />
                {this.paymentModes[fieldValues.paymentValue].refRequired &&
                  <TextField
                    className={classes.paymentInput}
                    label="Ref No" value={fieldValues.refNo}
                    onChange={(e) => this.onChangeFeeDetails(e, 'refNo')}
                    inputProps={{ maxLength: '20' }}
                    helperText={error['refNo'] && (error['refNo'] === "" ? "" : error['refNo'])}
                    error={error['refNo'] && (error['refNo'] === "" ? false : true)}
                  />}

              </Box>
            </DialogContent>
            {(this.props.payDisabled || this.state.loading) &&
              <Box display='flex' justifyContent='center'><CircularProgress /></Box>
            }
            {!this.props.payDisabled && !this.state.loading &&
              <Button onClick={() => this.redictedToPaymentUrl()} color="primary" className={classes.payNow}> Pay Now </Button>
            }
          </Grid>
        </Grid>
        <IconButton aria-label="Close" className={classes.closeButton} onClick={() => this.handleClose()}>
          <CloseIcon />
        </IconButton>
      </Dialog>
    );
  }
}

export default withRouter(withStyles(styles)(PaymentGatewayModel))