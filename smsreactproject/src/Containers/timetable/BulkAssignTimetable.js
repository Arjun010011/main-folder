import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import {
  Paper,
  Grid,
  Box,
  Button,
  Typography,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Collapse,
  Switch,
  TextField,
  InputAdornment,
} from '@material-ui/core';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SwapHoriz as SwapHorizIcon,
  Search as SearchIcon,
} from '@material-ui/icons';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';
import MultipleSelectDropdown from 'Components/MultipleSelectDropdown';
import { SetAcademicYear, getAcademicYear, dateFormat, getKeyValueMap } from 'Includes/functions';
import Swal from 'sweetalert2';
import './styles.scss';

class BulkAssignTimetable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      saving: false,
      selectedYear: getAcademicYear() || 0,
      yearList: [],
      year_name: '',
      dateRangeList: [],
      selectedDateRange: null,
      periodPlanList: [],
      selectedPeriodPlan: null,
      standards: [],
      selectedStandards: [],
      periods: [],
      days: [],
      periodDayMappings: [],
      staffSubjectMapping: [],
      staffList: [], // List of all staff for name lookup
      subjectList: [], // List of all subjects for name lookup
      timetableData: {}, // { standard_section_id: { period_day_mapping_id: { staff, subject } } }
      showAssignmentDialog: false,
      currentCell: null, // { standardSectionId, periodDayMappingId }
      availableStaffSubjects: [],
      selectedStaff: null,
      selectedSubject: null,
      conflictingAssignments: [],
      selectedDays: [], // Array of day IDs
      summaryExpanded: true, // Summary section expanded by default
      showSummaryDialog: false, // Dialog for allocation summary
      viewMode: 'standard', // 'standard' or 'day' - standard shows sections on left, day shows days on left
      staffSearchTerm: '', // Search term for filtering staff in assignment dialog
    };
  }

  componentDidMount() {
    this.getYearList();
  }

  getYearList = () => {
    const url = GET_URL.getacademicyear.api;
    const param = { is_active: true };
    getRequest(url, param, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          let fromYear = '';
          let toYear = '';
          response.data.data.map((data) => {
            fromYear = data.start_date.split('-');
            toYear = data.end_date.split('-');
            // data.name = fromYear[0] + '-' + toYear[0];
          });
          let entry_academic_year_value = '';
          if (this.state.selectedYear) {
            entry_academic_year_value = getKeyValueMap(response.data.data, 'id', 'name');
            entry_academic_year_value = entry_academic_year_value[this.state.selectedYear];
          }
          this.setState(
            {
              yearList: response.data.data,
              selectedYear: this.state.selectedYear || response.data.data[0]?.id,
              year_name: entry_academic_year_value,
            },
            () => {
              if (this.state.selectedYear) {
                this.loadInitialData();
              }
            }
          );
        }
      })
      .catch((error) => {
        console.error('Error loading academic years:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load academic years. Please refresh the page.',
        });
      });
  };

  loadInitialData = () => {
    this.getDateRangeList();
    this.getPeriodPlanList();
  };

  getDateRangeList = () => {
    const params = { academic_year: this.state.selectedYear };
    getRequest(GET_URL.timetabledaterange.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const dateRangeList = response.data.data.map((data) => ({
            ...data,
            label: `${data.name} (${dateFormat(data.start_date, 'DD-MM-YYYY')} - ${dateFormat(data.end_date, 'DD-MM-YYYY')})`,
          }));
          this.setState({ dateRangeList });
        }
      })
      .catch((error) => {
        console.error('Error loading date ranges:', error);
      });
  };

  getPeriodPlanList = () => {
    const params = { academic_year: this.state.selectedYear };
    getRequest(GET_URL.period.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          // Period API returns PeriodPlan objects
          const periodPlanList = response.data.data.map((plan) => ({
            id: plan.id,
            name: plan.name || `Plan ${plan.id}`,
          }));
          this.setState({ periodPlanList });
        }
      })
      .catch((error) => {
        console.error('Error loading period plans:', error);
      });
  };

  handleYearChange = (e) => {
    const value = e.target.value;
    if (value !== 0) {
      const { yearList } = this.state;
      let entry_academic_year_value = getKeyValueMap(yearList, 'id', 'name');
      entry_academic_year_value = entry_academic_year_value[value];
      SetAcademicYear(value);
      this.setState(
        {
          selectedYear: value,
          year_name: entry_academic_year_value,
          selectedDateRange: null,
          selectedPeriodPlan: null,
          standards: [],
          timetableData: {},
        },
        () => {
          this.loadInitialData();
        }
      );
    }
  };

  handleDateRangeChange = (e) => {
    const value = e.target.value;
    const selected = this.state.dateRangeList.find((dr) => dr.id === parseInt(value));
    this.setState({ selectedDateRange: selected }, () => {
      this.loadBulkTimetableData();
    });
  };

  handlePeriodPlanChange = (e) => {
    const value = e.target.value;
    const selected = this.state.periodPlanList.find((pp) => pp.id === parseInt(value));
    this.setState({ selectedPeriodPlan: selected }, () => {
      this.loadBulkTimetableData();
    });
  };

  loadBulkTimetableData = () => {
    if (!this.state.selectedYear || !this.state.selectedDateRange || !this.state.selectedPeriodPlan) {
      return;
    }

    this.setState({ loading: true });

    const params = {
      academic_year: this.state.selectedYear,
      date_range: this.state.selectedDateRange.id,
      period_plan: this.state.selectedPeriodPlan.id,
    };

    getRequest(GET_URL.bulktimetableassignment.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
        const data = response.data.data;
        // Filter out Sunday by default and set selected days
        const allDays = data.days || [];
        const filteredDays = allDays.filter((day) => day.name.toLowerCase() !== 'sunday');
        const defaultSelectedDays = filteredDays.map((day) => day.id);
        
        // Load existing timetable assignments
        const existingAssignments = data.existing_assignments || {};
        // Convert existing assignments to the format expected by timetableData
        // existing_assignments format: {standard_section_id: {period_day_mapping_id: {staff, subject}}}
        const timetableData = {};
        Object.keys(existingAssignments).forEach((standardSectionId) => {
          // Convert to string to match the format used in the component
          const sectionIdStr = String(standardSectionId);
          timetableData[sectionIdStr] = {};
          Object.keys(existingAssignments[standardSectionId]).forEach((periodDayMappingId) => {
            const assignment = existingAssignments[standardSectionId][periodDayMappingId];
            timetableData[sectionIdStr][String(periodDayMappingId)] = {
              staff: assignment.staff,
              subject: assignment.subject,
            };
          });
        });
        
        // Sort periods by their start time for better chronological ordering
        // First, create a map of period ID to earliest start time
        const periodStartTimes = {};
        (data.period_day_mappings || []).forEach((pdm) => {
          if (pdm.start_time && pdm.period__id) {
            if (!periodStartTimes[pdm.period__id] || pdm.start_time < periodStartTimes[pdm.period__id]) {
              periodStartTimes[pdm.period__id] = pdm.start_time;
            }
          }
        });
        
        // Sort periods by start time, then by extracted number from name as fallback
        const sortedPeriods = (data.periods || []).sort((a, b) => {
          const timeA = periodStartTimes[a.id] || '';
          const timeB = periodStartTimes[b.id] || '';
          if (timeA && timeB) {
            return timeA.localeCompare(timeB);
          }
          // Fallback to extracting number from period name
          const extractNumber = (name) => {
            if (!name) return 0;
            const match = name.match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
          };
          return extractNumber(a.name) - extractNumber(b.name);
        });
        
        this.setState({
          standards: data.standards || [],
          periods: sortedPeriods,
          days: allDays,
          periodDayMappings: data.period_day_mappings || [],
          staffSubjectMapping: data.staff_subject_mapping || [],
          staffList: data.staff_list || [],
          subjectList: data.subject_list || [],
          loading: false,
          selectedStandards: [],
          timetableData: timetableData,
          selectedDays: defaultSelectedDays,
        });
        } else {
          this.setState({ loading: false });
        }
      })
      .catch((error) => {
        console.error('Error loading bulk timetable data:', error);
        this.setState({ loading: false });
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.detail || 'Failed to load timetable data. Please try again.',
        });
      });
  };

  handleStandardToggle = (standardId) => {
    const { selectedStandards } = this.state;
    const index = selectedStandards.indexOf(standardId);
    if (index > -1) {
      selectedStandards.splice(index, 1);
    } else {
      selectedStandards.push(standardId);
    }
    this.setState({ selectedStandards: [...selectedStandards] });
  };

  handleSelectAllStandards = () => {
    const { standards, selectedStandards } = this.state;
    if (selectedStandards.length === standards.length) {
      this.setState({ selectedStandards: [] });
    } else {
      const allStandardIds = standards.map((std) => std.id);
      this.setState({ selectedStandards: allStandardIds });
    }
  };

  openAssignmentDialog = (standardSectionId, periodDayMappingId) => {
    const { staffSubjectMapping, timetableData } = this.state;
    
    // Check if this period is already assigned to another standard section
    // Only check in current session (not database) to reduce warnings
    const conflictingAssignments = [];
    Object.keys(timetableData).forEach((ssId) => {
      if (ssId !== standardSectionId.toString() && timetableData[ssId] && timetableData[ssId][periodDayMappingId]) {
        const assignment = timetableData[ssId][periodDayMappingId];
        if (assignment && (assignment.staff || assignment.subject)) {
          // Find the standard section name
          let sectionName = '';
          this.state.standards.forEach((std) => {
            std.sections.forEach((sec) => {
              if (sec.standard_section === parseInt(ssId)) {
                sectionName = `${std.name} - ${sec.name}`;
              }
            });
          });
          conflictingAssignments.push({
            standardSectionId: ssId,
            sectionName: sectionName,
            assignment: assignment,
          });
        }
      }
    });

    // Get available staff-subject combinations with allocated hours
    const availableStaffSubjects = staffSubjectMapping.map((mapping) => ({
      staff_id: mapping.staff__id,
      staff_name: `${mapping.staff__first_name || ''} ${mapping.staff__middle_name || ''} ${mapping.staff__last_name || ''}`.trim(),
      subject_id: mapping.subject__id,
      subject_name: mapping.subject__name,
      allocated_hours: mapping.allocated_hours || '00:00',
      allocated_minutes: mapping.allocated_minutes || 0,
      max_hour: mapping.max_hour || '',
    }));

    // Get current assignment if exists
    const currentAssignment = this.state.timetableData[standardSectionId]?.[periodDayMappingId];

    this.setState({
      showAssignmentDialog: true,
      currentCell: { standardSectionId, periodDayMappingId },
      availableStaffSubjects,
      selectedStaff: currentAssignment?.staff || null,
      selectedSubject: currentAssignment?.subject || null,
      conflictingAssignments: conflictingAssignments,
    });
  };

  closeAssignmentDialog = () => {
    this.setState({
      showAssignmentDialog: false,
      currentCell: null,
      selectedStaff: null,
      selectedSubject: null,
      conflictingAssignments: [],
      staffSearchTerm: '', // Reset search when closing dialog
    });
  };

  handleStaffSubjectSelect = (staffId, subjectId) => {
    this.setState({
      selectedStaff: staffId,
      selectedSubject: subjectId,
    });
  };

  saveAssignment = () => {
    const { currentCell, selectedStaff, selectedSubject, timetableData, conflictingAssignments } = this.state;
    if (!currentCell) return;

    const { standardSectionId, periodDayMappingId } = currentCell;

    // Check for conflicts - same period assigned to different standard sections
    if (conflictingAssignments && conflictingAssignments.length > 0) {
      const conflictMessages = conflictingAssignments.map((conflict) => {
        const staffSubjectName = this.getStaffSubjectName(
          conflict.assignment.staff,
          conflict.assignment.subject
        );
        return `${conflict.sectionName}: ${staffSubjectName}`;
      }).join('\n');

      Swal.fire({
        icon: 'error',
        title: 'Period Conflict Error',
        html: `This period cannot be assigned because it's already assigned to other standard section(s):<br/><br/>${conflictMessages.replace(/\n/g, '<br/>')}<br/><br/>Each standard section must have unique period assignments. Please remove the assignment from the conflicting section(s) first.`,
        confirmButtonText: 'OK',
      });
      return;
    }

    this.confirmSaveAssignment();
  };

  confirmSaveAssignment = () => {
    const { currentCell, selectedStaff, selectedSubject, timetableData } = this.state;
    if (!currentCell) return;

    const { standardSectionId, periodDayMappingId } = currentCell;

    if (!timetableData[standardSectionId]) {
      timetableData[standardSectionId] = {};
    }

    timetableData[standardSectionId][periodDayMappingId] = {
      staff: selectedStaff,
      subject: selectedSubject,
    };

    this.setState({ timetableData: { ...timetableData } });
    this.closeAssignmentDialog();
  };

  clearAssignment = (standardSectionId, periodDayMappingId) => {
    const { timetableData } = this.state;
    if (timetableData[standardSectionId] && timetableData[standardSectionId][periodDayMappingId]) {
      delete timetableData[standardSectionId][periodDayMappingId];
      if (Object.keys(timetableData[standardSectionId]).length === 0) {
        delete timetableData[standardSectionId];
      }
      this.setState({ timetableData: { ...timetableData } });
    }
  };

  getCellAssignment = (standardSectionId, periodDayMappingId) => {
    return this.state.timetableData[standardSectionId]?.[periodDayMappingId];
  };

  getStaffName = (staffId) => {
    if (!staffId) return '';
    // Convert both to numbers for comparison to handle string/number mismatch
    const staffIdNum = Number(staffId);
    if (isNaN(staffIdNum)) return '';
    
    // Try to find in staffList first
    const staff = this.state.staffList.find((s) => {
      const sId = Number(s.id);
      return !isNaN(sId) && sId === staffIdNum;
    });
    if (staff) {
      const name = `${staff.first_name || ''} ${staff.middle_name || ''} ${staff.last_name || ''}`.trim();
      if (name) return name;
    }
    
    // Fallback to staff-subject mapping if staff list doesn't have it
    const mapping = this.state.staffSubjectMapping.find((m) => {
      const mId = Number(m.staff__id);
      return !isNaN(mId) && mId === staffIdNum;
    });
    if (mapping) {
      const name = `${mapping.staff__first_name || ''} ${mapping.staff__middle_name || ''} ${mapping.staff__last_name || ''}`.trim();
      if (name) return name;
    }
    return '';
  };

  getSubjectName = (subjectId) => {
    if (!subjectId) return '';
    // Convert both to numbers for comparison to handle string/number mismatch
    const subjectIdNum = Number(subjectId);
    const subject = this.state.subjectList.find((s) => Number(s.id) === subjectIdNum);
    if (subject) {
      return subject.name;
    }
    // Fallback to staff-subject mapping if subject list doesn't have it
    const mapping = this.state.staffSubjectMapping.find((m) => Number(m.subject__id) === subjectIdNum);
    if (mapping) {
      return mapping.subject__name;
    }
    return 'Unknown Subject';
  };

  getStaffSubjectName = (staffId, subjectId) => {
    const staffName = this.getStaffName(staffId);
    const subjectName = this.getSubjectName(subjectId);
    
    // Always show staff name first if available, then subject
    if (staffName && subjectName) {
      return `${staffName} - ${subjectName}`;
    } else if (staffName) {
      return staffName;
    } else if (subjectName) {
      // If only subject is available, show it but log warning
      if (staffId) {
        console.warn('Staff name not found for staffId:', staffId, 'Type:', typeof staffId, 'staffList length:', this.state.staffList.length);
      }
      return subjectName;
    }
    return '';
  };

  convertTimeToMinutes = (timeString) => {
    try {
      const parts = timeString.split(':');
      if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      return 0;
    } catch {
      return 0;
    }
  };

  getStaffAllocationSummary = () => {
    const { timetableData, staffList, standards, periodDayMappings, selectedStandards, selectedDays } = this.state;
    const staffCounts = {};
    const unallocatedPeriods = [];

    // Initialize all staff with 0 counts
    staffList.forEach((staff) => {
      staffCounts[staff.id] = {
        staffId: staff.id,
        staffName: `${staff.first_name || ''} ${staff.middle_name || ''} ${staff.last_name || ''}`.trim(),
        count: 0,
        sections: new Set(),
      };
    });

    // Count assignments for each staff
    Object.keys(timetableData).forEach((standardSectionId) => {
      const sectionAssignments = timetableData[standardSectionId];
      Object.keys(sectionAssignments).forEach((periodDayMappingId) => {
        const assignment = sectionAssignments[periodDayMappingId];
        if (assignment && assignment.staff) {
          const staffId = assignment.staff;
          if (staffCounts[staffId]) {
            staffCounts[staffId].count++;
            // Find section name
            standards.forEach((std) => {
              std.sections.forEach((sec) => {
                if (sec.standard_section === parseInt(standardSectionId)) {
                  staffCounts[staffId].sections.add(`${std.name} - ${sec.name}`);
                }
              });
            });
          }
        }
      });
    });

    // Find unallocated periods
    if (selectedStandards.length > 0) {
      selectedStandards.forEach((standardId) => {
        const standard = standards.find((s) => s.id === standardId);
        if (standard) {
          standard.sections.forEach((section) => {
            const standardSectionId = section.standard_section;
            periodDayMappings.forEach((pdm) => {
              // Only check if day is selected
              if (selectedDays.includes(pdm.day__id)) {
                const assignment = timetableData[standardSectionId]?.[pdm.id];
                if (!assignment || !assignment.staff) {
                  unallocatedPeriods.push({
                    standardSection: `${standard.name} - ${section.name}`,
                    period: pdm.period__name,
                    day: pdm.day__name,
                    periodDayMappingId: pdm.id,
                    standardSectionId: standardSectionId,
                  });
                }
              }
            });
          });
        }
      });
    }

    return {
      staffAllocations: Object.values(staffCounts)
        .filter((s) => s.count > 0)
        .sort((a, b) => b.count - a.count),
      unallocatedCount: unallocatedPeriods.length,
      unallocatedPeriods: unallocatedPeriods.slice(0, 20), // Show first 20
      totalUnallocated: unallocatedPeriods.length,
    };
  };

  renderSummarySection = () => {
    const summary = this.getStaffAllocationSummary();
    const { staffAllocations, unallocatedCount, unallocatedPeriods, totalUnallocated } = summary;

    return (
      <Grid container spacing={3}>
        {/* Staff Allocation Summary */}
        <Grid item xs={12} md={6}>
          <Paper style={{ padding: '16px', background: '#f8f9fa' }}>
            <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: '12px', color: '#1976d2' }}>
              Staff Allocation Summary
            </Typography>
            {staffAllocations.length > 0 ? (
              <Box style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#e3f2fd', borderBottom: '2px solid #1976d2' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Staff Name</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Classes</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Sections</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffAllocations.map((staff, index) => (
                      <tr key={staff.staffId} style={{ borderBottom: '1px solid #e0e0e0' }}>
                        <td style={{ padding: '8px', fontSize: '13px' }}>
                          {staff.staffName || 'Unknown Staff'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#1976d2' }}>
                          {staff.count}
                        </td>
                        <td style={{ padding: '8px', fontSize: '12px', color: '#666' }}>
                          {Array.from(staff.sections).slice(0, 3).join(', ')}
                          {staff.sections.size > 3 && ` +${staff.sections.size - 3} more`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            ) : (
              <Typography variant="body2" style={{ color: '#999', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                No staff assignments yet
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Unallocated Periods Summary */}
        <Grid item xs={12} md={6}>
          <Paper style={{ padding: '16px', background: '#fff3e0' }}>
            <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: '12px', color: '#f57c00' }}>
              Unallocated Periods Summary
            </Typography>
            <Box style={{ marginBottom: '12px' }}>
              <Typography variant="h6" style={{ color: '#f57c00', fontWeight: 700 }}>
                {totalUnallocated}
              </Typography>
              <Typography variant="body2" style={{ color: '#666' }}>
                Total unallocated periods
              </Typography>
            </Box>
            {unallocatedPeriods.length > 0 ? (
              <Box style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#ffe0b2', borderBottom: '2px solid #f57c00' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Section</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Day</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unallocatedPeriods.map((period, index) => (
                      <tr 
                        key={`${period.standardSectionId}-${period.periodDayMappingId}`}
                        style={{ 
                          borderBottom: '1px solid #ffe0b2',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          // Scroll to the cell and highlight it
                          const cell = document.querySelector(`[data-cell-id="${period.standardSectionId}-${period.periodDayMappingId}"]`);
                          if (cell) {
                            cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            cell.style.background = '#ffeb3b';
                            setTimeout(() => {
                              cell.style.background = '';
                            }, 2000);
                          }
                        }}
                      >
                        <td style={{ padding: '8px', fontSize: '12px' }}>
                          {period.standardSection}
                        </td>
                        <td style={{ padding: '8px', fontSize: '12px' }}>
                          {period.day}
                        </td>
                        <td style={{ padding: '8px', fontSize: '12px', fontWeight: 500 }}>
                          {period.period}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalUnallocated > 20 && (
                  <Typography variant="caption" style={{ display: 'block', marginTop: '8px', color: '#666', fontStyle: 'italic' }}>
                    Showing first 20 of {totalUnallocated} unallocated periods
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="body2" style={{ color: '#4caf50', fontStyle: 'italic', padding: '20px', textAlign: 'center', fontWeight: 600 }}>
                ✓ All periods are allocated!
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    );
  };

  renderDayBasedView = () => {
    const { standards, selectedStandards, periods, days, periodDayMappings, timetableData } = this.state;
    
    // Filter days based on selection (exclude Sunday by default)
    const filteredDays = days.filter((day) => this.state.selectedDays.includes(day.id));
    
    // Create period-day matrix
    const periodDayMatrix = {};
    periodDayMappings.forEach((pdm) => {
      const periodId = pdm.period__id;
      const dayId = pdm.day__id;
      if (this.state.selectedDays.includes(dayId)) {
        if (!periodDayMatrix[periodId]) {
          periodDayMatrix[periodId] = {};
        }
        periodDayMatrix[periodId][dayId] = pdm;
      }
    });

    // Build sections list from selected standards
    const sectionsList = [];
    selectedStandards.forEach((standardId) => {
      const standard = standards.find((s) => s.id === standardId);
      if (standard) {
        standard.sections.forEach((section) => {
          sectionsList.push({
            standardId: standard.id,
            standardName: standard.name,
            sectionId: section.standard_section,
            sectionName: section.name,
          });
        });
      }
    });

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
        <thead>
          <tr>
            <th style={{ padding: '10px', border: '1px solid #ddd', background: '#f5f5f5', position: 'sticky', left: 0, zIndex: 10 }}>
              Day
            </th>
            {sectionsList.map((section) => (
              <th
                key={section.sectionId}
                colSpan={periods.length}
                style={{ padding: '10px', border: '1px solid #ddd', background: '#f5f5f5', textAlign: 'center' }}
              >
                {section.standardName} - {section.sectionName}
              </th>
            ))}
          </tr>
          <tr>
            <th style={{ padding: '10px', border: '1px solid #ddd', background: '#f5f5f5', position: 'sticky', left: 0, zIndex: 10 }}></th>
            {sectionsList.map((section) => {
              // Sort periods by start time for the first day (or any day)
              const firstDay = filteredDays[0];
              const periodsForSection = [...periods].sort((a, b) => {
                const pdmA = periodDayMatrix[a.id]?.[firstDay?.id];
                const pdmB = periodDayMatrix[b.id]?.[firstDay?.id];
                if (pdmA?.start_time && pdmB?.start_time) {
                  return pdmA.start_time.localeCompare(pdmB.start_time);
                }
                const extractNumber = (name) => {
                  if (!name) return 0;
                  const match = name.match(/\d+/);
                  return match ? parseInt(match[0], 10) : 0;
                };
                return extractNumber(a.name) - extractNumber(b.name);
              });
              
              return periodsForSection.map((period) => (
                <th
                  key={`${section.sectionId}-${period.id}`}
                  style={{ padding: '8px', border: '1px solid #ddd', background: '#f8f8f8', minWidth: '120px' }}
                >
                  <Box>
                    <Typography variant="caption" display="block">
                      {period.name}
                    </Typography>
                    {firstDay && periodDayMatrix[period.id]?.[firstDay.id] && (
                      <Typography variant="caption" style={{ fontSize: '10px', color: '#666' }}>
                        {periodDayMatrix[period.id][firstDay.id].start_time?.substring(0, 5)} - {periodDayMatrix[period.id][firstDay.id].end_time?.substring(0, 5)}
                      </Typography>
                    )}
                  </Box>
                </th>
              ));
            })}
          </tr>
        </thead>
        <tbody>
          {filteredDays.map((day) => {
            // Sort periods by start time for this specific day
            const periodsForDay = [...periods].sort((a, b) => {
              const pdmA = periodDayMatrix[a.id]?.[day.id];
              const pdmB = periodDayMatrix[b.id]?.[day.id];
              if (pdmA?.start_time && pdmB?.start_time) {
                return pdmA.start_time.localeCompare(pdmB.start_time);
              }
              const extractNumber = (name) => {
                if (!name) return 0;
                const match = name.match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
              };
              return extractNumber(a.name) - extractNumber(b.name);
            });

            return (
              <tr key={day.id}>
                <td
                  style={{
                    padding: '10px',
                    border: '1px solid #ddd',
                    background: '#fff',
                    position: 'sticky',
                    left: 0,
                    zIndex: 5,
                    fontWeight: 600,
                  }}
                >
                  {day.name}
                </td>
                {sectionsList.map((section) => {
                  return periodsForDay.map((period) => {
                    const periodDayMapping = periodDayMatrix[period.id]?.[day.id];
                    if (!periodDayMapping) return null;

                    const assignment = this.getCellAssignment(
                      section.sectionId,
                      periodDayMapping.id
                    );
                    const hasAssignment = assignment && (assignment.staff || assignment.subject);

                    return (
                      <td
                        key={`${day.id}-${section.sectionId}-${period.id}`}
                        data-cell-id={`${section.sectionId}-${periodDayMapping.id}`}
                        style={{
                          padding: '5px',
                          border: '1px solid #ddd',
                          background: hasAssignment ? '#e8f5e9' : '#fff',
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                        onClick={() => this.openAssignmentDialog(section.sectionId, periodDayMapping.id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = hasAssignment ? '#c8e6c9' : '#f5f5f5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = hasAssignment ? '#e8f5e9' : '#fff';
                        }}
                      >
                        {hasAssignment ? (
                          <Box>
                            <Typography variant="caption" style={{ fontSize: '11px', display: 'block', fontWeight: 500 }}>
                              {this.getStaffSubjectName(assignment.staff, assignment.subject) || 'Click to assign'}
                            </Typography>
                            <IconButton
                              size="small"
                              style={{ padding: '2px', marginTop: '2px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                this.clearAssignment(section.sectionId, periodDayMapping.id);
                              }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Typography variant="caption" style={{ color: '#999', fontSize: '11px' }}>
                            Click to assign
                          </Typography>
                        )}
                      </td>
                    );
                  });
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  handleBulkSave = () => {
    const { selectedStandards, selectedDateRange, selectedPeriodPlan, timetableData, selectedYear } = this.state;

    if (selectedStandards.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Standards Selected',
        text: 'Please select at least one standard to assign timetable',
      });
      return;
    }

    if (!selectedDateRange || !selectedPeriodPlan) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Configuration',
        text: 'Please select Date Range and Period Plan',
      });
      return;
    }

    // Build assignments array
    const assignments = [];
    
    selectedStandards.forEach((standardId) => {
      const standard = this.state.standards.find((s) => s.id === standardId);
      if (!standard) return;

      standard.sections.forEach((section) => {
        const standardSectionId = section.standard_section;
        const sectionAssignments = [];

        // Get all assignments for this standard section
        if (timetableData[standardSectionId]) {
          Object.keys(timetableData[standardSectionId]).forEach((periodDayMappingId) => {
            const assignment = timetableData[standardSectionId][periodDayMappingId];
            if (assignment && (assignment.staff || assignment.subject)) {
              sectionAssignments.push({
                period_day_mapping: parseInt(periodDayMappingId),
                staff: assignment.staff || null,
                subject: assignment.subject || null,
              });
            }
          });
        }

        if (sectionAssignments.length > 0) {
          assignments.push({
            standard_section: standardSectionId,
            assignments: sectionAssignments,
          });
        }
      });
    });

    if (assignments.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Assignments',
        text: 'Please make some timetable assignments before saving',
      });
      return;
    }

    const postData = {
      academic_year: selectedYear,
      date_range: selectedDateRange.id,
      period_plan: selectedPeriodPlan.id,
      assignments: assignments,
    };

    this.setState({ saving: true });

    postRequest(POST_URL.bulktimetableassignment.api, postData, this.props).then((response) => {
      this.setState({ saving: false });
      if (response && response.status === 200) {
        const { success_count, error_count, errors } = response.data.data;
        if (error_count > 0) {
          // Format errors for better display
          const errorList = errors.length > 0 
            ? errors.map((err, idx) => `<div style="margin: 5px 0; padding: 8px; background: #ffebee; border-left: 3px solid #f44336; border-radius: 4px;">${idx + 1}. ${err}</div>`).join('')
            : '';
          
          Swal.fire({
            icon: 'error',
            title: 'Assignment Errors',
            html: `
              <div style="text-align: left;">
                <p><strong>Successfully assigned:</strong> ${success_count}</p>
                <p><strong>Errors:</strong> ${error_count}</p>
                ${errorList ? `<div style="max-height: 300px; overflow-y: auto; margin-top: 10px;">${errorList}</div>` : ''}
              </div>
            `,
            width: '600px',
          });
          
          // If there are errors, reload data to reflect current state
          if (errors.length > 0) {
            this.loadBulkTimetableData();
          }
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: `Successfully assigned timetable for ${success_count} standard(s)`,
          });
          // Clear selections and reload data
          this.setState({
            selectedStandards: [],
            timetableData: {},
          });
          this.loadBulkTimetableData();
        }
      }
    }).catch((error) => {
      this.setState({ saving: false });
      const errorMessage = error.response?.data?.data?.errors 
        ? error.response.data.data.errors.join('\n')
        : error.response?.data?.detail || 'Failed to save timetable assignments';
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        html: `<div style="text-align: left; white-space: pre-wrap;">${errorMessage}</div>`,
        width: '600px',
      });
    });
  };

  render() {
    const {
      loading,
      saving,
      selectedYear,
      yearList,
      dateRangeList,
      selectedDateRange,
      periodPlanList,
      selectedPeriodPlan,
      standards,
      selectedStandards,
      periods,
      days,
      periodDayMappings,
      showAssignmentDialog,
      availableStaffSubjects,
      selectedStaff,
      selectedSubject,
    } = this.state;

    // Filter days based on selection (exclude Sunday by default)
    const filteredDays = days.filter((day) => this.state.selectedDays.includes(day.id));
    
    // Create period-day matrix
    const periodDayMatrix = {};
    periodDayMappings.forEach((pdm) => {
      const periodId = pdm.period__id;
      const dayId = pdm.day__id;
      // Only include if day is selected
      if (this.state.selectedDays.includes(dayId)) {
        if (!periodDayMatrix[periodId]) {
          periodDayMatrix[periodId] = {};
        }
        periodDayMatrix[periodId][dayId] = pdm;
      }
    });

    return (
      <Paper className="paper-background">
        <Box className="heading" style={{ marginBottom: '20px' }}>
          Bulk Timetable Assignment
        </Box>

        {/* Configuration Section */}
        <Grid container spacing={3} style={{ marginBottom: '20px' }}>
          <Grid item md={3} xs={12}>
            <Dropdown
              data={yearList}
              value={selectedYear || 0}
              onChange={this.handleYearChange}
              name="selectedYear"
              label="Academic Year"
              customName="name"
              customId="id"
              required
            />
          </Grid>
          <Grid item md={3} xs={12}>
            <Dropdown
              data={dateRangeList}
              value={selectedDateRange?.id || 0}
              onChange={this.handleDateRangeChange}
              name="selectedDateRange"
              label="Date Range"
              customName="label"
              customId="id"
              required
            />
          </Grid>
          <Grid item md={3} xs={12}>
            <Dropdown
              data={periodPlanList}
              value={selectedPeriodPlan?.id || 0}
              onChange={this.handlePeriodPlanChange}
              name="selectedPeriodPlan"
              label="Period Plan"
              customName="name"
              customId="id"
              required
            />
          </Grid>
        </Grid>

        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Standards Selection - Compact */}
            {standards.length > 0 && (
              <Paper style={{ padding: '12px', marginBottom: '12px' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle1" style={{ fontSize: '14px', fontWeight: 600 }}>Select Standards</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    style={{ minWidth: '100px', fontSize: '12px' }}
                    onClick={this.handleSelectAllStandards}
                  >
                    {selectedStandards.length === standards.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </Box>
                <Grid container spacing={1}>
                  {standards.map((standard) => (
                    <Grid item xs={6} sm={4} md={3} key={standard.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedStandards.includes(standard.id)}
                            onChange={() => this.handleStandardToggle(standard.id)}
                            color="primary"
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" style={{ fontSize: '12px' }}>
                            {standard.name} ({standard.sections.length})
                          </Typography>
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {/* Timetable Grid */}
            {selectedStandards.length > 0 && periods.length > 0 && filteredDays.length > 0 && (
              <Paper style={{ padding: '20px', marginBottom: '20px', overflowX: 'auto' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" style={{ gap: '16px' }}>
                  <Typography variant="h6">Timetable Assignment</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={this.state.viewMode === 'day'}
                          onChange={(e) => this.setState({ viewMode: e.target.checked ? 'day' : 'standard' })}
                          color="primary"
                          size="small"
                        />
                      }
                      label={
                        <Box display="flex" alignItems="center" style={{ gap: '4px' }}>
                          <SwapHorizIcon fontSize="small" />
                          <Typography variant="body2" style={{ fontSize: '12px' }}>
                            {this.state.viewMode === 'day' ? 'Day View' : 'Standard View'}
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                  <Box display="flex" style={{ gap: '8px' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => this.setState({ showSummaryDialog: true })}
                    >
                      View Allocation Summary
                    </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={this.handleBulkSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save All Assignments'}
                  </Button>
                  </Box>
                </Box>

                {/* Days Filter - Moved here */}
                <Box mb={2}>
                  <MultipleSelectDropdown
                    id="selectedDays"
                    data_list={days.filter((day) => day.name.toLowerCase() !== 'sunday')}
                    selected_list={days.filter((day) => this.state.selectedDays.includes(day.id))}
                    onChange={(selectedDaysList) => {
                      const selectedDayIds = selectedDaysList.map((day) => day.id);
                      this.setState({ selectedDays: selectedDayIds });
                    }}
                    label="Filter Days"
                    optionValue="name"
                    customId="id"
                    required
                  />
                </Box>

                <div style={{ overflowX: 'auto' }}>
                  {this.state.viewMode === 'day' ? (
                    this.renderDayBasedView()
                  ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px', border: '1px solid #ddd', background: '#f5f5f5', position: 'sticky', left: 0, zIndex: 10 }}>
                          Standard / Section
                        </th>
                        {filteredDays.map((day) => (
                          <th
                            key={day.id}
                            colSpan={periods.length}
                            style={{ padding: '10px', border: '1px solid #ddd', background: '#f5f5f5', textAlign: 'center' }}
                          >
                            {day.name}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        <th style={{ padding: '10px', border: '1px solid #ddd', background: '#f5f5f5', position: 'sticky', left: 0, zIndex: 10 }}></th>
                        {filteredDays.map((day) => {
                          // Sort periods by start time for this specific day
                          const periodsForDay = [...periods].sort((a, b) => {
                            const pdmA = periodDayMatrix[a.id]?.[day.id];
                            const pdmB = periodDayMatrix[b.id]?.[day.id];
                            if (pdmA?.start_time && pdmB?.start_time) {
                              return pdmA.start_time.localeCompare(pdmB.start_time);
                            }
                            // Fallback to period name number extraction
                            const extractNumber = (name) => {
                              if (!name) return 0;
                              const match = name.match(/\d+/);
                              return match ? parseInt(match[0], 10) : 0;
                            };
                            return extractNumber(a.name) - extractNumber(b.name);
                          });
                          
                          return periodsForDay.map((period) => (
                            <th
                              key={`${day.id}-${period.id}`}
                              style={{ padding: '8px', border: '1px solid #ddd', background: '#f8f8f8', minWidth: '120px' }}
                            >
                              <Box>
                                <Typography variant="caption" display="block">
                                  {period.name}
                                </Typography>
                                {periodDayMatrix[period.id]?.[day.id] && (
                                  <Typography variant="caption" style={{ fontSize: '10px', color: '#666' }}>
                                    {periodDayMatrix[period.id][day.id].start_time?.substring(0, 5)} - {periodDayMatrix[period.id][day.id].end_time?.substring(0, 5)}
                                  </Typography>
                                )}
                              </Box>
                            </th>
                          ));
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStandards.map((standardId) => {
                        const standard = standards.find((s) => s.id === standardId);
                        if (!standard) return null;

                        return standard.sections.map((section, sectionIndex) => {
                          const standardSectionId = section.standard_section;
                          const isFirstSection = sectionIndex === 0;

                          return (
                            <tr key={section.standard_section}>
                              <td
                                style={{
                                  padding: '10px',
                                  border: '1px solid #ddd',
                                  background: '#fff',
                                  position: 'sticky',
                                  left: 0,
                                  zIndex: 5,
                                  fontWeight: isFirstSection ? 'bold' : 'normal',
                                }}
                              >
                                {isFirstSection && standard.name}
                                <br />
                                <span style={{ fontSize: '12px', color: '#666' }}>
                                  Section: {section.name}
                                </span>
                              </td>
                              {filteredDays.map((day) => {
                                // Sort periods by start time for this specific day to ensure correct order
                                const periodsForDay = [...periods].sort((a, b) => {
                                  const pdmA = periodDayMatrix[a.id]?.[day.id];
                                  const pdmB = periodDayMatrix[b.id]?.[day.id];
                                  if (pdmA?.start_time && pdmB?.start_time) {
                                    return pdmA.start_time.localeCompare(pdmB.start_time);
                                  }
                                  // Fallback to period name number extraction
                                  const extractNumber = (name) => {
                                    if (!name) return 0;
                                    const match = name.match(/\d+/);
                                    return match ? parseInt(match[0], 10) : 0;
                                  };
                                  return extractNumber(a.name) - extractNumber(b.name);
                                });
                                
                                return periodsForDay.map((period) => {
                                  const periodDayMapping = periodDayMatrix[period.id]?.[day.id];
                                  if (!periodDayMapping) return null;
                                  
                                  // Verify that the period-day mapping actually matches this period
                                  if (periodDayMapping.period__id !== period.id) {
                                    console.warn(`Period mismatch: Expected period ${period.id} (${period.name}), but got period ${periodDayMapping.period__id}`);
                                    return null;
                                  }

                                  const assignment = this.getCellAssignment(
                                    standardSectionId,
                                    periodDayMapping.id
                                  );
                                  const hasAssignment = assignment && (assignment.staff || assignment.subject);

                                  return (
                                    <td
                                      key={`${section.standard_section}-${day.id}-${period.id}`}
                                      data-cell-id={`${standardSectionId}-${periodDayMapping.id}`}
                                      style={{
                                        padding: '5px',
                                        border: '1px solid #ddd',
                                        background: hasAssignment ? '#e8f5e9' : '#fff',
                                        cursor: 'pointer',
                                        position: 'relative',
                                      }}
                                      onClick={() => this.openAssignmentDialog(standardSectionId, periodDayMapping.id)}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = hasAssignment ? '#c8e6c9' : '#f5f5f5';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = hasAssignment ? '#e8f5e9' : '#fff';
                                      }}
                                    >
                                      {hasAssignment ? (
                                        <Box>
                                          <Typography variant="caption" style={{ fontSize: '11px', display: 'block', fontWeight: 500 }}>
                                            {this.getStaffSubjectName(assignment.staff, assignment.subject) || 'Click to assign'}
                                          </Typography>
                                          <IconButton
                                            size="small"
                                            style={{ padding: '2px', marginTop: '2px' }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              this.clearAssignment(standardSectionId, periodDayMapping.id);
                                            }}
                                          >
                                            <CancelIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      ) : (
                                        <Typography variant="caption" style={{ color: '#999', fontSize: '11px' }}>
                                          Click to assign
                                        </Typography>
                                      )}
                                    </td>
                                  );
                                });
                              })}
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                  )}
                </div>
              </Paper>
            )}
          </>
        )}

        {/* Allocation Summary Dialog */}
        <Dialog
          open={this.state.showSummaryDialog}
          onClose={() => this.setState({ showSummaryDialog: false })}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Allocation Summary</Typography>
              <IconButton size="small" onClick={() => this.setState({ showSummaryDialog: false })}>
                <CancelIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {this.renderSummarySection()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => this.setState({ showSummaryDialog: false })} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assignment Dialog */}
        <Dialog
          open={showAssignmentDialog}
          onClose={this.closeAssignmentDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Assign Staff & Subject</DialogTitle>
          <DialogContent>
            <Box mb={2}>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: '12px' }}>
                Select a staff-subject combination:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Search by staff name or subject..."
                value={this.state.staffSearchTerm}
                onChange={(e) => this.setState({ staffSearchTerm: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Grid container spacing={2}>
              {availableStaffSubjects
                .filter((item) => {
                  if (!this.state.staffSearchTerm) return true;
                  const searchTerm = this.state.staffSearchTerm.toLowerCase();
                  const staffName = (item.staff_name || '').toLowerCase();
                  const subjectName = (item.subject_name || '').toLowerCase();
                  return staffName.includes(searchTerm) || subjectName.includes(searchTerm);
                })
                .map((item, index) => {
                const isSelected = selectedStaff === item.staff_id && selectedSubject === item.subject_id;
                // Convert max_hour to minutes for comparison
                const maxMinutes = item.max_hour ? this.convertTimeToMinutes(item.max_hour) : null;
                const isOverLimit = maxMinutes && item.allocated_minutes > maxMinutes;
                const hoursInfo = item.max_hour 
                  ? `Allocated: ${item.allocated_hours} / Max: ${item.max_hour}`
                  : `Allocated: ${item.allocated_hours}`;
                return (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box
                      onClick={() => this.handleStaffSubjectSelect(item.staff_id, item.subject_id)}
                      style={{
                        padding: '12px',
                        border: `2px solid ${isSelected ? '#4680FF' : '#ddd'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelected ? '#e3f2fd' : '#fff',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#4680FF';
                          e.currentTarget.style.background = '#f5f5f5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#ddd';
                          e.currentTarget.style.background = '#fff';
                        }
                      }}
                    >
                      <Typography variant="body2" style={{ fontWeight: isSelected ? 600 : 400 }}>
                        {item.staff_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" style={{ display: 'block' }}>
                        {item.subject_name}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        style={{ 
                          display: 'block', 
                          marginTop: '4px',
                          color: isOverLimit ? '#d32f2f' : '#666',
                          fontWeight: 500,
                          fontSize: '11px'
                        }}
                      >
                        {hoursInfo}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
            {(() => {
              const filteredStaffSubjects = availableStaffSubjects.filter((item) => {
                if (!this.state.staffSearchTerm) return true;
                const searchTerm = this.state.staffSearchTerm.toLowerCase();
                const staffName = (item.staff_name || '').toLowerCase();
                const subjectName = (item.subject_name || '').toLowerCase();
                return staffName.includes(searchTerm) || subjectName.includes(searchTerm);
              });
              
              if (availableStaffSubjects.length === 0) {
                return (
              <Box p={3} textAlign="center">
                <Typography color="textSecondary">No staff-subject mappings available</Typography>
              </Box>
                );
              }
              
              if (filteredStaffSubjects.length === 0 && this.state.staffSearchTerm) {
                return (
                  <Box p={3} textAlign="center">
                    <Typography color="textSecondary">No results found for "{this.state.staffSearchTerm}"</Typography>
                  </Box>
                );
              }
              
              return null;
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeAssignmentDialog} color="secondary">
              Cancel
            </Button>
            <Button
              onClick={this.saveAssignment}
              color="primary"
              variant="contained"
              disabled={!selectedStaff || !selectedSubject}
            >
              Assign
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    );
  }
}

export default withRouter(BulkAssignTimetable);

