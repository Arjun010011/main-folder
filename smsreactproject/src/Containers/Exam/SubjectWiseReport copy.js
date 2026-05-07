import React, { Component } from 'react'
import {
  Paper,
  Box,
  Typography,
  Button,
  CircularProgress,
  Grid
} from '@material-ui/core'
import { getRequest } from 'Includes/api/apicall'
import { GET_URL } from 'Includes/urls'
import Chart from "react-apexcharts";
import { Dropdown } from "Components/DropDown";

export default class SubjectWiseReport extends Component {
  constructor(props) {
    super(props)
    this.state = {
      yearList: [],
      termList: [],
      examList: [],
      standardSectionList: [],
      subjectList: [],
      selectedYear: '',
      selectedTerm: '',
      selectedExam: '',
      selectedStandardSection: '',
      selectedSubject: '',
      loading: false,
      error: {},
      tableData: [],
      chartData: [],
    }
  }

  componentDidMount() {
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
    getRequest(GET_URL.examterms.api, { is_active: true }, this.props).then((res) => {
      if (res && res.status === 200) {
        this.setState({ termList: res.data.data, selectedTerm: '' })
      }
    })
  }

  fetchExamList = (yearId, termId) => {
    if (!yearId || !termId) return
    getRequest(GET_URL.exam.api, { academic_year: yearId, term: termId, is_active: true }, this.props).then((res) => {
      if (res && res.status === 200) {
        this.setState({ examList: res.data.data, selectedExam: '' })
      }
    })
  }

  fetchStandardSectionList = (examId) => {
    if (!examId) return
    getRequest(GET_URL.studentmarkclasssummary.api, { exam: examId, is_active: true }, this.props).then((res) => {
      if (res && res.status === 200) {
        this.setState({ standardSectionList: res.data.data })
      }
    })
  }

  fetchSubjectList = (standardSectionId) => {
    if (!standardSectionId) return
    getRequest(GET_URL.subjectsForStandardSection.api, { standard_section: standardSectionId }, this.props).then((res) => {
      if (res && res.status === 200) {
        this.setState({ subjectList: res.data.data })
      }
    })
  }

  fetchReport = () => {
    const { selectedYear, selectedTerm, selectedExam, selectedSubject, selectedStandardSection } = this.state

    if (!selectedYear || !selectedTerm || !selectedExam || !selectedSubject) {
      this.setState({ error: { general: 'Please select Year, Term, Exam, and Subject.' } })
      return
    }

    this.setState({ loading: true, error: {}, tableData: [], chartData: [] })

    let params = {
      academic_year: selectedYear,
      term: selectedTerm,
      exam: selectedExam,
      subject: selectedSubject,
    }

    // Include standard_section only if selected (optional filter)
    if (selectedStandardSection) {
      params.standard_section = selectedStandardSection
    }

    getRequest(GET_URL.subjectWiseReport.api, params, this.props)
      .then((res) => {
        if (res && res.status === 200) {
          const tableData = (res.data.table || []).map((row, idx) => ({
            id: row.id || idx,
            student: row.student,
            marks: row.marks,
            grade: row.grade,
            attendance: row.attendance,
            remarks: row.remarks,
          }))
          const chartData = res.data.chart || []
          this.setState({ tableData, chartData, loading: false })
        } else {
          this.setState({ error: { general: 'Failed to fetch report data.' }, loading: false })
        }
      })
      .catch((err) => {
        this.setState({ error: { general: 'Error fetching report data.' }, loading: false })
        console.error(err)
      })
  }

  onChange = (event) => {
    const { name, value } = event.target
    this.setState({ [name]: value, error: { ...this.state.error, [name]: '' } }, () => {
      if (name === 'selectedYear') {
        this.fetchTermList(value)
        this.setState({
          termList: [],
          examList: [],
          standardSectionList: [],
          subjectList: [],
          selectedTerm: '',
          selectedExam: '',
          selectedStandardSection: '',
          selectedSubject: '',
        })
      } else if (name === 'selectedTerm') {
        this.fetchExamList(this.state.selectedYear, value)
        this.setState({
          examList: [],
          standardSectionList: [],
          subjectList: [],
          selectedExam: '',
          selectedStandardSection: '',
          selectedSubject: '',
        })
      } else if (name === 'selectedExam') {
        this.fetchStandardSectionList(value)
        this.setState({
          standardSectionList: [],
          subjectList: [],
          selectedStandardSection: '',
          selectedSubject: '',
        })
      } else if (name === 'selectedStandardSection') {
        this.fetchSubjectList(value)
        this.setState({
          subjectList: [],
          selectedSubject: '',
        })
      }
    })
  }

