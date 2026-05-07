import React, { useEffect, useState } from "react";
import { withRouter } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  makeStyles,
  IconButton,
  Tooltip
} from "@material-ui/core";
import AddIcon from '@material-ui/icons/Add';
import RefreshIcon from '@material-ui/icons/Refresh';

import ReactApexChart from "react-apexcharts";
import MUIDataTable from "mui-datatables";

import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { options } from "Constants";

// --- MODERN STYLING ---
const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: "#F1F5F9", // Slate 100
    minHeight: "100vh",
    padding: theme.spacing(4),
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(3),
  },
  pageTitle: {
    fontWeight: 800,
    color: "#2c6bd0", // Slate 800
    letterSpacing: "-0.025em",
  },
  tabContainer: {
    marginBottom: theme.spacing(4),
    borderBottom: "1px solid #E2E8F0",
    "& .MuiTab-root": {
      fontWeight: 600,
      fontSize: "0.95rem",
      textTransform: "none",
      minWidth: 120,
    },
  },
  card: {
    borderRadius: 16,
    padding: theme.spacing(3),
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    transition: "transform 0.2s ease-in-out",
    height: "100%",
  },
  kpiCard: {
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  kpiLabel: {
    fontSize: "0.75rem",
    textTransform: "uppercase",
    fontWeight: 700,
    opacity: 0.8,
    marginBottom: theme.spacing(1),
  },
  kpiValue: {
    fontSize: "2.25rem",
    fontWeight: 800,
  },
  progressWrapper: {
    marginTop: theme.spacing(2),
  },
  progressBg: {
    height: 12,
    background: "#E2E8F0",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #10B981 0%, #34D399 100%)",
    borderRadius: 6,
    transition: "width 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  formControl: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: theme.spacing(3),
  }
}));

