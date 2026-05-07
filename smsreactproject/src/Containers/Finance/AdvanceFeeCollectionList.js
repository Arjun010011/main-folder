import React, { Component } from 'react';
import {
  Paper,
  Box,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
} from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';
import { withRouter, Link } from 'react-router-dom';
import AssignmentIndOutlinedIcon from '@material-ui/icons/AssignmentIndOutlined';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import CategoryOutlinedIcon from '@material-ui/icons/CategoryOutlined';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';
import { Actions } from 'Constants/permissions';
import { getFullName, getPaginationProps, checkLocalAcademicYear, checkLocalStandard } from 'Includes/functions';
import { cloneDeep } from 'lodash';
import { DEFAULT_PAGINATION_PROPS } from 'Constants';
import classNames from 'classnames';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import StudentProfileCard from 'Components/StudentProfileCard';
import loadingBar from 'images/loading.gif';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) || {};

class AdvanceFeeCollectionList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      yearList: [],
      standardList: [],
      sectionList: [],
      year: '',
      standard: '',
      section: 'all',
      loadingStd: true,
      studentList: [],
      studentListData: null,
      pagination: cloneDeep(DEFAULT_PAGINATION_PROPS),
      blankPageMessage: '',
      printLoading: {},
    };
  }

  columns = [
    {
      name: 'name',
      label: 'Student',
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta) => {
          const row = tableMeta.tableData?.[tableMeta.rowIndex] || {};
          const sectionName = row.section_name ?? row.section__name ?? '';
          return (
            <StudentProfileCard
              student_name={getFullName(row.first_name, row.middle_name, row.last_name) || row.student_name || '—'}
              section_name={sectionName}
              id={row.id ?? row.student ?? row.user_id}
              isApiCall={true}
            />
          );
        },
      },
    },
    {
      name: 'admission_num',
      label: 'Admission No',
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value, tableMeta) => {
          const row = tableMeta.tableData?.[tableMeta.rowIndex] || {};
          return <Box>{row.admission_num ?? row.admission_number ?? '—'}</Box>;
        },
      },
    },
    {
      name: 'section_name',
      label: 'Section',
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value, tableMeta) => {
          const row = tableMeta.tableData?.[tableMeta.rowIndex] || {};
          return <Box>{row.section_name ?? row.section__name ?? '—'}</Box>;
        },
      },
    },
    {
      name: 'advance_collected',
      label: 'Advance Collected',
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value, tableMeta) => {
          const row = tableMeta.tableData?.[tableMeta.rowIndex] || {};
          return <Box>{row.total_advance_paid ?? row.advance_collected ?? row.advance_amount ?? row.advance_balance ?? '0'}</Box>;
        },
      },
    },
    {
      name: 'actions',
      label: 'Action',
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value, tableMeta) => {
          const row = tableMeta.tableData?.[tableMeta.rowIndex] || {};
          return (
            <Box display="flex" justifyContent="flex-start">
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddCircleOutlineOutlinedIcon />}
                onClick={() => this.handleAddAdvance(row)}
              >
                Add Advance
              </Button>
            </Box>
          );
        },
      },
    },
  ];

  componentDidMount() {
    this.getAcademicYear();
  }

  componentWillUnmount() { }

  getAcademicYear = () => {
    const url = GET_URL.getacademicyear?.api || 'institutes/getacademicyear/';
    const params = { is_active: true, is_finance_page: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const yearList = response.data?.data ?? [];
        const year = checkLocalAcademicYear(yearList);
        this.setState(
          {
            yearList: Array.isArray(yearList) ? yearList : [],
            year: year || '',
            loading: !!year,
            loadingStd: !!year,
          },
          () => {
            if (year) this.getStandardsList(year);
          }
        );
      } else {
        this.setState({ yearList: [], loading: false, loadingStd: false });
      }
    }).catch(() => this.setState({ yearList: [], loading: false, loadingStd: false }));
  };

  getStandardsList = (year) => {
    const url = GET_URL.getstandard?.api || 'classes/getstandard/';
    const params = { academic_year: year, is_finance_page: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data?.data ?? [];
        const standard = checkLocalStandard(standardList);
        this.setState(
          {
            standardList: Array.isArray(standardList) ? standardList : [],
            standard: standard || '',
            loadingStd: false,
            sectionList: [],
            section: 'all',
          },
          () => {
            if (standard) {
              this.getSectionList();
              this.getStudentList('default');
            } else {
              this.setState({ studentList: [], studentListData: null, blankPageMessage: 'Please select academic year and standard.' });
            }
          }
        );
      } else {
        this.setState({ standardList: [], loadingStd: false });
      }
    }).catch(() => this.setState({ standardList: [], loadingStd: false }));
  };

  getSectionList = () => {
    const { year, standard } = this.state;
    if (!year || !standard) return;
    const url = GET_URL.getsection?.api || 'classes/getsection/';
    const params = { academic_year: year, standard, is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let sectionList = response.data?.data ?? [];
        sectionList = [{ standard_section: 'all', id: 'all', name: 'All' }, ...(Array.isArray(sectionList) ? sectionList : [])];
        this.setState({ sectionList });
      } else {
        this.setState({ sectionList: [] });
      }
    }).catch(() => this.setState({ sectionList: [] }));
  };

  getStudentList = (paginationProps) => {
    const { year, standard, section } = this.state;
    if (!year || !standard) {
      this.setState({ studentList: [], studentListData: null });
      return;
    }
    let pagination = this.state.pagination;
    if (paginationProps === 'default') {
      pagination = cloneDeep(DEFAULT_PAGINATION_PROPS);
      this.setState({ pagination });
    } else if (paginationProps && typeof paginationProps === 'object') {
      pagination = paginationProps;
    }
    const pagination_params = getPaginationProps(pagination);
    const url = 'students/student/';
    const params = {
      ...pagination_params,
      ordering: '-id',
      is_active: true,
      student_academic_year: year,
      current_standard: standard,
      admission_history: true,
      get_advance_fee: 1,
    };
    if (section && section !== 'all') {
      params.current_standard_section = section;
      params.section = section;
    }
    this.setState({ loading: true, blankPageMessage: '' });
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const raw = response.data?.data ?? response.data;
        const list = raw?.results ?? raw?.student_list ?? (Array.isArray(raw) ? raw : []);
        const count = raw?.count ?? (Array.isArray(list) ? list.length : 0);
        this.setState({
          studentList: Array.isArray(list) ? list : [],
          studentListData: raw,
          loading: false,
          pagination: { ...pagination, count },
        });
      } else {
        this.setState({
          studentList: [],
          studentListData: null,
          loading: false,
          blankPageMessage: typeof response?.data === 'string' ? response.data : 'No students found.',
        });
      }
    }).catch(() => {
      this.setState({ studentList: [], studentListData: null, loading: false, blankPageMessage: 'Failed to load students.' });
    });
  };

  onChange = (e) => {
    const { name, value } = e.target;
    if (name === 'year') {
      this.setState({ [name]: value, standard: '', section: 'all', sectionList: [], studentList: [] }, () => {
        if (value) this.getStandardsList(value);
        else this.setState({ standardList: [], loadingStd: false });
      });
      return;
    }
    if (name === 'standard') {
      this.setState({ [name]: value, section: 'all' }, () => {
        if (value) {
          this.getSectionList();
          this.getStudentList('default');
        } else this.setState({ studentList: [], sectionList: [] });
      });
      return;
    }
    if (name === 'section') {
      this.setState({ [name]: value }, () => this.getStudentList('default'));
    }
  };

  changePage = (tableState, action) => {
    if (action === 'viewColumnsChange') return;
    this.setState({ pagination: tableState }, () => this.getStudentList(tableState));
  };

  handleAddAdvance = (student) => {
    const studentId = student.student ?? student.id ?? student.user_id;
    const { year } = this.state;
    this.props.history.push({
      pathname: '/finance/advance-fee-collection/add',
      search: `?academic_year=${year}&student=${studentId}`,
      state: { studentName: getFullName(student.first_name, student.middle_name, student.last_name) },
    });
  };

  printReceipt = (id) => {
    this.setState(prevState => ({ printLoading: { ...prevState.printLoading, [id]: true } }));
    const baseApi = GET_URL.feeadvancecollection?.api || 'finance/feeadvancecollection/';
    const get_url = `${baseApi}${id}/`;
    const prop = { ...this.props, responseType: 'blob' };
    getRequest(get_url, { print_receipt: 1 }, prop).then((response) => {
      this.setState(prevState => {
        const printLoading = { ...prevState.printLoading };
        delete printLoading[id];
        return { printLoading };
      });
      if (response && response.status === 200) {
        let Data = new Blob([response.data], { type: 'application/pdf' });
        let fileURL = URL.createObjectURL(Data);
        const height = (window.screen.height * 90) / 100;
        const width = (window.screen.width * 80) / 100;
        const mywindow = window.open(
          fileURL,
          'PRINT',
          'height=' + height + ',width=' + width + ''
        );
        mywindow.print();
        mywindow.onafterprint = mywindow.close;
      }
    }).catch(() => {
      this.setState(prevState => {
        const printLoading = { ...prevState.printLoading };
        delete printLoading[id];
        return { printLoading };
      });
    });
  };

  renderExpandableRow = (rowData, rowMeta) => {
    const { studentList } = this.state;
    const student = studentList[rowMeta.dataIndex];
    const advanceDetails = student?.advance_fee_details || [];

    return (
      <TableRow>
        <TableCell colSpan={rowData.length + 1} style={{ padding: 0 }}>
          <Box m={2}>
            {advanceDetails.length > 0 ? (
              <Table size="small" aria-label="advance-details" style={{ backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Transaction Date</strong></TableCell>
                    <TableCell><strong>Receipt No.</strong></TableCell>
                    <TableCell><strong>Advance Type</strong></TableCell>
                    <TableCell><strong>Payment Mode</strong></TableCell>
                    <TableCell align="right"><strong>Amount</strong></TableCell>
                    <TableCell align="center"><strong>Action</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {advanceDetails.map((detail, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{detail.transaction_date}</TableCell>
                      <TableCell>{detail.receipt_num || '—'}</TableCell>
                      <TableCell>{detail.fee_advance_type__name || '—'}</TableCell>
                      <TableCell>{detail.mode_of_payment || '—'}</TableCell>
                      <TableCell align="right">{detail.amount}</TableCell>
                      <TableCell align="center">
                        {this.state.printLoading && this.state.printLoading[detail.id] ? (
                          <CircularProgress size={20} />
                        ) : (
                          <Button size="small" color="primary" onClick={() => this.printReceipt(detail.id)}>
                            Print
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Box p={2} textAlign="center" color="text.secondary">No advance fee records.</Box>
            )}
          </Box>
        </TableCell>
      </TableRow>
    );
  };

  render() {
    const {
      yearList,
      standardList,
      sectionList,
      year,
      standard,
      section,
      loadingStd,
      studentList,
      loading,
      pagination,
      blankPageMessage,
    } = this.state;

    const yearOptions = (yearList || []).map((y) => ({ id: y.id, name: y.name || y.alias || '—' }));
    const standardOptions = (standardList || []).map((s) => ({ id: s.id, name: s.name || '—' }));
    const sectionOptions = (sectionList || []).map((s) => ({ id: s.standard_section ?? s.id, name: s.name || '—' }));

    const hasFilters = year && standard;
    const showBlank = hasFilters && !loading && (!studentList || studentList.length === 0);

    return (
      <Box>
        <Paper className={classNames('paper-background')} elevation={0}>
          <Grid container>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" mb={2}>
                <Box display="flex" alignItems="center">
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={8}
                    bgcolor="primary.main"
                    color="white"
                    width={40}
                    height={40}
                    mr={1.5}
                  >
                    <AssignmentIndOutlinedIcon />
                  </Box>
                  <Box className="heading">Advance Fee Collection</Box>
                </Box>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  component={Link}
                  to={Actions.advance_fee_type?.view?.url || '/finance/advance-fee-type/list'}
                  startIcon={<CategoryOutlinedIcon />}
                >
                  Advance Fee Types
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" flexWrap="wrap" mb={1}>
                <Box className="header-align mb-10 margin-right-10">
                  <Dropdown
                    label="Academic Year"
                    name="year"
                    value={year}
                    onChange={this.onChange}
                    data={yearOptions}
                    hideSelect={true}
                  />
                </Box>
                <Box className="header-align mb-10 margin-right-10">
                  {!loadingStd ? (
                    <Dropdown
                      label={alias_names['standard'] || 'Standard'}
                      name="standard"
                      value={standard}
                      onChange={this.onChange}
                      data={standardOptions}
                      hideSelect={true}
                    />
                  ) : (
                    <Skeleton
                      variant="rect"
                      className="drop-down-skeleton margin-top-30 "
                    />
                  )}
                </Box>
                {sectionOptions.length > 1 && (
                  <Box className="header-align mb-10 margin-right-10">
                    <Dropdown
                      label="Section"
                      name="section"
                      value={section}
                      onChange={this.onChange}
                      data={sectionOptions}
                    />
                  </Box>
                )}
              </Box>
            </Grid>

            {!hasFilters && (
              <Grid item xs={12}>
                <BlankPagewithIcon data="Select Academic Year and Standard to view students." />
              </Grid>
            )}

            {hasFilters && (
              <Grid item xs={12}>
                <Paper variant="outlined" style={{ borderRadius: 12, overflow: 'hidden' }}>
                  {loading && studentList.length === 0 && (
                    <Box display="flex">
                      <img src={loadingBar} className="loading" alt="loading" />
                    </Box>
                  )}
                  {!loading && showBlank && (
                    <Box py={4}>
                      <BlankPagewithIcon data={blankPageMessage || 'No students found for the selected filters.'} />
                    </Box>
                  )}
                  {studentList.length > 0 && (
                    <Box>
                      <AllMUIDataTable
                        data={studentList}
                        title={loading && studentList.length > 0 ? <CircularProgress className="white-text" size={24} /> : ""}
                        columns={this.columns}
                        options={{
                          selectableRows: 'none',
                          filter: false,
                          search: true,
                          print: false,
                          download: false,
                          responsive: 'responsive',
                          rowsPerPageOptions: [10, 25, 50],
                          expandableRows: true,
                          expandableRowsHeader: false,
                          renderExpandableRow: this.renderExpandableRow,
                        }}
                        serverSide={true}
                        pagination={pagination}
                        count={pagination.count ?? studentList.length}
                        onTableChange={this.changePage}
                        viewColumns={true}
                      />
                    </Box>
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

export default withRouter(AdvanceFeeCollectionList);