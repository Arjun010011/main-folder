import React, { Component } from 'react'
import {
  Paper,
  Box,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Collapse,
  IconButton,
  Avatar
} from '@material-ui/core'
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  GetApp as ExportIcon,
  Save as SaveIcon,
  FilterList as FilterIcon,
  Assessment as ReportIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon
} from '@material-ui/icons'
import { getRequest } from 'Includes/api/apicall'
import { GET_URL } from 'Includes/urls'
import { Dropdown } from "Components/DropDown"
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableContainer from '@material-ui/core/TableContainer';

export default class AdvancedSubjectWiseReport extends Component {
  constructor(props) {
    super(props)
    this.state = {
      yearList: [],
      termList: [],
      examList: [],
      standardSectionList: [],
      subjectList: [],
      studentList: [],

      selectedYear: '',
      selectedTerms: [],
      selectedExams: [],
      selectedStandardSections: [],
      selectedSubjects: [],
      selectedStudents: [],

      loadingTerms: false,
      loadingExams: false,
      loadingStandardSections: false,
      loadingSubjects: false,

      activeTab: 0,
      loading: false,
      showFilters: true,
      expandedRows: {},
      savedReports: [],

      reportData: [],
      summaryStats: {},
      chartData: [],
      error: {},
      subjectRanks: [],
      reportTypes: [
        { label: 'Subject Analysis', icon: <SchoolIcon />, value: 'subject' },
        // { label: 'Student Performance', icon: <PersonIcon />, value: 'student' },
        // { label: 'Ranking Report', icon: <TrendingUpIcon />, value: 'ranking' },
        // { label: 'Comparative Analysis', icon: <ReportIcon />, value: 'comparative' }
      ],
      subjectRankings: []
    }
  }

  

  componentDidMount() {
    this.initializeData()
  }

  initializeData = () => {
    this.fetchYearList()
  }

  fetchYearList = () => {
    getRequest(GET_URL.getacademicyear.api, { is_active: true }, this.props).then((res) => {
      if (res && res.status === 200) {
        const yearList = res.data.data.map((year) => {
          const fromYear = year.start_date.split('-')[0]
          const toYear = year.end_date.split('-')[0]
          return { ...year, name: `${fromYear}-${toYear}` }
        })
        this.setState({ yearList })
      }
    })
  }

  fetchTermList = (yearId) => {
    if (!yearId) return
    this.setState({ loadingTerms: true })
    getRequest(GET_URL.examterms.api, { is_active: true }, this.props).then((res) => {
      if (res && res.status === 200) {
        this.setState({ termList: res.data.data, loadingTerms: false })
      } else {
        this.setState({ loadingTerms: false })
      }
    }).catch(() => this.setState({ loadingTerms: false }))
  }

  fetchExamList = (yearId, termIds) => {
    if (!yearId || !termIds.length) return
    this.setState({ loadingExams: true })

    const termQuery = Array.isArray(termIds) ? termIds.join(',') : termIds

    getRequest(GET_URL.exam.api, {
      academic_year: yearId,
      term__in: termQuery,
      is_active: true
    }, this.props).then(res => {
      if (res && res.status === 200) {
        this.setState({ examList: res.data.data, loadingExams: false })
      } else {
        this.setState({ loadingExams: false })
      }
    }).catch(() => this.setState({ loadingExams: false }))
  }

  fetchStandardSectionList = (examIds) => {
    if (!examIds || !examIds.length) {
      this.setState({ standardSectionList: [] })
      return
    }

    this.setState({ loadingStandardSections: true })

    getRequest(GET_URL.standardsectiondataforexam.api, { exam_ids: examIds.join(',') }, this.props).then(res => {
      if (res && res.status === 200) {
        let flatSections = [];
        (res.data || []).forEach(standard => {
          (standard.section_list || []).forEach(section => {
            flatSections.push({
              standard_name: standard.standard_name,
              section_name: section.section_name,
              standard_section: section.standard_section
            });
          });
        });
        this.setState({ standardSectionList: flatSections, loadingStandardSections: false })
      } else {
        this.setState({ standardSectionList: [], loadingStandardSections: false })
      }
    }).catch(() => this.setState({ standardSectionList: [], loadingStandardSections: false }))
  }

