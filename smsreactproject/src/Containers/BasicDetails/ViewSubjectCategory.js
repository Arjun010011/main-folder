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
import { nameWithQuoteRegex, nameAndNumberAndHyphenRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, updatePermissions } from 'Includes/functions';
import { options } from 'Constants';
import commonMessages from 'Constants/messages';
import { FormattedMessage } from 'react-intl';

class ViewSubjectCategory extends Component {
  constructor() {
    super();
    this.permission = updatePermissions('subejct_category', ['update', 'delete']);

    this.state = {
      subejctCategoryList: [],
      loading: true,
      tableUpdating: false,
      optionsLocal: {},
      fieldDetails: [
        {
          label: 'Subejct Category Name',
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
        },
        {
          label: 'Subejct Category Code',
          regex: nameAndNumberAndHyphenRegex,
          autoFocus: false,
          name: 'code',
          md: 12,
          className: 'width-100',
          required: true,
          id: 'outlined-textarea',
          default: '',
          rows: null,
          type: 'text',
          maxLength: 30,
          gridClassName: 'margin-vertical-20',
        },
      ],
      columns: [
        {
          name: 'id',
          label: 'id',
          options: { filter: false, sort: false, viewColumns: false, display: false },
        },
        {
          name: 'name',
          label: 'Subject Category Name',
          options: { filter: true, sort: true },
        },
        {
          name: 'code',
          label: 'Code',
          options: { filter: true, sort: true },
        },
        {
          name: 'Actions',
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
             display: this.permission.length > 0,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
               const name = tableMeta.rowData[1];
               const code = tableMeta.rowData[2];
              return (
                <ActionColumn
                  id={tableMeta.rowData[0]}
                  fieldValues={[name, code]}
                  label="Edit Subject Category"
                  fieldDetails={this.state.fieldDetails}
                  updateUrl={PUT_URL.subjectcategory.api}
                  updatePostFormat={this.updatePostFormat}
                  updateType={this.updateType}
                  deleteUrl={DEL_URL.subjectcategory.api}
                  deleteType={this.deleteType}
                  baseClassName="action-basic-detail-width"
                  enabledActions={this.permission}
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
    this.setState({ optionsLocal: { ...options } }, this.getSubjectCategoryList);
  }

  getSubjectCategoryList = () => {
    const url = GET_URL.subjectcategory.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const rows = response.data?.data || [];
        this.setState({ subejctCategoryList: rows, loading: false });
      }
    });
  };

   fieldValues(name, code) {
        let fieldValues = [];
        fieldValues.push(name);
        fieldValues.push(code);
        return [name, code];
    }

  updatePostFormat = (newData) => {
    return {
      name: newData.name,
      code: newData.code ?? '',
    };
  };

  updateType = () => {
    this.getSubjectCategoryList();
    return true;
  };

  deleteType = (id) => {
    const subejctCategoryList = [...this.state.subejctCategoryList];
    const idx = subejctCategoryList.findIndex((d) => d.id === id);
    if (idx !== -1) {
      subejctCategoryList.splice(idx, 1);
      this.setState({ subejctCategoryList });
    }
  };

  onTableChange = (tableState) => {
    const newOptions = { ...this.state.optionsLocal, searchText: tableState.searchText };
    this.setState({ optionsLocal: newOptions });
  };

  render() {
    const { loading, subejctCategoryList, columns, tableUpdating, optionsLocal } = this.state;
    console.log(this.state.permission,"dfghjkl")

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
               Subject Category
              </Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames('header-align', 'end-flex-prop')}>
                {isUserHasPermission('subejct_category', 'create') && (
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.subejct_category.create.url}
                    className="editbutton-view"
                  >
                    <AddCircleOutlineOutlinedIcon className="visibility-icon" />{' '}
                    {Actions.subejct_category.create.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>

          <Grid container className={classNames('header-align')}>
            <Grid item md={8} xs={12}>
              <Paper>
                <AllMUIDataTable
                  key={subejctCategoryList}
                  title={tableUpdating ? <CircularProgress className="white-text" /> : ''}
                  data={subejctCategoryList}
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

export default ViewSubjectCategory;