  columns = [
    { field: 'id', headerName: 'ID', hide: true },
    { field: 'student', headerName: 'Student', width: 180 },
    { field: 'marks', headerName: 'Marks', width: 100 },
    { field: 'grade', headerName: 'Grade', width: 100 },
    { field: 'attendance', headerName: 'Attendance', width: 130 },
    { field: 'remarks', headerName: 'Remarks', width: 220 },
  ]

  render() {
    const {
      yearList,
      termList,
      examList,
      standardSectionList,
      subjectList,
      selectedYear,
      selectedTerm,
      selectedExam,
      selectedStandardSection,
      selectedSubject,
      loading,
      error,
      tableData,
      chartData,
    } = this.state

    return (
      <Box p={4}>
        <Typography variant="h4" gutterBottom>
          Subject-wise Report
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={16} mb={3}>
          <Grid item md={2} xs={12}>
            <Dropdown
              data={yearList}
              name="selectedYear"
              value={selectedYear}
              onChange={this.onChange}
              label="Academic Year"
              error={error.selectedYear}
              style="width-100"
              hideSelect={true}
            />
          </Grid>

          <Grid item md={2} xs={12}>
            <Dropdown
              data={termList}
              name="selectedTerm"
              value={selectedTerm}
              onChange={this.onChange}
              label="Term"
              error={error.selectedTerm}
              style="width-100"
              hideSelect={true}
              disabled={!selectedYear}
            />
          </Grid>

          <Grid item md={2} xs={12}>
            <Dropdown
              data={examList}
              name="selectedExam"
              customName="exam_type_name"
              value={selectedExam}
              onChange={this.onChange}
              label="Exam"
              error={error.selectedExam}
              style="width-100"
              hideSelect={true}
              disabled={!selectedTerm}
            />
          </Grid>

          {/* Optional filter */}
          <Grid item md={2} xs={12}>
            <Dropdown
              data={standardSectionList}
              name="selectedStandardSection"
              value={selectedStandardSection}
              onChange={this.onChange}
              label="Class/Section (Optional)"
              error={error.selectedStandardSection}
              style="width-100"
              hideSelect={true}
              disabled={!selectedExam}
            />
          </Grid>

          <Grid item md={2} xs={12}>
            <Dropdown
              data={subjectList}
              name="selectedSubject"
              value={selectedSubject}
              onChange={this.onChange}
              label="Subject"
              error={error.selectedSubject}
              style="width-100"
              hideSelect={true}
              disabled={!selectedStandardSection && !selectedExam} // allow subject if standardSection selected OR if no standardSection selected
            />
          </Grid>

          <Grid item md={2} xs={12} display="flex" alignItems="center">
            <Button variant="contained" onClick={this.fetchReport} disabled={loading}>
              Generate Report
            </Button>
          </Grid>
        </Box>

        {loading && (
          <Box my={4} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        )}

        {error.general && (
          <Box my={2} color="error.main">
            {error.general}
          </Box>
        )}

        {!loading && tableData.length > 0 && (
          <Paper sx={{ height: 400, width: '100%', mb: 4 }}>
            <Grid rows={tableData} columns={this.columns} pageSize={10} rowsPerPageOptions={[10]} disableSelectionOnClick />
          </Paper>
        )}

        {!loading && chartData.length > 0 && (
          <Box sx={{ width: '100%', height: 300 }}>
            <Chart
              options={{
                chart: {
                  id: 'subject-wise-bar',
                  toolbar: { show: true },
                },
                xaxis: {
                  categories: chartData.map((item) => item.student),
                  title: { text: 'Students' },
                },
                yaxis: {
                  title: { text: 'Marks' },
                  min: 0,
                  max: 100, // adjust if you have different max marks
                },
                tooltip: {
                  enabled: true,
                },
                plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
              }}
              series={[
                {
                  name: 'Marks',
                  data: chartData.map((item) => item.marks || 0),
                },
              ]}
              type="bar"
              height={300}
            />
          </Box>
        )}
      </Box>
    )
  }
}