  fetchSubjectListFromAPI = () => {
    const selectedExams = this.state.selectedExams;
    const selectedSections = this.state.selectedSections || this.state.selectedExams || [];
    if (!selectedSections.length || !selectedExams.length) {
      this.setState({ subjectList: [], loading: false });
      return;
    }
  
    this.setState({ loading: true });
  
    getRequest(
      GET_URL.subjectsbyexams.api,
      {
        standard_section: selectedSections.join(','),
        exam_ids: selectedExams.join(','),
        is_active: true,
      },
      this.props
    )
      .then((res) => {
        if (res && res.status === 200) {
          this.setState({
            subjectList: res.data.data || [],
            loading: false,
          });
        } else {
          this.setState({ subjectList: [], loading: false });
        }
      })
      .catch(() => {
        this.setState({ subjectList: [], loading: false });
      });
  };

  onYearChange = (event) => {
    const { name, value } = event.target
    this.setState({
      [name]: value,
      selectedTerms: [],
      selectedExams: [],
      selectedStandardSections: [],
      selectedSubjects: [],
      termList: [],
      examList: [],
      standardSectionList: [],
      subjectList: [],
      error: {}
    }, () => {
      if (value) this.fetchTermList(value)
    })
  }

  handleMultiSelectChange = (field, value) => {
    const currentValues = this.state[field]
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]

