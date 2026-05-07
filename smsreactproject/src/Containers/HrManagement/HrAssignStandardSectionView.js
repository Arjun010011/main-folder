import React, { Component } from 'react';
import {
  Paper,
  Box,
  Grid,
  Button,
  CircularProgress,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  FormControl,
  InputLabel,
  Select,
} from '@material-ui/core';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import EditOutlinedIcon from '@material-ui/icons/EditOutlined';
import Swal from 'sweetalert2';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import MultipleSelectDropdown from 'Components/MultipleSelectDropdown';
import { getRequest, deleteRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, DEL_URL } from 'Includes/urls';
import { isUserHasPermission, getPaginationProps, updatePermissions, getAcademicYear } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import classNames from 'classnames';
import { DEFAULT_PAGINATION_PROPS_ID_LIST, options as tableOptions } from 'Constants';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages';
import { cloneDeep } from 'lodash';

const alias_names = (typeof localStorage !== 'undefined' && localStorage.getItem('alias_name'))
  ? JSON.parse(localStorage.getItem('alias_name'))
  : {};

class HrAssignStandardSectionView extends Component {
  constructor() {
    super();
    this.permission = updatePermissions('assign_standard_section', ['update', 'delete']);
    this.state = {
      tableUpdating: false,
      getAssignTeacherList: [],
      staffList: [],
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      count: 0,
      actionMenuAnchor: null,
      actionMenuRowData: null,
      actionMenuRowIndex: null,
      fieldDetails: [{ selectLabel: 'Standard–Section', name: 'standard_sections', list: [], optionValue: 'name', customId: 'id' }],
      sectionListLoaded: false,
      editDialogOpen: false,
      editDialogStaffId: null,
      editDialogStaffName: '',
      editDialogSelected: [],
      editDialogListLoading: false,
      editDialogSubmitting: false,
      academicYearList: [],
      selectedAcademicYear: typeof getAcademicYear === 'function' ? (getAcademicYear() || '') : '',
      columns: [
        { name: 'staff_name', label: <FormattedMessage {...commonMessages.staffName} />, options: { filter: true, sort: true } },
        { name: 'group_names', label: 'Group', options: { filter: true, sort: true } },
        { name: 'standard_section', label: `${alias_names['standard'] || 'Standard'} Section`, options: { filter: true, sort: true } },
        { name: 'mappings', label: 'Mappings', options: { display: false } },
        { name: 'staff_id', label: 'Staff ID', options: { display: false } },
        {
          name: 'Actions',
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            customBodyRender: (_, tableMeta) => {
              const rowData = tableMeta.rowData;
              const staffId = rowData[4];
              const mappings = rowData[3] || [];
              const standardSectionList = mappings.map((m) => ({ id: m.standard_section_id, name: m.standard_section }));
              return (
                <Box display="flex" alignItems="center">
                  {this.permission.indexOf('update') !== -1 && (
                    <Tooltip title="Edit">
                      <Button
                        size="small"
                        color="primary"
                        startIcon={<EditOutlinedIcon />}
                        onClick={() => this.handleOpenEditDialog(staffId, rowData[0], standardSectionList)}
                      >
                        Edit
                      </Button>
                    </Tooltip>
                  )}
                  <Tooltip title="Actions">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        this.setState({
                          actionMenuAnchor: e.currentTarget,
                          actionMenuRowData: rowData,
                          actionMenuRowIndex: tableMeta.rowIndex,
                        });
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            },
          },
        },
      ],
    };
  }

  handleOpenEditDialog = (staffId, staffName, selectedList) => {
    this.setState({
      editDialogOpen: true,
      editDialogStaffId: staffId,
      editDialogStaffName: staffName,
      editDialogSelected: selectedList || [],
      editDialogListLoading: true,
      sectionListLoaded: false,
    });
    this.getStandardSectionList().then(() => {
      this.setState({ editDialogListLoading: false });
    }).catch(() => {
      this.setState({ editDialogListLoading: false });
    });
  };

  handleCloseEditDialog = () => {
    this.setState({
      editDialogOpen: false,
      editDialogStaffId: null,
      editDialogStaffName: '',
      editDialogSelected: [],
      editDialogSubmitting: false,
    });
  };

