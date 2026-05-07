import React, { Component } from 'react';
import {
  Paper,
  Box,
  Button,
  Grid,
  CircularProgress,
  Typography,
} from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import ViewListOutlinedIcon from '@material-ui/icons/ViewListOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import { cloneDeep } from 'lodash';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls';
import { getPaginationProps } from 'Includes/functions';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import StudentListActions from 'Includes/StudentListActions';
import { Actions } from 'Constants/permissions';
import { DEFAULT_PAGINATION_PROPS, DATATABLEROWSPERPAGEOPT } from 'Constants';
import Swal from 'sweetalert2';

const LESSON_TEMPLATE_PAGINATION_KEY = 'lesson_plan_templates';

const getDefaultLessonTemplatePagination = () =>
  cloneDeep({
    ...DEFAULT_PAGINATION_PROPS,
    sortOrder: { name: 'plan_name', direction: 'asc' },
  });

const readPaginationTypes = () => {
  try {
    const raw = localStorage.getItem('pagination_types');
    if (!raw || raw === 'undefined') return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
};

class LessonPlanTemplateList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      templateList: [],
      templateCount: 0,
      pagination: getDefaultLessonTemplatePagination(),
      loading: true,
      listLoading: false,
      tableUpdating: false,
      columns: [
        {
          name: 'id',
          label: 'id',
          options: {
            filter: false,
            sort: false,
            display: false,
          },
        },
        {
          name: 'plan_name',
          label: 'Template Name',
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: 'subject_name',
          label: 'Subject',
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value) => <Box>{value || '—'}</Box>,
          },
        },
        {
          name: 'standard_name',
          label: 'Standard',
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value) => <Box>{value || '—'}</Box>,
          },
        },
        {
          name: 'Actions',
          label: 'Action',
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => (
              <StudentListActions
                id={tableMeta.rowData[0]}
                index={tableMeta.rowIndex}
                deleteStudent={this.deleteTemplate}
                editURL={Actions.lesson_plan_template?.create?.url}
                viewURL={Actions.lesson_plan_template?.create?.url}
                viewExtraParams={{ mode: 'view', readOnly: true }}
                enabledActions={['view', 'edit', 'delete']}
              />
            ),
          },
        },
      ],
    };
  }

  deleteTemplate = (id, index) => {
    this.setState({ tableUpdating: true });
    const url = (DEL_URL.lessonplantemplate?.api || 'classes/lessonplantemplate/') + id + '/';
    deleteRequest(url, {}, this.props)
      .then((response) => {
        if (response && (response.status === 200 || response.status === 204)) {
          const { templateList } = this.state;
          const updated = templateList.filter((_, i) => i !== index);
          this.setState({ templateList: updated, tableUpdating: false });
          Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: response.data?.Reason || 'Template deleted successfully.',
            showConfirmButton: false,
            timer: 1500,
          });
        } else {
          this.setState({ tableUpdating: false });
        }
      })
      .catch(() => {
        this.setState({ tableUpdating: false });
        Swal.fire({ icon: 'error', title: 'Failed to delete template.' });
      });
  };

  componentDidMount() {
    const pagination_types = readPaginationTypes();
    let pagination_temp = cloneDeep(this.state.pagination);
    if (pagination_types[LESSON_TEMPLATE_PAGINATION_KEY]) {
      const saved = pagination_types[LESSON_TEMPLATE_PAGINATION_KEY];
      pagination_temp.page = saved.page;
      pagination_temp.rowsPerPage = saved.rowsPerPage;
      if (saved.sortOrder) {
        pagination_temp.sortOrder = { ...saved.sortOrder };
      }
    }
    this.setState({ pagination: pagination_temp }, () => this.fetchTemplateList());
  }

  fetchTemplateList = (paginationProps) => {
    const pagination_types = JSON.parse(
      localStorage.getItem('pagination_types') || '{}'
    )
      ? JSON.parse(localStorage.getItem('pagination_types') || '{}')
      : {};
    const { pagination } = this.state;
    if (paginationProps === 'default') {
      this.currentPagination = getDefaultLessonTemplatePagination();
      delete pagination_types[LESSON_TEMPLATE_PAGINATION_KEY];
      localStorage.setItem(
        'pagination_types',
        JSON.stringify({ ...pagination_types })
      );
    } else if (paginationProps && typeof paginationProps === 'object') {
      this.currentPagination = { ...paginationProps };
      const temp = { [LESSON_TEMPLATE_PAGINATION_KEY]: this.currentPagination };
      localStorage.setItem(
        'pagination_types',
        JSON.stringify({ ...pagination_types, ...temp })
      );
    } else {
      this.currentPagination = pagination;
    }
    const pagination_params = getPaginationProps(this.currentPagination);
    const url = GET_URL.lessonplantemplate?.api || 'classes/lessonplantemplate/';
    const params = { is_active: true, ...pagination_params };
    this.setState({ listLoading: true });
    getRequest(url, params, this.props)
      .then((response) => {
        this.setState({ loading: false, listLoading: false, tableUpdating: false });
        if (response && response.status === 200 && response.data) {
          const res = response.data;
          const raw = res?.data?.data_list ?? res?.data?.results ?? res?.data ?? res?.results ?? res;
          let list = [];
          let count = 0;
          if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.results) {
            list = Array.isArray(raw.results) ? raw.results : [];
            count = raw.count != null ? raw.count : list.length;
          } else {
            list = Array.isArray(raw) ? raw : [];
            count = res?.data?.count ?? res?.count ?? list.length;
          }
          this.setState({
            templateList: list,
            templateCount: count,
            pagination: this.currentPagination,
          });
        } else {
          this.setState({ templateList: [], templateCount: 0 });
        }
      })
      .catch(() => {
        this.setState({
          loading: false,
          listLoading: false,
          tableUpdating: false,
          templateList: [],
          templateCount: 0,
        });
      });
  };

  handleTableChange = (tableState, action) => {
    if (action === 'viewColumnsChange') return;
    this.fetchTemplateList(tableState);
  };

  /** Same option shape as FeeCollection/student.js for AllMUIDataTable server-side mode */
  tableOptions = {
    selectableRows: 'none',
    filterType: 'dropdown',
    responsive: 'responsive',
    filter: true,
    download: false,
    fixedHeader: true,
    print: false,
    viewColumns: true,
    rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
  };

  handleAddTemplate = () => {
    this.props.history.push(Actions.lesson_plan_template?.create?.url);
  };

  render() {
    const {
      templateList,
      loading,
      columns,
      tableUpdating,
      templateCount,
      listLoading,
      pagination,
    } = this.state;

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      );
    }

    const tableData = (templateList || []).map((row) => ({
      id: row.id,
      plan_name: row.plan_name || row.template_name || row.name,
      subject_name: row.subject_name || (row.subject && (row.subject.name || row.subject)),
      standard_name: row.standard_name || (row.standard && (row.standard.name || row.standard)),
    }));

    return (
      <Box>
        <Paper className={classNames('paper-background')} elevation={0} style={{ borderRadius: 12, overflow: 'hidden' }}>
          <Box px={2} pt={2} pb={1}>
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 12 }}>
                  <Box display="flex" alignItems="center" justifyContent="center" style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)' }}>
                    <ViewListOutlinedIcon style={{ fontSize: 28, color: '#e65100' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" style={{ fontWeight: 600, color: '#bf360c' }}>Lesson Plan Templates</Typography>
                    <Typography variant="body2" color="textSecondary">View and manage lesson plan templates by subject and standard</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box display="flex" justifyContent="flex-end" flexWrap="wrap" style={{ gap: 8 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddCircleOutlineOutlinedIcon />}
                    onClick={this.handleAddTemplate}
                    className="editbutton-view"
                    style={{ textTransform: 'none', borderRadius: 8 }}
                  >
                    {Actions.lesson_plan_template?.create?.label || 'Add Template'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
          <Grid container className={classNames('header-align', 'm-bt-15px')} style={{ padding: '0 16px 16px' }}>
            <Grid item xs={12}>
              <Paper elevation={0} style={{ borderRadius: 10, border: '1px solid #e9ecef', overflow: 'hidden' }}>
                <AllMUIDataTable
                  count={templateCount}
                  title={
                    listLoading || tableUpdating ? 'Loading...' : 'Lesson plan templates'
                  }
                  data={tableData}
                  columns={columns}
                  options={this.tableOptions}
                  serverSide={true}
                  pagination={pagination}
                  onTableChange={this.handleTableChange}
                  loading={listLoading || tableUpdating}
                  viewColumns={true}
                />
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  }
}

export default withRouter(LessonPlanTemplateList);
