import React, { Component } from 'react';
import {
  Paper,
  Box,
  Grid,
  Button,
  TextField,
  Typography,
  CircularProgress,
} from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter, Link } from 'react-router-dom';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';
import { Actions } from 'Constants/permissions';
import PaymentModal from 'Components/PaymentModalNew';
import classNames from 'classnames';
import Swal from 'sweetalert2';
import { getFullName } from 'Includes/functions';

class AdvanceFeeCollection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      advanceFeeTypeList: [],
      advanceFeeType: '',
      academicYearList: [],
      academicYear: '',
      studentList: [],
      studentId: '',
      studentListLoading: false,
      amount: '',
      feeReceiptNumber: '',
      loading: true,
      submitDisable: false,
      openPaymentModal: false,
      amountDetails: null,
    };
  }

  componentDidMount() {
    this.fetchAdvanceFeeTypes();
    this.fetchAcademicYears();
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

  fetchAcademicYears = () => {
    const url = GET_URL.getacademicyear?.api || 'institutes/getacademicyear/';
    getRequest(url, { is_active: true }, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const data = response.data?.data ?? response.data ?? [];
          this.setState({ academicYearList: Array.isArray(data) ? data : [] });
        } else {
          this.setState({ academicYearList: [] });
        }
      })
      .catch(() => this.setState({ academicYearList: [] }));
  };

  fetchStudentList = () => {
    const { academicYear } = this.state;
    if (!academicYear) {
      this.setState({ studentList: [], studentId: '' });
      return;
    }
    this.setState({ studentListLoading: true, studentId: '' });
    const url = GET_URL.fianceStudentlist?.api || 'finance/feeplanstudentlist/';
    const params = { academic_year: academicYear, admission_history: true };
    getRequest(url, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const raw = response.data?.data ?? response.data;
          const list = raw?.student_list ?? (Array.isArray(raw) ? raw : []);
          this.setState({ studentList: Array.isArray(list) ? list : [], studentListLoading: false });
        } else {
          this.setState({ studentList: [], studentListLoading: false });
        }
      })
      .catch(() => this.setState({ studentList: [], studentListLoading: false }));
  };

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value }, () => {
      if (name === 'academicYear') {
        this.fetchStudentList();
      }
    });
  };

  handleProceedToPayment = () => {
    const { advanceFeeType, amount, feeReceiptNumber, academicYear, studentId } = this.state;
    const amt = parseFloat(amount);
    if (!academicYear) {
      Swal.fire({ icon: 'warning', title: 'Please select Academic Year.' });
      return;
    }
    if (!studentId) {
      Swal.fire({ icon: 'warning', title: 'Please select Student.' });
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
        academic_year: academicYear,
        student: studentId,
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
    const payload = {
      academic_year: amountDetails.academic_year,
      student: amountDetails.student,
      advance_fee_type: amountDetails.advance_fee_type,
      amount: amountDetails.amount,
      fee_receipt_number: amountDetails.receiptNumber || payment_ref_num,
      payment_ref_num,
      payment_note,
      mode_of_payment,
      mode_of_payment_list: mode_of_payment_list || [],
    };
    this.setState({ submitDisable: true });
    const url = POST_URL.feeadvancecollection?.api || 'finance/feeadvancecollection/';
    postRequest(url, payload, this.props)
      .then((response) => {
        this.setState({ submitDisable: false });
        if (response && response.status === 200) {
          Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: response.data?.Reason || 'Advance fee collected successfully.',
            showConfirmButton: false,
            timer: 1500,
          });
          this.closePaymentModal();
          this.setState({ amount: '', feeReceiptNumber: '', advanceFeeType: '', academicYear: '', studentId: '' });
        } else {
          Swal.fire({ icon: 'error', title: response?.data?.Reason || 'Failed to save collection.' });
        }
      })
      .catch(() => {
        this.setState({ submitDisable: false });
        Swal.fire({ icon: 'error', title: 'Failed to save advance fee collection.' });
      });
  };

  render() {
    const {
      advanceFeeTypeList,
      advanceFeeType,
      academicYearList,
      academicYear,
      studentList,
      studentId,
      studentListLoading,
      amount,
      feeReceiptNumber,
      loading,
      openPaymentModal,
      amountDetails,
      submitDisable,
    } = this.state;

    const typeOptions = (advanceFeeTypeList || []).map((t) => ({ id: t.id, name: t.name || '—' }));
    const yearOptions = (academicYearList || []).map((y) => ({ id: y.id, name: y.name || y.alias || '—' }));
    const studentOptions = (studentList || []).map((s) => ({
      id: s.student ?? s.id ?? s.user_id,
      name: getFullName(s.first_name, s.middle_name, s.last_name) || s.student_name || '—',
    }));

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={280}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Box>
        <Paper className={classNames('paper-background')}>
          <Grid container>
            <Grid item md={6} xs={12} className={classNames('header-align')}>
              <Box className="heading">Advance Fee Collection</Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames('header-align', 'end-flex-prop')}>
                <Button
                  variant="outlined"
                  color="primary"
                  component={Link}
                  to={Actions.advance_fee_type?.view?.url || '/finance/advance-fee-type/list'}
                  style={{ marginRight: 8 }}
                >
                  Advance Fee Types
                </Button>
              </Box>
            </Grid>
          </Grid>

          <Box px={2} py={2}>
            <Typography variant="subtitle2" color="textSecondary" style={{ marginBottom: 16 }}>
              Select academic year, student, advance fee type, enter amount and fee receipt number, then proceed to payment.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Dropdown
                  label="Academic Year"
                  name="academicYear"
                  value={academicYear}
                  onChange={this.handleChange}
                  data={yearOptions}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Dropdown
                  label="Student"
                  name="studentId"
                  value={studentId}
                  onChange={this.handleChange}
                  data={studentOptions}
                  fullWidth
                  disabled={!academicYear || studentListLoading}
                />
                {studentListLoading && (
                  <Box mt={0.5} display="flex" alignItems="center">
                    <CircularProgress size={18} /> <Box ml={1} component="span">Loading students...</Box>
                  </Box>
                )}
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Dropdown
                  label="Advance Fee Type"
                  name="advanceFeeType"
                  value={advanceFeeType}
                  onChange={this.handleChange}
                  data={typeOptions}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Amount"
                  name="amount"
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                  value={amount}
                  onChange={this.handleChange}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Fee Receipt Number"
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
                  startIcon={<AddCircleOutlineOutlinedIcon />}
                  onClick={this.handleProceedToPayment}
                  disabled={!academicYear || !studentId || !advanceFeeType || !amount}
                >
                  Proceed to Payment
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {openPaymentModal && amountDetails && (
          <PaymentModal
            amountDetails={{
              amount: amountDetails.amount,
              student: amountDetails.receiptNumber ? `Receipt: ${amountDetails.receiptNumber}` : 'Advance Fee Collection',
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

export default withRouter(AdvanceFeeCollection);
