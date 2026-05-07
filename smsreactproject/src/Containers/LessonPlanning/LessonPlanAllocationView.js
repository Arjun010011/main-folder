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
import LibraryBooksOutlinedIcon from '@material-ui/icons/LibraryBooksOutlined';
import AssignmentTurnedInOutlinedIcon from '@material-ui/icons/AssignmentTurnedInOutlined';
import FilterListOutlinedIcon from '@material-ui/icons/FilterListOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls';
import { getPaginationProps } from 'Includes/functions';
import { Dropdown } from 'Components/DropDown';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import StudentListActions from 'Includes/StudentListActions';
import { Actions } from 'Constants/permissions';
import { options, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import Swal from 'sweetalert2';

class LessonPlanAllocationView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      academicYear: '',
      standardSection: '',
      yearList: [],
      standardSectionList: [],
      allocationList: [],
      allocationCount: 0,
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      loading: true,
      listLoading: false,
      columns: [
        { name: 'id', label: 'ID', options: { filter: false, sort: false, display: false } },
        {
          name: 'template_name',
          label: 'Template Name',
          options: { filter: true, sort: true, customBodyRender: (v) => (typeof v === 'object' && v !== null ? '—' : String(v ?? '—')) },
        },
        {
          name: 'subject_name',
          label: 'Subject',
          options: { filter: true, sort: true, customBodyRender: (v) => (typeof v === 'object' && v !== null ? '—' : String(v ?? '—')) },
        },
        {
          name: 'standard_section_display',
          label: 'Standard Section',
          options: { filter: true, sort: true, customBodyRender: (v) => (typeof v === 'object' && v !== null ? '—' : String(v ?? '—')) },
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
                deleteStudent={this.deleteAllocation}
                editURL={Actions?.lesson_plan_allocation?.update?.url}
                viewURL={Actions?.lesson_plan_allocation?.update?.url}
                editExtraParams={{ mode: 'edit', readOnly: false }}
                viewExtraParams={{ mode: 'view', readOnly: true }}
                enabledActions={['view', 'edit', 'delete']}
              />
            ),
          },
        },
      ],
    };
  }

  componentDidMount() {
    this.fetchInitialData();
  }

  componentWillUnmount() {
    if (this.loadingGuardTimer) {
      clearTimeout(this.loadingGuardTimer);
      this.loadingGuardTimer = null;
    }
  }

  fetchInitialData = () => {
    this.setState({ loading: true });
    // Guard against hanging network calls that can leave UI in permanent loading state.
    this.loadingGuardTimer = setTimeout(() => {
      this.setState({ loading: false, listLoading: false });
      this.loadingGuardTimer = null;
    }, 10000);
    const url = GET_URL.getacademicyear?.api || 'institutes/getacademicyear/';
    getRequest(url, { is_active: true }, this.props)
      .then((response) => {
        if (this.loadingGuardTimer) {
          clearTimeout(this.loadingGuardTimer);
          this.loadingGuardTimer = null;
        }
        const yearList = response?.status === 200 ? response.data?.data || [] : [];
        this.setState({
          yearList,
          loading: false,
          academicYear: yearList.length ? String(yearList[0].id) : '',
        }, () => {
          if (this.state.academicYear) this.fetchStandardSections();
        });
      })
      .catch(() => {
        if (this.loadingGuardTimer) {
          clearTimeout(this.loadingGuardTimer);
          this.loadingGuardTimer = null;
        }
        this.setState({ loading: false });
      });
  };

  fetchStandardSections = () => {
    const { academicYear } = this.state;
    if (!academicYear) return;
    const url = GET_URL.getstandardandsection?.api || 'classes/getstandardandsection/';
    getRequest(url, { academic_year: academicYear, is_active: true }, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const standardsData = response.data?.data || [];
          const flattened = [];
          (standardsData || []).forEach((standard) => {
            const sections = standard.sections || [];
            sections.forEach((section) => {
              const sectionId = section.standard_section ?? section.id;
              flattened.push({
                id: sectionId,
                name: `${standard.standard_name || standard.name || ''} - ${section.section_name || section.name || ''}`,
              });
            });
          });
          this.setState({ standardSectionList: flattened });
        }
      });
  };

  fetchAllocationList = (paginationProps) => {
    const { academicYear, standardSection, pagination } = this.state;
    if (!academicYear || !standardSection) {
      this.setState({ allocationList: [], allocationCount: 0 });
      return;
    }
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    const pagination_params = getPaginationProps(this.currentPagination);
    const params = {
      academic_year: academicYear,
      standard_section: standardSection,
      ...pagination_params,
    };
    this.setState({ listLoading: true });
    const url = GET_URL.lessonplantemplateacademicyear?.api || 'classes/lessonplantemplateacademicyear/';
    getRequest(url, params, this.props)
      .then((response) => {
        this.setState({ listLoading: false });
        if (response && response.status === 200 && response.data) {
          const res = response.data;
          const data = res?.data?.data_list ?? res?.data ?? res?.results ?? res;
          const list = Array.isArray(data) ? data : [];
          const count = res?.data?.count ?? res?.count ?? list.length;
          this.setState({
            allocationList: list,
            allocationCount: count,
            pagination: this.currentPagination,
          });
        } else {
          this.setState({ allocationList: [], allocationCount: 0 });
        }
      })
      .catch(() => this.setState({ listLoading: false, allocationList: [], allocationCount: 0 }));
  };

  deleteAllocation = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "This will permanently delete the lesson plan allocation. You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        const url = (DEL_URL.lessonplantemplateacademicyear?.api || 'classes/lessonplantemplateacademicyear/') + id + '/';
        deleteRequest(url, {}, this.props)
          .then((response) => {
            if (response && response.status === 200) {
              Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Lesson plan allocation has been deleted successfully.',
                timer: 2000,
                showConfirmButton: false
              });
              this.fetchAllocationList();
            } else {
              Swal.fire('Error!', response?.data?.Reason || response?.data?.detail || 'Failed to delete allocation.', 'error');
            }
          })
          .catch((err) => {
            const msg = err?.response?.data?.Reason || err?.response?.data?.detail || 'Failed to delete allocation.';
            Swal.fire('Error!', msg, 'error');
          });
      }
    });
  };

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value }, () => {
      if (name === 'academicYear') {
        this.setState({ standardSection: '', pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST } });
        this.fetchStandardSections();
      }
      this.fetchAllocationList();
    });
  };

  handleTableChange = (tableState) => {
    this.fetchAllocationList(tableState);
  };

  handleAddAllocation = () => {
    this.props.history.push(Actions?.lesson_plan_allocation?.create?.url);
  };

  render() {
    const {
      academicYear,
      standardSection,
      yearList,
      standardSectionList,
      allocationList,
      allocationCount,
      pagination,
      loading,
      listLoading,
      columns,
    } = this.state;

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      );
    }

    const tableData = (allocationList || []).map((row) => {
      const template = row.lesson_plan_template;
      const subj = row.subject;
      const templateName = template?.plan_name ?? row.plan_name ?? row.template_name ?? '—';
      const subjectName = subj?.name ?? row.subject_name ?? '—';
      const standardSectionDisplay = row.standard_section_display ?? (row.standard_section ? `${row.standard_section.standard_name || ''} - ${row.standard_section.section__name || ''}` : '—');
      return {
        id: row.id,
        template_name: templateName,
        subject_name: subjectName,
        standard_section_display: standardSectionDisplay,
      };
    });

    return (
      <Box>
        <Paper className={classNames('paper-background')} elevation={0} style={{ borderRadius: 12, overflow: 'hidden' }}>
          <Box px={2} pt={2} pb={1}>
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 12 }}>
                  <Box display="flex" alignItems="center" justifyContent="center" style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
                    <AssignmentTurnedInOutlinedIcon style={{ fontSize: 28, color: '#1976d2' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" style={{ fontWeight: 600, color: '#1565c0' }}>Lesson Plan Allocation</Typography>
                    <Typography variant="body2" color="textSecondary">View and manage lesson plan allocations by academic year and standard section</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box display="flex" justifyContent="flex-end" flexWrap="wrap" style={{ gap: 8 }}>
                  <Button variant="contained" color="primary" startIcon={<LibraryBooksOutlinedIcon />} className="editbutton-view" onClick={() => this.props.history.push(Actions?.lesson_plan_template?.view?.url)} style={{ textTransform: 'none', borderRadius: 8 }}>Lesson Plan Templates</Button>
                  <Button variant="contained" color="primary" startIcon={<AddCircleOutlineOutlinedIcon />} className="editbutton-view" onClick={this.handleAddAllocation} style={{ textTransform: 'none', borderRadius: 8 }}>Add Allocation</Button>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Box px={2} py={2} mt={1} style={{ backgroundColor: '#f8f9fa', borderRadius: 12, border: '1px solid #e9ecef' }}>
            <Typography variant="subtitle2" style={{ fontWeight: 600, color: '#495057', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FilterListOutlinedIcon style={{ fontSize: 20 }} /> Filters
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <Dropdown label="Academic Year" name="academicYear" value={academicYear} onChange={this.handleChange} data={yearList} fullWidth hideSelect={true} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Dropdown label="Standard Section" name="standardSection" value={standardSection} onChange={this.handleChange} data={standardSectionList} fullWidth disabled={!academicYear} helperText={!academicYear ? 'Select Academic Year' : ''} hideSelect={true} />
              </Grid>
            </Grid>
          </Box>

          {!academicYear || !standardSection ? (
            <BlankPagewithIcon data="Select Academic Year and Standard Section to expect the result" />
          ) : (
            <Grid container className={classNames('header-align', 'm-bt-15px')}>
              <Grid item xs={12}>
                <Paper>
                  <AllMUIDataTable
                    count={allocationCount}
                    title={listLoading ? 'Loading...' : 'Lesson plan allocations'}
                    data={tableData}
                    columns={columns}
                    options={options}
                    serverSide={true}
                    pagination={pagination}
                    onTableChange={this.handleTableChange}
                  />
                  {!listLoading && tableData.length === 0 && (
                    <Box p={2}>
                      <Typography variant="body2" color="textSecondary">
                        No lesson plan allocations found for the selected filters.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </Paper>
      </Box>
    );
  }
}

export default withRouter(LessonPlanAllocationView);