  handleEditDialogUpdate = () => {
    const { editDialogStaffId, editDialogSelected } = this.state;
    if (!editDialogStaffId) return;
    const postData = this.updatePostFormat({ standard_sections: editDialogSelected }, editDialogStaffId);
    this.setState({ editDialogSubmitting: true });
    postRequest(POST_URL.staffstandardsectionmapping.api, postData, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          this.updateType({ standard_sections: editDialogSelected }, editDialogStaffId);
          this.handleCloseEditDialog();
          Swal.fire({ position: 'top-end', type: 'success', title: response.data.Reason || 'Updated', showConfirmButton: false, timer: 1500 });
        } else {
          this.setState({ editDialogSubmitting: false });
          Swal.fire('Error', 'Update failed', 'error');
        }
      })
      .catch(() => {
        this.setState({ editDialogSubmitting: false });
        Swal.fire('Error', 'An error occurred', 'error');
      });
  };

  componentDidMount() {
    this.fetchAcademicYearList();
    this.fetchStaffList();
    this.fetchAssignTeacherList();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.selectedAcademicYear !== this.state.selectedAcademicYear) {
      this.fetchStaffList();
    }
  }

  fetchAcademicYearList = () => {
    getRequest(GET_URL.getacademicyear.api, { is_active: true }, this.props).then((response) => {
      if (response && response.status === 200) {
        const list = response.data.data || response.data || [];
        this.setState({
          academicYearList: Array.isArray(list) ? list : [],
        });
      }
    });
  };

  handleAcademicYearChange = (event) => {
    const selectedAcademicYear = event.target.value || '';
    this.setState(
      { selectedAcademicYear, sectionListLoaded: false },
      () => this.fetchAssignTeacherList(this.state.pagination)
    );
  };

  fetchAssignTeacherList = (tableState) => {
    let { pagination, selectedAcademicYear } = this.state;
    if (tableState) {
      this.currentPagination = tableState;
      pagination = tableState;
    } else {
      this.currentPagination = pagination;
    }
    const pagination_params = getPaginationProps(this.currentPagination);
    const params = { ...pagination_params, is_active: true };
    if (selectedAcademicYear) params.academic_year = selectedAcademicYear;
    this.setState({ tableUpdating: true });

    const buildStandardSectionMap = (cb) => {
      const sectionParams = { is_active: true };
      if (selectedAcademicYear) sectionParams.academic_year = selectedAcademicYear;
      getRequest(GET_URL.getstandardandsection.api, sectionParams, { ...this.props, dontSendAcademicYear: true }).then((res) => {
        const list = (res && res.data && res.data.data) ? res.data.data : [];
        const map = {};
        (list || []).forEach((std) => {
          (std.sections || []).forEach((sec) => {
            const id = sec.standard_section != null ? sec.standard_section : sec.id;
            if (id != null) map[id] = `${std.name || std.standard_name || ''} - ${sec.name || sec.section_name || ''}`;
          });
        });
        cb(map);
      }).catch(() => cb({}));
    };

    buildStandardSectionMap((standardSectionNameMap) => {
        params["mapped_type"] = "only_mapped";
      getRequest(GET_URL.staffstandardsectionmapping.api, params, { ...this.props, dontSendAcademicYear: true }).then((response) => {
        if (response && response.status === 200) {
          const resData = response.data.data || response.data;
          const dataList = resData.data_list != null ? resData.data_list : (Array.isArray(resData) ? resData : []);
          const totalCount = resData.count != null ? resData.count : 0;

          const getStaffName = (item) => {
            if (!item) return '';
            return item.name || item.staff_name || item.full_name
              || (item.staff && (item.staff.full_name || item.staff.name || item.staff.staff_name))
              || '';
          };
          const getGroupNames = (item) => {
            if (item.group_name != null) {
              return Array.isArray(item.group_name) ? item.group_name.join(', ') : String(item.group_name);
            }
            return item.group_names || '';
          };

          const getStandardSectionDisplay = (item, sectionId) => {
            if (!item && sectionId == null) return '';
            const fromItem = item || {};
            let name = fromItem.standard_section_name || fromItem.standard_section_display
              || (fromItem.standard_section && typeof fromItem.standard_section === 'string' ? fromItem.standard_section : null)
              || (fromItem.standard_name && fromItem.section_name ? `${fromItem.standard_name} - ${fromItem.section_name}` : null)
              || (fromItem.standard__name && fromItem.section__name ? `${fromItem.standard__name} - ${fromItem.section__name}` : null);
            if (name) return name;
            if (fromItem.standard_section && typeof fromItem.standard_section === 'object') {
              const ss = fromItem.standard_section;
              return (ss.name || (ss.standard_name && ss.section_name ? `${ss.standard_name} - ${ss.section_name}` : null) || '');
            }
            const id = sectionId != null ? sectionId : (fromItem.standard_section_id != null ? fromItem.standard_section_id : fromItem.standard_section);
            return (id != null && standardSectionNameMap[id]) ? standardSectionNameMap[id] : '';
          };

          const flattened = [];
          (Array.isArray(dataList) ? dataList : []).forEach((parent) => {
            const staffMappings = parent.staff_standard_section_mapping_staff;
            const standardSectionId = parent.standard_section != null ? parent.standard_section : parent.standard_section_id;
            let standardSectionDisplay = getStandardSectionDisplay(parent, standardSectionId);

            const fromDate = parent.from_date || '';
            const toDate = parent.to_date || '';

            if (Array.isArray(staffMappings) && staffMappings.length > 0) {
              staffMappings.forEach((inner) => {
                const mappingId = inner.id != null ? inner.id : parent.id;
                const innerSectionId = inner.standard_section != null ? inner.standard_section : standardSectionId;
                const innerDisplay = getStandardSectionDisplay(inner, innerSectionId) || standardSectionDisplay;
                flattened.push({
                  id: mappingId,
                  standard_section_id: innerSectionId != null ? innerSectionId : standardSectionId,
                  staff_name: getStaffName(inner) || getStaffName(parent),
                  group_names: getGroupNames(inner) || getGroupNames(parent),
                  standard_section: innerDisplay,
                  from_date: inner.from_date != null ? inner.from_date : fromDate,
                  to_date: inner.to_date != null ? inner.to_date : toDate,
                  staff_id: (inner.staff && (typeof inner.staff === 'object' ? inner.staff.id : inner.staff)) || parent.staff,
                });
              });
            } else {
              flattened.push({
                id: parent.id,
                standard_section_id: standardSectionId,
                staff_name: getStaffName(parent),
                group_names: getGroupNames(parent),
                standard_section: standardSectionDisplay,
                from_date: fromDate,
                to_date: toDate,
                staff_id: parent.staff && (typeof parent.staff === 'object' ? parent.staff.id : parent.staff),
              });
            }
          });

          const groupedByStaff = {};
          flattened.forEach((row) => {
            const key = `${row.staff_id ?? ''}|${row.staff_name}|${row.group_names}`;
            if (!groupedByStaff[key]) {
              groupedByStaff[key] = {
                staff_name: row.staff_name,
                group_names: row.group_names,
                staff_id: row.staff_id,
                mappings: [],
              };
            }
            groupedByStaff[key].mappings.push({
              id: row.id,
              standard_section_id: row.standard_section_id,
              staff_name: row.staff_name,
              from_date: row.from_date,
              to_date: row.to_date,
              standard_section: row.standard_section,
            });
          });
          const tableRows = Object.values(groupedByStaff).map((g) => [
            g.staff_name,
            g.group_names,
            g.mappings.map((m) => m.standard_section).join(', '),
            g.mappings,
            g.staff_id,
          ]);

        this.setState({
          getAssignTeacherList: tableRows,
          count: totalCount || flattened.length,
          pagination: this.currentPagination || this.state.pagination,
          tableUpdating: false,
        });
      } else {
        this.setState({ tableUpdating: false });
      }
    }).catch(() => {
      this.setState({ tableUpdating: false });
    });
    });
  };

  fetchStaffList = () => {
    const params = { is_active: true };
    if (this.state.selectedAcademicYear) params.academic_year = this.state.selectedAcademicYear;
    getRequest(GET_URL.staff.api, params, { ...this.props, dontSendAcademicYear: true }).then((response) => {
      if (response && response.status === 200) {
        this.setState({ staffList: response.data.data || response.data || [] });
      }
    });
  };

  getStandardSectionList = () => {
    const { sectionListLoaded, fieldDetails, selectedAcademicYear } = this.state;
    if (sectionListLoaded) return Promise.resolve();
    const params = { is_active: true };
    if (selectedAcademicYear) params.academic_year = selectedAcademicYear;
    return getRequest(GET_URL.getstandardandsection.api, params, { ...this.props, dontSendAcademicYear: true })
      .then((response) => {
        const raw = (response && response.data && response.data.data) || (response && response.data) || [];
        const data = Array.isArray(raw) ? raw : [];
        const sectionList = [];
        data.forEach((std) => {
          const sections = std.sections || std.section_list || [];
          (Array.isArray(sections) ? sections : []).forEach((sec) => {
            const id = sec.standard_section != null ? sec.standard_section : sec.id;
            const stdName = std.name || std.standard_name || '';
            const secName = sec.name || sec.section_name || '';
            if (id != null) {
              sectionList.push({ id, name: `${stdName} - ${secName}`.trim() || String(id) });
            }
          });
        });
        const nextDetails = cloneDeep(fieldDetails);
        if (nextDetails[0]) nextDetails[0].list = sectionList;
        this.setState({ fieldDetails: nextDetails, sectionListLoaded: true });
      })
      .catch(() => {
        const nextDetails = cloneDeep(fieldDetails);
        if (nextDetails[0]) nextDetails[0].list = [];
        this.setState({ fieldDetails: nextDetails, sectionListLoaded: true });
      });
  };

  updatePostFormat = (newData, id) => {
    const standard_sections = (newData.standard_sections || []).map((s) => (s && s.id != null ? s.id : s));
    return { staff: id, standard_sections };
  };

  updateType = (newData, id) => {
    const { getAssignTeacherList } = this.state;
    const list = getAssignTeacherList.slice();
    const idx = list.findIndex((row) => String(row[4]) === String(id));
    if (idx === -1) return true;
    const row = list[idx];
    const standardSections = newData.standard_sections || [];
    list[idx] = [
      row[0],
      row[1],
      standardSections.map((s) => (s && s.name) || s).join(', '),
      standardSections.map((s) => ({
        id: null,
        standard_section_id: s && s.id != null ? s.id : s,
        staff_name: row[0],
        from_date: '',
        to_date: '',
        standard_section: (s && s.name) || '',
      })),
      row[4],
    ];
    this.setState({ getAssignTeacherList: list });
    return true;
  };

  handleActionMenuClose = () => {
    this.setState({
      actionMenuAnchor: null,
      actionMenuRowData: null,
      actionMenuRowIndex: null,
    });
  };

  deleteExpense = (id, rowIndex) => {
    const { getAssignTeacherList, columns, count } = this.state;
    const url = `${DEL_URL.staffstandardsectionmapping.api}${id}/`;
    this.setState({ tableUpdating: true });
    deleteRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        const row = getAssignTeacherList[rowIndex];
        const mappings = row && row[3] ? row[3] : [];
        const newMappings = mappings.filter((m) => m.id !== id);
        let updated;
        if (newMappings.length === 0) {
          updated = getAssignTeacherList.filter((_, i) => i !== rowIndex);
        } else {
          updated = getAssignTeacherList.slice();
          updated[rowIndex] = [row[0], row[1], newMappings.map((m) => m.standard_section).join(', '), newMappings];
        }
        this.setState({
          getAssignTeacherList: updated,
          columns: [...columns],
          count: Math.max(0, (count || 0) - 1),
          tableUpdating: false,
        });
        Swal.fire({ position: 'top-end', type: 'success', title: response.data.Reason || 'Deleted', showConfirmButton: false, timer: 1500 });
      } else {
        this.setState({ tableUpdating: false });
      }
    }).catch(() => {
      this.setState({ tableUpdating: false });
    });
  };

  handleAddExpensesButton = () => {
    const academicYear = this.state.selectedAcademicYear || (typeof getAcademicYear === 'function' ? getAcademicYear() : '');
    this.props.history.push({
      pathname: Actions.assign_standard_section.create.url,
      state: { academicYear },
    });
  };

  render() {
    const {
      tableUpdating,
      getAssignTeacherList,
      columns,
      pagination,
      count,
    } = this.state;

    return (
      <Box>
        <Paper className={classNames('paper-background')}>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item md={6} xs={12} className={classNames('header-align')}>
              <Box className="heading">
                {Actions.assign_standard_section.view.label}
              </Box>
            </Grid>
            <Grid item md={5} xs={12}>
              <Box className={classNames('header-align', 'end-flex-prop')}>
                {isUserHasPermission('assign_standard_section', 'create') && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={this.handleAddExpensesButton}
                    className="editbutton-view"
                  >
                    <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                    {Actions.assign_standard_section.create.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Grid container className={classNames('header-align')} style={{ marginBottom: 16 }}>
            <Grid item md={4} xs={12}>
              <FormControl variant="outlined" size="small" fullWidth>
                <InputLabel id="list-academic-year-label">Academic Year</InputLabel>
                <Select
                  labelId="list-academic-year-label"
                  id="list-academic-year-select"
                  value={this.state.selectedAcademicYear || ''}
                  onChange={this.handleAcademicYearChange}
                  label="Academic Year"
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {(this.state.academicYearList || []).map((year) => (
                    <MenuItem key={year.id} value={year.id}>
                      {year.name || year.year_name || year.academic_year_name || String(year.id)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Grid container className={classNames('header-align')}>
            <Grid item md={8}>
              <Paper>
                <AllMUIDataTable
                  key={getAssignTeacherList}
                  title={tableUpdating ? <CircularProgress size={24} /> : ''}
                  data={getAssignTeacherList}
                  columns={columns}
                  onTableChange={this.fetchAssignTeacherList}
                  serverSide={true}
                  pagination={pagination}
                  count={Number(count) || 0}
                  loading={tableUpdating}
                  options={{
                    ...tableOptions,
                    selectableRows: 'none',
                    print: false,
                  }}
                />
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        <Menu
          anchorEl={this.state.actionMenuAnchor}
          open={Boolean(this.state.actionMenuAnchor)}
          onClose={this.handleActionMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {this.state.actionMenuRowData &&
            this.state.actionMenuRowData[3] &&
            this.state.actionMenuRowData[3].map((mapping) =>
              isUserHasPermission('assign_standard_section', 'delete') ? (
                <MenuItem
                  key={mapping.id}
                  onClick={() => {
                    const rowIndex = this.state.actionMenuRowIndex;
                    this.handleActionMenuClose();
                    this.deleteExpense(mapping.id, rowIndex);
                  }}
                  style={{ minWidth: 160 }}
                >
                  Delete – {mapping.standard_section}
                </MenuItem>
              ) : null
            )}
        </Menu>

        <Dialog open={Boolean(this.state.editDialogOpen)} onClose={this.handleCloseEditDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Update {alias_names['standard'] || 'Standard'} sections for {this.state.editDialogStaffName}</DialogTitle>
          <DialogContent>
            {this.state.editDialogListLoading ? (
              <Box py={2} display="flex" alignItems="center">
                <CircularProgress size={24} style={{ marginRight: 8 }} />
                <Typography>Loading standard sections...</Typography>
              </Box>
            ) : (
              <Box mt={1}>
                <MultipleSelectDropdown
                  id="edit_dialog_standard_sections"
                  label={`Select ${alias_names['standard'] || 'Standard'} Section`}
                  data_list={(this.state.fieldDetails[0] && this.state.fieldDetails[0].list) || []}
                  selected_list={this.state.editDialogSelected || []}
                  onChange={(selected) => this.setState({ editDialogSelected: selected || [] })}
                  optionValue="name"
                  customId="id"
                  enableSelectAll
                  required
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleCloseEditDialog} color="secondary">
              Cancel
            </Button>
            <Button
              onClick={this.handleEditDialogUpdate}
              color="primary"
              disabled={this.state.editDialogListLoading || this.state.editDialogSubmitting}
            >
              {this.state.editDialogSubmitting ? 'Updating...' : 'Update'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
}

export default withRouter(HrAssignStandardSectionView);
