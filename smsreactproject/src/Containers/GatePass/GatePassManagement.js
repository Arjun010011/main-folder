import React, { Component } from 'react';
import {
  Paper, Box, Button, Grid, CircularProgress, IconButton, Tooltip,
} from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import PrintIcon from '@material-ui/icons/Print';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import classNames from 'classnames';
import Swal from 'sweetalert2';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { dateFormat, getPaginationProps } from 'Includes/functions';
import { withRouter } from 'react-router-dom';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import loadingBar from 'images/loading.gif';

const STATUS_LABELS = {
  requested: 'REQUESTED',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  exited: 'EXITED',
  returned: 'RETURNED',
  expired: 'EXPIRED',
};

class GatePassManagement extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      gatepasses: [],
      gatepassCount: 0,
      tableUpdating: false,
      printLoading: {},
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
    };
    this.columns = [
      {
        name: 'id',
        label: 'ID',
        options: { display: false, filter: false, sort: false },
      },
      {
        name: 'gate_pass_number',
        label: 'Gate Pass No',
        options: { filter: true, sort: true },
      },
      {
        name: 'user_type',
        label: 'User Type',
        options: { display: false },
      },
      {
        name: 'user_name',
        label: 'Student/Staff Name',
        options: {
          filter: true,
          sort: true,
          customBodyRender: (value, tableMeta) => {
            const row = tableMeta.rowData && this.state.gatepasses[tableMeta.rowIndex];
            const type = row && row.user_type;
            const name = value || '—';
            return type ? `${name} (${type})` : name;
          },
        },
      },
      {
        name: 'admission_number',
        label: 'Admission/Employee No',
        options: { filter: true, sort: true, customBodyRender: (v) => v || '—' },
      },
      {
        name: 'class_name',
        label: 'Class',
        options: { filter: true, sort: true, customBodyRender: (v) => v || '—' },
      },
      {
        name: 'section_name',
        label: 'Section',
        options: { filter: true, sort: true, customBodyRender: (v) => v || '—' },
      },
      {
        name: 'reason',
        label: 'Reason',
        options: { filter: true, sort: true },
      },
      {
        name: 'date',
        label: 'Date',
        options: {
          filter: true,
          sort: true,
          customBodyRender: (value) => (value ? dateFormat(value, 'DD-MM-YYYY') : '—'),
        },
      },
      {
        name: 'status',
        label: 'Status',
        options: {
          filter: true,
          sort: true,
          customBodyRender: (value) => STATUS_LABELS[value] || value || '—',
        },
      },
      {
        name: 'Actions',
        label: 'Actions',
        options: {
          filter: false,
          sort: false,
          customBodyRender: (value, tableMeta) => {
            const row = this.state.gatepasses[tableMeta.rowIndex];
            const id = row && row.id;
            const status = row && row.status;
            const isRequested = status === 'requested';
            const printLoading = this.state.printLoading[id];
            return (
              <Box display="flex" alignItems="center" gap={4}>
                <Tooltip title="Print (with QR)">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => this.handlePrint(id)}
                      disabled={printLoading}
                    >
                      {printLoading ? <CircularProgress size={20} /> : <PrintIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
                {isRequested && isUserHasPermission('gate_pass_add', 'create') && (
                  <>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => this.handleEdit(id)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => this.handleDelete(row)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>
            );
          },
        },
      },
    ];
  }

  handlePrint = (id) => {
    this.setState((s) => ({ printLoading: { ...s.printLoading, [id]: true } }));
    const url = `${GET_URL.gatepass.api.replace(/\/$/, '')}/${id}/pdf/`;
    const prop = { responseType: 'blob' };
    getRequest(url, {}, { ...this.props, ...prop }).then((res) => {
      this.setState((s) => {
        const next = { ...s.printLoading };
        delete next[id];
        return { printLoading: next };
      });
      if (res && res.status === 200 && res.data) {
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(blob);
        const w = window.open(fileURL, 'PRINT', `height=${(window.screen.height * 90) / 100},width=${(window.screen.width * 80) / 100}`);
        if (w) {
          w.print();
          w.onafterprint = w.close;
        }
      }
    }).catch(() => {
      this.setState((s) => {
        const next = { ...s.printLoading };
        delete next[id];
        return { printLoading: next };
      });
    });
  };

  handleEdit = (id) => {
    this.props.history.push(`/gatepass/edit/${id}`);
  };

  handleDelete = (row) => {
    Swal.fire({
      title: 'Delete Gate Pass?',
      text: `Gate Pass ${row.gate_pass_number} will be permanently deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (result.isConfirmed) {
        const url = `${DEL_URL.gatepass.api.replace(/\/$/, '')}/${row.id}/`;
        deleteRequest(url, this.props).then(() => {
          Swal.fire({ position: 'top-end', icon: 'success', title: 'Deleted', showConfirmButton: false, timer: 1500 });
          this.fetchList();
        }).catch(() => {});
      }
    });
  };

  componentDidMount() {
    this.fetchList();
  }

  fetchList = (paginationProps) => {
    this.setState({ tableUpdating: true });
    const { pagination } = this.state;
    this.currentPagination = pagination;
    if (paginationProps && paginationProps !== 'download') {
      this.currentPagination = { ...paginationProps };
    }
    const paginationParams = getPaginationProps(this.currentPagination);
    const params = { ...paginationParams };
    getRequest(GET_URL.gatepass.api, params, this.props).then((res) => {
      if (res && res.status === 200 && res.data) {
        const data = res.data.data || res.data;
        const list = Array.isArray(data) ? data : (data.data_list || data.results || []);
        const count = data.count != null ? data.count : list.length;
        this.setState({
          gatepasses: list,
          gatepassCount: count,
          loading: false,
          tableUpdating: false,
          pagination: this.currentPagination || this.state.pagination,
        });
      } else {
        this.setState({ loading: false, tableUpdating: false });
      }
    }).catch(() => {
      this.setState({ loading: false, tableUpdating: false });
    });
  };

  handleAddGatePass = () => {
    this.props.history.push(Actions.gate_pass_add.create.url);
  };

  render() {
    const { loading, gatepasses, gatepassCount, tableUpdating, pagination } = this.state;
    const options = {
      selectableRows: 'none',
      responsive: 'scroll',
      viewColumns: true,
      filter: true,
      print: true,
      download: true,
      search: true,
      rowsPerPageOptions: [10, 25, 50, 100],
      downloadOptions: {
        filename: 'gate_pass_list.csv',
        filterOptions: {
          useDisplayedColumnsOnly: true,
          useDisplayedRowsOnly: true,
        },
      },
    };
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    }
    return (
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={6} xs={12} className={classNames('header-align')}>
            <Box className="heading">Gate Pass</Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className={classNames('header-align', 'end-flex-prop')}>
              {isUserHasPermission('gate_pass_add', 'create') && (
                <Button
                  variant="contained"
                  onClick={this.handleAddGatePass}
                  className="editbutton-view"
                >
                  <AddCircleOutlineOutlinedIcon className="visibility-icon" /> Add Gate Pass
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
        <Grid container className="margin-top-20">
          <Grid item md={12} xs={12}>
            <Paper>
              <AllMUIDataTable
                title={tableUpdating ? <CircularProgress className="white-text" /> : ''}
                data={gatepasses}
                columns={this.columns}
                options={options}
                serverSide={true}
                pagination={pagination}
                count={gatepassCount}
                onTableChange={this.fetchList}
              />
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    );
  }
}

export default withRouter(GatePassManagement);
