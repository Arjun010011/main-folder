import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { Paper, Box, Typography, CircularProgress } from '@material-ui/core';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { dateFormat, isUserHasPermission, getFullName } from 'Includes/functions';

const VISITOR_VERIFY_API =
  (GET_URL.visitorVerify && GET_URL.visitorVerify.api) || '/institutes/visitor/verify/';

function visitedForLabel(data) {
  if (!data || !data.user_details) return '—';
  const u = data.user_details;
  if (u.staff) {
    return `Staff — ${getFullName(u.staff.first_name, u.staff.middle_name, u.staff.last_name)}`;
  }
  if (u.student) {
    return `Student — ${getFullName(u.student.first_name, u.student.middle_name, u.student.last_name)}`;
  }
  return '—';
}

class SchoolVisitorVerify extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      data: null,
      error: null,
      forbidden: false,
    };
  }

  getVisitorIdFromUrl = () => {
    const search = (this.props.location && this.props.location.search) || window.location.search || '';
    const params = new URLSearchParams(search);
    return params.get('visitor') || params.get('visitor_id') || '';
  };

  componentDidMount() {
    if (!isUserHasPermission('school_visitor_verify', 'view')) {
      this.setState({ loading: false, forbidden: true });
      return;
    }
    const vid = this.getVisitorIdFromUrl();
    if (vid) {
      this.fetchVisitor(vid);
    } else {
      this.setState({
        loading: false,
        error: 'No visitor id in URL. Scan the QR code on the printed visitor pass.',
      });
    }
  }

  componentDidUpdate(prevProps) {
    const prevSearch = (prevProps.location && prevProps.location.search) || '';
    const currSearch = (this.props.location && this.props.location.search) || '';
    if (prevSearch !== currSearch) {
      const vid = this.getVisitorIdFromUrl();
      if (vid) {
        this.setState({ error: null });
        this.fetchVisitor(vid);
      }
    }
  }

  fetchVisitor = (visitorId) => {
    this.setState({ loading: true });
    const url = VISITOR_VERIFY_API;
    const params = { visitor: visitorId };
    getRequest(url, params, { ...this.props, dontSendBranch: true }).then((res) => {
      if (res && res.status === 200 && res.data && res.data.valid && res.data.data) {
        this.setState({ data: res.data.data, loading: false, error: null });
      } else {
        this.setState({
          data: null,
          loading: false,
          error: (res && res.data && res.data.message) || 'Visitor not found.',
        });
      }
    }).catch(() => {
      this.setState({ data: null, loading: false, error: 'Failed to load visitor.' });
    });
  };

  render() {
    const { loading, data, error, forbidden } = this.state;

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
            Log in with a user who has School Visitor Verify permission, then open the link from the QR code again.
          </Typography>
        </Paper>
      );
    }

    if (error && !data) {
      return (
        <Paper style={{ padding: 24, maxWidth: 480, margin: '24px auto' }}>
          <Typography color="error">{error}</Typography>
          <Typography variant="body2" style={{ marginTop: 8 }}>
            Use the full URL from the QR on the visitor pass (includes <code>?visitor=…</code>).
          </Typography>
        </Paper>
      );
    }

    if (!data) {
      return null;
    }

    const reasonName = (data.reason_details && data.reason_details.name) || '—';
    const building = data.building_name || '—';

    return (
      <Paper style={{ padding: 24, maxWidth: 560, margin: '24px auto' }}>
        <Typography variant="h6" gutterBottom>Visitor pass verification</Typography>
        <Typography variant="subtitle2" color="textSecondary">
          Record id: <strong>{data.id}</strong>
        </Typography>
        <Box marginTop={2}>
          <Typography><strong>Visitor name:</strong> {data.name || '—'}</Typography>
          <Typography><strong>Mobile:</strong> {data.mobile || '—'}</Typography>
          <Typography>
            <strong>Check-in:</strong>{' '}
            {data.checkin ? dateFormat(data.checkin, 'DD-MM-YYYY hh:mm A') : '—'}
          </Typography>
          <Typography>
            <strong>Check-out:</strong>{' '}
            {data.checkout ? dateFormat(data.checkout, 'DD-MM-YYYY hh:mm A') : '—'}
          </Typography>
          <Typography><strong>Building:</strong> {building}</Typography>
          <Typography><strong>Purpose / reason:</strong> {reasonName}</Typography>
          <Typography><strong>Visited for:</strong> {visitedForLabel(data)}</Typography>
        </Box>
        <Box marginTop={2}>
          <Typography variant="body2" color="textSecondary">
            Compare these details with the printed pass and the person at the gate.
          </Typography>
        </Box>
      </Paper>
    );
  }
}

export default withRouter(SchoolVisitorVerify);
