import React, { Component, Fragment } from 'react';
import {
  Paper,
  Box,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Chip
} from '@material-ui/core';
import Swal from 'sweetalert2';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import _ from 'lodash';

import { DateRange } from 'Components/DateRange';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { Dropdown } from 'Components/DropDown';
import ActionColumn from 'Components/ActionColumnNew';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL,POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import {
  dateFormat,
  isUserHasPermission
} from 'Includes/functions';
import { minDate, maxDate } from 'Constants';

const fieldDetails_global = [
  {
    label: 'Department',
    name: 'branch_id',
    type: 'dropDown',
    md: 12,
    className: 'width-100',
    required: true,
    id: 'outlined-textarea',
    autoFocus: true,
    maxLength: '25',
    list: []
  },
  {
    label: 'From Date',
    name: 'from_date',
    type: 'date',
    md: 12,
    className: 'width-100',
    required: true,
    id: 'outlined-textarea',
    minDate: minDate,
    maxDate: maxDate
  },
  {
    label: 'Is HOD',
    name: 'is_hod',
    type: 'checkbox',
    md: 12,
    className: 'width-100',
    required: false,
    id: 'outlined-textarea'
  },
  {
    label: 'HOD From Date',
    name: 'hod_from_date',
    type: 'date',
    md: 12,
    className: 'width-100',
    required: false,
    id: 'outlined-textarea',
    minDate: minDate,
    maxDate: maxDate,
    isEnableWhenPresent: "is_hod",
  },
  {
    label: 'Staff',
    name: 'staff_id',
    type: 'dropDown',
    md: 12,
    className: 'width-100',
    required: false,
    id: 'outlined-textarea',
    autoFocus: true,
    maxLength: '25',
    list: [],
    disable:true,
    display:false
  }

];

