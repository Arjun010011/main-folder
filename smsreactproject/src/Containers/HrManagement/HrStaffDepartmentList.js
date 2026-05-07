import React, { Component } from 'react';
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import ActionColumn from 'Components/ActionColumnNew';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { nameWithQuoteRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, updatePermissions } from 'Includes/functions';
import { options } from 'Constants';
import commonMessages from 'Constants/messages';
import { FormattedMessage } from 'react-intl';

class HrStaffDepartmentList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions('hr_department', ['update', 'delete']);

    this.state = {
      departmentList: [],
      loading: true,
      tableUpdating: false,
      optionsLocal: {},
      fieldDetails: [
        {
          label: 'Department Name',
          regex: nameWithQuoteRegex,
          autoFocus: true,
          name: 'name',
          md: 12,
          className: 'width-100',
          required: true,
          id: 'outlined-textarea',
          default: '',
          rows: null,
          type: 'text',
          maxLength: 250,
          gridClassName: 'margin-vertical-20',
        }
      ],
      columns: [
        {
          name: 'id',
          label: 'id',
          options: { filter: false, sort: false, viewColumns: false, display: false },
        },
        {
          name: 'name',
          label: 'Department Name',
          options: { filter: true, sort: true },
        },
        {
          name: 'Actions',
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: true,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <ActionColumn
                  id={tableMeta.rowData[0]}
                  fieldValues={this.getFieldValues(tableMeta.rowData)}
                  label="Edit Department"
                  fieldDetails={this.state.fieldDetails}
                  updateUrl={PUT_URL.hr_department.api}
                  updatePostFormat={this.updatePostFormat}
                  updateType={this.updateType}
                  deleteUrl={DEL_URL.hr_department.api}
                  deleteType={this.deleteType}
                  baseClassName="action-basic-detail-width"
                  enabledActions={['update', 'delete']}
                  isGetData={false}
                />
              );
            },
          },
        },
      ],
    };
  }

  componentDidMount() {
    this.setState({ optionsLocal: { ...options } }, this.getDepartmentList);
  }

  getDepartmentList = () => {
    const url = GET_URL.hr_department.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const rows = response.data?.data || [];
        this.setState({ departmentList: rows, loading: false });
      }
    });
  };

  getFieldValues = (rowData) => {
    let fieldValues = [];
    fieldValues.push(rowData[1]);
    return fieldValues;
  };

  updatePostFormat = (newData) => {
    return {
      name: newData.name
    };
  };

  updateType = () => {
    this.getDepartmentList();
    return true;
  };

  deleteType = (id) => {
    const departmentList = [...this.state.departmentList];
    const idx = departmentList.findIndex((d) => d.id === id);
    if (idx !== -1) {
      departmentList.splice(idx, 1);
      this.setState({ departmentList });
    }
  };

  onTableChange = (tableState) => {
    const newOptions = { ...this.state.optionsLocal, searchText: tableState.searchText };
    this.setState({ optionsLocal: newOptions });
  };

  render() {
    const { loading, departmentList, columns, tableUpdating, optionsLocal } = this.state;

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
              <Box className="heading">
                <FormattedMessage {...commonMessages.department} />
              </Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames('header-align', 'end-flex-prop')}>
                {isUserHasPermission('hr_department', 'create') && (
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.hr_department?.create?.url || '/hr/department/add'}
                    className="editbutton-view"
                  >
                    <AddCircleOutlineOutlinedIcon className="visibility-icon" />{' '}
                    Add Department
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>

          <Grid container className={classNames('header-align')}>
            <Grid item md={8} xs={12}>
              <Paper>
                <AllMUIDataTable
                  key={departmentList}
                  title={tableUpdating ? <CircularProgress className="white-text" /> : ''}
                  data={departmentList}
                  columns={columns}
                  options={optionsLocal}
                  onTableChange={this.onTableChange}
                />
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  }
}

export default HrStaffDepartmentList;
