import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import {
  Paper, Box, Button, Grid, Typography, CircularProgress, TextField,
} from '@material-ui/core';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { dateFormat, isUserHasPermission } from 'Includes/functions';
import Swal from 'sweetalert2';

const STATUS_LABELS = {
  requested: 'REQUESTED',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  exited: 'EXITED',
  returned: 'RETURNED',
  expired: 'EXPIRED',
};

class GatePassVerify extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      submitting: false,
      passNumber: '',
      data: null,
      error: null,
      guardName: '',
      forbidden: false,
    };
  }

  getPassFromUrl = () => {
    const search = (this.props.location && this.props.location.search) || window.location.search || '';
    const params = new URLSearchParams(search);
    return params.get('pass') || params.get('pass_number') || '';
  };

  componentDidMount() {
    if (!isUserHasPermission('gate_pass_verify', 'view')) {
      this.setState({ loading: false, forbidden: true });
      return;
    }
    const pass = this.getPassFromUrl();
    if (pass) {
      this.setState({ passNumber: pass });
      this.fetchPass(pass);
    } else {
      this.setState({ loading: false, error: 'No gate pass number in URL. Scan the QR on the gate pass.' });
    }
  }

  componentDidUpdate(prevProps) {
    const prevSearch = (prevProps.location && prevProps.location.search) || '';
    const currSearch = (this.props.location && this.props.location.search) || '';
    if (prevSearch !== currSearch) {
      const pass = this.getPassFromUrl();
      if (pass) {
        this.setState({ passNumber: pass, error: null });
        this.fetchPass(pass);
      }
    }
  }

  fetchPass = (passNumber) => {
    this.setState({ loading: true });
    const url = GET_URL.gatepassVerify.api;
    const params = { pass_number: passNumber };
    getRequest(url, params, { ...this.props, dontSendBranch: true }).then((res) => {
      if (res && res.status === 200 && res.data && res.data.valid && res.data.data) {
        this.setState({ data: res.data.data, loading: false, error: null });
      } else {
        this.setState({ data: null, loading: false, error: (res && res.data && res.data.message) || 'Gate pass not found.' });
      }
    }).catch(() => {
      this.setState({ data: null, loading: false, error: 'Failed to load gate pass.' });
    });
  };

  handleVerifyExit = () => {
    const { passNumber, guardName } = this.state;
    this.setState({ submitting: true });
    postRequest(
      POST_URL.gatepassVerify.api,
      { pass_number: passNumber, action: 'exit', guard_name: guardName || '' },
      { ...this.props, dontSendBranch: true }
    ).then((res) => {
      this.setState({ submitting: false });
      if (res && res.status === 200 && res.data) {
        Swal.fire({ position: 'top-end', icon: 'success', title: res.data.Reason || 'Checkout verified.', showConfirmButton: false, timer: 2000 });
        this.fetchPass(passNumber);
      }
    }).catch((err) => {
      this.setState({ submitting: false });
      const msg = (err && err.response && err.response.data && err.response.data.message) || 'Failed to verify checkout.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
    });
  };

  handleVerifyReturn = () => {
    const { passNumber } = this.state;
    this.setState({ submitting: true });
    postRequest(
      POST_URL.gatepassVerify.api,
      { pass_number: passNumber, action: 'return' },
      { ...this.props, dontSendBranch: true }
    ).then((res) => {
      this.setState({ submitting: false });
      if (res && res.status === 200 && res.data) {
        Swal.fire({ position: 'top-end', icon: 'success', title: res.data.Reason || 'Return verified.', showConfirmButton: false, timer: 2000 });
        this.fetchPass(passNumber);
      }
    }).catch((err) => {
      this.setState({ submitting: false });
      const msg = (err && err.response && err.response.data && err.response.data.message) || 'Failed to verify return.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
    });
  };

  render() {
    const { loading, data, error, guardName, submitting, forbidden } = this.state;

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress />
        </Box>
      );
    }

    if (forbidden) {
      return (
        <Paper style={{ padding: 24, maxWidth: 520, margin: '24px auto' }}>
          <Typography color="error">Access denied.</Typography>
          <Typography variant="body2" style={{ marginTop: 8 }}>
            Please login with a user who has Gate Pass Verify permission.
          </Typography>
        </Paper>
      );
    }

    if (error && !data) {
      return (
        <Paper style={{ padding: 24, maxWidth: 480, margin: '24px auto' }}>
          <Typography color="error">{error}</Typography>
          <Typography variant="body2" style={{ marginTop: 8 }}>Use the link from the QR code on the printed gate pass.</Typography>
        </Paper>
      );
    }

    if (!data) {
      return null;
    }

    const status = data.status || '';
    const canVerifyExit = status === 'approved';
    const canVerifyReturn = status === 'exited';

    return (
      <Paper style={{ padding: 24, maxWidth: 520, margin: '24px auto' }}>
        <Typography variant="h6" gutterBottom>Gate Pass Verification</Typography>
        <Typography variant="subtitle2" color="textSecondary">Pass: <strong>{data.gate_pass_number}</strong></Typography>
        <Box marginTop={2}>
          <Typography><strong>Name:</strong> {data.user_name || '—'} {data.user_type ? `(${data.user_type})` : ''}</Typography>
          <Typography><strong>Admission/Employee No:</strong> {data.admission_number || '—'}</Typography>
          {data.class_name && <Typography><strong>Class:</strong> {data.class_name}</Typography>}
          {data.section_name && <Typography><strong>Section:</strong> {data.section_name}</Typography>}
          <Typography><strong>Reason:</strong> {data.reason || '—'}</Typography>
          <Typography><strong>Date:</strong> {data.date ? dateFormat(data.date, 'DD-MM-YYYY') : '—'}</Typography>
          <Typography><strong>Status:</strong> {STATUS_LABELS[status] || status}</Typography>
        </Box>

        <Box marginTop={3}>
          {canVerifyExit && (
            <Box marginBottom={2}>
              <TextField
                label="Guard name (optional)"
                value={guardName}
                onChange={(e) => this.setState({ guardName: e.target.value })}
                variant="outlined"
                size="small"
                fullWidth
                style={{ marginBottom: 8 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleVerifyExit}
                disabled={submitting}
              >
                {submitting ? <CircularProgress size={22} /> : 'Verify checkout (exit)'}
              </Button>
            </Box>
          )}
          {canVerifyReturn && (
            <Button
              variant="contained"
              color="secondary"
              onClick={this.handleVerifyReturn}
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={22} /> : 'Verify return'}
            </Button>
          )}
          {!canVerifyExit && !canVerifyReturn && (
            <Typography color="textSecondary">
              {status === 'requested' && 'Gate pass is pending approval. Cannot verify exit yet.'}
              {status === 'rejected' && 'This gate pass was rejected.'}
              {status === 'exited' && 'Checkout already recorded. Use "Verify return" when the person returns.'}
              {status === 'returned' && 'Exit and return have been verified.'}
              {status === 'expired' && 'This gate pass has expired.'}
            </Typography>
          )}
        </Box>
      </Paper>
    );
  }
}

export default withRouter(GatePassVerify);
