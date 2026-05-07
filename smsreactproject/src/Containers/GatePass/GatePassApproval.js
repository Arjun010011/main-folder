import React, { Component } from 'react';
import {
  Paper, Box, Button, Grid, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Tabs, Tab,
} from '@material-ui/core';
import classNames from 'classnames';
import Swal from 'sweetalert2';
import { getRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL } from 'Includes/urls';
import { dateFormat, getPaginationProps } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';

const STATUS_LABELS = {
  requested: 'REQUESTED',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  exited: 'EXITED',
  returned: 'RETURNED',
  expired: 'EXPIRED',
};

const TAB_STATUS = ['requested', 'approved', 'rejected'];

class GatePassApproval extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      tab: 0,
      requested: [],
      requestedCount: 0,
      approved: [],
      approvedCount: 0,
      rejected: [],
      rejectedCount: 0,
      requestedPagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      approvedPagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      rejectedPagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      tableUpdating: false,
      rejectOpen: false,
      rejectId: null,
      rejectReason: '',
    };
  }

  componentDidMount() {
    this.fetchTab(0);
  }

  getPaginationForTab = (tabIndex) => {
    const { requestedPagination, approvedPagination, rejectedPagination } = this.state;
    return [requestedPagination, approvedPagination, rejectedPagination][tabIndex];
  };

  fetchTab = (tabIndex, paginationProps) => {
    const status = TAB_STATUS[tabIndex];
    const pagination = this.getPaginationForTab(tabIndex);
    this.currentPagination = pagination;
    if (paginationProps && paginationProps !== 'download') {
      this.currentPagination = { ...paginationProps };
    }
    const params = { status, ...getPaginationProps(this.currentPagination) };
    this.setState({ tableUpdating: true });
    getRequest(GET_URL.gatepass.api, params, this.props).then((res) => {
      if (res && res.status === 200 && res.data) {
        const data = res.data.data || res.data;
        const list = Array.isArray(data) ? data : (data.data_list || data.results || []);
        const count = data.count != null ? data.count : list.length;
        const updates = {
          loading: false,
          tableUpdating: false,
        };
        if (tabIndex === 0) {
          updates.requested = list;
          updates.requestedCount = count;
          updates.requestedPagination = this.currentPagination || pagination;
        } else if (tabIndex === 1) {
          updates.approved = list;
          updates.approvedCount = count;
          updates.approvedPagination = this.currentPagination || pagination;
        } else {
          updates.rejected = list;
          updates.rejectedCount = count;
          updates.rejectedPagination = this.currentPagination || pagination;
        }
        this.setState(updates);
      } else {
        this.setState({ loading: false, tableUpdating: false });
      }
    }).catch(() => {
      this.setState({ loading: false, tableUpdating: false });
    });
  };

  handleTabChange = (e, newTab) => {
    this.setState({ tab: newTab }, () => this.fetchTab(newTab));
  };

  handleApprove = (id) => {
    const base = PUT_URL.gatepass.api.replace(/\/$/, '');
    putRequest(`${base}/${id}/`, { action: 'approve' }, this.props).then((res) => {
      if (res && (res.status === 200 || res.status === 201)) {
        Swal.fire({ position: 'top-end', type: 'success', title: 'Approved', showConfirmButton: false, timer: 1500 });
        this.fetchTab(this.state.tab);
      }
    });
  };

  openReject = (id) => this.setState({ rejectOpen: true, rejectId: id, rejectReason: '' });
  closeReject = () => this.setState({ rejectOpen: false, rejectId: null, rejectReason: '' });

  handleReject = () => {
    const { rejectId, rejectReason, tab } = this.state;
    if (!rejectId) return;
    const base = PUT_URL.gatepass.api.replace(/\/$/, '');
    putRequest(`${base}/${rejectId}/`, { action: 'reject', reason: rejectReason }, this.props).then((res) => {
      if (res && (res.status === 200 || res.status === 201)) {
        Swal.fire({ position: 'top-end', type: 'success', title: 'Rejected', showConfirmButton: false, timer: 1500 });
        this.closeReject();
        this.fetchTab(tab);
      }
    });
  };

  downloadPdf = (id) => {
    const base = GET_URL.gatepass.api.replace(/\/$/, '');
    const url = `${base}/${id}/pdf/`;
    getRequest(url, {}, { ...this.props, responseType: 'blob' }).then((res) => {
      if (res && res.data) {
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `gatepass-${id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(link.href);
      }
    });
  };

  getColumns = (tabIndex) => {
    const baseCols = [
      { name: 'id', label: 'ID', options: { display: false } },
      { name: 'gate_pass_number', label: 'Gate Pass No', options: { filter: false, sort: true } },
      { name: 'user_name', label: 'User', options: { filter: false, sort: true, customBodyRender: (v) => v || '—' } },
      { name: 'reason', label: 'Reason', options: { filter: false, sort: true } },
      { name: 'date', label: 'Date', options: { filter: false, sort: true, customBodyRender: (v) => (v ? dateFormat(v, 'DD-MM-YYYY') : '—') } },
      { name: 'status', label: 'Status', options: { filter: false, sort: true, customBodyRender: (v) => STATUS_LABELS[v] || v || '—' } },
    ];
    if (tabIndex === 0) {
      baseCols.push({
        name: 'Actions',
        label: 'Actions',
        options: {
          filter: false,
          sort: false,
          customBodyRender: (val, tableMeta) => {
            const gp = this.state.requested[tableMeta.rowIndex];
            if (!gp) return null;
            return (
              <Box display="flex" gap={1}>
                <Button size="small" color="primary" onClick={() => this.handleApprove(gp.id)}>Approve</Button>
                <Button size="small" color="secondary" onClick={() => this.openReject(gp.id)}>Reject</Button>
              </Box>
            );
          },
        },
      });
    } else if (tabIndex === 1) {
      baseCols.push({
        name: 'Actions',
        label: 'Actions',
        options: {
          filter: false,
          sort: false,
          customBodyRender: (val, tableMeta) => {
            const gp = this.state.approved[tableMeta.rowIndex];
            if (!gp) return null;
            return (
              <Button size="small" onClick={() => this.downloadPdf(gp.id)}>Print PDF</Button>
            );
          },
        },
      });
    }
    return baseCols;
  };

  render() {
    const {
      loading, tab, requested, approved, rejected,
      requestedCount, approvedCount, rejectedCount,
      requestedPagination, approvedPagination, rejectedPagination,
      tableUpdating, rejectOpen, rejectReason,
    } = this.state;
    const tabData = [requested, approved, rejected];
    const tabCount = [requestedCount, approvedCount, rejectedCount];
    const tabPagination = [requestedPagination, approvedPagination, rejectedPagination];
    const data = tabData[tab];
    const count = tabCount[tab];
    const pagination = tabPagination[tab];

    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    }
    const tableOptions = {
      selectableRows: 'none',
      responsive: 'scroll',
      filter: false,
      print: true,
      download: true,
      search: true,
      rowsPerPageOptions: [10, 25, 50, 100],
    };

    return (
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={12} xs={12} className={classNames('header-align')}>
            <Box className="heading">Gate Pass Approval</Box>
          </Grid>
        </Grid>
        <Grid container className="margin-top-20">
          <Grid item md={12} xs={12}>
            <Paper>
              <Tabs value={tab} onChange={this.handleTabChange}>
                <Tab label="Pending" />
                <Tab label="Approved" />
                <Tab label="Rejected" />
              </Tabs>
              <Box p={2}>
                <AllMUIDataTable
                  title={tableUpdating ? <CircularProgress size={24} className="white-text" /> : ''}
                  data={data || []}
                  columns={this.getColumns(tab)}
                  options={tableOptions}
                  serverSide={true}
                  pagination={pagination}
                  count={count || 0}
                  onTableChange={(tableState) => this.fetchTab(tab, tableState)}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Dialog open={rejectOpen} onClose={this.closeReject}>
          <DialogTitle>Reject Gate Pass</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="Reason" value={rejectReason} onChange={(e) => this.setState({ rejectReason: e.target.value })} multiline rows={3} />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeReject}>Cancel</Button>
            <Button color="secondary" onClick={this.handleReject}>Reject</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    );
  }
}

export default GatePassApproval;
