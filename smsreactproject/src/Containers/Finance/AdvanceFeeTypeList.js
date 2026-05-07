import React, { Component } from 'react';
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import ActionColumn from 'Components/ActionColumnNew';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { nameAndNumberRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, updatePermissions } from 'Includes/functions';
import { options } from 'Constants';
import Swal from 'sweetalert2';

const fieldDetails = [
  {
    label: 'Name',
    regex: nameAndNumberRegex,
    name: 'name',
    md: 12,
    className: 'width-100',
    required: true,
    id: 'outlined-textarea',
    default: '',
    rows: null,
    type: 'text',
    autoFocus: true,
    maxLength: '225',
  },
];

class AdvanceFeeTypeList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions('advance_fee_type', ['update', 'delete']);
    this.state = {
      list: [],
      loading: true,
      tableUpdating: false,
      columns: [
        { name: 'id', label: 'ID', options: { filter: false, sort: false, display: false } },
        { name: 'name', label: 'Name' },
        { name: 'code', label: 'Code' },
        {
          name: 'is_active',
          label: 'Active',
          options: {
            customBodyRender: (value) => (value ? 'Yes' : 'No'),
          },
        },
        {
          name: 'Actions',
          label: 'Actions',
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => (
              <ActionColumn
                id={tableMeta.rowData[0]}
                fieldValues={[tableMeta.rowData[1]]}
                label="Advance Fee Type"
                fieldDetails={fieldDetails}
                updateUrl={PUT_URL.feeadvancetype?.api || 'finance/feeadvancetype/'}
                updatePostFormat={(newData) => ({ name: newData.name })}
                updateType={this.updateType}
                deleteUrl={DEL_URL.feeadvancetype?.api || 'finance/feeadvancetype/'}
                deleteType={this.deleteType}
                baseClassName="action-basic-detail-width"
                enabledActions={this.permission}
              />
            ),
          },
        },
      ],
    };
  }

  componentDidMount() {
    this.fetchList();
  }

  fetchList = () => {
    const url = GET_URL.feeadvancetype?.api || 'finance/feeadvancetype/';
    getRequest(url, { is_active: true }, this.props).then((response) => {
      if (response && response.status === 200) {
        const data = response.data?.data ?? response.data ?? [];
        this.setState({ list: Array.isArray(data) ? data : [], loading: false });
      } else {
        this.setState({ list: [], loading: false });
      }
    }).catch(() => this.setState({ list: [], loading: false }));
  };

  updateType = (newData, id) => {
    const { list } = this.state;
    const updated = list.map((item) => (item.id === id ? { ...item, name: newData.name } : item));
    this.setState({ list: updated });
    return true;
  };

  deleteType = (id) => {
    this.setState({ tableUpdating: true });
    const url = (DEL_URL.feeadvancetype?.api || 'finance/feeadvancetype/') + id + '/';
    deleteRequest(url, {}, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const { list } = this.state;
          const updated = list.filter((item) => item.id !== id);
          this.setState({ list: updated, tableUpdating: false });
          Swal.fire({ position: 'top-end', icon: 'success', title: 'Deleted successfully.', showConfirmButton: false, timer: 1500 });
        } else {
          this.setState({ tableUpdating: false });
        }
      })
      .catch(() => this.setState({ tableUpdating: false }));
  };

  render() {
    const { loading, list, columns, tableUpdating } = this.state;
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
              <Box className="heading">Advance Fee Type</Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames('header-align', 'end-flex-prop')}>
                {isUserHasPermission('advance_fee_type', 'create') && (
                  <Button variant="contained" component={Link} to={Actions.advance_fee_type?.create?.url || '/finance/advance-fee-type/add'} className="editbutton-view">
                    <AddCircleOutlineOutlinedIcon className="visibility-icon" /> {Actions.advance_fee_type?.create?.label || 'Add Advance Fee Type'}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Grid container className={classNames('header-align')}>
            <Grid item xs={12}>
              <Paper>
                <AllMUIDataTable
                  key={list?.length}
                  title={tableUpdating ? <CircularProgress className="white-text" size={24} /> : ''}
                  data={list}
                  columns={columns}
                  options={options}
                />
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  }
}

export default AdvanceFeeTypeList;
