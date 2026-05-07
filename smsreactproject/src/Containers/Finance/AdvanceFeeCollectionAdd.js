import React, { Component } from 'react';
import { Paper, Box, Grid, Button, TextField, Typography } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import AccountBalanceWalletOutlinedIcon from '@material-ui/icons/AccountBalanceWalletOutlined';
import { withRouter } from 'react-router-dom';
import { MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';
import PaymentModal from 'Components/PaymentModalNew';
import classNames from 'classnames';
import loadingBar from 'images/loading.gif';
import Swal from 'sweetalert2';

class AdvanceFeeCollectionAdd extends Component {
  constructor(props) {
    super(props);
    const { academic_year, student } = this.getParams();
    this.state = {
      academicYearId: academic_year,
      studentId: student,
      studentName: (props.location?.state?.studentName) || '',
      collectionDate: new Date(),
      advanceFeeTypeList: [],
      advanceFeeType: '',
      amount: '',
      feeReceiptNumber: '',
      loading: true,
      submitDisable: false,
      openPaymentModal: false,
      amountDetails: null,
    };
  }

  getParams = () => {
    const search = this.props.location?.search || '';
    const params = new URLSearchParams(search);
    return {
      academic_year: params.get('academic_year') || '',
      student: params.get('student') || '',
    };
  };

  componentDidMount() {
    this.fetchAdvanceFeeTypes();
  }

  fetchAdvanceFeeTypes = () => {
    this.setState({ loading: true });
    const url = GET_URL.feeadvancetype?.api || 'finance/feeadvancetype/';
    getRequest(url, { is_active: true }, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const data = response.data?.data ?? response.data ?? [];
          this.setState({ advanceFeeTypeList: Array.isArray(data) ? data : [], loading: false });
        } else {
          this.setState({ advanceFeeTypeList: [], loading: false });
        }
      })
      .catch(() => this.setState({ advanceFeeTypeList: [], loading: false }));
  };

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  handleCollect = () => {
    const { advanceFeeType, amount, feeReceiptNumber, academicYearId, studentId, collectionDate } = this.state;
    const amt = parseFloat(amount);
    if (!academicYearId || !studentId) {
      Swal.fire({ icon: 'warning', title: 'Invalid student or academic year. Go back and select a student.' });
      return;
    }
    if (!collectionDate) {
      Swal.fire({ icon: 'warning', title: 'Please select Date.' });
      return;
    }
    if (!advanceFeeType) {
      Swal.fire({ icon: 'warning', title: 'Please select Advance Fee Type.' });
      return;
    }
    if (!amount || isNaN(amt) || amt <= 0) {
      Swal.fire({ icon: 'warning', title: 'Please enter a valid amount.' });
      return;
    }
    this.setState({
      openPaymentModal: true,
      amountDetails: {
        amount: amt,
        receiptNumber: feeReceiptNumber || '',
        advance_fee_type: advanceFeeType,
        academic_year: academicYearId,
        student: studentId,
        date: collectionDate,
      },
    });
  };

  closePaymentModal = () => {
    this.setState({ openPaymentModal: false, amountDetails: null });
  };

  payFees = (fieldValues, mode_of_payment_list) => {
    const { amountDetails } = this.state;
    if (!amountDetails) return;
    const payment_ref_num = fieldValues?.refNo ?? fieldValues?.payment_ref_num ?? '';
    const payment_note = fieldValues?.paymentNote ?? '';
    let mode_of_payment = '';
    if (Array.isArray(mode_of_payment_list) && mode_of_payment_list.length > 0) {
      const first = mode_of_payment_list[0];
      mode_of_payment = first?.paymentValue?.name ?? first?.paymentValue ?? '';
    }
    // Same shape as FeeCollectionNew — backend expects plain objects, not modal internals
    const normalizedModeList = (Array.isArray(mode_of_payment_list) ? mode_of_payment_list : []).map((data) => {
      const item = {
        mode_of_payment: data.paymentValue?.name || data.paymentValue || '',
        payment_ref_num: data.payment_ref_num || '',
        note: data.note || '',
        amount: parseFloat(data.amount != null ? data.amount : amountDetails.amount || 0),
        bank_detail_id: data?.bank_details?.bank_detail_id || null,
      };
      if (data.paymentValue?.name === 'Loan') {
        item.loan_from_bank = data.from_bank || '';
        item.loan_to_bank = data.to_bank || '';
        item.loan_utr_number = data.utr_no || '';
        item.loan_credited_date = data.transfer_date || '';
      }
      return item;
    });
    const toPk = (v) => {
      if (v === '' || v === null || v === undefined) return v;
      const n = parseInt(String(v), 10);
      return Number.isNaN(n) ? v : n;
    };
    const txDate = amountDetails.date instanceof Date
      ? amountDetails.date.toISOString().slice(0, 10)
      : amountDetails.date;
    const receiptVal = amountDetails.receiptNumber || null;
    const typePk = toPk(amountDetails.advance_fee_type);
    const payload = {
      academic_year: toPk(amountDetails.academic_year),
      student: toPk(amountDetails.student),
      fee_advance_type_id: typePk,
      advance_fee_type: typePk,
      fee_advance_type: typePk,
      amount: amountDetails.amount,
      receipt_num: receiptVal,
      fee_receipt_number: receiptVal,
      transaction_date: txDate,
      date: txDate,
      payment_ref_num,
      payment_note,
      mode_of_payment,
      mode_of_payment_list: normalizedModeList,
    };
    // Pass bank_detail_id to root payload for DepositWithdrawRecord
    const bankId = fieldValues?.bank_detail_id
      || (normalizedModeList.length > 0 ? normalizedModeList[0].bank_detail_id : null);
    if (bankId) {
      payload.bank_detail_id = bankId;
    }
    this.setState({ submitDisable: true });
    const url = POST_URL.feeadvancecollection?.api || 'finance/feeadvancecollection/';
    // postRequest returns the axios response for any HTTP 2xx (incl. 201 Created from Django REST)
    postRequest(url, payload, { ...this.props, return_error: true })
      .then((response) => {
        this.setState({ submitDisable: false });
        const code = response != null && response.status != null ? Number(response.status) : NaN;
        const ok = !Number.isNaN(code) && code >= 200 && code < 300;
        if (ok) {
          try {
            Swal.fire({
              position: 'top-end',
              type: 'success',
              title: response.data?.Reason || response.data?.message || 'Advance fee collected successfully.',
              showConfirmButton: false,
              timer: 1500,
            });
            this.closePaymentModal();
            this.props.history.push('/finance/advance-fee-collection');
          } catch (_e) {
            this.closePaymentModal();
            this.props.history.push('/finance/advance-fee-collection');
          }
          return;
        }
        const errBody = response?.data;
        const msg = errBody?.Reason
          || errBody?.message
          || errBody?.detail
          || (typeof errBody === 'string' ? errBody : null)
          || this.formatApiErrors(errBody)
          || 'Failed to save collection.';
        Swal.fire({ type: 'error', title: msg });
      })
      .catch((error) => {
        this.setState({ submitDisable: false });
        const errBody = error?.response?.data;
        const msg = errBody?.Reason
          || errBody?.message
          || errBody?.detail
          || (typeof errBody === 'string' ? errBody : null)
          || this.formatApiErrors(errBody)
          || 'Failed to save advance fee collection.';
        Swal.fire({ type: 'error', title: msg });
      });
  };

  formatApiErrors = (data) => {
    if (!data || typeof data !== 'object') return null;
    const parts = [];
    Object.keys(data).forEach((key) => {
      const v = data[key];
      if (Array.isArray(v)) parts.push(`${key}: ${v.join(', ')}`);
      else if (typeof v === 'string') parts.push(`${key}: ${v}`);
    });
    return parts.length ? parts.join(' ') : null;
  };

  handleBack = () => {
    this.props.history.push('/finance/advance-fee-collection');
  };

  render() {
    const {
      academicYearId,
      studentId,
      studentName,
      collectionDate,
      advanceFeeTypeList,
      advanceFeeType,
      amount,
      feeReceiptNumber,
      loading,
      openPaymentModal,
      amountDetails,
      submitDisable,
    } = this.state;

    const typeOptions = (advanceFeeTypeList || []).map((t) => ({ id: t.id, name: t.name || '—' }));

    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    }

    if (!academicYearId || !studentId) {
      return (
        <Paper className={classNames('paper-background')}>
          <Box p={3} textAlign="center">
            <Typography color="textSecondary">Invalid or missing student / academic year. Please go back and select a student from the list.</Typography>
            <Button variant="contained" color="primary" onClick={this.handleBack} style={{ marginTop: 16 }}>
              Back to Advance Fee Collection
            </Button>
          </Box>
        </Paper>
      );
    }

    return (
      <Box>
        <Paper className={classNames('paper-background')} elevation={0}>
          <Grid container>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" mb={2}>
                <Box display="flex" alignItems="center">
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={8}
                    bgcolor="primary.main"
                    color="white"
                    width={40}
                    height={40}
                    mr={1.5}
                  >
                    <AccountBalanceWalletOutlinedIcon />
                  </Box>
                  <Box>
                    <Typography variant="h6" style={{ fontWeight: 600 }}>Collect Advance Fee</Typography>
                    {studentName && (
                      <Typography variant="body2" style={{ color: '#212121', fontWeight: 600 }}>
                        Student: {studentName}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<VisibilityOutlinedIcon />}
                  onClick={this.handleBack}
                  size="small"
                >
                  Back
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={8} lg={6}>
              <Paper
                variant="outlined"
                style={{ borderRadius: 12, padding: 24 }}
              >
                <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: 20, color: '#374151' }}>
                  Enter advance fee details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                      <KeyboardDatePicker
                        fullWidth
                        autoOk
                        variant="inline"
                        inputVariant="outlined"
                        format="dd/MM/yyyy"
                        margin="none"
                        label="Date"
                        value={collectionDate}
                        onChange={(d) => this.setState({ collectionDate: d })}
                        KeyboardButtonProps={{ 'aria-label': 'change date' }}
                      />
                    </MuiPickersUtilsProvider>
                  </Grid>
                  <Grid item xs={12}>
                    <Dropdown
                      label="Advance Fee Type"
                      name="advanceFeeType"
                      value={advanceFeeType}
                      onChange={this.handleChange}
                      data={typeOptions}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Amount (₹)"
                      name="amount"
                      type="number"
                      inputProps={{ min: 0, step: 0.01 }}
                      value={amount}
                      onChange={this.handleChange}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Receipt Number"
                      name="feeReceiptNumber"
                      value={feeReceiptNumber}
                      onChange={this.handleChange}
                      variant="outlined"
                      size="small"
                      placeholder="Optional"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      size="medium"
                      onClick={this.handleCollect}
                      disabled={!advanceFeeType || !amount}
                      style={{ marginTop: 8, padding: 10, borderRadius: 8 }}
                    >
                      Collect
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        {openPaymentModal && amountDetails && (
          <PaymentModal
            amountDetails={{
              amount: amountDetails.amount,
              student: studentName || `Receipt: ${amountDetails.receiptNumber || '—'}`,
            }}
            closeFeePaymentModal={this.closePaymentModal}
            payFees={this.payFees}
            isSamePageShow
            isSelectSamePage
            isTaxHide
            payDisabled={submitDisable}
          />
        )}
      </Box>
    );
  }
}

export default withRouter(AdvanceFeeCollectionAdd);
