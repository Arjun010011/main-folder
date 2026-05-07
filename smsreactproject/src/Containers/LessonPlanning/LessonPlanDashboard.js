import React, { Component } from 'react';
import {
  Paper,
  Box,
  Grid,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@material-ui/core';
import DashboardOutlinedIcon from '@material-ui/icons/DashboardOutlined';
import CheckCircleOutlinedIcon from '@material-ui/icons/CheckCircleOutlined';
import MenuBookOutlinedIcon from '@material-ui/icons/MenuBookOutlined';
import ScheduleOutlinedIcon from '@material-ui/icons/ScheduleOutlined';
import TodayOutlinedIcon from '@material-ui/icons/TodayOutlined';
import AssignmentOutlinedIcon from '@material-ui/icons/AssignmentOutlined';
import UpdateOutlinedIcon from '@material-ui/icons/UpdateOutlined';
import { withRouter } from 'react-router-dom';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { DateRange } from 'Components/DateRange';
import { getAcademicYear } from 'Includes/functions';
import { dateFormat } from 'Includes/functions';
import moment from 'moment';
import classNames from 'classnames';
import Chart from 'react-apexcharts';
import Swal from 'sweetalert2';
import { Actions } from 'Constants/permissions';
import './LessonPlanDashboard.scss';

const alias_names = JSON.parse(localStorage.getItem('alias_name') || '{}');
const user = typeof localStorage !== 'undefined' && localStorage.getItem('user') && localStorage.getItem('user') !== 'undefined'
  ? JSON.parse(localStorage.getItem('user'))
  : null;

class LessonPlanDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      academicYear: '',
      yearList: [],
      loading: true,
      summaryLoading: true,
      reportLoading: false,
      dashboardList: [],
      myAssignments: [],
      completedCount: 0,
      totalSyllabusCount: 0,
      pendingCount: 0,
      todayCount: 0,
      selectedSubject: '',
      selectedStandardSection: '',
      subjectOptions: [],
      standardSectionOptions: [],
      fromDate: moment().format('YYYY-MM-DD'),
      toDate: moment().format('YYYY-MM-DD'),
      rowsLoading: false,
      rows: [],
      overallDistribution: [],
    };
  }

  getCurrentStaffId = () => {
    if (!user) return null;
    return user.staff?.id ?? user.staff_id ?? user.id ?? null;
  };

  componentDidMount() {
    this.fetchAcademicYearAndDashboard();
  }

  fetchAcademicYearAndDashboard = () => {
    this.setState({ loading: true });
    const url = GET_URL.getacademicyear?.api || 'institutes/getacademicyear/';
    getRequest(url, { is_active: true }, this.props)
      .then((response) => {
        const yearList = response?.status === 200 ? response.data?.data || [] : [];
        const academicYear = getAcademicYear() || (yearList.length ? String(yearList[0].id) : '');
        this.setState({ yearList, academicYear, loading: false }, () => this.fetchStaffDashboard());
      })
      .catch(() => this.setState({ loading: false }));
  };

  fetchStaffDashboard = () => {
    const { academicYear, selectedSubject, selectedStandardSection, fromDate, toDate } = this.state;
    const staffId = this.getCurrentStaffId();
    if (staffId == null) {
      this.setState({ dashboardList: [], summaryLoading: false, subjectOptions: [], standardSectionOptions: [], myAssignments: [] });
      return;
    }
    this.setState({ summaryLoading: true });
    const apiUrl = GET_URL.stafflessonplandashboard?.api || 'classes/stafflessonplandashboard/';
    const params = {};
    if (academicYear) params.academic_year = academicYear;
    if (selectedSubject) params.subject = selectedSubject;
    if (selectedStandardSection) params.standard_section = selectedStandardSection;
    if (fromDate && toDate) {
      if (fromDate === toDate) params.date = fromDate;
      else {
        params.from_date = fromDate;
        params.to_date = toDate;
      }
    }
    getRequest(apiUrl, params, this.props)
      .then((response) => {
        if (response?.status !== 200) {
          this.setState({ summaryLoading: false, dashboardList: [], myAssignments: [] });
          return;
        }
        const data = response.data?.data ?? response.data ?? response;
        const dashboardList = Array.isArray(data.dashboard_list) ? data.dashboard_list : [];
        const subjectOptions = this.normalizeOptions(data.subject_options, 'name');
        const standardSectionOptions = this.normalizeStandardSectionOptions(data.standard_section_options);
        const ay = data.academic_year;
        const resolvedAcademicYear = (ay && (ay.id || ay.name)) ? String(ay.id || '') : academicYear;
        const totals = data.dashboard_totals || {};
        const completedCount = Number(totals.total_subtopics_completed || 0);
        const totalSyllabusCount = Number(totals.total_subtopics_allocated || 0);
        const pendingCount = Number(totals.total_subtopics_pending || 0);
        const myAssignments = dashboardList.map((row) => {
          const subj = row.subject;
          const ss = row.standard_section;
          const subjectId = subj?.id ?? subj ?? row.subject_id;
          const subjectName = typeof subj === 'object' ? (subj?.name ?? subj?.subject_name) : subj;
          const sectionId = ss?.id ?? ss ?? row.standard_section_id;
          const standardId = ss?.standard ?? row.standard;
          const actualSectionId = ss?.section ?? row.section;
          let sectionName = '';
          if (ss && typeof ss === 'object') {
            sectionName = ss.standard_name && ss.section__name ? `${ss.standard_name} - ${ss.section__name}` : (ss.standard_name ?? ss.name ?? ss.section_name ?? '—');
          } else {
            sectionName = '—';
          }
          return {
            lesson_plan_academic_year_id: row.lesson_plan_academic_year_id,
            subject: subjectId,
            standard_section: sectionId,
            standard_id: standardId,
            section_id: actualSectionId,
            subject_name: subjectName ?? '—',
            standard_section_name: sectionName || '—',
            total_subtopics_allocated: Number(row.total_subtopics_allocated ?? row.total_syllabus ?? 0),
            total_subtopics_completed: Number(row.total_subtopics_completed ?? row.completed ?? 0),
            total_subtopics_pending: Number(row.total_subtopics_pending ?? row.pending_syllabus ?? 0),
            update_action: row.update_action || null,
          };
        });
        const filter = data.selected_filter || {};
        const nextFromDate = filter.from_date || filter.date || fromDate;
        const nextToDate = filter.to_date || filter.date || toDate;
        const overallDistribution = Array.isArray(data.graph_data?.overall_distribution)
          ? data.graph_data.overall_distribution
          : [
            { label: 'Allocated', value: totalSyllabusCount },
            { label: 'Completed', value: completedCount },
            { label: 'Pending', value: pendingCount },
          ];
        this.setState({
          dashboardList,
          myAssignments,
          rows: myAssignments,
          subjectOptions,
          standardSectionOptions,
          completedCount,
          totalSyllabusCount,
          pendingCount,
          todayCount: completedCount,
          overallDistribution,
          fromDate: nextFromDate,
          toDate: nextToDate,
          academicYear: resolvedAcademicYear || academicYear,
          summaryLoading: false,
        });
      })
      .catch(() => this.setState({ summaryLoading: false, dashboardList: [], myAssignments: [], subjectOptions: [], standardSectionOptions: [] }));
  };

  getDateRangeList = () => {
    const { fromDate, toDate } = this.state;
    const start = moment(fromDate, 'YYYY-MM-DD');
    const end = moment(toDate, 'YYYY-MM-DD');
    if (!start.isValid() || !end.isValid()) return [];
    if (end.isBefore(start)) return [];
    const dates = [];
    const d = start.clone();
    while (d.isSameOrBefore(end)) {
      dates.push(d.format('YYYY-MM-DD'));
      d.add(1, 'day');
    }
    return dates;
  };

  aggregateAssignmentForRange = async (assignment, dates) => {
    const { academicYear } = this.state;
    const apiUrl = GET_URL.updatelessonplanningstatus?.api || 'classes/updatelessonplanningstatus/';
    const taskMap = new Map();
    const requests = dates.map((forDate) =>
      getRequest(apiUrl, {
        academic_year: academicYear,
        standard_section: assignment.standard_section,
        subject: assignment.subject,
        for_date: forDate,
      }, this.props)
    );
    const responses = await Promise.all(requests);
    responses.forEach((res) => {
      const data = res?.status === 200 ? (res.data?.data ?? res.data) : {};
      const all = [
        ...(Array.isArray(data.pending_tasks) ? data.pending_tasks : []),
        ...(Array.isArray(data.todays_tasks) ? data.todays_tasks : []),
        ...(Array.isArray(data.tomorrows_tasks) ? data.tomorrows_tasks : []),
      ];
      all.forEach((t) => {
        const d = t.detail ?? {};
        const id = d.id ?? t.subtopic_detail_id;
        if (id == null) return;
        const completed = this.isTaskCompleted(t);
        const prev = taskMap.get(id) || { completed: false };
        taskMap.set(id, { completed: prev.completed || completed });
      });
    });
    const totalAllocated = taskMap.size;
    let totalCompleted = 0;
    taskMap.forEach((v) => {
      if (v.completed) totalCompleted += 1;
    });
    const totalPending = Math.max(0, totalAllocated - totalCompleted);
    return { totalAllocated, totalCompleted, totalPending };
  };

  fetchDateRangeSummaryAndRows = async () => {
    const { myAssignments } = this.state;
    const dates = this.getDateRangeList();
    if (!myAssignments || myAssignments.length === 0 || dates.length === 0) {
      this.setState({
        rows: [],
        totalSyllabusCount: 0,
        completedCount: 0,
        pendingCount: 0,
        todayCount: 0,
      });
      return;
    }
    if (dates.length > 31) {
      Swal.fire({ icon: 'warning', title: 'Please select a date range within 31 days.' });
      return;
    }
    this.setState({ rowsLoading: true });
    try {
      const stats = await Promise.all(myAssignments.map((a) => this.aggregateAssignmentForRange(a, dates)));
      const rows = myAssignments.map((a, idx) => ({
        ...a,
        total_subtopics_allocated: stats[idx].totalAllocated,
        total_subtopics_completed: stats[idx].totalCompleted,
        total_subtopics_pending: stats[idx].totalPending,
      }));
      const totalSyllabusCount = rows.reduce((s, r) => s + (r.total_subtopics_allocated || 0), 0);
      const completedCount = rows.reduce((s, r) => s + (r.total_subtopics_completed || 0), 0);
      const pendingCount = rows.reduce((s, r) => s + (r.total_subtopics_pending || 0), 0);
      this.setState({
        rows,
        totalSyllabusCount,
        completedCount,
        pendingCount,
        todayCount: totalSyllabusCount,
        rowsLoading: false,
      });
    } catch {
      this.setState({ rowsLoading: false });
    }
  };

  normalizeOptions = (arr, nameKey) => {
    const list = Array.isArray(arr) ? arr : [];
    return list.map((item) => {
      const id = item?.id ?? item?.value;
      const name = item?.[nameKey] ?? item?.name ?? item?.label ?? String(id ?? '');
      return { id: String(id), name };
    }).filter((o) => o.id != null && o.id !== '');
  };

  normalizeStandardSectionOptions = (arr) => {
    const list = Array.isArray(arr) ? arr : [];
    return list.map((item) => {
      const id = item?.id ?? item?.value;
      let name = item?.name ?? item?.label;
      if (!name && item && typeof item === 'object') {
        const sn = item.standard_name ?? item.standard?.name;
        const sec = item.section__name ?? item.section_name ?? item.section?.name;
        name = sn && sec ? `${sn} - ${sec}` : (sn || sec || String(id ?? ''));
      }
      return { id: String(id), name: name || String(id ?? '') };
    }).filter((o) => o.id != null && o.id !== '');
  };

  hasCommentDate = (detail) =>
    Array.isArray(detail?.comments) && detail.comments.some((c) => c && c.date != null);

  isTaskCompleted = (task) => {
    const d = task?.detail ?? {};
    if (task && Object.prototype.hasOwnProperty.call(task, 'is_completed')) return !!task.is_completed;
    return !!(d.completion_date || this.hasCommentDate(d));
  };

  handleSubjectChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value }, () => this.fetchStaffDashboard());
  };

  handleStandardSectionChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value }, () => this.fetchStaffDashboard());
  };

  handleApplyDateFilter = () => {
    this.fetchStaffDashboard();
  };

  handleDateRangeChange = (value) => {
    const nextFromDate = value?.start || this.state.fromDate;
    const nextToDate = value?.end || this.state.toDate;
    this.setState(
      {
        fromDate: nextFromDate,
        toDate: nextToDate,
      },
      () => {
        if (this.state.fromDate && this.state.toDate) {
          this.fetchStaffDashboard();
        }
      }
    );
  };

  handleUpdateRow = (row) => {
    const apiQuery = row?.update_action?.api_query || {};
    const { academicYear } = this.state;
    const query = new URLSearchParams({
      year: String(apiQuery.academic_year || academicYear || ''),
      standard_section: String(apiQuery.standard_section || row.standard_section || ''),
      standard: row.standard_id || '',
      section: row.section_id || '',
      is_subject_wise: '1',
      subject_id: String(apiQuery.subject || row.subject || ''),
      subject_name: row.subject_name || '',
      standard_name: (row.standard_section_name || '').split('-')[0]?.trim() || '',
      section_name: (row.standard_section_name || '').split('-').slice(1).join('-').trim() || '',
      ...(apiQuery.date ? { date: apiQuery.date } : {}),
    }).toString();
    this.props.history.push({
      pathname: Actions.lesson_plan_status?.view?.url,
      search: `?${query}`,
    });
  };

  render() {
    const {
      loading,
      summaryLoading,
      rowsLoading,
      completedCount,
      totalSyllabusCount,
      pendingCount,
      todayCount,
      rows,
      fromDate,
      toDate,
      overallDistribution,
    } = this.state;

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
          <CircularProgress />
        </Box>
      );
    }

    const staffId = this.getCurrentStaffId();
    if (staffId == null) {
      return (
        <Paper className={classNames('paper-background')} style={{ padding: 24 }}>
          <Typography color="textSecondary">You are not logged in as staff. This dashboard is for staff only.</Typography>
        </Paper>
      );
    }

    return (
      <Box className="lp-dashboard-container">
        <Paper className={classNames('paper-background')} elevation={0} style={{ borderRadius: 16, overflow: 'hidden', padding: 24 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
            <Box display="flex" alignItems="center" style={{ gap: 16 }}>
              <Box display="flex" alignItems="center" justifyContent="center" style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white', boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.4)' }}>
                <DashboardOutlinedIcon style={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h5" style={{ fontWeight: 700, color: '#1e293b' }}>
                  Lesson Plan Dashboard
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Track curriculum progress and upcoming tasks
                </Typography>
              </Box>
            </Box>
            
            <Box p={1.5} style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 12 }}>
              <DateRange
                label="Date Range"
                startDate={fromDate}
                endDate={toDate}
                handleChange={this.handleDateRangeChange}
                size="small"
              />
              <Button variant="contained" color="primary" onClick={this.handleApplyDateFilter} style={{ textTransform: 'none', borderRadius: 8, fontWeight: 600 }}>
                Apply
              </Button>
            </Box>
          </Box>

          {summaryLoading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Grid container spacing={3} style={{ marginBottom: 32 }}>
                <Grid item xs={12} md={8}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <div className="summary-card completed">
                        <div className="card-content">
                          <div className="icon-box"><CheckCircleOutlinedIcon /></div>
                          <div>
                            <div className="label">Completed</div>
                            <div className="value">{completedCount}</div>
                          </div>
                        </div>
                      </div>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <div className="summary-card allocated">
                        <div className="card-content">
                          <div className="icon-box"><MenuBookOutlinedIcon /></div>
                          <div>
                            <div className="label">Total Allocated</div>
                            <div className="value">{totalSyllabusCount}</div>
                          </div>
                        </div>
                      </div>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <div className="summary-card pending">
                        <div className="card-content">
                          <div className="icon-box"><ScheduleOutlinedIcon /></div>
                          <div>
                            <div className="label">Total Pending</div>
                            <div className="value">{pendingCount}</div>
                          </div>
                        </div>
                      </div>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <div className="summary-card today">
                        <div className="card-content">
                          <div className="icon-box"><TodayOutlinedIcon /></div>
                          <div>
                            <div className="label">Efficiency</div>
                            <div className="value">{totalSyllabusCount > 0 ? Math.round((completedCount/totalSyllabusCount)*100) : 0}%</div>
                          </div>
                        </div>
                      </div>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper className="chart-paper" elevation={0}>
                    <Typography variant="subtitle1" style={{ fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>
                      Progress Overview
                    </Typography>
                    <Chart
                      type="donut"
                      height={280}
                      series={(overallDistribution || []).map((x) => Number(x.value || 0))}
                      options={{
                        labels: (overallDistribution || []).map((x) => x.label),
                        legend: { position: 'bottom', fontFamily: 'Inter, sans-serif' },
                        colors: ['#3b82f6', '#22c55e', '#f97316'],
                        dataLabels: { enabled: false },
                        plotOptions: {
                          pie: {
                            donut: {
                              size: '75%',
                              labels: {
                                show: true,
                                total: {
                                  show: true,
                                  label: 'Total',
                                  formatter: () => totalSyllabusCount
                                }
                              }
                            }
                          }
                        }
                      }}
                    />
                  </Paper>
                </Grid>
              </Grid>

              <Typography variant="h6" style={{ fontWeight: 700, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <AssignmentOutlinedIcon style={{ color: '#3b82f6' }} /> Subject-wise Progress
              </Typography>
              
              <TableContainer className="table-container" component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{alias_names['standard'] || 'Standard'} Section</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell align="center">Allocated</TableCell>
                      <TableCell align="center">Completed</TableCell>
                      <TableCell align="center">Pending</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rowsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" style={{ padding: 40 }}><CircularProgress size={32} /></TableCell>
                      </TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" style={{ padding: 40, color: '#64748b' }}>No class or subject assigned.</TableCell>
                      </TableRow>
                    ) : (
                      rows.map((a, idx) => (
                        <TableRow key={`${a.standard_section}-${a.subject}-${idx}`} hover>
                          <TableCell style={{ fontWeight: 600 }}>{a.standard_section_name}</TableCell>
                          <TableCell>{a.subject_name}</TableCell>
                          <TableCell align="center">{a.total_subtopics_allocated || 0}</TableCell>
                          <TableCell align="center" style={{ color: '#166534', fontWeight: 600 }}>{a.total_subtopics_completed || 0}</TableCell>
                          <TableCell align="center" style={{ color: '#991b1b' }}>{a.total_subtopics_pending || 0}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<UpdateOutlinedIcon />}
                              onClick={() => this.handleUpdateRow(a)}
                              style={{ textTransform: 'none', borderRadius: 8, fontWeight: 600 }}
                            >
                              Update Progress
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      </Box>
    );
  }
}

export default withRouter(LessonPlanDashboard);