class StaffDepartmentMappingView extends Component {
  constructor() {
    super();
    this.permission = ["update",'delete'];
    this.state = {
      assignShiftList: [],
      loading: true,
      selectedToDelete: [],
      tableUpdating: false,
      fieldDetails: null,
      shiftListLoaded: false,
      pageLoading: false,
      isBlankPage: true,
      dateRangeValue: {},
      yearList: [],
      selected_branch: '',
      year: '',
      columns: [
        {
          name: 'id',
          label: 'id',
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false
          }
        },
        {
          name: 'branch',
          label: 'Department Id',
          options: { display: false,

           }
        },
        {
          name: 'full_name',
          label: 'Staff Name',
          options: {
            filter: true,
            sort: true,
            search: true
          }
        },
        {
          name: 'branch__name',
          label: 'Department Name',
          options: {
            filter: true,
            sort: true
          }
        },
        {
          name: 'from_date',
          label: 'From Date',
          options: {
            display:false,
            filter: false,
            sort: true,
            customBodyRender: (value) => dateFormat(value, 'DD-MM-YYYY')
          }
        },
        {
          name: 'is_hod',
          label: 'Is HOD',
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value) =>
              value ? (
                <Chip label="Yes" color="primary" size="small" />
              ) : (
                <Chip label="No" color="secondary" size="small" />
              )
          }
        },
        {
          name: 'mobile_num',
          label: 'Mobile Number',
          options: {
            filter: false,
            sort: true
          }
        },
        {
          name: 'hod_from_date',
          label: 'HOD  Date',
          options: {
            display:false,
            filter: false,
            sort: true,
            customBodyRender: (value) => dateFormat(value, 'DD-MM-YYYY')
          }
        },
        {
          name: 'staff_id',
          label: 'Staff Id',
          options: {display: false}
        },
        {
          name: 'Actions',
          label: 'Action',
          options: {
            display: true,
            filter: false,
            sort: false,
            viewColumns: false,
            customBodyRender: (value, tableMeta) => {
              const rowId = tableMeta.rowData[0];
              const departmentId = tableMeta.rowData[3];
              const fromDateRaw = tableMeta.rowData[4];
              const isHodRaw = tableMeta.rowData[5];
              const fromDate = fromDateRaw ? new Date(fromDateRaw) : null;

              // const isHod =
              //   typeof isHodRaw === "string"
              //     ? isHodRaw.toLowerCase() === "true"
              //     : Boolean(isHodRaw);
            
              // // 🔹 Make a clone of fieldDetails for this row
              // const dynamicFields = this.state.fieldDetails.map((f) =>
              //   f.name === "hod_from_date" ? { ...f, disabled: !isHod } : f
              // );
            
              return (
                <ActionColumn
                  id={rowId}
                  fieldValues={[tableMeta.rowData[1], fromDate, isHodRaw, tableMeta.rowData[7], tableMeta.rowData[8]]}
                  label={`Update Department To ${tableMeta.rowData[2]}`}
                  fieldDetails={this.state.fieldDetails}
                  updateUrl={PUT_URL.staffhodbranchmapping.api}
                  updatePostFormat={this.updatePostFormat}
                  getData={() => this.getdepartmenteditList(rowId)}
                  isGetData={true}
                  updateType={this.updateType}
                  deleteUrl={DEL_URL.staffhodbranchmapping.api}
                  baseClassName="action-basic-detail-width"
                  enabledActions={this.permission}
                />
              );
            }
          }
        }
      ]
    };
    this.dateRange = React.createRef();
  }

  updatePermissions = (name) => {
    let test = true;
    const hasEditPermission = isUserHasPermission('assign_department', 'update');
    const hasDeletePermission = isUserHasPermission('assign_department', 'delete');
    let permissions = [];
    let enabledActions = [];
    if (hasEditPermission) {
      enabledActions.push('edit');
      permissions.push('assign_department');
    }
    if (hasDeletePermission) {
      enabledActions.push('delete');
      permissions.push('assign_department');
    }
    if (enabledActions.length === 0) {
      test = false;
    }
    if (name === 'display') {
      return test;
    } else {
      this.setState({
        enabledActions: enabledActions,
        permissions,
        columns: this.state.columns
      });
    }
  };

  componentDidMount = () => {
    this.getAssignDepartmentList();
    this.updatePermissions('actions');
    this.setState({
      fieldDetails: fieldDetails_global,
      selected_branch: localStorage.getItem('branch')
    });
  };

  getAssignDepartmentList = () => {
    const url = GET_URL.staffhodbranchmapping.api;
    const params = { is_group_mapped_staff: 1 };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        
        this.setState({
          assignShiftList: response.data,
          loading: false,
          isBlankPage: false,
          pageLoading: false,
          tableUpdating: false
        });
      }
    });
  };

  getdepartmenteditList = async () => {
    const { fieldDetails } = this.state;
    const resp = await getRequest(GET_URL.branch.api, { is_active: true }, this.props);
    if (resp && resp.status === 200) {
      const list = (resp.data?.data || resp.data || []).map((d) => ({
        id: d.id,
        name: d.name
      }));
      const next = [...fieldDetails];
      next[0] = { ...next[0], list };
      this.setState({ fieldDetails: next });
      fieldDetails[0].list = resp.data.data;
      this.setState({fieldDetails})
    }
    return true;
  };

  updatePostFormat = (formData) => {
    return {
      department_id: formData.branch_id,
      staff_id: formData.staff_id,
      from_date: dateFormat(formData.from_date, 'YYYY-MM-DD'),
      is_hod: !!formData.is_hod,
      ...(formData.is_hod && {
        hod_from_date: dateFormat(formData.hod_from_date, 'YYYY-MM-DD'),
      }),
    };
  };

  updateType = (newData, id) => {
    let {assignShiftList} = this.state;
    assignShiftList.map((data) => {
      if (data.id === id) {
        return {
          ...data,
          department_id: newData.department_id,
          from_date: dateFormat(newData.from_date, 'YYYY-MM-DD'),
          is_hod: newData.is_hod,
          hod_from_date: newData.hod_from_date
        };
      }
      return data;
    });
  
    const updatedFields = this.state.fieldDetails.map((f) =>
      f.name === "hod_from_date" ? { ...f, disabled: !newData.is_hod } : f
    );
  
    this.setState({
      assignShiftList: [...assignShiftList],
      tableUpdating: false,
      columns: this.state.columns,
      fieldDetails: updatedFields
    });
    this.getAssignDepartmentList()
    return true;
  };

  render() {
    const { loading, assignShiftList, columns, fieldDetails, tableUpdating, isBlankPage, pageLoading } = this.state;

    const options = {
      selectableRows: 'none',
      filterType: 'dropdown',
      responsive: 'simple',
      filter: true,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100]
    };

    // 🔹 Loader Replacement (grey placeholders instead of Skeleton)
    if (loading) {
        return (
            <Box display="flex">
                <img src={loadingBar} className="loading" alt="loading" />
            </Box>
        );
    }

    return (
      <Box>
        <Paper className={classNames('paper-background')}>
          <Grid container>
            <Grid item md={6} xs={12} className={classNames('header-align')}>
              <Box className="heading" display="flex" alignItems="center" gap={1}>
                <Typography variant="h6">👥 Staff Department Mapping</Typography>
              </Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames('header-align', 'end-flex-prop')}>
                {isUserHasPermission('assign_department', 'create') && (
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.assign_department.create.url}
                    className="editbutton-view"
                  >
                    <AddCircleOutlineOutlinedIcon className="visibility-icon" />{' '}
                    {Actions.assign_department.create.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>

          <Grid container className={classNames('flex-justify-center', 'header-align')}>
            {isBlankPage && !pageLoading && (
              <Grid item md={12}>
                <BlankPagewithIcon data="No department assignments found. Please select a financial year." />
              </Grid>
            )}
            {pageLoading && (
              <Box className="loading">
                <CircularProgress />
              </Box>
            )}
            {!pageLoading && !isBlankPage && (
              <Grid item md={12} xs={12}>
                <Paper>
                  {fieldDetails && (
                    <AllMUIDataTable
                      key={assignShiftList}
                      title={tableUpdating ? <CircularProgress className="white-text" /> : ''}
                      data={assignShiftList}
                      columns={columns}
                      options={options}
                    />
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Box>
    );
  }
}

export default StaffDepartmentMappingView;
