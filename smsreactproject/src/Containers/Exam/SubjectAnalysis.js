import React from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from "@material-ui/core";
import Chart from "react-apexcharts";
import { getRequest } from "Includes/api/apicall";
import { withRouter } from "react-router-dom";
import { GET_URL } from "Includes/urls";

class SubjectAnalysisPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      subjectName: decodeURIComponent(props.match.params.subjectName || ""),
      loading: false,
      error: null,
      reportData: [],
      chartData: [],
      summary: {},
    };
  }

  componentDidMount() {
    this.fetchSubjectAnalysis();
  }

  fetchSubjectAnalysis = () => {
    const { subjectName } = this.state;
    if (!subjectName) {
      this.setState({ error: "Subject not specified." });
      return;
    }
    this.setState({ loading: true, error: null });

    // Request should include filters like academic year, exams etc, modify as needed
    getRequest(
      GET_URL.subjectAnalysis.api,
      { subject: subjectName },
      this.props
    )
      .then((res) => {
        if (res && res.status === 200) {
          this.setState({
            reportData: res.data.students || [],
            chartData: res.data.chart || [],
            summary: res.data.summary || {},
            loading: false,
          });
        } else {
          this.setState({
            error: "Failed to load subject analysis data.",
            loading: false,
          });
        }
      })
      .catch(() => {
        this.setState({
          error: "An error occurred while loading the data.",
          loading: false,
        });
      });
  };

  renderChart() {
    const { chartData } = this.state;
    if (!chartData || chartData.length === 0) return null;

    const categories = chartData.map((c) => c.exam_name || "");
    const studentScores = chartData.map((c) => c.student_score || 0);
    const classAverages = chartData.map((c) => c.class_average || 0);

    const options = {
      chart: {
        id: "subject-progress",
      },
      xaxis: {
        categories,
      },
      yaxis: {
        max: 100,
        title: {
          text: "Marks (%)",
        },
      },
      tooltip: {
        enabled: true,
      },
    };

    const series = [
      {
        name: "Student Score",
        data: studentScores,
      },
      {
        name: "Class Average",
        data: classAverages,
      },
    ];

    return (
      <Box mt={3} mb={3}>
        <Typography variant="h6">Progress Over Time</Typography>
        <Chart options={options} series={series} type="line" height={350} />
      </Box>
    );
  }

  render() {
    const { subjectName, loading, error, reportData, summary } = this.state;

    if (loading)
      return (
        <Box p={3} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      );
    if (error)
      return (
        <Box p={3}>
          <Typography color="error">{error}</Typography>
        </Box>
      );

    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Subject Analysis: {subjectName}
        </Typography>

        {/* Summary Info */}
        <Box mb={2}>
          <Typography>Average Marks: {summary.average_marks || "-"}</Typography>
          <Typography>Pass Rate: {summary.pass_rate ? `${summary.pass_rate}%` : "-"}</Typography>
          <Typography>Total Students Appeared: {summary.total_students || "-"}</Typography>
        </Box>

        {/* Chart */}
        {this.renderChart()}

        {/* Student Marks Table */}
        <Table component={Paper} size="small" aria-label="Student Marks">
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Exam</TableCell>
              <TableCell>Marks</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No data available.
                </TableCell>
              </TableRow>
            ) : (
              reportData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.student_name}</TableCell>
                  <TableCell>{row.exam_name}</TableCell>
                  <TableCell>{row.marks}</TableCell>
                  <TableCell>{row.grade}</TableCell>
                  <TableCell>{row.result}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>
    );
  }
}

export default withRouter(SubjectAnalysisPage);