const ViewIdCardUpdates = () => {
  const classes = useStyles();
  const [yearList, setYearList] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardYear, setDashboardYear] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState("");

  // ---------------- INIT ----------------
  useEffect(() => {
    fetchYears();
  }, []);

  useEffect(() => {
    if (yearList.length > 0) {
      const latest = yearList[0];
      setDashboardYear(latest.id);
      getDashboardData(latest.id);
      fetchIdCardUpdates();
    }
  }, [yearList]);

  // ---------------- API ----------------
  const fetchYears = async () => {
    const res = await getRequest(GET_URL.academicyear.api);
    if (res?.data?.data) setYearList(res.data.data);
  };

  const fetchIdCardUpdates = async () => {
    const res = await getRequest(GET_URL.idcardupdates.api);
    if (res?.data?.data) setTableData(res.data.data);
  };

  const getDashboardData = async (year) => {
    const res = await getRequest(`${GET_URL.iddashboard.api}?academicyear=${year}`);
    if (res?.data) setDashboardData(res.data);
  };

  const completion = dashboardData?.total_students > 0
    ? Math.round((dashboardData.total_id_cards / dashboardData.total_students) * 100)
    : 0;

  // ---------------- CHARTS ----------------
  const pipelineChart = {
    series: [{
      name: "Students",
      data: [
        dashboardData?.not_started || 0,
        dashboardData?.photo_taken || 0,
        dashboardData?.printed || 0,
        dashboardData?.pending || 0
      ]
    }],
    options: {
      chart: { type: "bar", toolbar: { show: false } },
      colors: ["#6366F1", "#8B5CF6", "#EC4899", "#F59E0B"],
      plotOptions: { bar: { borderRadius: 8, columnWidth: "45%", distributed: true } },
      dataLabels: { enabled: false },
      legend: { show: false },
      xaxis: {
        categories: ["Not Started", "Photo Taken", "Printed", "Pending"],
        axisBorder: { show: false }
      },
      grid: { borderColor: "#f1f1f1" }
    }
  };

  const statusChart = {
    series: dashboardData?.status_counts?.map(i => i.count) || [],
    options: {
      labels: dashboardData?.status_counts?.map(i => i.status) || [],
      colors: ["#6366F1", "#10B981", "#F59E0B", "#EF4444"],
      legend: { position: "bottom", fontSize: '14px' },
      stroke: { width: 0 },
      plotOptions: { pie: { donut: { size: '70%' } } }
    }
  };

  // ---------------- ACTIONS ----------------
  const handleSubmit = async () => {
    const payload = { academic_year: selectedYear };
    const res = await postRequest(POST_URL.idcardupdates.api, [payload]);
    if (res) {
      fetchIdCardUpdates();
      setOpenDialog(false);
      setSelectedYear("");
    }
  };

  return (
    <Box className={classes.root}>
      {/* HEADER */}
      <div className={classes.header}>
        <Typography variant="h4" className={classes.pageTitle}>
          ID Card Analytics
        </Typography>
      </div>

      {/* TABS */}
      <Tabs
        value={tabValue}
        onChange={(e, v) => setTabValue(v)}
        className={classes.tabContainer}
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label="Analytics Overview" />
        <Tab label="Historical Logs" />
      </Tabs>

      <Box>
        {tabValue === 0 && dashboardData && (
          <Grid container spacing={3}>
            {/* YEAR SELECTOR */}
            <Grid item xs={12}>
              <FormControl variant="outlined" className={classes.formControl} style={{ minWidth: 250 }}>
                <InputLabel>Academic Year</InputLabel>
                <Select
                  value={dashboardYear}
                  onChange={(e) => {
                    setDashboardYear(e.target.value);
                    getDashboardData(e.target.value);
                  }}
                  label="Filter by Academic Year"
                >
                  {yearList.map((y) => (
                    <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* KPI ROW */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper className={`${classes.card} ${classes.kpiCard}`} style={{ background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)" }}>
                <Typography className={classes.kpiLabel}>Total Enrollment</Typography>
                <Typography className={classes.kpiValue}>{dashboardData.total_students}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper className={`${classes.card} ${classes.kpiCard}`} style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}>
                <Typography className={classes.kpiLabel}>Cards Processed</Typography>
                <Typography className={classes.kpiValue}>{dashboardData.total_id_cards}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper className={`${classes.card} ${classes.kpiCard}`} style={{ background: "linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)" }}>
                <Typography className={classes.kpiLabel}>Unprocessed</Typography>
                <Typography className={classes.kpiValue}>{dashboardData.not_started}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper className={`${classes.card} ${classes.kpiCard}`} style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}>
                <Typography className={classes.kpiLabel}>Efficiency</Typography>
                <Typography className={classes.kpiValue}>{completion}%</Typography>
              </Paper>
            </Grid>

            {/* CHARTS SECTION */}
            <Grid item xs={12} md={8}>
              <Paper className={classes.card}>
                <Typography variant="h6" style={{ fontWeight: 700, marginBottom: 16 }}>Workflow Pipeline</Typography>
                <ReactApexChart options={pipelineChart.options} series={pipelineChart.series} type="bar" height={320} />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper className={classes.card}>
                <Typography variant="h6" style={{ fontWeight: 700, marginBottom: 16 }}>Status Mix</Typography>
                <ReactApexChart options={statusChart.options} series={statusChart.series} type="donut" height={320} />
              </Paper>
            </Grid>

            {/* PROGRESS BAR CARD */}
            <Grid item xs={12}>
              <Paper className={classes.card}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" style={{ fontWeight: 700 }}>Overall Project Progress</Typography>
                  <Typography variant="h5" style={{ fontWeight: 800, color: "#10B981" }}>{completion}%</Typography>
                </Box>
                <div className={classes.progressWrapper}>
                  <div className={classes.progressBg}>
                    <div className={classes.progressFill} style={{ width: `${completion}%` }} />
                  </div>
                </div>
              </Paper>
            </Grid>

            {/* RECENT ACTIVITY TABLE */}
            <Grid item xs={12}>
              <Paper className={classes.card} style={{ padding: 0, overflow: 'hidden' }}>
                <MUIDataTable
                  title={<Typography variant="h6" style={{ fontWeight: 700, padding: '10px 0' }}>Live Update Feed</Typography>}
                  data={dashboardData.recent_updates}
                  columns={[
                    { name: "name", label: "Student Name" },
                    { name: "status", label: "Current Status" },
                    { name: "group_name", label: "Academic Group" },
                    { name: "print_count", label: "Print Iterations" }
                  ]}
                  options={{ 
                    selectableRows: "none", 
                    elevation: 0,
                    responsive: "standard"
                  }}
                />
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* HISTORY TAB */}
        {tabValue === 1 && (
          <Paper className={classes.card} style={{ padding: 0, overflow: 'hidden' }}>
            <MUIDataTable
              title="Audit Logs"
              data={tableData}
              columns={[
                { name: "group_name", label: "Group" },
                { name: "academic_year", label: "Year" },
                { name: "created", label: "Timestamp" },
                { name: "status", label: "Final Status" }
              ]}
              options={options}
            />
          </Paper>
        )}
      </Box>

      {/* CREATE DIALOG */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        PaperProps={{ style: { borderRadius: 16, padding: 8 } }}
      >
        <DialogTitle style={{ fontWeight: 800 }}>Start New Batch Update</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 20 }}>
            Select the academic year to generate new ID card records and track production status.
          </Typography>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Academic Year</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              label="Academic Year"
            >
              {yearList.map((y) => (
                <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions style={{ padding: 20 }}>
          <Button onClick={() => setOpenDialog(false)} color="secondary">Discard</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary" 
            disabled={!selectedYear}
            style={{ borderRadius: 8, backgroundColor: selectedYear ? '#6366F1' : '#CBD5E1' }}
          >
            Confirm & Initialize
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default withRouter(ViewIdCardUpdates);