import React, { useEffect, useState } from "react";
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Grid,
  Box,
  TextField
} from "@material-ui/core";
import { Dropdown } from "Components/DropDown";
import { DateRange } from "Components/DateRange";
import LoadingGif from "Components/LoadingGif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { withRouter } from "react-router-dom";
import {
  getCurrentAndPreviousAcademicYears,
  getKeyValueMap,
  dateFormat,
} from "Includes/functions";
import moment from "moment";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import { Chip } from "@material-ui/core";
import { green, orange, red } from "@material-ui/core/colors"
import jsPDF from "jspdf";
import "jspdf-autotable";
import ReactExport from "react-export-excel";
import "./styles.scss";

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ExcelFile.ExcelSheet;
const ExcelColumn = ExcelFile.ExcelColumn;

const StandardSectionSummaryReport = () => {
  const [year, setYear] = useState("");
  const [yearList, setYearList] = useState([]);
  const [dateRange, setDateRange] = useState({ minDate: "", maxDate: "" });
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(dateFormat(new Date(), "YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dateFormat(new Date(), "YYYY-MM-DD"));
  const [selectedDate, setSelectedDate] = useState(dateFormat(new Date(), "YYYY-MM-DD"));
  
  useEffect(() => {
    getAcademicYears();
  }, []);

  const getAcademicYears = () => {
    getRequest(GET_URL.getacademicyear.api, { is_active: true }).then((res) => {
      if (res?.status === 200) {
        const years = getCurrentAndPreviousAcademicYears(res.data.data);
        const start_map = getKeyValueMap(years, "id", "start_date");
        const end_map = getKeyValueMap(years, "id", "end_date");
        const defaultYear = years?.[0]?.id;
  
        const today = dateFormat(new Date(), "YYYY-MM-DD");
  
        setYearList(years);
        setYear(defaultYear);
        setDateRange({ minDate: start_map[defaultYear], maxDate: end_map[defaultYear] });
        setStartDate(today);
        setEndDate(today);
        getSummary(defaultYear, today, today); // send today's date as from_date and to_date
      }
    });
  };

  const getSummary = (academicYear, from_date, to_date) => {
    setLoading(true);
    const params = {
      academic_year: academicYear,
      from_date,
      to_date,
      standard_section_summary: 1,
    };
    getRequest(GET_URL.attendancedetail.api, params).then((res) => {
      if (res?.status === 200) {
        setSummaryData(res.data.data.data_list || []);
      }
      setLoading(false);
    });
  };

  const handlePdfDownload = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Section Wise Attendance Report", 14, 16);
    doc.setFontSize(11);
    doc.text(`Date: ${selectedDate}`, 14, 24);
  
    const tableColumn = [
      "Standard",
      "Section",
      "Total Boys",
      "Boys Present",
      "Total Girls",
      "Girls Present",
      "Overall %",
    ];
    const tableRows = [];
  
    summaryData.forEach((row) => {
      const totalBoys = Number(row.total_boys) || 0;
      const totalGirls = Number(row.total_girls) || 0;
      const boysPresent = Number(row.boys_present) || 0;
      const girlsPresent = Number(row.girls_present) || 0;
      const total = totalBoys + totalGirls;
      const present = boysPresent + girlsPresent;
      const expectedTotal = total * 2;
      const percentage =
        expectedTotal > 0 ? ((present / expectedTotal) * 100).toFixed(2) : "0.00";
  
      const rowData = [
        row.standard_name,
        row.section_name,
        totalBoys,
        boysPresent,
        totalGirls,
        girlsPresent,
        `${percentage}%`,
      ];
      tableRows.push(rowData);
    });
  
    doc.autoTable({
      startY: 28,
      head: [tableColumn],
      body: tableRows,
      styles: { fontSize: 10 },
    });
  
    doc.save(`Attendance_Summary_Report_${selectedDate}.pdf`);
  };

//   const handleDateRangeChange = (value) => {
//     setStartDate(value.start);
//     setEndDate(value.end);
//     getSummary(year, value.start, value.end);
//   };
    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        getSummary(year, newDate, newDate);
    };


  return (
    <Paper className={classNames("paper-background")} style={{ padding: "1.5rem", borderRadius: "12px" }}>
    <Grid container justifyContent="space-between" alignItems="center">
      <Grid item>
        <Box className="heading" style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
          Section Wise Attendance Report
        </Box>
      </Grid>
    </Grid>
  
    {/* Filters */}
    <Grid container spacing={3} style={{ marginBottom: "1.5rem" }}>
      <Grid item xs={12} md={3}>
        <Dropdown
          data={yearList}
          name="year"
          value={year}
          label="Academic Year"
          hideSelect={true}
          onChange={(e) => {
            const y = e.target.value;
            setYear(y);
            const start = getKeyValueMap(yearList, "id", "start_date")[y];
            const end = getKeyValueMap(yearList, "id", "end_date")[y];
            setDateRange({ minDate: start, maxDate: end });
            getSummary(y, selectedDate, selectedDate);
          }}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <TextField
          label="Select Date"
          type="date"
          variant="outlined"
          fullWidth
          size="medium"
          value={selectedDate}
          onChange={handleDateChange}
          inputProps={{
            min: dateRange.minDate,
            max: dateRange.maxDate,
          }}
        />
      </Grid>
    </Grid>
  
    {/* Report Table */}
    {loading ? (
      <LoadingGif />
    ) : (
      <Box style={{ overflowX: "auto" }}>
        <Grid container justifyContent="flex-end">
          <Grid item xs={12} md={12}>
            <Box mb={2}>
              <ExcelFile
                filename={`Attendance_Summary_${selectedDate}`}
                element={<button className="custom-button">Download Excel</button>}
              >
                <ExcelSheet data={summaryData} name="Attendance Summary">
                  <ExcelColumn label="Standard" value="standard_name" />
                  <ExcelColumn label="Section" value="section_name" />
                  <ExcelColumn label="Total Boys" value="total_boys" />
                  <ExcelColumn label="Boys Present" value="boys_present" />
                  <ExcelColumn label="Total Girls" value="total_girls" />
                  <ExcelColumn label="Girls Present" value="girls_present" />
                </ExcelSheet>
              </ExcelFile> &nbsp; &nbsp;
              <button className="custom-button" onClick={handlePdfDownload}>
                Download PDF
              </button>
            </Box>
          </Grid>
        </Grid>
        <Table style={{ minWidth: "800px", borderRadius: "8px", overflow: "hidden" }}>
            <TableHead style={{ backgroundColor: "#3f51b5" }}>
                <TableRow>
                <TableCell style={{ color: "#fff", fontWeight: "bold" }}>Standard</TableCell>
                <TableCell style={{ color: "#fff", fontWeight: "bold" }}>Section</TableCell>
                <TableCell style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>Total Boys</TableCell>
                <TableCell style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>Boys Present</TableCell>
                <TableCell style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>Total Girls</TableCell>
                <TableCell style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>Girls Present</TableCell>
                <TableCell style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>Overall %</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {summaryData.map((row, index) => {
                const totalBoys = Number(row.total_boys) || 0;
                const totalGirls = Number(row.total_girls) || 0;
                const boysPresent = Number(row.boys_present) || 0;
                const girlsPresent = Number(row.girls_present) || 0;

                const total = totalBoys + totalGirls;
                const present = boysPresent + girlsPresent;
                const sessionsPerDay = 2;
                const expectedTotal = total * sessionsPerDay;

                let percentage = "0.00";
                if (expectedTotal > 0 && !isNaN(present)) {
                    percentage = ((present / expectedTotal) * 100).toFixed(2);
                }

                // Color-coded chip
                let chipColor = "default";
                if (percentage >= 90) chipColor = "primary";
                else if (percentage >= 75) chipColor = "secondary";
                else chipColor = "default";

                const getChipStyle = () => {
                    if (percentage >= 90) return { backgroundColor: green[500], color: "#fff" };
                    if (percentage >= 75) return { backgroundColor: orange[500], color: "#fff" };
                    return { backgroundColor: red[400], color: "#fff" };
                };

                return (
                    <TableRow
                    key={index}
                    style={{
                        backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#fff",
                        transition: "all 0.2s",
                    }}
                    hover
                    >
                    <TableCell>{row.standard_name}</TableCell>
                    <TableCell>{row.section_name}</TableCell>
                    <TableCell align="center">{totalBoys}</TableCell>
                    <TableCell align="center">{boysPresent}</TableCell>
                    <TableCell align="center">{totalGirls}</TableCell>
                    <TableCell align="center">{girlsPresent}</TableCell>
                    <TableCell align="center">
                        <Chip label={`${percentage}%`} size="small" style={getChipStyle()} />
                    </TableCell>
                    </TableRow>
                );
                })}
            </TableBody>
            </Table>
      </Box>
    )}
  </Paper>
  
  );
};

export default withRouter(StandardSectionSummaryReport);
