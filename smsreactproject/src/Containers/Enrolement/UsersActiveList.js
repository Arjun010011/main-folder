import React, { useRef, useEffect } from "react";
import { Paper, Box, Grid, CircularProgress, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab } from "@material-ui/core";
import LoadingGif from "Components/LoadingGif";
import { Actions } from "Constants/permissions";
import { getUrlParam, dateFormat } from "Includes/functions";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import Highcharts from "highcharts";
import { DateRange } from "Components/DateRange";
import ActiveUserListModal from "./Components/ActiveUserListModal";
import moment from "moment";
import { FROM_ACTIVE_USER_TYPE } from "Constants";
import { DropDownWithSearch } from "Components/DropDownWithSearch";

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

export default function UsersActiveList(props) {
  const [loading, setLoading] = React.useState(true);
  const [loadingApi, setLoadingApi] = React.useState(true);
  const [openUserDetail, setOpenUserDetail] = React.useState(false);
  const [selected_from, set_selected_from] = React.useState();
  const [selected_details, set_selected_details] = React.useState({});
  const [series, set_series] = React.useState([]);
  const [categories, set_categories] = React.useState([]);
  const [chartReady, setChartReady] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [tabValue, setTabValue] = React.useState(0);
  const [loggedInUserList, setLoggedInUserList] = React.useState([]);
  const [notLoggedInUserList, setNotLoggedInUserList] = React.useState([]);
  const [loggedInListsLoading, setLoggedInListsLoading] = React.useState(false);
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Active Users tab: only Active Users and Inactive/In Active Users series + Total column
  const activeTabSeries = React.useMemo(() => {
    if (!series || !Array.isArray(series)) return [];
    const filtered = series.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const isActive = (name.includes("active") && !name.includes("inactive") && !name.includes("in active"));
      const isInactive = name.includes("inactive") || name.includes("in active");
      return isActive || isInactive;
    });
    // Order: Active first, then Inactive
    return filtered.sort((a, b) => {
      const aName = (a.name || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();
      const aInactive = aName.includes("inactive") || aName.includes("in active");
      const bInactive = bName.includes("inactive") || bName.includes("in active");
      if (aInactive === bInactive) return 0;
      return aInactive ? 1 : -1;
    });
  }, [series]);

  // Logged in Users tab: only Total Logged in Users and Total Not Logged in Users series (same report data as Active Users)
  const loggedInTabSeries = React.useMemo(() => {
    if (!series || !Array.isArray(series)) return [];
    const filtered = series.filter((s) => {
      const name = (s.name || "").toLowerCase();
      return name.includes("logged in") || name.includes("not logged");
    });
    return filtered.sort((a, b) => {
      const aName = (a.name || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();
      const aNotLogged = aName.includes("not logged");
      const bNotLogged = bName.includes("not logged");
      if (aNotLogged === bNotLogged) return 0;
      return aNotLogged ? 1 : -1;
    });
  }, [series]);

  // Compute total logged in / not logged in from series (for Logged in Users tab summary cards)
  const loggedInTotals = React.useMemo(() => {
    if (!series || !Array.isArray(series) || series.length === 0) return { loggedIn: 0, notLoggedIn: 0 };
    let loggedIn = 0;
    let notLoggedIn = 0;
    series.forEach((s) => {
      const name = (s.name || "").toLowerCase();
      const dataSum = (Array.isArray(s.data) ? s.data : []).reduce((sum, val) => sum + (Number(val) || 0), 0);
      // Match "Total Not Logged in" / "Not Logged in" / "In Active" first
      if (name.includes("not logged") || name.includes("inactive") || name.includes("in active")) {
        notLoggedIn += dataSum;
      } else if (name.includes("logged in") || name.includes("active users")) {
        loggedIn += dataSum;
      }
    });
    return { loggedIn, notLoggedIn };
  }, [series]);

  const handlePointClick = React.useCallback((event) => {
    try {
      const point = event.point || event;
      const seriesIndex = point.series ? point.series.index : (event.seriesIndex !== undefined ? event.seriesIndex : 0);
      const dataIndex = point.index !== undefined ? point.index : (event.dataIndex !== undefined ? event.dataIndex : 0);
      
      console.log("Chart point clicked - Series Index:", seriesIndex, "Data Index:", dataIndex);
      
      set_selected_details({
        dataIndex: dataIndex,
        seriesIndex: seriesIndex,
      });
      setOpenUserDetail(true);
    } catch (error) {
      console.error("Error handling point click:", error);
    }
  }, []);

  React.useEffect(() => {
    try {
      let { selected } = getUrlParam();
      if (selected) {
        set_selected_from({ id: selected, name: selected });
        setLoading(false);
      } else {
        set_selected_from({ id: "Today", name: "Today" });
        setLoading(false);
      }
    } catch (error) {
      console.error("Error parsing URL params:", error);
      set_selected_from({ id: "Today", name: "Today" });
      setLoading(false);
    }
  }, []);

  const getUserReport = () => {
    if (selected_from) {
      console.log("Fetching user report with params:", { selected_from, dateTime: getDateTime() });
      setLoadingApi(true);
      setChartReady(false);
      const url = GET_URL.userreport.api;
      const params = {
        user_last_activity_from_date_time: getDateTime(),
      };
      console.log("API URL:", url, "Params:", params);
  
      getRequest(url, params, props).then((response) => {
        console.log("API Response:", response);
        if (response && response.status === 200) {
          try {
            // The response.data is the actual data object
            const responseData = response.data || {};
            console.log("Response data:", responseData);
            
            // Try multiple possible paths for the data
            const newCategories = (responseData?.standard_categories && Array.isArray(responseData.standard_categories)) 
              ? responseData.standard_categories 
              : (responseData?.data?.standard_categories && Array.isArray(responseData.data.standard_categories))
              ? responseData.data.standard_categories
              : [];
              
            const newSeries = (responseData?.standard_report_series && Array.isArray(responseData.standard_report_series))
              ? responseData.standard_report_series
              : (responseData?.data?.standard_report_series && Array.isArray(responseData.data.standard_report_series))
              ? responseData.data.standard_report_series
              : [];
            
            console.log("Categories:", newCategories);
            console.log("Series:", newSeries);
            
            if (!Array.isArray(newCategories) || !Array.isArray(newSeries)) {
              console.warn("Invalid chart data - Categories:", newCategories, "Series:", newSeries);
              set_series([]);
              set_categories([]);
              setLoadingApi(false);
              return;
            }
            
            if (newCategories.length === 0 || newSeries.length === 0) {
              console.warn("Empty chart data - Categories:", newCategories.length, "Series:", newSeries.length);
              set_series([]);
              set_categories([]);
              setLoadingApi(false);
              return;
            }
            
            // Convert ApexCharts series format to Highcharts format
            const highchartsSeries = newSeries.map((seriesItem) => {
              // Ensure data is an array
              const seriesData = Array.isArray(seriesItem.data) ? seriesItem.data : [];
              return {
                name: seriesItem.name || '',
                data: seriesData,
                stack: 'stack1'
              };
            });
    
            console.log("Setting chart data - Categories:", newCategories.length, "Series:", highchartsSeries.length);
            console.log("Highcharts series:", highchartsSeries);
            set_categories(newCategories);
            set_series(highchartsSeries);
            setChartReady(true);
            // Set a timeout to show table if chart doesn't render
            setTimeout(() => {
              if (!chartInstanceRef.current) {
                console.log("Chart not rendered, showing table instead");
                setShowTable(true);
              }
            }, 2000);
          } catch (error) {
            console.error("Error processing chart data:", error, error.stack);
            set_series([]);
            set_categories([]);
            setChartReady(false);
          }
        } else {
          console.warn("API response status not 200:", response?.status);
          set_series([]);
          set_categories([]);
          setChartReady(false);
        }
  
        setLoadingApi(false);
      }).catch((error) => {
        console.error("Error fetching user report:", error);
        set_series([]);
        set_categories([]);
        setChartReady(false);
        setLoadingApi(false);
      });
    }
  };

  // Render Highcharts chart (Active Users tab: only Active + Inactive series)
  useEffect(() => {
    console.log("Chart render effect - chartReady:", chartReady, "activeTabSeries.length:", activeTabSeries.length, "categories.length:", categories.length);
    
    if (chartReady && activeTabSeries.length > 0 && categories.length > 0 && chartContainerRef.current) {
      // Destroy existing chart if it exists
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }

      // Wait for container to be properly rendered
      const renderChart = () => {
        if (!chartContainerRef.current) {
          console.warn("Chart container not available");
          return;
        }
        
        // Calculate chart height based on container
        let containerHeight = chartContainerRef.current.offsetHeight;
        if (!containerHeight || containerHeight === 0) {
          containerHeight = chartContainerRef.current.clientHeight;
        }
        if (!containerHeight || containerHeight === 0) {
          // Fallback to calculated height based on viewport
          containerHeight = Math.floor(window.innerHeight * 0.6);
        }
        if (!containerHeight || containerHeight === 0) {
          containerHeight = 500; // Default fallback
        }
        
        // Ensure minimum height
        const finalHeight = Math.max(containerHeight, 500);
        
        console.log("Rendering chart - Container height:", containerHeight, "Final height:", finalHeight, "Categories:", categories.length, "Series:", series.length);

        try {
          // Create new Highcharts chart
          chartInstanceRef.current = Highcharts.chart(chartContainerRef.current, {
            chart: {
              type: 'column',
              height: finalHeight,
              width: null, // Use container width
              reflow: true,
              events: {
                load: function() {
                  // Chart loaded successfully
                  console.log("Highcharts chart loaded successfully");
                },
                render: function() {
                  console.log("Highcharts chart rendered");
                  setShowTable(false); // Hide table if chart renders successfully
                }
              }
            },
            title: {
              text: ''
            },
            xAxis: {
              categories: categories,
              labels: {
                rotation: -45,
                style: {
                  fontSize: '12px'
                }
              }
            },
            yAxis: {
              min: 0,
              title: {
                text: ''
              },
              stackLabels: {
                enabled: true,
                style: {
                  fontWeight: 'bold',
                  color: '#333'
                }
              }
            },
            legend: {
              align: 'left',
              x: 70,
              verticalAlign: 'top',
              y: 0,
              floating: true,
              backgroundColor: 'rgba(255,255,255,0.25)',
              shadow: false
            },
            tooltip: {
              headerFormat: '<b>{point.x}</b><br/>',
              pointFormat: '{series.name}: {point.y}<br/>Total: {point.stackTotal}'
            },
            plotOptions: {
              column: {
                stacking: 'normal',
                dataLabels: {
                  enabled: true,
                  color: '#000',
                  style: {
                    textOutline: '1px contrast',
                    fontSize: '11px'
                  }
                },
            point: {
              events: {
                click: function(event) {
                  console.log("Highcharts point click event:", event);
                  const point = this;
                  const seriesIndex = point.series.index;
                  const dataIndex = point.index;
                  
                  console.log("Extracted - Series Index:", seriesIndex, "Data Index:", dataIndex, "Category:", categories[dataIndex]);
                  
                  if (handlePointClick) {
                    // Pass the point data directly
                    handlePointClick({
                      point: point,
                      seriesIndex: seriesIndex,
                      dataIndex: dataIndex
                    });
                  }
                }
              },
              cursor: 'pointer'
            }
              }
            },
            colors: ['#04AA6D', '#ff9c9c', '#008FFB', '#ff0000'],
            series: activeTabSeries,
            credits: {
              enabled: false
            }
          });
        } catch (error) {
          console.error("Error creating Highcharts chart:", error);
        }
      };

      // Use requestAnimationFrame and setTimeout to ensure DOM is ready
      let timeoutId, timeoutId2;
      
      const renderWithDelay = () => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (chartContainerRef.current && !chartInstanceRef.current) {
              renderChart();
            }
          }, 100);
        });
      };
      
      renderWithDelay();
      
      // Also try rendering after a longer delay in case container needs more time
      timeoutId = setTimeout(() => {
        if (!chartInstanceRef.current && chartContainerRef.current) {
          console.log("Retrying chart render after delay");
          renderChart();
        }
      }, 500);
      
      // One more retry after a longer delay
      timeoutId2 = setTimeout(() => {
        if (!chartInstanceRef.current && chartContainerRef.current) {
          console.log("Final retry for chart render");
          renderChart();
        }
      }, 1000);
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (timeoutId2) clearTimeout(timeoutId2);
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }
      };
    } else {
      console.log("Chart not ready - chartReady:", chartReady, "activeTabSeries.length:", activeTabSeries.length, "categories.length:", categories.length, "container:", !!chartContainerRef.current);
    }

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [chartReady, series, categories, activeTabSeries, handlePointClick]);

  // Handle window resize for chart responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (chartInstanceRef.current && chartContainerRef.current) {
        const containerHeight = chartContainerRef.current.offsetHeight || 400;
        chartInstanceRef.current.setSize(null, containerHeight, false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chartReady]);

  const getDateTime = () => {
    try {
      let new_date = new Date();
      new_date.setHours(0, 0, 0, 0);
      if (!selected_from || !selected_from.id) {
        return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
      }
      
      if (selected_from.id === "Today") {
        return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
      } else if (selected_from.id === "This Week") {
        new_date = new Date(new_date.setDate(new_date.getDate() - 7));
        return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
      } else if (selected_from.id === "This Month") {
        new_date = new Date(new_date.getFullYear(), new_date.getMonth(), 1);
        return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
      } else if (selected_from.id === "This Academic Year") {
        let start_year_date = user?.other_details?.academic_year?.start_date;
        if (start_year_date) {
          return dateFormat(start_year_date, "YYYY-MM-DD HH:mm:ss");
        }
        // Fallback to current date if academic year not available
        return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
      }
      // Default fallback
      return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
    } catch (error) {
      console.error("Error in getDateTime:", error);
      return dateFormat(new Date(), "YYYY-MM-DD HH:mm:ss");
    }
  };

  React.useEffect(() => {
    console.log("selected_from changed:", selected_from);
    if (selected_from) {
      getUserReport();
    } else {
      console.warn("selected_from is not set, cannot fetch data");
      setLoadingApi(false);
    }
  }, [selected_from]);

  const handleClose = () => {
    setOpenUserDetail(false);
  };


  const handleDropDown = (value) => {
    set_selected_from(value);
  };

  if (loading) {
    return <LoadingGif />;
  } else {
    return (
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={6} xs={12} className="header-align">
            <Box className="heading">{Actions.user_active_list.view.label}</Box>
          </Grid>
        </Grid>
        <Box className="mt-20">
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Active Users" />
            <Tab label="Logged in Users" />
          </Tabs>
        </Box>
        <div className="mt-20">
          <DropDownWithSearch
            options={FROM_ACTIVE_USER_TYPE}
            name={"selected_from"}
            value={selected_from}
            onChange={(e, newValue) => handleDropDown(newValue)}
            label={"From"}
            hideClearIcon={true}
            className="width-300px"
            size="small"
          />
        </div>
        {tabValue === 0 && (
        <Paper className="mt-20 p-10" style={{ height: "62vh", position: "relative", overflow: "auto" }}>
          {loadingApi ? (
            <Box display="flex" justifyContent="center" alignItems="center" style={{ height: "100%" }}>
              <CircularProgress />
            </Box>
          ) : !chartReady || !categories || categories.length === 0 || !Array.isArray(activeTabSeries) || activeTabSeries.length === 0 ? (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" style={{ height: "100%", padding: "20px" }}>
              <Typography variant="body1" style={{ color: "#999", marginBottom: "8px" }}>
                No data available
              </Typography>
              <Typography variant="caption" style={{ color: "#999" }}>
                {!chartReady ? "Chart not ready" : activeTabSeries.length === 0 ? "No active/inactive series data" : categories.length === 0 ? "No categories" : "Unknown error"}
              </Typography>
            </Box>
          ) : showTable || !chartInstanceRef.current ? (
            // Show table: Active Users tab – only Active Users, Inactive Users, and Total column
            <TableContainer style={{ maxHeight: "100%", overflow: "auto" }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell style={{ fontWeight: 600, backgroundColor: "#f5f5f5", position: "sticky", left: 0, zIndex: 10 }}>Category</TableCell>
                    {activeTabSeries.map((s, idx) => {
                      const seriesName = (s.name || `Series ${idx + 1}`).toLowerCase();
                      const isActive = seriesName.includes('active') && !seriesName.includes('inactive') && !seriesName.includes('in active');
                      const isInactive = seriesName.includes('inactive') || seriesName.includes('in active');
                      const headerBgColor = isActive ? "#e8f5e9" : isInactive ? "#ffebee" : "#f5f5f5";
                      const headerTextColor = isActive ? "#2e7d32" : isInactive ? "#c62828" : "#333";
                      return (
                        <TableCell 
                          key={idx} 
                          align="right" 
                          style={{ 
                            fontWeight: 600, 
                            backgroundColor: headerBgColor,
                            color: headerTextColor,
                            borderLeft: "1px solid rgba(0,0,0,0.1)"
                          }}
                        >
                          {s.name || `Series ${idx + 1}`}
                        </TableCell>
                      );
                    })}
                    <TableCell align="right" style={{ fontWeight: 600, backgroundColor: "#f5f5f5" }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((category, catIdx) => {
                    const rowData = activeTabSeries.map(s => s.data[catIdx] || 0);
                    const total = rowData.reduce((sum, val) => sum + (val || 0), 0);
                    return (
                      <TableRow 
                        key={catIdx} 
                        hover
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          // When clicking on a row, open modal with first series (usually "Active Users" or similar)
                          // User can change the status in the modal
                          set_selected_details({
                            dataIndex: catIdx,
                            seriesIndex: 0, // Default to first series
                          });
                          setOpenUserDetail(true);
                        }}
                      >
                        <TableCell 
                          style={{ 
                            fontWeight: 500,
                            position: "sticky",
                            left: 0,
                            backgroundColor: "#ffffff",
                            zIndex: 5
                          }}
                        >
                          {category}
                        </TableCell>
                        {rowData.map((value, idx) => {
                          const seriesName = (activeTabSeries[idx]?.name || '').toLowerCase();
                          const isActive = seriesName.includes('active') && !seriesName.includes('inactive') && !seriesName.includes('in active');
                          const isInactive = seriesName.includes('inactive') || seriesName.includes('in active');
                          const cellBgColor = isActive ? (value > 0 ? "#e8f5e9" : "#f1f8e9") : isInactive ? (value > 0 ? "#ffebee" : "#fce4ec") : "#ffffff";
                          const cellTextColor = isActive ? (value > 0 ? "#1b5e20" : "#558b2f") : isInactive ? (value > 0 ? "#b71c1c" : "#c2185b") : "#333";
                          const hoverBgColor = isActive ? "#c8e6c9" : isInactive ? "#ffcdd2" : "#f5f5f5";
                          return (
                            <TableCell 
                              key={idx} 
                              align="right"
                              onClick={(e) => {
                                e.stopPropagation();
                                set_selected_details({
                                  dataIndex: catIdx,
                                  seriesIndex: idx,
                                });
                                setOpenUserDetail(true);
                              }}
                              style={{ 
                                cursor: 'pointer',
                                backgroundColor: cellBgColor,
                                color: cellTextColor,
                                fontWeight: value > 0 ? 600 : 400,
                                borderLeft: "1px solid rgba(0,0,0,0.1)",
                                transition: "all 0.2s ease",
                                position: "relative"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = hoverBgColor;
                                e.currentTarget.style.transform = "scale(1.05)";
                                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                                e.currentTarget.style.zIndex = "1";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = cellBgColor;
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.zIndex = "0";
                              }}
                            >
                              {value || 0}
                            </TableCell>
                          );
                        })}
                        <TableCell align="right" style={{ fontWeight: 600, backgroundColor: "#fafafa" }}>{total}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow style={{ backgroundColor: "#f9f9f9" }}>
                    <TableCell style={{ fontWeight: 600, position: "sticky", left: 0, backgroundColor: "#f9f9f9", zIndex: 5 }}>Total</TableCell>
                    {activeTabSeries.map((s, idx) => {
                      const seriesTotal = s.data.reduce((sum, val) => sum + (val || 0), 0);
                      return (
                        <TableCell key={idx} align="right" style={{ fontWeight: 600 }}>{seriesTotal}</TableCell>
                      );
                    })}
                    <TableCell align="right" style={{ fontWeight: 700 }}>
                      {activeTabSeries.reduce((grandTotal, s) => {
                        return grandTotal + s.data.reduce((sum, val) => sum + (val || 0), 0);
                      }, 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box style={{ width: "100%", height: "100%", position: "relative" }}>
              <div 
                ref={chartContainerRef} 
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  minHeight: "500px",
                  position: "relative",
                  display: "block"
                }}
                id="highcharts-container"
              ></div>
            </Box>
          )}
        </Paper>
        )}
        {tabValue === 1 && (
          <Paper className="mt-20 p-10" style={{ minHeight: "200px" }}>
            {loadingApi ? (
              <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                <CircularProgress />
              </Box>
            ) : !categories || categories.length === 0 || loggedInTabSeries.length === 0 ? (
              <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                <Typography color="textSecondary">No data available</Typography>
              </Box>
            ) : (
              <TableContainer style={{ overflow: "auto" }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ fontWeight: 600, backgroundColor: "#f5f5f5", position: "sticky", left: 0, zIndex: 10 }}>Category</TableCell>
                      {loggedInTabSeries.map((s, idx) => {
                        const name = (s.name || "").toLowerCase();
                        const isLoggedIn = name.includes("logged in") && !name.includes("not logged");
                        const headerBgColor = isLoggedIn ? "#e8f5e9" : "#ffebee";
                        const headerTextColor = isLoggedIn ? "#2e7d32" : "#c62828";
                        return (
                          <TableCell key={idx} align="right" style={{ fontWeight: 600, backgroundColor: headerBgColor, color: headerTextColor, borderLeft: "1px solid rgba(0,0,0,0.1)" }}>
                            {s.name || `Series ${idx + 1}`}
                          </TableCell>
                        );
                      })}
                      <TableCell align="right" style={{ fontWeight: 600, backgroundColor: "#f5f5f5" }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map((category, catIdx) => {
                      const rowData = loggedInTabSeries.map((s) => s.data[catIdx] || 0);
                      const total = rowData.reduce((sum, val) => sum + (val || 0), 0);
                      return (
                        <TableRow
                          key={catIdx}
                          hover
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            set_selected_details({ dataIndex: catIdx, seriesIndex: 0 });
                            setOpenUserDetail(true);
                          }}
                        >
                          <TableCell style={{ fontWeight: 500, position: "sticky", left: 0, backgroundColor: "#ffffff", zIndex: 5 }}>{category}</TableCell>
                          {rowData.map((value, idx) => {
                            const name = (loggedInTabSeries[idx]?.name || "").toLowerCase();
                            const isLoggedIn = name.includes("logged in") && !name.includes("not logged");
                            const cellBgColor = isLoggedIn ? (value > 0 ? "#e8f5e9" : "#f1f8e9") : (value > 0 ? "#ffebee" : "#fce4ec");
                            const cellTextColor = isLoggedIn ? (value > 0 ? "#1b5e20" : "#558b2f") : (value > 0 ? "#b71c1c" : "#c2185b");
                            return (
                              <TableCell
                                key={idx}
                                align="right"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  set_selected_details({ dataIndex: catIdx, seriesIndex: idx });
                                  setOpenUserDetail(true);
                                }}
                                style={{ cursor: "pointer", backgroundColor: cellBgColor, color: cellTextColor, fontWeight: value > 0 ? 600 : 400, borderLeft: "1px solid rgba(0,0,0,0.1)" }}
                              >
                                {value || 0}
                              </TableCell>
                            );
                          })}
                          <TableCell align="right" style={{ fontWeight: 600, backgroundColor: "#fafafa" }}>{total}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow style={{ backgroundColor: "#f9f9f9" }}>
                      <TableCell style={{ fontWeight: 600, position: "sticky", left: 0, backgroundColor: "#f9f9f9", zIndex: 5 }}>Total</TableCell>
                      {loggedInTabSeries.map((s, idx) => (
                        <TableCell key={idx} align="right" style={{ fontWeight: 600 }}>
                          {(s.data || []).reduce((sum, val) => sum + (val || 0), 0)}
                        </TableCell>
                      ))}
                      <TableCell align="right" style={{ fontWeight: 700 }}>
                        {loggedInTabSeries.reduce((grandTotal, s) => grandTotal + (s.data || []).reduce((sum, val) => sum + (val || 0), 0), 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
        {openUserDetail && (
          <ActiveUserListModal
            handleClose={handleClose}
            selected_from={selected_from}
            handleDropDown={handleDropDown}
            selected_details={selected_details}
            series={tabValue === 1 && loggedInTabSeries.length > 0 ? loggedInTabSeries : (activeTabSeries.length > 0 ? activeTabSeries : series)}
            optionsChart={{ xaxis: { categories: categories } }}
          />
        )}
      </Paper>
    );
  }
}
