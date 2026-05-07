import React, { Component } from 'react';
import {
  Paper, Box, Button, Grid, TextField, Dialog, AppBar, Toolbar, IconButton,
  CircularProgress, FormControl, FormHelperText,
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { Dropdown } from 'Components/DropDown';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getFullName, getKeyValueMap, getPaginationProps } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS } from 'Constants';
import loadingBar from 'images/loading.gif';

const GOING_WITH = [
  { id: 'parent', name: 'Parent' },
  { id: 'guardian', name: 'Guardian' },
  { id: 'self', name: 'Self' },
];

const alias_names = JSON.parse(localStorage.getItem('alias_name')) || {};

class AddGatePass extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      users: [],
      form: {
        user: '',
        user_display: '',
        selected_user_type: '', // 'student' | 'staff'
        reason: '',
        going_with: 'parent',
        guardian_name: '',
        guardian_phone: '',
        expected_return_time: '',
        date: new Date().toISOString().split('T')[0],
        approval_authority: '',
      },
      errors: {},
      submitting: false,
      selectDialogOpen: false,
      selectType: 'student',
      data_list: [],
      all_data_list: {},
      tableUpdating: false,
      pagination: { ...DEFAULT_PAGINATION_PROPS },
      standardList: [],
      selectedStandard: 'all',
    };
  }

  componentDidMount() {
    this.getStandardList();
    this.setState({ loading: false });
  }

  getStandardList = () => {
    getRequest(GET_URL.getstandard.api, { is_active: true, only_standards: true }, this.props).then((res) => {
      if (res && res.status === 200 && res.data?.data) {
        const list = res.data.data.filter((d) => (d.codename || '') !== 'promoted');
        this.setState({ standardList: [{ id: 'all', name: 'All' }, ...list] });
      }
    });
  };

  openSelectDialog = (type) => {
    this.setState({ selectDialogOpen: true, selectType: type, tableUpdating: true }, () => {
      this.fetchUserList();
    });
  };

  fetchUserList = (paginationProps) => {
    const { pagination, selectType, selectedStandard } = this.state;
    const currentPagination = paginationProps ? { ...paginationProps } : pagination;
    const pagination_params = getPaginationProps(currentPagination);
    const url = selectType === 'staff' ? GET_URL.staff.api : GET_URL.student.api;
    let params = { ...pagination_params, is_active: true };
    if (selectType === 'student' && selectedStandard && selectedStandard !== 'all') {
      params.current_standard = selectedStandard;
    }

    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const res = response.data;
        let data_list = res.data?.student_list ?? res.data ?? res.results ?? [];
        if (!Array.isArray(data_list)) data_list = [];
        data_list.forEach((data) => {
          data.full_name = data.full_name || getFullName(data.first_name, data.middle_name, data.last_name);
        });
        const allData = res.data || res;
        const count = allData?.count ?? data_list.length;
        this.setState({
          data_list,
          all_data_list: { count },
          pagination: currentPagination,
          tableUpdating: false,
        });
      } else {
        this.setState({ tableUpdating: false });
      }
    }).catch(() => this.setState({ tableUpdating: false }));
  };

  getParentName = (row) => {
    if (!row) return '';
    const sp = row.student_parent;
    if (!sp) return row.father_name || row.mother_name || row.guardian_name || '';
    const parts = [];
    if (sp.parent) {
      if (sp.parent.father_name) parts.push(sp.parent.father_name);
      if (sp.parent.mother_name) parts.push(sp.parent.mother_name);
    }
    if (sp.guardian && sp.guardian.guardian_name) parts.push(sp.guardian.guardian_name);
    return parts.join(' / ') || row.father_name || row.mother_name || row.guardian_name || '';
  };

  onSelectUser = (index) => {
    const { data_list, selectType } = this.state;
    const row = data_list[index];
    if (!row) return;
    const userId = row.user_id || (row.users && (typeof row.users === 'object' ? row.users.id : row.users)) || row.id;
    const fullName = row.full_name || getFullName(row.first_name, row.middle_name, row.last_name);
    const regNum = row.current_reg_num || row.employee_id || '';
    const parentName = selectType === 'student' ? this.getParentName(row) : '';
    let userDisplay = `${fullName}${regNum ? ` (${regNum})` : ''}`;
    if (parentName) userDisplay += ` - Parent: ${parentName}`;
    this.setState({
      form: {
        ...this.state.form,
        user: userId,
        user_display: userDisplay,
        selected_user_type: selectType,
      },
      selectDialogOpen: false,
    });
  };

  handleCloseSelectDialog = () => {
    this.setState({ selectDialogOpen: false });
  };

  onChange = (e) => {
    const { name, value } = e.target;
    const { form, errors } = this.state;
    form[name] = value;
    if (errors[name]) delete errors[name];
    this.setState({ form, errors });
    if (name === 'selectedStandard' && this.state.selectDialogOpen) {
      this.setState({ selectedStandard: value }, () => this.fetchUserList());
    }
  };

  validate = () => {
    const { form } = this.state;
    const errors = {};
    if (!form.user) errors.user = 'User is required';
    if (!form.reason) errors.reason = 'Reason is required';
    if (!form.date) errors.date = 'Date is required';
    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  onSubmit = () => {
    if (!this.validate()) return;
    this.setState({ submitting: true });
    const payload = { ...this.state.form };
    delete payload.user_display;
    delete payload.selected_user_type;
    if (!payload.expected_return_time) delete payload.expected_return_time;
    if (!payload.approval_authority) delete payload.approval_authority;

    postRequest(POST_URL.gatepass.api, payload, this.props).then((res) => {
      if (res && (res.status === 200 || res.status === 201)) {
        Swal.fire({ position: 'top-end', type: 'success', title: 'Gate pass requested', showConfirmButton: false, timer: 1500 });
        this.props.history.push(Actions.gate_pass_list.view.url);
      }
      this.setState({ submitting: false });
    }).catch(() => this.setState({ submitting: false }));
  };

  handleBack = () => {
    this.props.history.push(Actions.gate_pass_list.view.url);
  };

  getColumns = () => {
    const { selectType } = this.state;
    const baseColumns = [
      { name: 'id', label: 'id', options: { display: false } },
      { name: 'user_id', label: 'user_id', options: { display: false } },
      { name: 'users', label: 'users', options: { display: false } },
      {
        name: 'full_name',
        label: 'Name',
        options: { filter: true, sort: true },
      },
      {
        name: 'Actions',
        label: 'Action',
        options: {
          filter: false,
          sort: false,
          customBodyRender: (value, tableMeta) => (
            <Button
              className="add-modify-button"
              size="small"
              onClick={() => this.onSelectUser(tableMeta.rowIndex)}
            >
              Select
            </Button>
          ),
        },
      },
    ];
    if (selectType === 'student') {
      return [
        ...baseColumns.slice(0, 4),
        { name: 'current_reg_num', label: 'Admission No', options: { filter: true, sort: true } },
        { name: 'current_standard_name', label: alias_names.standard || 'Class', options: { filter: true, sort: true } },
        ...baseColumns.slice(4),
      ];
    }
    return [
      ...baseColumns.slice(0, 4),
      { name: 'employee_id', label: 'Employee ID', options: { filter: true, sort: true } },
      ...baseColumns.slice(4),
    ];
  };

  render() {
    const { loading, form, errors, submitting, selectDialogOpen, selectType, data_list, tableUpdating, pagination, all_data_list, standardList } = this.state;

    const tableOptions = {
      selectableRows: 'none',
      filterType: 'dropdown',
      responsive: 'simple',
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [10, 25, 50],
    };

    if (loading) return null;

    return (
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={6} xs={12} className={classNames('header-align')}>
            <Box className="heading">Add Gate Pass</Box>
          </Grid>
          <Grid item md={6} xs={12} className={classNames('header-align', 'end-flex-prop')}>
            <Button variant="contained" onClick={this.handleBack} className="editbutton-view">
              Back to List
            </Button>
          </Grid>
        </Grid>

        <Paper className="mt-20 p-20">
          <Grid container spacing={3}>
            <Grid item md={6} xs={12}>
              <Box className="mb-20">
                <Box className="text-blue fs-16 mb-10">Student / Staff</Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Button
                      className="add-modify-button"
                      fullWidth
                      onClick={() => this.openSelectDialog('student')}
                    >
                      Select Student
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      className="add-modify-button"
                      fullWidth
                      onClick={() => this.openSelectDialog('staff')}
                    >
                      Select Staff
                    </Button>
                  </Grid>
                </Grid>
                {form.user_display && (
                  <Box className="mt-10 fs-16" fontWeight="bold">
                    Selected {form.selected_user_type === 'staff' ? 'Staff' : 'Student'}: {form.user_display}
                  </Box>
                )}
                {errors.user && <FormHelperText error>{errors.user}</FormHelperText>}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                label="Reason"
                name="reason"
                value={form.reason}
                onChange={this.onChange}
                error={!!errors.reason}
                helperText={errors.reason}
                className="w-100"
              />
            </Grid>

            <Grid item md={4} xs={12}>
              <Dropdown
                data={GOING_WITH}
                name="going_with"
                value={form.going_with}
                onChange={this.onChange}
                label="Going with"
                customName="name"
                customId="id"
                hideSelect={true}
                fullWidth
              />
            </Grid>
            <Grid item md={4} xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                label={form.going_with === 'parent' ? 'Parent Name' : form.going_with === 'guardian' ? 'Guardian Name' : 'Contact Name'}
                name="guardian_name"
                value={form.guardian_name}
                onChange={this.onChange}
                className="w-100"
              />
            </Grid>
            <Grid item md={4} xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                label={form.going_with === 'parent' ? 'Parent Phone' : form.going_with === 'guardian' ? 'Guardian Phone' : 'Contact Phone'}
                name="guardian_phone"
                value={form.guardian_phone}
                onChange={this.onChange}
                className="w-100"
              />
            </Grid>

            <Grid item md={4} xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                type="date"
                label="Date"
                name="date"
                value={form.date}
                onChange={this.onChange}
                InputLabelProps={{ shrink: true }}
                error={!!errors.date}
                helperText={errors.date}
                className="w-100"
              />
            </Grid>
            <Grid item md={4} xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                type="datetime-local"
                label="Expected Return Time"
                name="expected_return_time"
                value={form.expected_return_time}
                onChange={this.onChange}
                InputLabelProps={{ shrink: true }}
                className="w-100"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={this.onSubmit}
                disabled={submitting}
                className="editbutton-view"
              >
                {submitting ? 'Submitting...' : 'Create Gate Pass Request'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Dialog fullScreen open={selectDialogOpen} onClose={this.handleCloseSelectDialog}>
          <AppBar style={{ position: 'fixed', backgroundColor: '#4680FF' }}>
            <Toolbar>
              <IconButton edge="start" color="inherit" onClick={this.handleCloseSelectDialog} aria-label="close">
                <CloseIcon />
              </IconButton>
              <Box className="ml-20">Select {selectType === 'student' ? 'Student' : 'Staff'}</Box>
            </Toolbar>
          </AppBar>
          <Box className="student-route-table-popup margin-top" style={{ paddingTop: 80 }}>
            {selectType === 'student' && (
              <Box className="header-align mb-20">
                <Dropdown
                  data={standardList}
                  name="selectedStandard"
                  value={this.state.selectedStandard}
                  onChange={this.onChange}
                  label={`Filter by ${alias_names.standard || 'Standard'}`}
                  hideSelect={true}
                  className="width-300"
                />
              </Box>
            )}
            {tableUpdating && (
              <Box display="flex" justifyContent="center" py={4}>
                <img src={loadingBar} className="loading" alt="loading" />
              </Box>
            )}
            {!tableUpdating && data_list && data_list.length > 0 && (
              <Paper>
                <AllMUIDataTable
                  data={data_list}
                  columns={this.getColumns()}
                  options={tableOptions}
                  title={tableUpdating ? <CircularProgress className="white-text" /> : ''}
                  onTableChange={selectType === 'student' ? this.fetchUserList : undefined}
                  serverSide={selectType === 'student'}
                  pagination={pagination}
                  count={all_data_list?.count || data_list.length}
                />
              </Paper>
            )}
          </Box>
        </Dialog>
      </Paper>
    );
  }
}

export default withRouter(AddGatePass);
