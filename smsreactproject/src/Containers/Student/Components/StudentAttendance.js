import React, { useEffect, useState } from "react";
import { withRouter } from "react-router-dom";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { Box, Select, MenuItem } from "@material-ui/core";
// import Calendar from "react-calendar";
// import "react-calendar/dist/Calendar.css";
import { format, parseISO, addMonths } from "date-fns";
import './StudentAttendance.css';

function StudentAttendance({ studentId }) {

  const [standardList, setStandardList] = useState([]);
  const [selectedYearItem, setSelectedYearItem] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [holidays, setHolidays] = useState({});
  const [report, setReport] = useState(null);

  useEffect(() => {
    const fetchStandardInfo = async () => {
      if (!studentId) return;

      try {
        const url = GET_URL.getmystandard1.api;
        const response = await getRequest(url, { student_id: studentId });
        if (response?.status === 200) {
          setStandardList(response.data?.data || []);
        }
      } catch (error) {
        console.error("Error fetching student standard info:", error);
      }
    };

    fetchStandardInfo();
  }, [studentId]);

  const handleYearChange = (event) => {
    const selectedId = parseInt(event.target.value);
    const selectedItem = standardList.find((item) => item.academic_year === selectedId);

    if (selectedItem) {
      setSelectedYearItem(selectedItem);
      setStartDate(parseISO(selectedItem.academic_year_start_date));
      setEndDate(parseISO(selectedItem.academic_year_end_date));
      fetchAttendance(studentId, selectedItem.academic_year);
    }
  };

  const fetchAttendance = async (studentId, academicYear) => {
    if (!studentId || !academicYear) return;
    try {
      const attendanceUrl = `${GET_URL.studentattendanceindividual.api}${studentId}/?academic_year=${academicYear}`;
      const response = await getRequest(attendanceUrl, {});
      if (response?.status === 200) {
        setAttendance(response.data.data || []);
        setHolidays(response.data.holiday_list || {});
        setReport(response.data.report);
      }
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    }
  };

  const getAttendanceColor = (date) => {
    const dateString = date.toISOString().split("T")[0];
    const record = attendance.find((entry) => entry.for_date === dateString);
    if (holidays && holidays[dateString]) {
      return "holiday";
    }
    if (!record) return "unmarked";
    if (record.session_1_status === "present" && record.session_2_status === "present") return "full-present";
    if (record.session_1_status === "absent" && record.session_2_status === "absent") return "full-absent";
    if (
      (record.session_1_status === "present" && record.session_2_status === "absent") ||
      (record.session_1_status === "absent" && record.session_2_status === "present")
    ) return "partial";

    return "unmarked";
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "#f9f9f9", minHeight: "100vh" }}>
      <Box sx={{ width: "100%", maxWidth: "300px" }}>
        <Select fullWidth value={selectedYearItem?.academic_year || ""} onChange={handleYearChange} displayEmpty>
          <MenuItem value="" disabled>Select Standard</MenuItem>
          {standardList.reverse().map((item) => (
             <MenuItem key={item.academic_year} value={item.academic_year}>
             {item.standard_name} 
           </MenuItem>
          ))}
        </Select>
      </Box>
      <br />

      {report && (
        <div className="attendance-summary-container">
          <div className="attendance-summary" >
            <p><strong>Total Present Days:</strong> {report.total_present_days}</p>
            <p><strong>Total Absent Days:</strong> {report.total_absent_days}</p>
            <p><strong>Unmarked Days:</strong> {report.total_unmarked_days}</p>
            <p><strong>Attendance Percentage:</strong> {report.percentage.toFixed(2)}%</p>
          </div>
          <div className="attendance-legend" style={{ flex: 1 }}>
            <p><span className="legend-box full-present"></span> Present</p>
            <p><span className="legend-box full-absent"></span> Absent</p>
            <p><span className="legend-box partial"></span> Partial</p>
            <p><span className="legend-box holiday"></span> Holiday</p>
          </div>
        </div>
      )}

      {/* {selectedYearItem && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "80px", justifyContent: "center", alignItems: "center" }}>
          {(() => {
            const calendars = [];
            let monthDate = new Date(startDate);
            while (monthDate <= endDate) {
              calendars.push(
                <div key={monthDate} style={{ textAlign: "center", flex: "0 1 calc(30% - 20px)" }}>
                  <br />
                  <div className="calendar-container">
                    <Calendar
                      minDate={startDate}
                      maxDate={endDate}
                      tileClassName={({ date }) => getAttendanceColor(date)}
                      activeStartDate={monthDate}
                      defaultView="month"
                      showNeighboringMonth={false}
                      navigationLabel={({ date }) => (
                        <span style={{ fontSize: "15px", fontWeight: "bold" }}>{format(date, "MMMM yyyy")}</span>
                      )}
                    />
                  </div>
                </div>
              );
              monthDate = addMonths(monthDate, 1);
            }
            return calendars;
          })()}
        </div>
      )} */}
    </div>
  );
}

export default withRouter(StudentAttendance);