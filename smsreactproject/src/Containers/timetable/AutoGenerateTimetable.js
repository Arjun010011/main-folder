import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import {
  Paper,
  Grid,
  Box,
  Button,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Checkbox,
  FormControlLabel,
  TextField,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import {
  PlayArrow as GenerateIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@material-ui/icons';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';
import MultipleSelectDropdown from 'Components/MultipleSelectDropdown';
import { SetAcademicYear, getAcademicYear, dateFormat, getKeyValueMap } from 'Includes/functions';
import Swal from 'sweetalert2';
import './styles.scss';

class AutoGenerateTimetable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      generating: false,
      selectedYear: getAcademicYear() || 0,
      yearList: [],
      year_name: '',
      dateRangeList: [],
      selectedDateRange: null,
      periodPlanList: [],
      selectedPeriodPlan: null,
      standards: [],
      selectedStandards: [],
      drafts: [], // Generated timetable drafts
      selectedDraft: null,
      generationProgress: 0,
      periods: [],
      days: [],
      periodDayMappings: [],
      staffList: [],
      subjectList: [],
      showTimetableView: false,
      editableDraft: null, // Editable copy of selected draft
      showAssignmentDialog: false,
      currentCell: null,
      availableStaffSubjects: [],
      selectedStaff: null,
      selectedSubject: null,
      conflictingAssignments: [],
      staffSearch: '',
      subjectSearch: '',
      constraints: {
        avoid_consecutive_periods: true,
        spread_subjects: true,
        spread_staff_load: true,
      },
      subjectFilters: {}, // {sectionId: [subjectIds]}
      showSummaryDialog: false,
      summaryData: null,
      subjectsBySection: {}, // {standardSectionId: [{id, name}]}
      showSubjectConfigDialog: false,
      subjectMatrixSubjects: [],
      subjectMatrixSections: [],
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
    this.getStandards();
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

  getStandards = () => {
    const params = { academic_year: this.state.selectedYear };
    getRequest(GET_URL.getstandardandsection.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const standardsData = response.data.data || [];
          // Flatten standards and sections into a single list for selection
          const flattenedStandards = [];
          standardsData.forEach((standard) => {
            if (standard.sections && standard.sections.length > 0) {
              standard.sections.forEach((section) => {
                // Use standard_section ID (StandardSectionMapping ID) which is what we need for timetable
                const standardSectionId = section.standard_section || section.id;
                flattenedStandards.push({
                  id: standardSectionId, // This should be the StandardSectionMapping ID
                  standard_name: standard.standard_name || standard.name,
                  section_name: section.section_name || section.name,
                  name: `${standard.standard_name || standard.name} - ${section.section_name || section.name}`,
                });
              });
            }
          });
          // Remove duplicates based on ID to prevent multiple selections
          const uniqueStandards = flattenedStandards.filter((item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
          );
          this.setState({ standards: uniqueStandards.length > 0 ? uniqueStandards : [] });
        } else {
          this.setState({ standards: [] });
        }
      })
      .catch((error) => {
        console.error('Error loading standards:', error);
        this.setState({ standards: [] });
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
          selectedStandards: [],
          drafts: [],
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
    this.setState({ selectedDateRange: selected, drafts: [] });
  };

  handlePeriodPlanChange = (e) => {
    const value = e.target.value;
    const selected = this.state.periodPlanList.find((pp) => pp.id === parseInt(value));
    this.setState({ selectedPeriodPlan: selected, drafts: [] });
  };

  handleStandardChange = (selected) => {
    this.setState({ selectedStandards: selected, drafts: [] }, () => {
      this.loadSubjectsForSelectedSections(selected);
    });
  };

  handleSelectAllStandards = () => {
    const { standards, selectedStandards } = this.state;
    const total = (standards || []).length;
    const selectedCount = (selectedStandards || []).length;
    if (total > 0 && selectedCount === total) {
      this.setState({ selectedStandards: [] });
    } else {
      this.setState({ selectedStandards: standards });
    }
  };

  loadTimetableData = () => {
    if (!this.state.selectedYear || !this.state.selectedDateRange || !this.state.selectedPeriodPlan) {
      return;
    }

    const params = {
      academic_year: this.state.selectedYear,
      date_range: this.state.selectedDateRange.id,
      period_plan: this.state.selectedPeriodPlan.id,
    };

    getRequest(GET_URL.bulktimetableassignment.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const data = response.data.data;
          const allDays = data.days || [];
          
          // Sort periods by their start time
          const periodStartTimes = {};
          (data.period_day_mappings || []).forEach((pdm) => {
            if (pdm.start_time && pdm.period__id) {
              if (!periodStartTimes[pdm.period__id] || pdm.start_time < periodStartTimes[pdm.period__id]) {
                periodStartTimes[pdm.period__id] = pdm.start_time;
              }
            }
          });
          
          const sortedPeriods = (data.periods || []).sort((a, b) => {
            const timeA = periodStartTimes[a.id] || '';
            const timeB = periodStartTimes[b.id] || '';
            if (timeA && timeB) {
              return timeA.localeCompare(timeB);
            }
            const extractNumber = (name) => {
              if (!name) return 0;
              const match = name.match(/\d+/);
              return match ? parseInt(match[0], 10) : 0;
            };
            return extractNumber(a.name) - extractNumber(b.name);
          });
          
          const filteredMappings = (data.period_day_mappings || []).filter((pdm) => !pdm.period__is_break);
          this.setState({
            periods: sortedPeriods,
            days: allDays,
            periodDayMappings: filteredMappings,
            staffList: data.staff_list || [],
            subjectList: data.subject_list || [],
            showTimetableView: true,
          });
          // refresh subjects per section mapping if standards already chosen
          if (this.state.selectedStandards && this.state.selectedStandards.length > 0) {
            this.loadSubjectsForSelectedSections(this.state.selectedStandards);
          }
        }
      })
      .catch((error) => {
        console.error('Error loading timetable data:', error);
      });
  };

  loadSubjectsForSelectedSections = (selectedStandards) => {
    const standards = selectedStandards || this.state.selectedStandards || [];
    if (!standards.length || !this.state.selectedYear) {
      this.setState({ subjectsBySection: {} });
      return;
    }
    const params = { academic_year: this.state.selectedYear };
    getRequest(GET_URL.getAssignSubject.api, params, this.props)
      .then((response) => {
        const subjectsBySection = {};
        const data = response?.data?.data || [];
        // data is grouped by standard → sections → subjects
        data.forEach((std) => {
          (std.sections || []).forEach((sec) => {
            const sectionId = sec.standard_section; // this is StandardSectionMapping id
            const subjects = (sec.subjects || []).map((s) => ({
              id: s.id,
              name: s.name,
            }));
            subjectsBySection[sectionId] = subjects;
          });
        });
        // Default-select all subjects for any section without existing selection
        const nextFilters = { ...(this.state.subjectFilters || {}) };
        standards.forEach((s) => {
          const sectionId = s.id;
          const existing = nextFilters[sectionId];
          const available = subjectsBySection[sectionId] || [];
          if (!existing || existing.length === 0) {
            nextFilters[sectionId] = available.map((sub) => sub.id);
          }
        });
        this.setState({ subjectsBySection, subjectFilters: nextFilters });
      })
      .catch((error) => {
        console.error('Error loading subjects per section:', error);
        this.setState({ subjectsBySection: {} });
      });
  };

  openSubjectConfigDialog = () => {
    const { selectedStandards, subjectsBySection } = this.state;
    const sections = (selectedStandards || []).map((s) => ({
      id: s.id,
      name: s.name || `${s.standard_name || ''} ${s.section_name || ''}`.trim(),
      standard_name: s.standard_name || '',
    }));
    const subjectMap = new Map();
    sections.forEach((sec) => {
      (subjectsBySection[sec.id] || []).forEach((sub) => {
        if (!subjectMap.has(String(sub.id))) subjectMap.set(String(sub.id), { id: sub.id, name: sub.name });
      });
    });
    const subjectMatrixSubjects = Array.from(subjectMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    this.setState({
      subjectMatrixSections: sections,
      subjectMatrixSubjects,
      showSubjectConfigDialog: true,
    });
  };

  closeSubjectConfigDialog = () => {
    this.setState({ showSubjectConfigDialog: false });
  };

  toggleSectionSubject = (sectionId, subjectId, checked) => {
    const current = this.state.subjectFilters[sectionId] || [];
    let next = current.slice(0);
    if (checked) {
      if (!next.map(String).includes(String(subjectId))) next.push(subjectId);
    } else {
      next = next.filter((s) => String(s) !== String(subjectId));
    }
    this.setState({ subjectFilters: { ...this.state.subjectFilters, [sectionId]: next } });
  };

  selectAllForSection = (sectionId, checked) => {
    const allIds = (this.state.subjectsBySection[sectionId] || []).map((s) => s.id);
    this.setState({
      subjectFilters: { ...this.state.subjectFilters, [sectionId]: checked ? allIds : [] },
    });
  };

  selectAllForSubject = (subjectId, checked) => {
    const nextFilters = { ...this.state.subjectFilters };
    (this.state.subjectMatrixSections || []).forEach((sec) => {
      const current = nextFilters[sec.id] || [];
      const available = (this.state.subjectsBySection[sec.id] || []).map((s) => String(s.id));
      const isAvailable = available.includes(String(subjectId));
      if (checked) {
        if (isAvailable && !current.map(String).includes(String(subjectId))) {
          current.push(subjectId);
          nextFilters[sec.id] = current;
        }
      } else {
        nextFilters[sec.id] = current.filter((s) => String(s) !== String(subjectId));
      }
    });
    this.setState({ subjectFilters: nextFilters });
  };

  copyFirstSectionToAllInStandard = (standardName) => {
    const sections = (this.state.subjectMatrixSections || []).filter((s) => (s.standard_name || '') === (standardName || ''));
    if (!sections.length) return;
    const sourceId = sections[0].id;
    const sourceList = this.state.subjectFilters[sourceId] || [];
    const nextFilters = { ...this.state.subjectFilters };
    sections.forEach((s) => {
      // Only keep subjects that are available in target section
      const availableIds = new Set((this.state.subjectsBySection[s.id] || []).map((x) => String(x.id)));
      nextFilters[s.id] = sourceList.filter((id) => availableIds.has(String(id)));
    });
    this.setState({ subjectFilters: nextFilters });
  };

  getStaffName = (staffId) => {
    if (!staffId) return '';
    const staff = this.state.staffList.find((s) => Number(s.id) === Number(staffId));
    return staff ? staff.name : '';
  };

  getSubjectName = (subjectId) => {
    if (!subjectId) return '';
    const subject = this.state.subjectList.find((s) => Number(s.id) === Number(subjectId));
    return subject ? subject.name : '';
  };

  handleCellClick = (sectionId, periodDayMappingId) => {
    if (!this.state.editableDraft) return;
    
    // Get available staff-subject combinations for this cell
    this.getAvailableStaffSubjects(sectionId, periodDayMappingId);
    
    // Get current assignment
    const currentAssignment = this.getCellAssignment(sectionId, periodDayMappingId);
    
    this.setState({
      currentCell: { standardSectionId: sectionId, periodDayMappingId },
      selectedStaff: currentAssignment?.staff || null,
      selectedSubject: currentAssignment?.subject || null,
      showAssignmentDialog: true,
    });
  };

  getAvailableStaffSubjects = (standardSectionId, periodDayMappingId) => {
    // Get staff-subject mappings for this standard section
    const params = {
      academic_year: this.state.selectedYear,
      date_range: this.state.selectedDateRange.id,
      period_plan: this.state.selectedPeriodPlan.id,
    };

    getRequest(GET_URL.bulktimetableassignment.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const data = response.data.data;
          const staffSubjectMapping = data.staff_subject_mapping || [];
          
          // Filter for this standard section
          const available = staffSubjectMapping.filter((mapping) => {
            // Check if this staff-subject is available for this standard section
            // This is a simplified check - in real implementation, you'd check against standard_section
            return true; // For now, show all available staff-subject combinations
          });

          // Check for conflicts with other assignments in the editable draft
          const conflictingAssignments = [];
          const editableAssignments = this.state.editableDraft?.assignments || [];
          
          editableAssignments.forEach((assignment) => {
            if (
              assignment.period_day_mapping === periodDayMappingId &&
              assignment.standard_section !== standardSectionId
            ) {
              conflictingAssignments.push({
                staff: assignment.staff,
                staff_name: assignment.staff_name,
                standard_section: assignment.standard_section,
              });
            }
          });

          this.setState({
            availableStaffSubjects: available,
            conflictingAssignments: conflictingAssignments,
          });
        }
      })
      .catch((error) => {
        console.error('Error loading available staff subjects:', error);
      });
  };

  getCellAssignment = (standardSectionId, periodDayMappingId) => {
    if (!this.state.editableDraft || !this.state.editableDraft.assignments) return null;
    
    // Convert IDs to numbers for comparison (handles string/number mismatch)
    const standardSectionIdNum = Number(standardSectionId);
    const periodDayMappingIdNum = Number(periodDayMappingId);
    
    const assignment = this.state.editableDraft.assignments.find((a) => {
      const aStandardSection = Number(a.standard_section);
      const aPeriodDayMapping = Number(a.period_day_mapping);
      return aStandardSection === standardSectionIdNum && aPeriodDayMapping === periodDayMappingIdNum;
    });
    
    return assignment || null;
  };

  saveAssignment = () => {
    const { currentCell, selectedStaff, selectedSubject, editableDraft } = this.state;
    
    if (!currentCell || !editableDraft) return;

    // Check for conflicts
    const conflicts = this.state.conflictingAssignments.filter(
      (c) => c.staff === selectedStaff
    );

    if (conflicts.length > 0 && selectedStaff) {
      Swal.fire({
        icon: 'warning',
        title: 'Conflict Detected',
        html: `This staff is already assigned to another section at this time. Do you want to proceed anyway?`,
        showCancelButton: true,
        confirmButtonText: 'Yes, Proceed',
        cancelButtonText: 'Cancel',
      }).then((result) => {
        if (result.isConfirmed) {
          this.confirmSaveAssignment();
        }
      });
      return;
    }

    this.confirmSaveAssignment();
  };

  confirmSaveAssignment = () => {
    const { currentCell, selectedStaff, selectedSubject, editableDraft } = this.state;
    if (!currentCell || !editableDraft) return;

    const { standardSectionId, periodDayMappingId } = currentCell;

    // Find and update or create assignment
    const assignmentIndex = editableDraft.assignments.findIndex(
      (a) => a.standard_section === standardSectionId && a.period_day_mapping === periodDayMappingId
    );

    if (selectedStaff && selectedSubject) {
      const staffName = this.getStaffName(selectedStaff);
      const subjectName = this.getSubjectName(selectedSubject);
      
      const newAssignment = {
        standard_section: standardSectionId,
        period_day_mapping: periodDayMappingId,
        staff: selectedStaff,
        subject: selectedSubject,
        staff_name: staffName,
        subject_name: subjectName,
      };

      if (assignmentIndex >= 0) {
        // Update existing
        editableDraft.assignments[assignmentIndex] = newAssignment;
      } else {
        // Add new
        editableDraft.assignments.push(newAssignment);
      }
    } else if (assignmentIndex >= 0) {
      // Remove assignment if no staff/subject selected
      editableDraft.assignments.splice(assignmentIndex, 1);
    }

    this.setState({
      editableDraft: { ...editableDraft },
      showAssignmentDialog: false,
      currentCell: null,
      selectedStaff: null,
      selectedSubject: null,
    });
  };

  closeAssignmentDialog = () => {
    this.setState({
      showAssignmentDialog: false,
      currentCell: null,
      selectedStaff: null,
      selectedSubject: null,
      conflictingAssignments: [],
    });
  };

  clearAssignment = (standardSectionId, periodDayMappingId) => {
    const { editableDraft } = this.state;
    if (!editableDraft) return;

    const assignmentIndex = editableDraft.assignments.findIndex(
      (a) => a.standard_section === standardSectionId && a.period_day_mapping === periodDayMappingId
    );

    if (assignmentIndex >= 0) {
      editableDraft.assignments.splice(assignmentIndex, 1);
      this.setState({ editableDraft: { ...editableDraft } });
    }
  };

  openSectionSummary = (sectionId, sectionName) => {
    const { editableDraft } = this.state;
    if (!editableDraft) return;

    const subjectCountsMap = {};
    const teacherCountsMap = {};

    (editableDraft.assignments || []).forEach((a) => {
      if (Number(a.standard_section) === Number(sectionId)) {
        if (a.subject) {
          const key = Number(a.subject);
          subjectCountsMap[key] = (subjectCountsMap[key] || 0) + 1;
        }
        if (a.staff) {
          const key = Number(a.staff);
          teacherCountsMap[key] = (teacherCountsMap[key] || 0) + 1;
        }
      }
    });

    // Build unassigned slots list for this section
    const { periods, days, periodDayMappings } = this.state;
    // Reuse same filtering as render
    const periodDayMatrix = {};
    periodDayMappings.forEach((pdm) => {
      if (!periodDayMatrix[pdm.period__id]) {
        periodDayMatrix[pdm.period__id] = {};
      }
      periodDayMatrix[pdm.period__id][pdm.day__id] = pdm;
    });
    const dayHasValidPeriods = (day) =>
      periodDayMappings.some((pdm) => pdm.day__id === day.id && pdm.start_time && pdm.end_time);
    const filteredDays = (days || []).filter(
      (day) => (day.name || '').toLowerCase() !== 'sunday' && dayHasValidPeriods(day)
    );
    const unassignedSlots = [];
    filteredDays.forEach((day) => {
      const periodsForDay = (periods || [])
        .filter((p) => !!periodDayMatrix[p.id]?.[day.id])
        .sort((a, b) => {
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
      periodsForDay.forEach((period) => {
        const pdm = periodDayMatrix[period.id]?.[day.id];
        if (!pdm) return;
        const assignment = this.getCellAssignment(sectionId, pdm.id);
        if (!assignment) {
          unassignedSlots.push({
            day: day.name,
            period: period.name,
            time:
              (pdm.start_time ? pdm.start_time.substring(0, 5) : '') +
              (pdm.end_time ? ` - ${pdm.end_time.substring(0, 5)}` : ''),
          });
        }
      });
    });

    const subjectCounts = Object.keys(subjectCountsMap).map((sid) => ({
      id: Number(sid),
      name: this.getSubjectName(Number(sid)) || 'Unknown Subject',
      count: subjectCountsMap[sid],
    })).sort((a, b) => b.count - a.count);

    const teacherCounts = Object.keys(teacherCountsMap).map((tid) => ({
      id: Number(tid),
      name: this.getStaffName(Number(tid)) || 'Unknown Staff',
      count: teacherCountsMap[tid],
    })).sort((a, b) => b.count - a.count);

    this.setState({
      showSummaryDialog: true,
      summaryData: {
        sectionId,
        sectionName,
        subjectCounts,
        teacherCounts,
        total: subjectCounts.reduce((s, x) => s + x.count, 0),
        unassignedSlots,
      },
    });
  };

  closeSectionSummary = () => {
    this.setState({ showSummaryDialog: false, summaryData: null });
  };

  renderTimetableView = () => {
    const { editableDraft, periods, days, periodDayMappings, selectedStandards, standards } = this.state;
    
    if (!editableDraft || !periods.length || !days.length) {
      return (
        <Grid item xs={12}>
          <Paper style={{ padding: '20px', marginTop: '20px' }}>
            <Typography variant="body2" color="textSecondary">
              Loading timetable data... Please wait.
            </Typography>
          </Paper>
        </Grid>
      );
    }
    
    if (!selectedStandards || selectedStandards.length === 0) {
      return (
        <Grid item xs={12}>
          <Paper style={{ padding: '20px', marginTop: '20px' }}>
            <Typography variant="body2" color="textSecondary">
              No standard sections selected. Please select standards to view timetable.
            </Typography>
          </Paper>
        </Grid>
      );
    }

    // Create a matrix for period-day mappings
    const periodDayMatrix = {};
    periodDayMappings.forEach((pdm) => {
      if (!periodDayMatrix[pdm.period__id]) {
        periodDayMatrix[pdm.period__id] = {};
      }
      periodDayMatrix[pdm.period__id][pdm.day__id] = pdm;
    });

    // Filter out Sunday and any day that has no valid period-day mappings (no timing configured)
    const dayHasValidPeriods = (day) => {
      return periodDayMappings.some(
        (pdm) => pdm.day__id === day.id && pdm.start_time && pdm.end_time
      );
    };
    const filteredDays = days.filter(
      (day) => day.name.toLowerCase() !== 'sunday' && dayHasValidPeriods(day)
    );

    // Convert draft assignments to a lookup map (use editableDraft)
    const assignmentMap = {};
    editableDraft.assignments.forEach((assignment) => {
      const key = `${assignment.standard_section}-${assignment.period_day_mapping}`;
      assignmentMap[key] = assignment;
    });

    // Get selected standard sections
    // selectedStandards is an array of objects with id, name, standard_name, section_name
    // We need to use the id directly as it's the standard_section_id
    const selectedStandardSections = selectedStandards.map((std) => {
      // Use the id directly - it's already the standard_section_id
      const standardSectionId = Number(std.id);
      
      // Try to find in standards array for display name
      let displayName = std.name;
      if (!displayName) {
        // Try to find in standards array
        for (const standard of standards || []) {
          if (standard.sections) {
            const section = standard.sections.find((s) => {
              const sectionId = Number(s.standard_section || s.id);
              return sectionId === standardSectionId;
            });
            if (section) {
              displayName = `${standard.name} - ${section.name}`;
              break;
            }
          }
        }
        // Fallback to standard_name and section_name if available
        if (!displayName && std.standard_name && std.section_name) {
          displayName = `${std.standard_name} - ${std.section_name}`;
        }
        // Final fallback
        if (!displayName) {
          displayName = `Section ${standardSectionId}`;
        }
      }
      
      return {
        id: standardSectionId, // This is the standard_section_id used in assignments
        name: displayName,
        standard_name: std.standard_name,
        section_name: std.section_name,
      };
    });
    
    // Debug logging
    console.log('Timetable View Debug:', {
      editableDraft: !!editableDraft,
      assignmentsCount: editableDraft?.assignments?.length || 0,
      selectedStandardsCount: selectedStandards?.length || 0,
      selectedStandardSectionsCount: selectedStandardSections.length,
      periodsCount: periods.length,
      daysCount: days.length,
      periodDayMappingsCount: periodDayMappings.length,
    });

    return (
      <Grid item xs={12}>
        <Paper style={{ padding: '20px', marginTop: '20px' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" className="m-b-20px">
            <Typography variant="h6">
              Generated Timetable View - Draft {editableDraft.draft_number} (Editable)
            </Typography>
            <Box display="flex" style={{ gap: '8px' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CancelIcon />}
                onClick={() => {
                  // Reset to original draft
                  const editableDraft = {
                    ...this.state.selectedDraft,
                    assignments: [...this.state.selectedDraft.assignments],
                  };
                  this.setState({ editableDraft });
                }}
              >
                Reset
              </Button>
            </Box>
          </Box>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px', border: '1px solid #ddd', background: '#f5f5f5', position: 'sticky', left: 0, zIndex: 10 }}>
                    Standard / Section
                  </th>
                  {filteredDays.map((day) => {
                    const periodsForDay = periods.filter((p) => !!periodDayMatrix[p.id]?.[day.id]);
                    if (periodsForDay.length === 0) return null;
                    return (
                      <th
                        key={day.id}
                        colSpan={periodsForDay.length}
                        style={{ padding: '10px', border: '1px solid #ddd', background: '#f5f5f5', textAlign: 'center' }}
                      >
                        {day.name}
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  <th style={{ padding: '10px', border: '1px solid #ddd', background: '#f5f5f5', position: 'sticky', left: 0, zIndex: 10 }}></th>
                  {filteredDays.map((day) => {
                    // Only include periods that have a valid mapping for this specific day
                    const periodsForDay = [...periods]
                      .filter((p) => !!periodDayMatrix[p.id]?.[day.id])
                      .sort((a, b) => {
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
                    if (periodsForDay.length === 0) return null;
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
                {selectedStandardSections.map((section) => {
                  return (
                    <tr key={section.id}>
                      <td
                        style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          background: '#fff',
                          position: 'sticky',
                          left: 0,
                          zIndex: 5,
                          fontWeight: 'bold',
                        }}
                      >
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <span>{section.name}</span>
                          <Tooltip title="Show Summary">
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => this.openSectionSummary(section.id, section.name)}
                            >
                              Summary
                            </Button>
                          </Tooltip>
                        </Box>
                      </td>
                      {filteredDays.map((day) => {
                        const periodsForDay = [...periods]
                          .filter((p) => !!periodDayMatrix[p.id]?.[day.id])
                          .sort((a, b) => {
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
                        if (periodsForDay.length === 0) return null;
                        
                        return periodsForDay.map((period) => {
                          const periodDayMapping = periodDayMatrix[period.id]?.[day.id];
                          if (!periodDayMapping) return null;
                          
                          const assignment = this.getCellAssignment(section.id, periodDayMapping.id);
                          
                          return (
                            <td
                              key={`${day.id}-${period.id}`}
                              onClick={() => this.handleCellClick(section.id, periodDayMapping.id)}
                              style={{
                                padding: '8px',
                                border: '1px solid #ddd',
                                background: assignment ? '#e8f5e9' : '#fff',
                                minWidth: '120px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = assignment ? '#c8e6c9' : '#f5f5f5';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = assignment ? '#e8f5e9' : '#fff';
                              }}
                            >
                              {assignment ? (
                                <Box>
                                  <Typography variant="body2" style={{ fontWeight: 600, fontSize: '12px' }}>
                                    {this.getStaffName(assignment.staff) || assignment.staff_name || 'N/A'}
                                  </Typography>
                                  <Typography variant="caption" style={{ fontSize: '11px', color: '#666' }}>
                                    {this.getSubjectName(assignment.subject) || assignment.subject_name || 'N/A'}
                                  </Typography>
                                  <Typography variant="caption" style={{ fontSize: '9px', color: '#999', fontStyle: 'italic' }}>
                                    Click to edit
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="caption" style={{ color: '#999', fontStyle: 'italic' }}>
                                  Unassigned - Click to assign
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
          </div>
        </Paper>
      </Grid>
    );
  };

  generateTimetable = () => {
    const { selectedYear, selectedDateRange, selectedPeriodPlan, selectedStandards, subjectFilters } = this.state;

    if (!selectedYear || !selectedDateRange || !selectedPeriodPlan) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please select Academic Year, Date Range, and Period Plan',
      });
      return;
    }

    if (!selectedStandards || selectedStandards.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Standards Selected',
        text: 'Please select at least one standard section to generate timetable',
      });
      return;
    }

    // Extract standard section IDs (already flattened)
    const standardSectionIds = selectedStandards.map((std) => std.id).filter((id) => id);

    if (standardSectionIds.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Sections Selected',
        text: 'Please select at least one section to generate timetable',
      });
      return;
    }

    this.setState({ generating: true, generationProgress: 0 });

    // Simulate progress (in real implementation, this could be from WebSocket or polling)
    const progressInterval = setInterval(() => {
      this.setState((prevState) => ({
        generationProgress: Math.min(prevState.generationProgress + 10, 90),
      }));
    }, 500);

    const data = {
      academic_year: selectedYear,
      date_range: selectedDateRange.id,
      period_plan: selectedPeriodPlan.id,
      standard_sections: standardSectionIds,
      constraints: this.state.constraints,
      subject_filters: subjectFilters,
      num_drafts: 3,
      max_iterations: 1000,
    };

    postRequest(POST_URL.autogeneratetimetable.api, data, this.props)
      .then((response) => {
        clearInterval(progressInterval);
        this.setState({ generationProgress: 100, generating: false });

        if (response && response.status === 200) {
          const drafts = response.data.data?.drafts || [];
          const selectedDraft = drafts[0] || null;
          
          // Create editable copy immediately
          const editableDraft = selectedDraft ? {
            ...selectedDraft,
            assignments: [...(selectedDraft.assignments || [])],
          } : null;
          
          this.setState({ drafts, selectedDraft, editableDraft }, () => {
            if (selectedDraft) {
              this.loadTimetableData();
            }
          });

          if (drafts.length > 0) {
            const best = drafts[0];
            const missing = best?.unassigned_summary?.total_missing || 0;
            if (missing > 0) {
              const topMissing = (best.unassigned_summary?.per_section || [])
                .filter((x) => x.missing > 0)
                .slice(0, 5)
                .map((x) => `${x.section_name}: ${x.missing}/${x.total_slots} missing`)
                .join('\n');
              Swal.fire({
                icon: 'warning',
                title: 'Incomplete Timetable',
                html: `Some classes could not be fully assigned.<br/><pre style="text-align:left;white-space:pre-wrap;margin:8px 0 0;">${topMissing}</pre><div style="margin-top:8px;color:#666;">For more detail, click the <b>Summary</b> button beside each class in the timetable.</div>`,
                confirmButtonText: 'Review',
              });
            } else {
              Swal.fire({
                icon: 'success',
                title: 'Generation Complete',
                text: `Generated ${drafts.length} timetable draft(s). Best draft has a score of ${drafts[0]?.score || 0}`,
              });
            }
          } else {
            Swal.fire({
              icon: 'warning',
              title: 'No Drafts Generated',
              text: 'Could not generate any valid timetable drafts. Please check your constraints.',
            });
          }
        }
      })
      .catch((error) => {
        clearInterval(progressInterval);
        this.setState({ generating: false, generationProgress: 0 });
        console.error('Error generating timetable:', error);
        Swal.fire({
          icon: 'error',
          title: 'Generation Failed',
          text: error.response?.data?.detail || 'Failed to generate timetable. Please try again.',
        });
      });
  };

  applyDraft = () => {
    const { editableDraft, selectedDraft, selectedYear, selectedDateRange, selectedPeriodPlan, selectedStandards } = this.state;

    const draftToApply = editableDraft || selectedDraft;

    if (!draftToApply) {
      Swal.fire({
        icon: 'warning',
        title: 'No Draft Selected',
        text: 'Please select a draft to apply',
      });
      return;
    }

    // Extract standard section IDs (selectedStandards is flattened with id = StandardSectionMapping id)
    const standardSectionIds = (selectedStandards || []).map((s) => s.id).filter(Boolean);

    const data = {
      academic_year: selectedYear,
      date_range: selectedDateRange.id,
      period_plan: selectedPeriodPlan.id,
      standard_sections: standardSectionIds,
      draft_assignments: draftToApply.assignments,
    };

    Swal.fire({
      title: 'Applying Timetable',
      text: 'This will replace existing timetable assignments. Continue?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Apply',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        postRequest(POST_URL.applygeneratedtimetable.api, data, this.props)
          .then((response) => {
            if (response && response.status === 200) {
              Swal.fire({
                icon: 'success',
                title: 'Timetable Applied',
                text: `Successfully applied timetable. Created: ${response.data.data?.created || 0}, Updated: ${response.data.data?.updated || 0}`,
              }).then(() => {
                // Redirect to view timetable or refresh
                this.props.history.push('/time-table/assign-timetable');
              });
            }
          })
          .catch((error) => {
            console.error('Error applying timetable:', error);
            Swal.fire({
              icon: 'error',
              title: 'Application Failed',
              text: error.response?.data?.detail || 'Failed to apply timetable. Please try again.',
            });
          });
      }
    });
  };

  render() {
    const {
      loading,
      generating,
      selectedYear,
      yearList,
      dateRangeList,
      selectedDateRange,
      periodPlanList,
      selectedPeriodPlan,
      standards,
      selectedStandards,
      drafts,
      selectedDraft,
      generationProgress,
    } = this.state;

    return (
      <div className="auto-generate-timetable-container">
        <Paper className="p-20px">
          <Typography variant="h5" className="m-b-20px">
            Automated Timetable Generation System (ATGS)
          </Typography>
          <Typography variant="body2" className="m-b-20px" color="textSecondary">
            Automatically generate optimized timetables based on constraints. The system will create multiple draft options for you to choose from.
          </Typography>

          <Grid container spacing={3}>
            {/* Selection Controls */}
            <Grid item xs={12} md={6}>
              <Dropdown
                label="Academic Year"
                data={yearList}
                customName="name"
                customId="id"
                value={selectedYear}
                onChange={this.handleYearChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Dropdown
                label="Date Range"
                data={dateRangeList}
                customName="label"
                customId="id"
                value={selectedDateRange?.id || ''}
                onChange={this.handleDateRangeChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Dropdown
                label="Period Plan"
                data={periodPlanList}
                customName="name"
                customId="id"
                value={selectedPeriodPlan?.id || ''}
                onChange={this.handlePeriodPlanChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: 8 }}>Select Standards & Sections</Typography>
              <MultipleSelectDropdown
                id="standard-section-select"
                data_list={standards || []}
                selected_list={selectedStandards || []}
                onChange={this.handleStandardChange}
                optionValue="name"
                customId="id"
                placeholder="Select standards and sections to generate timetable for"
                enableSelectAll
              />
            </Grid>

            {/* Per-Class Subject Selection */}
            {selectedStandards && selectedStandards.length > 0 && (
              <Grid item xs={12}>
                <Paper style={{ padding: '12px', marginTop: '8px' }}>
                  <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: 8 }}>Select Subjects Per Class</Typography>
                  <Box display="flex" justifyContent="flex-end" className="m-b-10px">
                    <Button variant="outlined" color="primary" onClick={this.openSubjectConfigDialog}>
                      Configure Subjects (Bulk)
                    </Button>
                  </Box>
                  <Grid container spacing={2}>
                    {selectedStandards.map((std) => (
                      <Grid item xs={12} md={6} key={`subj-${std.id}`}>
                        <Typography variant="body2" style={{ fontWeight: 600, marginBottom: 4 }}>
                          {std.name || `${std.standard_name || ''} ${std.section_name || ''}`}
                        </Typography>
                        <MultipleSelectDropdown
                          id={`subjects-${std.id}`}
                          data_list={(this.state.subjectsBySection[std.id] || [])}
                          selected_list={(this.state.subjectFilters[std.id] || []).map((sid) => {
                            const list = this.state.subjectsBySection[std.id] || [];
                            const found = list.find((s) => String(s.id) === String(sid));
                            return { id: sid, name: found ? found.name : '' };
                          })}
                          onChange={(selectedSubjects) => {
                            const ids = (selectedSubjects || []).map((s) => s.id);
                            this.setState({ subjectFilters: { ...this.state.subjectFilters, [std.id]: ids } });
                          }}
                          optionValue="name"
                          customId="id"
                          placeholder="Select subjects for this class"
                        />
                      </Grid>
                    ))}
                  </Grid>
                  <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: 8 }}>
                    Only the selected subjects will be considered for timetable generation for each class.
                  </Typography>
                </Paper>
              </Grid>
            )}
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<GenerateIcon />}
                onClick={this.generateTimetable}
                disabled={generating || !selectedYear || !selectedDateRange || !selectedPeriodPlan || !selectedStandards || selectedStandards.length === 0}
                fullWidth
                size="large"
              >
                {generating ? 'Generating...' : 'Generate Timetable'}
              </Button>
            </Grid>

            {/* Generation Progress */}
            {generating && (
              <Grid item xs={12}>
                <Box>
                  <Typography variant="body2" className="m-b-10px">
                    Generating timetables... {generationProgress}%
                  </Typography>
                  <LinearProgress variant="determinate" value={generationProgress} />
                </Box>
              </Grid>
            )}

            {/* Constraints Filters */}
            <Grid item xs={12}>
              <Paper style={{ padding: '12px', marginTop: '8px' }}>
                <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: 8 }}>Constraints</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          color="primary"
                          checked={this.state.constraints.avoid_consecutive_periods}
                          onChange={(e) => this.setState({ constraints: { ...this.state.constraints, avoid_consecutive_periods: e.target.checked } })}
                        />
                      }
                      label="Avoid consecutive periods for a teacher"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          color="primary"
                          checked={this.state.constraints.spread_subjects}
                          onChange={(e) => this.setState({ constraints: { ...this.state.constraints, spread_subjects: e.target.checked } })}
                        />
                      }
                      label="Spread subjects evenly across days"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          color="primary"
                          checked={this.state.constraints.spread_staff_load}
                          onChange={(e) => this.setState({ constraints: { ...this.state.constraints, spread_staff_load: e.target.checked } })}
                        />
                      }
                      label="Balance staff workload"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Draft Selection */}
            {drafts.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" className="m-b-15px">
                  Generated Drafts ({drafts.length})
                </Typography>
                <Grid container spacing={2}>
                  {drafts.map((draft, index) => (
                    <Grid item xs={12} md={4} key={draft.draft_number}>
                      <Card
                        style={{
                          cursor: 'pointer',
                          border: selectedDraft?.draft_number === draft.draft_number ? '2px solid #1976d2' : '1px solid #e0e0e0',
                        }}
                        onClick={() => {
                          // Create editable copy of draft
                          const editableDraft = {
                            ...draft,
                            assignments: [...draft.assignments],
                          };
                          this.setState({ 
                            selectedDraft: draft,
                            editableDraft: editableDraft,
                          }, () => {
                            if (!this.state.periods.length) {
                              this.loadTimetableData();
                            }
                          });
                        }}
                      >
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" className="m-b-10px">
                            <Typography variant="h6">Draft {draft.draft_number}</Typography>
                            {index === 0 && (
                              <Chip label="Best" color="primary" size="small" />
                            )}
                          </Box>
                          <Box display="flex" alignItems="center" className="m-b-5px">
                            <CheckIcon style={{ color: '#4caf50', marginRight: 8 }} />
                            <Typography variant="body2">Score: {draft.score.toFixed(2)}</Typography>
                          </Box>
                          {draft.violations > 0 && (
                            <Box display="flex" alignItems="center" className="m-b-5px">
                              <WarningIcon style={{ color: '#ff9800', marginRight: 8 }} />
                              <Typography variant="body2" color="textSecondary">
                                {draft.violations} violation(s)
                              </Typography>
                            </Box>
                          )}
                          <Typography variant="body2" color="textSecondary">
                            {draft.assignments?.length || 0} assignments
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}

            {/* Apply Button and View Toggle */}
            {selectedDraft && (
              <Grid item xs={12}>
                <Box display="flex" style={{ gap: '16px' }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      if (!this.state.periods.length || !this.state.editableDraft) {
                        // Load timetable data and ensure editableDraft is set
                        if (!this.state.editableDraft && this.state.selectedDraft) {
                          const editableDraft = {
                            ...this.state.selectedDraft,
                            assignments: [...this.state.selectedDraft.assignments],
                          };
                          this.setState({ editableDraft }, () => {
                            this.loadTimetableData();
                          });
                        } else {
                          this.loadTimetableData();
                        }
                      } else {
                        this.setState({ showTimetableView: !this.state.showTimetableView });
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    {this.state.showTimetableView ? 'Hide Timetable View' : 'Show Timetable View'}
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={this.applyDraft}
                    style={{ flex: 1 }}
                    size="large"
                  >
                    Apply Selected Draft
                  </Button>
                </Box>
              </Grid>
            )}

            {/* Timetable View */}
            {selectedDraft && this.state.showTimetableView && this.state.editableDraft && this.renderTimetableView()}
          </Grid>
        </Paper>

        {/* Assignment Dialog */}
        {this.renderAssignmentDialog()}

        {/* Bulk Subject Configuration Dialog */}
        <Dialog
          open={this.state.showSubjectConfigDialog}
          onClose={this.closeSubjectConfigDialog}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" style={{ fontWeight: 700 }}>Configure Subjects for Selected Classes</Typography>
            <Typography variant="body2" color="textSecondary">
              Use bulk actions to quickly select subjects across sections. Your selections are saved automatically.
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                padding: 12,
                background: '#fafbfd',
                marginBottom: 12,
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" style={{ gap: 12 }}>
                    <Chip size="small" label="Tip" color="primary" />
                    <Typography variant="body2" color="textSecondary">
                      Header checkbox selects a subject for all sections; left checkbox selects all subjects for that section.
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box
                    display="flex"
                    justifyContent="flex-end"
                    alignItems="center"
                    style={{ flexWrap: 'wrap' }}
                  >
                    {(Array.from(new Set((this.state.subjectMatrixSections || []).map((s) => s.standard_name))).filter(Boolean) || []).map((stdName) => (
                      <Button
                        key={`copy-${stdName}`}
                        size="small"
                        variant="outlined"
                        style={{ marginLeft: 8, marginBottom: 8 }}
                        onClick={() => this.copyFirstSectionToAllInStandard(stdName)}
                      >
                        Copy first {stdName} row to all
                      </Button>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Box>
            <Box style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
              <table
                className="table table-bordered"
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        position: 'sticky',
                        left: 0,
                        top: 0,
                        background: '#f5f7fb',
                        zIndex: 2,
                        padding: 10,
                        borderBottom: '1px solid #e0e0e0',
                        borderRight: '1px solid #e0e0e0',
                        fontWeight: 600,
                      }}
                    >
                      Section / Subject
                    </th>
                    {this.state.subjectMatrixSubjects.map((sub) => (
                      <th
                        key={`h-${sub.id}`}
                        style={{
                          textAlign: 'center',
                          position: 'sticky',
                          top: 0,
                          background: '#f5f7fb',
                          zIndex: 1,
                          padding: 10,
                          borderBottom: '1px solid #e0e0e0',
                          borderRight: '1px solid #e0e0e0',
                          minWidth: 140,
                        }}
                      >
                        <Box display="flex" alignItems="center" justifyContent="center" style={{ gap: 8 }}>
                          <Typography variant="body2" style={{ fontWeight: 600 }}>{sub.name}</Typography>
                          <Tooltip title="Select for all sections">
                            <Checkbox
                              size="small"
                              color="primary"
                              onChange={(e) => this.selectAllForSubject(sub.id, e.target.checked)}
                            />
                          </Tooltip>
                        </Box>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {this.state.subjectMatrixSections.map((sec, rowIdx) => {
                    const selected = this.state.subjectFilters[sec.id] || [];
                    const selectedSet = new Set((selected || []).map(String));
                    const rowBg = rowIdx % 2 === 0 ? '#fff' : '#fafafa';
                    return (
                      <tr key={`r-${sec.id}`} style={{ background: rowBg }}>
                        <td
                          style={{
                            position: 'sticky',
                            left: 0,
                            background: rowBg,
                            zIndex: 1,
                            padding: 10,
                            borderRight: '1px solid #e0e0e0',
                            minWidth: 220,
                          }}
                        >
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <div>
                              <Typography variant="body2" style={{ fontWeight: 700 }}>{sec.name}</Typography>
                              {sec.standard_name ? (
                                <Typography variant="caption" color="textSecondary">{sec.standard_name}</Typography>
                              ) : null}
                            </div>
                            <div>
                              <Tooltip title="Select all subjects for this section">
                                <Checkbox
                                  size="small"
                                  color="primary"
                                  checked={
                                    (this.state.subjectMatrixSubjects || []).length > 0 &&
                                    (selected || []).length === (this.state.subjectMatrixSubjects || []).length
                                  }
                                  onChange={(e) => this.selectAllForSection(sec.id, e.target.checked)}
                                />
                              </Tooltip>
                            </div>
                          </Box>
                        </td>
                        {this.state.subjectMatrixSubjects.map((sub) => (
                          <td
                            key={`c-${sec.id}-${sub.id}`}
                            style={{
                              textAlign: 'center',
                              padding: 6,
                              borderRight: '1px solid #eee',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f6ff')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            {(() => {
                              const availableIds = new Set((this.state.subjectsBySection[sec.id] || []).map((x) => String(x.id)));
                              const isAvailable = availableIds.has(String(sub.id));
                              const box = (
                                <Checkbox
                                  size="small"
                                  color="primary"
                                  checked={selectedSet.has(String(sub.id))}
                                  onChange={(e) => this.toggleSectionSubject(sec.id, sub.id, e.target.checked)}
                                  disabled={!isAvailable}
                                />
                              );
                              return isAvailable ? box : (
                                <Tooltip title="Subject not assigned to this section">
                                  <span>{box}</span>
                                </Tooltip>
                              );
                            })()}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeSubjectConfigDialog} variant="contained" color="primary">
              Done
            </Button>
          </DialogActions>
        </Dialog>

        {/* Section Summary Dialog */}
        <Dialog
          open={this.state.showSummaryDialog}
          onClose={this.closeSectionSummary}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {this.state.summaryData ? `Summary - ${this.state.summaryData.sectionName}` : 'Summary'}
          </DialogTitle>
          <DialogContent>
            {this.state.summaryData && (
              <Box>
                <Typography variant="subtitle2" style={{ marginBottom: 6 }}>Classes per Subject</Typography>
                <Box style={{ marginBottom: 12 }}>
                  {(this.state.summaryData.subjectCounts || []).length > 0 ? (
                    (this.state.summaryData.subjectCounts || []).map((row) => (
                      <Box key={`sub-${row.id}`} display="flex" justifyContent="space-between" style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
                        <Typography variant="body2">{row.name}</Typography>
                        <Typography variant="body2" style={{ fontWeight: 600 }}>{row.count}</Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="caption" color="textSecondary">No subject assignments</Typography>
                  )}
                </Box>
                <Typography variant="subtitle2" style={{ marginBottom: 6 }}>Classes per Teacher</Typography>
                <Box>
                  {(this.state.summaryData.teacherCounts || []).length > 0 ? (
                    (this.state.summaryData.teacherCounts || []).map((row) => (
                      <Box key={`t-${row.id}`} display="flex" justifyContent="space-between" style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
                        <Typography variant="body2">{row.name}</Typography>
                        <Typography variant="body2" style={{ fontWeight: 600 }}>{row.count}</Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="caption" color="textSecondary">No teacher assignments</Typography>
                  )}
                </Box>
                <Box style={{ marginTop: 12 }}>
                  <Typography variant="subtitle2" style={{ marginBottom: 6 }}>Unassigned Slots</Typography>
                  {(this.state.summaryData.unassignedSlots || []).length > 0 ? (
                    <Box style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6 }}>
                      {(this.state.summaryData.unassignedSlots || []).map((slot, idx) => (
                        <Box key={`ua-${idx}`} display="flex" justifyContent="space-between" style={{ padding: '6px 10px', borderBottom: '1px solid #f2f2f2' }}>
                          <Typography variant="body2">{slot.day} - {slot.period}</Typography>
                          <Typography variant="body2" color="textSecondary">{slot.time}</Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="textSecondary">None</Typography>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeSectionSummary}>Close</Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }

  renderAssignmentDialog = () => {
    const {
      showAssignmentDialog,
      availableStaffSubjects,
      selectedStaff,
      selectedSubject,
      conflictingAssignments,
      currentCell,
      staffSearch,
      subjectSearch,
    } = this.state;

    if (!showAssignmentDialog || !currentCell) return null;

    // Group staff-subject combinations by staff
    const staffGroups = {};
    availableStaffSubjects.forEach((mapping) => {
      const staffId = mapping.staff__id;
      if (!staffGroups[staffId]) {
        staffGroups[staffId] = {
          staff: {
            id: staffId,
            name: `${mapping.staff__first_name || ''} ${mapping.staff__middle_name || ''} ${mapping.staff__last_name || ''}`.trim(),
          },
          subjects: [],
        };
      }
      staffGroups[staffId].subjects.push({
        id: mapping.subject__id,
        name: mapping.subject__name,
      });
    });

    // Build filtered staff list
    const allStaff = Object.values(staffGroups)
      .map((g) => g.staff)
      .filter((s) =>
        !staffSearch ? true : (s.name || '').toLowerCase().includes(staffSearch.toLowerCase())
      );

    // Build subject list for selected staff or all unique subjects if none selected
    const subjectsForSelectedStaff = selectedStaff ? (staffGroups[selectedStaff]?.subjects || []) : [];
    const uniqueSubjects = selectedStaff
      ? subjectsForSelectedStaff
      : Array.from(
          new Map(
            Object.values(staffGroups)
              .flatMap((g) => g.subjects)
              .map((s) => [s.id, s])
          ).values()
        );
    const filteredSubjects = uniqueSubjects.filter((s) =>
      !subjectSearch ? true : (s.name || '').toLowerCase().includes(subjectSearch.toLowerCase())
    );

    return (
      <Dialog
        open={showAssignmentDialog}
        onClose={this.closeAssignmentDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Assign Staff & Subject
          {conflictingAssignments.length > 0 && (
            <Box mt={1} p={1} style={{ background: '#fff3cd', borderRadius: '4px' }}>
              <Typography variant="caption" style={{ color: '#856404', fontWeight: 600 }}>
                ⚠️ Warning: This staff is already assigned to another section at this time
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Subject Left */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Select Subject:
              </Typography>
              <TextField
                variant="outlined"
                size="small"
                fullWidth
                placeholder="Search subject..."
                value={subjectSearch}
                onChange={(e) => this.setState({ subjectSearch: e.target.value })}
                style={{ marginBottom: 8 }}
              />
              <Box display="flex" flexDirection="column" style={{ gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                {filteredSubjects.map((subject) => {
                  const isSelected = selectedSubject === subject.id;
                  return (
                    <Box
                      key={subject.id}
                      onClick={() => {
                        this.setState({ selectedSubject: subject.id });
                      }}
                      style={{
                        padding: '8px',
                        border: `2px solid ${isSelected ? '#1976d2' : '#e0e0e0'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: isSelected ? '#e3f2fd' : '#fff',
                      }}
                    >
                      <Typography variant="body2" style={{ fontWeight: isSelected ? 600 : 400 }}>
                        {subject.name}
                      </Typography>
                    </Box>
                  );
                })}
                {filteredSubjects.length === 0 && (
                  <Typography variant="caption" color="textSecondary">No subjects found</Typography>
                )}
              </Box>
            </Grid>

            {/* Staff Right */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Select Staff:
              </Typography>
              <TextField
                variant="outlined"
                size="small"
                fullWidth
                placeholder="Search staff..."
                value={staffSearch}
                onChange={(e) => this.setState({ staffSearch: e.target.value })}
                style={{ marginBottom: 8 }}
              />
              <Box display="flex" flexDirection="column" style={{ gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                {allStaff.map((staff) => {
                  const group = staffGroups[staff.id];
                  const hasConflict = conflictingAssignments.some((c) => c.staff === staff.id);
                  const isSelected = selectedStaff === staff.id;
                  return (
                    <Box
                      key={staff.id}
                      onClick={() => {
                        this.setState({ selectedStaff: staff.id, selectedSubject: null });
                      }}
                      style={{
                        padding: '8px',
                        border: `2px solid ${isSelected ? '#1976d2' : '#e0e0e0'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: isSelected ? '#e3f2fd' : '#fff',
                        opacity: hasConflict ? 0.7 : 1,
                      }}
                    >
                      <Typography variant="body2" style={{ fontWeight: isSelected ? 600 : 400 }}>
                        {staff.name}
                        {hasConflict && (
                          <Chip
                            label="Conflict"
                            size="small"
                            style={{ marginLeft: '8px', background: '#ff9800', color: '#fff' }}
                          />
                        )}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {(group?.subjects || []).length} subject(s)
                      </Typography>
                    </Box>
                  );
                })}
                {allStaff.length === 0 && (
                  <Typography variant="caption" color="textSecondary">No staff found</Typography>
                )}
              </Box>
            </Grid>
          </Grid>

          <Box mt={2} display="flex" justifyContent="space-between">
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                if (currentCell) {
                  this.clearAssignment(currentCell.standardSectionId, currentCell.periodDayMappingId);
                }
                this.closeAssignmentDialog();
              }}
            >
              Clear Assignment
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={this.closeAssignmentDialog} color="default">
            Cancel
          </Button>
          <Button
            onClick={this.saveAssignment}
            color="primary"
            variant="contained"
            disabled={!selectedStaff || !selectedSubject}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
}

export default withRouter(AutoGenerateTimetable);