    this.setState({ [field]: newValues }, () => {
      switch (field) {
        case 'selectedTerms':
          this.setState({ selectedExams: [], selectedStandardSections: [], selectedSubjects: [], examList: [], standardSectionList: [], subjectList: [] }, () => {
            if (newValues.length) this.fetchExamList(this.state.selectedYear, newValues)
          })
          break;
        case 'selectedExams':
          this.setState({ selectedStandardSections: [], selectedSubjects: [], standardSectionList: [], subjectList: [] }, () => {
            if (newValues.length) this.fetchStandardSectionList(newValues)
          })
          break;
        case 'selectedStandardSections':
          this.setState({ selectedSubjects: [], subjectList: [] }, () => {
            if (newValues.length) this.fetchSubjectListFromAPI()
          })
          break;
        default:
          break;
      }
    })
  }

  fetchReport = () => {
    const { activeTab, selectedYear, selectedExams, selectedSubjects, selectedStudents, selectedStandardSections } = this.state

    if (!selectedYear || !selectedExams.length) {
      this.setState({ error: { general: 'Please select Academic Year and at least one Exam.' } })
      return
    }

    this.setState({ loading: true, error: {}, reportData: [], summaryStats: {}, chartData: [] })

    const params = {
      academic_year: selectedYear,
      exams: selectedExams.join(','),
      report_type: this.state.reportTypes[activeTab].value
    }
    if (selectedSubjects.length) params.subjects = selectedSubjects.join(',')
    if (selectedStudents.length) params.students = selectedStudents.join(',')
    if (selectedStandardSections.length) params.standard_sections = selectedStandardSections.join(',')

    getRequest(GET_URL.subjectWiseReport.api, params, this.props).then(res => {
      if (res && res.status === 200) {
        const summary = res.data.summary || {};
        this.setState({
          reportData: res.data.table || [],
          summaryStats: {
            total_students: summary.total_students || 0,
            average_marks: Number(summary.average_percentage) || 0,
            highest_score: Number(summary.highest_percentage) || 0,
            pass_rate: Number(summary.pass_rate) || 0,
          },
          chartData: res.data.chart || [],
          loading: false
        })
      } else {
        this.setState({ error: { general: 'Failed to fetch report data.' }, loading: false })
      }
    }).catch(() => this.setState({ error: { general: 'Error fetching report data.' }, loading: false }))
  }

  hasValidFilters = () => {
    const { selectedYear, selectedExams } = this.state
    return !!selectedYear && selectedExams.length > 0
  }

  handleToggleSection = (sectionId) => {
    const { selectedStandardSections, standardSectionList } = this.state
    const allSectionIds = (standardSectionList || []).map(sec => sec.standard_section)

    const updated = selectedStandardSections.includes(sectionId)
      ? selectedStandardSections.filter(id => id !== sectionId)
      : [...selectedStandardSections, sectionId]

    this.setState({ selectedStandardSections: updated }, () => {
      if (updated.length) this.fetchSubjectListFromAPI()
      else this.setState({ subjectList: [], selectedSubjects: [] })
    })
  }

  handleSubjectClick = (subjectName) => {
    // Navigate to detailed view page or open dialog
    // Example: using React Router
    this.props.history.push(`/subject-analysis/${encodeURIComponent(subjectName)}`);
  }

  renderSubjectRanks() {
    const { subjectRankings, loading } = this.state;
  
    if (loading) return <CircularProgress />;
    if (!subjectRankings || subjectRankings.length === 0) return <Typography>No data available</Typography>;
  
    return (
      <Box mt={2}>
        <Typography variant="h5">Subject-wise Student Rankings</Typography>
        {subjectRankings.map(subjectData => (
          <Paper key={subjectData.subject} style={{ marginTop: 20, padding: 16 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">{subjectData.subject}</Typography>
              <Button variant="outlined" color="primary" onClick={() => this.handleSubjectClick(subjectData.subject)}>
                View Details
              </Button>
            </Box>
  
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Marks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subjectData.rankings.slice(0, 10).map(item => (
                  <TableRow key={item.rank}>
                    <TableCell>{item.rank}</TableCell>
                    <TableCell>{item.student_name}</TableCell>
                    <TableCell>{item.marks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        ))}
      </Box>
    );
  }

  renderFilterSection = () => {
    const {
      yearList, termList, examList, standardSectionList, subjectList,
      selectedYear, selectedTerms, selectedExams, selectedStandardSections, selectedSubjects,
      showFilters, activeTab, loadingTerms, loadingExams, loadingStandardSections, loadingSubjects
    } = this.state

    const activeReportType = this.state.reportTypes[activeTab]

    const allSectionIds = (standardSectionList || []).map(section => section.standard_section)
    const allSelected = allSectionIds.length > 0 && allSectionIds.every(id => selectedStandardSections.includes(id))
    const indeterminate = selectedStandardSections.length > 0 && !allSelected

    const handleSelectAllSections = (e) => {
      if (e.target.checked) {
        this.setState({ selectedStandardSections: allSectionIds }, () => {
          if (allSectionIds.length) this.fetchSubjectListFromAPI()
        })
      } else {
        this.setState({ selectedStandardSections: [], subjectList: [], selectedSubjects: [] })
      }
    }

    return (
      <Card style={{ marginBottom: 16 }}>
        <Box p={2}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" style={{ display: 'flex', alignItems: 'center' }}>
              <FilterIcon style={{ marginRight: 8 }} />
              Smart Filters - {activeReportType.label}
            </Typography>
            <IconButton onClick={() => this.setState({ showFilters: !showFilters })}>
              {showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={showFilters}>
            <Grid container spacing={2}>
              {/* Academic Year */}
              <Grid item xs={12} md={3}>
                <Dropdown
                  data={yearList}
                  name="selectedYear"
                  value={selectedYear}
                  onChange={this.onYearChange}
                  label="Academic Year *"
                  style="width-100"
                  hideSelect={true}
                />
              </Grid>

              {/* Terms */}
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Terms {loadingTerms && <CircularProgress size={16} />}
                </Typography>
                <FormGroup row>
                  {(termList || []).map(term => (
                    <FormControlLabel
                      key={term.id}
                      control={
                        <Checkbox
                          checked={selectedTerms.includes(term.id)}
                          onChange={() => this.handleMultiSelectChange('selectedTerms', term.id)}
                          disabled={!selectedYear || loadingTerms}
                        />
                      }
                      label={term.name}
                    />
                  ))}
                </FormGroup>
              </Grid>

              {/* Exams */}
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Exams * {loadingExams && <CircularProgress size={16} />}
                </Typography>
                <FormGroup>
                  {(examList || []).map(exam => (
                    <FormControlLabel
                      key={exam.id}
                      control={
                        <Checkbox
                          checked={selectedExams.includes(exam.id)}
                          onChange={() => this.handleMultiSelectChange('selectedExams', exam.id)}
                          disabled={!selectedTerms.length || loadingExams}
                        />
                      }
                      label={`${exam.exam_type_name} (${exam.term_name})` || exam.name}
                    />
                  ))}
                </FormGroup>
              </Grid>

              {/* Standard Sections with Select All */}
              <Grid item xs={12} md={4} style={{ maxHeight: 300, overflowY: 'auto' }}>
                <Typography variant="subtitle1" gutterBottom><strong>Class / Sections (Optional)</strong></Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allSelected}
                      indeterminate={indeterminate}
                      onChange={handleSelectAllSections}
                    />
                  }
                  label="Select All"
                />
                <FormGroup>
                  {(standardSectionList || []).map(section => (
                    <FormControlLabel
                      key={section.standard_section}
                      control={
                        <Checkbox
                          checked={selectedStandardSections.includes(section.standard_section)}
                          onChange={() => this.handleToggleSection(section.standard_section)}
                        />
                      }
                      label={`${section.standard_name} - ${section.section_name}`}
                    />
                  ))}
                </FormGroup>
              </Grid>

              {/* Subjects */}
              <Grid item xs={12} md={3} style={{ maxHeight: 300, overflowY: 'auto' }}>
                <Typography variant="subtitle1" gutterBottom><strong>Subjects (Optional)</strong></Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={subjectList.length > 0 && selectedSubjects.length === subjectList.length}
                      indeterminate={selectedSubjects.length > 0 && selectedSubjects.length < subjectList.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          this.setState({ selectedSubjects: subjectList.map(subj => subj.id) });
                        } else {
                          this.setState({ selectedSubjects: [] });
                        }
                      }}
                      disabled={loadingSubjects}
                    />
                  }
                  label="Select All"
                />
                <FormGroup>
                  {(subjectList || []).map(subject => (
                    <FormControlLabel
                      key={subject.id}
                      control={
                        <Checkbox
                          checked={selectedSubjects.includes(subject.id)}
                          onChange={() => this.handleMultiSelectChange('selectedSubjects', subject.id)}
                          disabled={loadingSubjects}
                        />
                      }
                      label={subject.name}
                    />
                  ))}
                </FormGroup>
              </Grid>

            </Grid>

            <Box mt={2} display="flex" gap={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={this.fetchReport}
                disabled={!this.hasValidFilters() || this.state.loading}
                startIcon={<ReportIcon />}
              >
                Generate Report
              </Button>
              {/* <Button
                variant="outlined"
                onClick={() => this.exportReport('csv')}
                disabled={this.state.reportData.length === 0}
                startIcon={<ExportIcon />}
              >
                Export CSV
              </Button>
              <Button variant="outlined" startIcon={<SaveIcon />}>
                Save Filter Preset
              </Button> */}
            </Box>
          </Collapse>
        </Box>
      </Card>
    )
  }

  renderSummaryCards = () => {
    const { summaryStats, loading } = this.state

    if (loading || Object.keys(summaryStats).length === 0) return null

    const cards = [
      // { title: 'Total Students', value: summaryStats.total_students || 0, icon: <PersonIcon />, color: '#1976d2' },
      // { title: 'Average Marks', value: summaryStats.average_marks || 0, icon: <SchoolIcon />, color: '#388e3c' },
      // { title: 'Pass Rate', value: `${summaryStats.pass_rate || 0}%`, icon: <TrendingUpIcon />, color: '#f57c00' },
      // { title: 'Highest Score', value: `${summaryStats.highest_score || 0}%`x || 0, icon: <ReportIcon />, color: '#7b1fa2' }
    ]

    return (
      <Grid container spacing={2} style={{ marginBottom: 16 }}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" component="h2">
                      {card.value}
                    </Typography>
                  </Box>
                  <Avatar style={{ backgroundColor: card.color }}>
                    {card.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    )
  }

  renderReportTable() {
    const { reportData, expandedRows } = this.state;
    if (!reportData.length) return null;
  
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Student Name</TableCell>
              <TableCell>Admission No</TableCell>
              <TableCell>Class/Section</TableCell>
              <TableCell>Total Marks</TableCell>
              <TableCell>Obtained Marks</TableCell>
              <TableCell>%</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Result</TableCell>
              {/* <TableCell>Details</TableCell> */}
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData.map((row) => (
              <React.Fragment key={row.id}>
                <TableRow hover>
                  <TableCell>{row.rank}</TableCell>
                  <TableCell>{row.student_name}</TableCell>
                  <TableCell>{row.admission_number || '-'}</TableCell>
                  <TableCell>{row.class_section}</TableCell>
                  <TableCell>{row.total_marks}</TableCell>
                  <TableCell>{row.total_obtained_marks}</TableCell>
                  <TableCell>{row.percentage}%</TableCell>
                  <TableCell>{row.grade}</TableCell>
                  <TableCell>{row.result}</TableCell>
                  {/* <TableCell>
                    <Button size="small" onClick={() => this.toggleRowExpansion(row.id)}>
                      {expandedRows[row.id] ? 'Hide' : 'Show'}
                    </Button>
                  </TableCell> */}
                </TableRow>
                {expandedRows[row.id] && (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <Table size="small" style={{ backgroundColor: '#f9f9f9' }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Subject</TableCell>
                            <TableCell>Marks</TableCell>
                            <TableCell>Max Marks</TableCell>
                            <TableCell>%</TableCell>
                            <TableCell>Result</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {row.subject_details.map((subj, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{subj.subject_name}</TableCell>
                              <TableCell>{subj.marks}</TableCell>
                              <TableCell>{subj.max_marks}</TableCell>
                              <TableCell>{subj.percentage}%</TableCell>
                              <TableCell>{subj.result}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  renderDetailedSubjectWiseReport = () => {
    const { reportData } = this.state;
    if (!reportData.length) return null;
  
    const subjectStats = {};
  
    reportData.forEach(student => {
      (student.subject_details || []).forEach(subj => {
        if (!subjectStats[subj.subject_name]) {
          subjectStats[subj.subject_name] = {
            totalMaxMarks: 0,
            totalObtainedMarks: 0,
            totalPercentage: 0,
            passCount: 0,
            failCount: 0,
            studentCount: 0,
          };
        }
        const stats = subjectStats[subj.subject_name];
        stats.totalMaxMarks += subj.max_marks || 0;
        stats.totalObtainedMarks += subj.marks || 0;
        stats.totalPercentage += subj.percentage || 0;
        if (subj.result && subj.result.toLowerCase() === 'pass') {
          stats.passCount += 1;
        } else {
          stats.failCount += 1;
        }
        stats.studentCount += 1;
      });
    });
  
    const detailedSubjectList = Object.entries(subjectStats).map(([subject, stats]) => ({
      subject,
      averageMaxMarks: (stats.totalMaxMarks / stats.studentCount).toFixed(2),
      averageObtainedMarks: (stats.totalObtainedMarks / stats.studentCount).toFixed(2),
      averagePercentage: (stats.totalPercentage / stats.studentCount).toFixed(2),
      passRate: ((stats.passCount / stats.studentCount) * 100).toFixed(2),
      passCount: stats.passCount,
      failCount: stats.failCount,
      studentCount: stats.studentCount,
    }));
  
    return (
      <Box mt={3} mb={3}>
        <Typography variant="h6" gutterBottom>
          Detailed Subject Wise Performance
        </Typography>
        <TableContainer component={Paper} style={{ width: '100%'}}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell align="right">Avg Max Marks</TableCell>
                <TableCell align="right">Avg Obtained Marks</TableCell>
                <TableCell align="right">Avg Percentage (%)</TableCell>
                <TableCell align="right">Pass Rate (%)</TableCell>
                <TableCell align="right">Passed Students</TableCell>
                <TableCell align="right">Failed Students</TableCell>
                <TableCell align="right">Total Students</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detailedSubjectList.map(subj => (
                <TableRow key={subj.subject}>
                  <TableCell>{subj.subject}</TableCell>
                  <TableCell align="right">{subj.averageMaxMarks}</TableCell>
                  <TableCell align="right">{subj.averageObtainedMarks}</TableCell>
                  <TableCell align="right">{subj.averagePercentage}</TableCell>
                  <TableCell align="right">{subj.passRate}</TableCell>
                  <TableCell align="right">{subj.passCount}</TableCell>
                  <TableCell align="right">{subj.failCount}</TableCell>
                  <TableCell align="right">{subj.studentCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };
  

  render() {
    const { reportTypes, activeTab, error, loading } = this.state

    return (
      <Box p={4}>
        <Typography variant="h4" gutterBottom>
          Advanced Exam Reports Dashboard
        </Typography>

        {/* Report Type Tabs */}
        <Paper style={{ marginBottom: 16 }}>
          <Tabs
            value={activeTab}
            onChange={this.handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            {reportTypes.map((type, index) => (
              <Tab
                key={index}
                icon={type.icon}
                label={type.label}
              />
            ))}
          </Tabs>
        </Paper>

        {/* Filters Section */}
        {this.renderFilterSection()}

        {/* Error Display */}
        {error.general && (
          <Box my={2} p={2} bgcolor="error.light" borderRadius={1}>
            <Typography color="error">{error.general}</Typography>
          </Box>
        )}

        {/* Loading */}
        {loading && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        )}

        {/* Summary Cards */}
        {this.renderSummaryCards()}

        {this.renderSubjectRanks()}

        {!loading && this.state.reportData.length > 0 && this.renderDetailedSubjectWiseReport()}

        {!loading && this.state.reportData.length > 0 && (
            <Box>
                <Typography variant="h6" gutterBottom>
                Report Results ({this.state.reportData.length} records)
                </Typography>

                {this.renderReportTable()}
            </Box>
        )}
      </Box>
    )
  }

  handleTabChange = (event, newValue) => {
    this.setState({ activeTab: newValue })
  }
}
