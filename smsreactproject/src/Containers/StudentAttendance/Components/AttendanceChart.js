import React, { useRef, useEffect, useState } from "react";
import { Paper, CircularProgress,Grid } from "@material-ui/core";
import { Dropdown } from "Components/DropDown";
import LoadingGif from "Components/LoadingGif";
import { getUrlParam, dateFormat, validateDate } from "Includes/functions";
import { POST_URL,GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";
import Chart from "react-apexcharts";
import { minDate } from "Constants";
import { KeyboardDatePicker, MuiPickersUtilsProvider } from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { postRequest } from "Includes/api/apicall";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import _ from "lodash";

const defaultChartOptions = {
  chart: {
    id: "Attendance_List",
    height: 350,
    type: "bar",
    stacked: true,
    events: {},
  },
  stroke: {
    width: 1,
    colors: ["#fff"],
  },
  dataLabels: {
    formatter: (val) => val,
  },
  plotOptions: {
    bar: {
      columnWidth: "70%",
      horizontal: false,
      dataLabels: {
        total: {
          enabled: true,
          offsetX: 0,
          style: {
            fontSize: "13px",
            fontWeight: 900,
          },
        },
      },
    },
  },
  xaxis: {
    labels: {
      formatter: (val) => val.name,
    },
    categories: [],
    position: "top",
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
    crosshairs: {
      fill: {
        type: "gradient",
        gradient: {
          colorFrom: "#D8E3F0",
          colorTo: "#BED1E6",
          stops: [0, 100],
          opacityFrom: 0.4,
          opacityTo: 0.5,
        },
      },
    },
    tooltip: {
      enabled: true,
    },
  },
  fill: {
    opacity: 1,
  },
  yaxis: {
    labels: {
      formatter: (val) => val,
    },
  },
  legend: {
    position: "top",
    horizontalAlign: "left",
  },
}

export default function UsersActiveList(props) {
  const [loading, setLoading] = useState(true);
  const [loadingApi, setLoadingApi] = useState(true);
  const [selecteddate, setSelecteddate] = useState(new Date());
  const [subject, setSelectedsubject] = useState();
  const [subjectList, setSubjectList] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [series, set_series] = useState([]);
  const [options, set_options] = useState();

  const selectedDateRef = useRef(selecteddate);

  useEffect(() => {
    selectedDateRef.current = selecteddate;
  }, [selecteddate]);

  useEffect(() => {
    getSubjectList();
  }, []);

  useEffect(() => {
    let isMounted = true; // Track if component is still mounted
  
    const fetchData = async () => {
      const error = validateDate(selecteddate, minDate, new Date());
      let response = {}
      if (error) {
        if (isMounted) {
          setErrorMessage(error);
        }
        return;
      } else {
        if (isMounted) {
          setErrorMessage("");
          setLoadingApi(true);
        }
      }
  
      let post_data = {
        filters: {
          academic_year: props.year,
          for_date: dateFormat(selecteddate, "YYYY-MM-DD"),
        },
      };


      if (subject) {
        post_data['filters']['subject'] = subject
        response = await postRequest(POST_URL.studentsubjectattendancereport.api, post_data, props);
      }
      else if (!props.is_subject_graph){
      response = await postRequest(POST_URL.studentattendancereport.api, post_data, props);
      }
      else{
        isMounted=false;
        set_series([]);
        set_options([]);
        setLoading(false);
      }
  
      if (isMounted) {
        if (response?.status === 200) {
          const updated_series = [];
          const section_list = {};
          const standard_list = [];
  
          response.data.data.forEach((data) => {
            const temp_count = { unmarked: 0, present: 0, absent: 0 };
  
            data.sections.forEach((secData) => {
              if (secData.is_unmarked) temp_count.unmarked += secData.strength;
              temp_count.present += secData.total_present;
              temp_count.absent += secData.total_absent;
            });
  
            if (!section_list["Un Marked"]) {
              section_list["Un Marked"] = { name: "Un Marked", data: [] };
              section_list["Present"] = { name: "Present", data: [] };
              section_list["Absent"] = { name: "Absent", data: [] };
            }
  
            section_list["Un Marked"].data.push(temp_count.unmarked);
            section_list["Present"].data.push(temp_count.present);
            section_list["Absent"].data.push(temp_count.absent);
            standard_list.push({ name: data.name, id: data.id });
          });
  
          Object.keys(section_list).forEach((key) => {
            updated_series.push(section_list[key]);
          });
  
          const newOptions = _.cloneDeep(defaultChartOptions);
          newOptions.xaxis.categories = standard_list;
          newOptions.chart.events = {
            dataPointSelection: (event, chartContext, config) => {
              const selectedAttendanceStatus = updated_series[config.seriesIndex]?.name;
              const selectedStandard = standard_list[config.dataPointIndex];
              if (selectedAttendanceStatus && selectedStandard) {
                props.handleShowChart(selectedStandard, selecteddate, selectedAttendanceStatus);
              }
            },
          };
  
          set_series(updated_series);
          set_options(newOptions);
        }
  
        setLoading(false);
        setLoadingApi(false);
      }
    };
  
    fetchData();
  
    return () => {
      isMounted = false;
    };
  }, [selecteddate]);

  useEffect(() => {
    if (subject) {
    let isMounted = true; // Track if component is still mounted
  
    const fetchData = async () => {
      const error = validateDate(selecteddate, minDate, new Date());
      let response = {}
      if (error) {
        if (isMounted) {
          setErrorMessage(error);
        }
        return;
      } else {
        if (isMounted) {
          setErrorMessage("");
          setLoadingApi(true);
        }
      }
  
      let post_data = {
        filters: {
          academic_year: props.year,
          for_date: dateFormat(selecteddate, "YYYY-MM-DD"),
        },
      };


      if (subject) {
        post_data['filters']['subject'] = subject
        response = await postRequest(POST_URL.studentsubjectattendancereport.api, post_data, props);
      }
      else{
      isMounted=false;
      set_series([]);
      set_options([]);
      }
  
      if (isMounted) {
        if (response?.status === 200) {
          const updated_series = [];
          const section_list = {};
          const standard_list = [];
  
          response.data.data.forEach((data) => {
            const temp_count = { unmarked: 0, present: 0, absent: 0 };
  
            data.sections.forEach((secData) => {
              if (secData.is_unmarked) temp_count.unmarked += secData.strength;
              temp_count.present += secData.total_present;
              temp_count.absent += secData.total_absent;
            });
  
            if (!section_list["Un Marked"]) {
              section_list["Un Marked"] = { name: "Un Marked", data: [] };
              section_list["Present"] = { name: "Present", data: [] };
              section_list["Absent"] = { name: "Absent", data: [] };
            }
  
            section_list["Un Marked"].data.push(temp_count.unmarked);
            section_list["Present"].data.push(temp_count.present);
            section_list["Absent"].data.push(temp_count.absent);
            standard_list.push({ name: data.name, id: data.id });
          });
  
          Object.keys(section_list).forEach((key) => {
            updated_series.push(section_list[key]);
          });
  
          const newOptions = _.cloneDeep(defaultChartOptions);
          newOptions.xaxis.categories = standard_list;
          newOptions.chart.events = {
            dataPointSelection: (event, chartContext, config) => {
              const selectedAttendanceStatus = updated_series[config.seriesIndex]?.name;
              const selectedStandard = standard_list[config.dataPointIndex];
              if (selectedAttendanceStatus && selectedStandard) {
                props.handleShowChart(selectedStandard, selecteddate, selectedAttendanceStatus);
              }
            },
          };
  
          set_series(updated_series);
          set_options(newOptions);
        }
  
        setLoading(false);
        setLoadingApi(false);
      }
    };
  
    fetchData();
  
    return () => {
      isMounted = false;
    };}
  }, [subject]);

  const getSubjectList = () => {
    const url = GET_URL.subject.api;
    let params = { is_active: true };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        const subjectList = response.data.data;
        setSubjectList(() => subjectList);
      }
    });
  };

  if (loading) {
    return <LoadingGif />;
  } else {
    return (
      <>
        <div className="width-250-px mt-20">
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <KeyboardDatePicker
              autoOk
              size="small"
              variant="inline"
              inputVariant="outlined"
              label={<FormattedMessage {...commonMessages.date} />}
              fullWidth
              name="start_date"
              minDate={minDate}
              maxDate={new Date()}
              format="dd-MM-yyyy"
              value={selecteddate}
              onChange={(e) => setSelecteddate(e)}
              KeyboardButtonProps={{
                "aria-label": "change date",
              }}
              helperText={errorMessage}
              error={Boolean(errorMessage)}
            />
          </MuiPickersUtilsProvider>
          { props.is_subject_graph && (
          <Grid item lg={3} md={4} xs={6} style={{marginTop: '1rem'}}>
            <Dropdown
              data={subjectList}
              name="subject"
              value={subject}
              hideSelect={true}
              onChange={(e) => setSelectedsubject(e.target.value)}
              label="Subject"
              size={"small"}
            />
          </Grid>)
        }   
        </div>
        <Paper className="mt-20 p-10" style={{ height: "62vh" }}>
          {loadingApi ? (
            <div className="loading">
              <CircularProgress />
            </div>
          ) : (
            <Chart options={options} series={series} type="bar" width="100%" height="100%" />
          )}
        </Paper>
      </>
    );
  }
}
