import React, { Component } from 'react';
import {
  Paper,
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import AddIcon from '@material-ui/icons/Add';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import LibraryBooksOutlinedIcon from '@material-ui/icons/LibraryBooksOutlined';
import AssignmentOutlinedIcon from '@material-ui/icons/AssignmentOutlined';
import ArrowBackOutlinedIcon from '@material-ui/icons/ArrowBackOutlined';
import SaveOutlinedIcon from '@material-ui/icons/SaveOutlined';
import TuneOutlinedIcon from '@material-ui/icons/TuneOutlined';
import TouchAppOutlinedIcon from '@material-ui/icons/TouchAppOutlined';
import { withRouter } from 'react-router-dom';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { getAcademicYear } from 'Includes/functions';
import Swal from 'sweetalert2';
import classNames from 'classnames';
import { Dropdown } from 'Components/DropDown';
import { Actions } from 'Constants/permissions';

class LessonPlanAllocation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      academicYear: '',
      subject: '',
      standardSection: '',
      standardSectionData: null,
      yearList: [],
      subjectList: [],
      staffList: [],
      standardSectionList: [],
      templateList: [],
      templateDropdownOptions: [],
      selectedTemplateId: '',
      useTemplate: false,
      loading: true,
      templateListLoading: false,
      topics: [],
      templateName: '',
      expandedTopic: 0,
    };
  }

  componentDidMount() {
    const allocationId = this.props.location?.state?.detail;
    const isEdit = this.props.isEdit && allocationId;
    if (isEdit) {
      this.setState({ allocationId }, () => this.fetchInitialData());
    } else {
      this.fetchInitialData();
    }
  }

  getDefaultAllocatedStaffId = () => {
    const { staffList } = this.state;
    if (!Array.isArray(staffList) || staffList.length !== 1) return '';
    return String(staffList[0].id);
  };

  /** MUI Select matches MenuItem values strictly; staff ids from API are often numbers while state stores strings. */
  resolveStaffDropdownValue = (subtopic, staffList) => {
    const list = Array.isArray(staffList) ? staffList : [];
    if (list.length === 1 && list[0]) return list[0].id;
    const raw = subtopic?.allocatedToUser;
    if (raw === '' || raw == null) return 0;
    const found = list.find((s) => String(s.id) === String(raw));
    return found ? found.id : 0;
  };

  applySingleStaffDefaultToAllSubtopics = (staffId) => {
    if (!staffId) return;
    this.setState((prev) => ({
      topics: (prev.topics || []).map((t) => ({
        ...t,
        subtopics: (t.subtopics || []).map((s) => ({
          ...s,
          allocatedToUser: s.allocatedToUser || staffId,
        })),
      })),
    }));
  };

  /** Staff id from API: prefers subtopic_detail.allocated_to_user, then staff / assigned_staff. */
  parseSubtopicStaffId = (s, first, allocationLevelStaffId) => {
    const rawAu = first?.allocated_to_user ?? s?.allocated_to_user;
    if (rawAu != null && rawAu !== '') {
      if (typeof rawAu === 'object' && !Array.isArray(rawAu)) {
        const id = rawAu.id ?? rawAu.pk;
        if (id != null) return String(id);
      } else {
        return String(rawAu);
      }
    }
    const st = first?.staff ?? s?.staff;
    if (st && typeof st === 'object') return String(st.id ?? st);
    if (st != null && typeof st !== 'object') return String(st);
    const arr = first?.assigned_staff ?? s?.assigned_staff;
    if (Array.isArray(arr) && arr.length) {
      const a = arr[0];
      return String(a?.id ?? a);
    }
    return allocationLevelStaffId || '';
  };

  /** Display name when API nests user on allocated_to_user (staff may be missing from staffList). */
  allocatedToUserNameFromApi = (s, first) => {
    const rawAu = first?.allocated_to_user ?? s?.allocated_to_user;
    if (rawAu && typeof rawAu === 'object' && !Array.isArray(rawAu)) {
      return (
        rawAu.name ||
        rawAu.full_name ||
        rawAu.username ||
        rawAu.staff_name ||
        ''
      );
    }
    return '';
  };

  isViewMode = () => {
    const state = this.props.location?.state || {};
    const search = this.props.location?.search || '';
    const queryParams = new URLSearchParams(search);
    return (
      state.readOnly === true ||
      state.mode === 'view' ||
      queryParams.get('mode') === 'view' ||
      queryParams.get('readOnly') === 'true'
    );
  };

  fetchInitialData = () => {
    this.setState({ loading: true });
    Promise.all([
      getRequest(GET_URL.getacademicyear?.api || 'institutes/getacademicyear/', { is_active: true }, this.props),
      getRequest(GET_URL.subject?.api || 'classes/subject/', {}, this.props),
      getRequest(GET_URL.staff?.api || 'staffs/staff/', {}, this.props),
    ])
      .then(([yearRes, subjectRes, staffRes]) => {
        const yearList = yearRes?.status === 200 ? yearRes.data?.data || [] : [];
        const subjectList = subjectRes?.status === 200 ? subjectRes.data?.data || [] : [];
        const rawStaff =
          staffRes?.status === 200
            ? staffRes?.data?.data?.data_list || staffRes?.data?.data || staffRes?.data?.results || []
            : [];
        const staffList = (Array.isArray(rawStaff) ? rawStaff : []).map((s) => ({
          id: s.id,
          name: s.name || s.full_name || s.username || s.staff_name || `Staff ${s.id}`,
        }));
        const savedYear = getAcademicYear();
        const hasSavedYear = savedYear && yearList.some((y) => String(y.id) === String(savedYear));
        const defaultYear = hasSavedYear
          ? String(savedYear)
          : yearList.length
          ? String(yearList[0].id)
          : '';
        this.setState({
          yearList,
          subjectList,
          staffList,
          academicYear: defaultYear,
        }, () => {
          if (this.state.allocationId) {
            this.fetchAllocationById();
          } else {
            if (this.state.academicYear) this.fetchStandardSections();
            this.setState({ loading: false });
          }
        });
      })
      .catch(() => this.setState({ loading: false }));
  };

  fetchAllocationById = () => {
    const { allocationId } = this.state;
    if (!allocationId) return;
    const url = (GET_URL.lessonplantemplateacademicyear?.api || 'classes/lessonplantemplateacademicyear/') + allocationId + '/';
    getRequest(url, {}, this.props)
      .then((response) => {
        if (response && response.status === 200 && response.data) {
          const data = response.data?.data ?? response.data;
          const academicYear = data.academic_year ? String(data.academic_year?.id ?? data.academic_year) : '';
          const subject = data.subject ? String(data.subject?.id ?? data.subject) : '';
          const standardSection = data.standard_section ? String(data.standard_section?.id ?? data.standard_section) : '';
          const allocationLevelStaffId = (() => {
            if (Array.isArray(data.assigned_staff) && data.assigned_staff.length) {
              return String(data.assigned_staff[0]?.id ?? data.assigned_staff[0]);
            }
            if (data.staff) return String(data.staff?.id ?? data.staff);
            const rootAu = data.allocated_to_user;
            if (rootAu != null && rootAu !== '') {
              if (typeof rootAu === 'object' && !Array.isArray(rootAu)) {
                const id = rootAu.id ?? rootAu.pk;
                if (id != null) return String(id);
              }
              return String(rootAu);
            }
            return '';
          })();
          const standardSectionData = typeof data.standard_section === 'object' ? data.standard_section : null;
          const templateId = data.lesson_plan_template ? String(data.lesson_plan_template?.id ?? data.lesson_plan_template) : '';
          const rawTopics = data.topics ?? data.topics_data ?? [];
          const topics = rawTopics.map((t, idx) => {
            const rawSubtopics = t.subtopics ?? t.subtopic_list ?? [];
            const subtopics = rawSubtopics.map((s, sIdx) => {
              const details = s.subtopic_details ?? s.details ?? s.subtopic_detail ?? [];
              const first = Array.isArray(details) ? details[0] : details;
              const allocatedToUser =
                this.parseSubtopicStaffId(s, first, allocationLevelStaffId) ||
                this.getDefaultAllocatedStaffId();
              return {
                id: s.id ?? sIdx + 1,
                detailId: first?.id,
                name: s.name ?? '',
                allocated_from_date: s.allocated_from_date ?? first?.allocated_from_date ?? '',
                allocated_to_date: s.allocated_to_date ?? first?.allocated_to_date ?? '',
                objectives: first?.objectives ?? '',
                activities: first?.activities ?? '',
                resource: first?.resource ?? '',
                assessment: first?.assessment ?? '',
                completion_date: first?.completion_date ?? '',
                allocatedToUser,
              };
            });
            return {
              id: t.id ?? idx + 1,
              name: t.name ?? t.topic_name ?? '',
              subtopics: subtopics.length
                ? subtopics
                : [{
                  id: 1,
                  name: '',
                  allocated_from_date: '',
                  allocated_to_date: '',
                  objectives: '',
                  activities: '',
                  resource: '',
                  assessment: '',
                  allocatedToUser: this.getDefaultAllocatedStaffId(),
                }],
            };
          });
          const templateName = data.lesson_plan_template?.plan_name ?? data.plan_name ?? data.template_name ?? '';
          this.setState({
            academicYear: academicYear || this.state.academicYear,
            subject,
            standardSection,
            standardSectionData,
            selectedTemplateId: templateId,
            useTemplate: Boolean(templateId),
            templateName,
            topics: topics.length ? topics : [],
            expandedTopic: 0,
          }, () => {
            if (this.state.academicYear) this.fetchStandardSections();
            if (subject && standardSection) this.fetchTemplates(true);
          });
        }
        this.setState({ loading: false });
      })
      .catch(() => this.setState({ loading: false }));
  };

  fetchStandardSections = () => {
    const { academicYear, standardSection, standardSectionData } = this.state;
    if (!academicYear) return;
    const url = GET_URL.getstandardandsection?.api || 'classes/getstandardandsection/';
    getRequest(url, { academic_year: academicYear, is_active: true }, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const standardsData = response.data?.data || [];
          const flattened = [];
          (standardsData || []).forEach((standard) => {
            const sections = standard.sections || [];
            sections.forEach((section) => {
            const sectionId = section.standard_section ?? section.id;
            flattened.push({
              id: sectionId,
              name: `${standard.standard_name || standard.name || ''} - ${section.section_name || section.name || ''}`,
              standardName: standard.standard_name || standard.name || '',
              sectionName: section.section_name || section.name || '',
            });
          });
          });
          const sid = standardSection != null && standardSection !== '' ? String(standardSection) : '';
          if (
            sid &&
            standardSectionData &&
            !flattened.some((x) => String(x.id) === sid)
          ) {
            const stdName = standardSectionData.standard_name || '';
            const secName =
              standardSectionData.section__name ||
              standardSectionData.section_name ||
              standardSectionData.section?.name ||
              '';
            const label = [stdName, secName].filter(Boolean).join(' - ') || `Standard Section ${sid}`;
            flattened.push({
              id: standardSectionData.id != null ? standardSectionData.id : standardSection,
              name: label,
              standardName: stdName,
              sectionName: secName,
            });
          }
          this.setState({ standardSectionList: flattened });
        }
      });
  };

  handleChange = (e) => {
    const { name, value } = e.target;
    const nextState = { [name]: value };
    if (name === 'standardSection') {
      nextState.standardSectionData = null;
    }
    this.setState(nextState, () => {
      if (name === 'academicYear') this.fetchStandardSections();
      if (name === 'subject' || name === 'standardSection') this.fetchTemplates();
    });
  };

  fetchTemplates = (preserveSelectedTemplateId = false) => {
    const { subject, standardSection } = this.state;
    if (!subject || !standardSection) return;
    const resetState = {
      templateListLoading: true,
      templateList: [],
      templateDropdownOptions: [],
    };
    if (!preserveSelectedTemplateId) {
      resetState.selectedTemplateId = '';
    }
    this.setState(resetState);
    const url = GET_URL.lessonplantemplate?.api || 'classes/lessonplantemplate/';
    const params = { standard_section: standardSection, subject };
    getRequest(url, params, this.props)
      .then((response) => {
        this.setState({ templateListLoading: false });
        if (response && response.status === 200 && response.data) {
          const data = response.data?.data ?? response.data?.results ?? response.data;
          const list = Array.isArray(data) ? data : [];
          const options = list.map((t) => ({
            id: t.id,
            name: t.plan_name ?? t.template_name ?? t.name ?? `Template ${t.id}`,
          }));
          this.setState({ templateList: list, templateDropdownOptions: options });
        } else {
          this.setState({ templateList: [] });
        }
      })
      .catch(() => this.setState({ templateListLoading: false, templateList: [] }));
  };

  handleIsFromTemplate = () => {
    this.setState(
      {
        useTemplate: true,
        selectedTemplateId: '',
        templateName: '',
        templateDropdownOptions: [],
        topics: [],
        expandedTopic: 0,
      },
      () => this.fetchTemplates(false)
    );
  };

  handleCreateManually = () => {
    this.setState({
      useTemplate: false,
      selectedTemplateId: '',
      templateName: '',
      templateDropdownOptions: [],
      templateListLoading: false,
      topics: [
        {
          id: 1,
          name: '',
          sequence: 0,
          subtopics: [
            {
              id: 1,
              detailId: null,
              name: '',
              allocated_from_date: '',
              allocated_to_date: '',
              objectives: '',
              activities: '',
              resource: '',
              assessment: '',
              sequence: 0,
              allocatedToUser: this.getDefaultAllocatedStaffId(),
              completion_date: '',
            },
          ],
        },
      ],
      expandedTopic: 0,
    });
  };

  handleTemplateSelect = (e) => {
    const templateId = e?.target?.value ?? e;
    if (!templateId) return;
    this.setState({ useTemplate: true, selectedTemplateId: templateId }, () => this.fetchTemplateById(templateId));
  };

  fetchTemplateById = (templateId) => {
    if (!templateId) return;
    const url = (GET_URL.lessonplantemplate?.api || 'classes/lessonplantemplate/') + templateId + '/';
    getRequest(url, {}, this.props)
      .then((response) => {
        if (response && response.status === 200 && response.data) {
          const data = response.data?.data ?? response.data;
          const rawTopics = data.topics ?? data.topic_list ?? [];
          const topics = rawTopics.map((t, idx) => {
            const rawSubtopics = t.subtopics ?? t.subtopic_list ?? [];
            const subtopics = rawSubtopics.map((s, sIdx) => {
              const details = s.subtopic_details ?? s.details ?? [];
              const first = details[0] || {};
              return {
                id: s.id ?? sIdx + 1,
                name: s.name ?? '',
                allocated_from_date: s.allocated_from_date ?? first.allocated_from_date ?? '',
                allocated_to_date: s.allocated_to_date ?? first.allocated_to_date ?? '',
                objectives: first.objectives ?? '',
                activities: first.activities ?? '',
                resource: first.resource ?? '',
                assessment: first.assessment ?? '',
                allocatedToUser: this.getDefaultAllocatedStaffId(),
                completion_date: '',
              };
            });
            return {
              id: t.id ?? idx + 1,
              name: t.name ?? t.topic_name ?? '',
              subtopics: subtopics.length ? subtopics : [{
                id: 1,
                name: '',
                allocated_from_date: '',
                allocated_to_date: '',
                objectives: '',
                activities: '',
                resource: '',
                assessment: '',
                allocatedToUser: this.getDefaultAllocatedStaffId(),
                completion_date: '',
              }],
            };
          });
          this.setState({
            templateName: data.plan_name ?? data.template_name ?? data.name ?? '',
            topics: topics.length ? topics : [],
            expandedTopic: 0,
          });
        }
      })
      .catch(() => {});
  };

  handleTopicChange = (topicIndex, field, value) => {
    const { topics } = this.state;
    const next = [...topics];
    next[topicIndex] = { ...next[topicIndex], [field]: value };
    this.setState({ topics: next });
  };

  handleSubtopicChange = (topicIndex, subtopicIndex, field, value) => {
    const { topics, staffList } = this.state;
    const next = [...topics];
    const subtopics = [...(next[topicIndex].subtopics || [])];
    const prev = subtopics[subtopicIndex] || {};
    if (field === 'allocatedToUser') {
      const cleared = value === '' || value == null;
      const found =
        !cleared && (staffList || []).find((x) => String(x.id) === String(value));
      subtopics[subtopicIndex] = {
        ...prev,
        allocatedToUser: value,
        allocatedToUserName: cleared ? '' : found?.name || '',
      };
    } else {
      subtopics[subtopicIndex] = { ...prev, [field]: value };
    }
    next[topicIndex] = { ...next[topicIndex], subtopics };
    this.setState({ topics: next });
  };

  addTopic = () => {
    const { topics } = this.state;
    const newId = Math.max(0, ...(topics.map((t) => t.id) || [])) + 1;
    const defaultStaff = this.getDefaultAllocatedStaffId();
    this.setState({
      topics: [
        ...topics,
        {
          id: newId,
          name: '',
          subtopics: [{
            id: 1,
            name: '',
            allocated_from_date: '',
            allocated_to_date: '',
            objectives: '',
            activities: '',
            resource: '',
            assessment: '',
            allocatedToUser: defaultStaff,
          }],
        },
      ],
    });
  };

  removeTopic = (topicIndex) => {
    const { topics } = this.state;
    if (topics.length <= 1) return;
    const next = topics.filter((_, i) => i !== topicIndex);
    this.setState({ topics: next });
  };

  handleRemoveTopicClick = (event, topicIndex) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    Swal.fire({
      title: 'Shall I delete this topic?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d32f2f',
      reverseButtons: true,
    }).then((result) => {
      const isConfirmed =
        result?.isConfirmed === true ||
        result?.value === true ||
        (result && result.dismiss === undefined && result.value !== false);
      if (isConfirmed) {
        this.setState((prevState) => {
          const topics = prevState.topics || [];
          if (topicIndex < 0 || topicIndex >= topics.length) return null;
          const updatedTopics = topics.filter((_, i) => i !== topicIndex);
          const nextExpanded =
            updatedTopics.length === 0
              ? 0
              : topicIndex === 0
              ? 0
              : Math.min(topicIndex - 1, updatedTopics.length - 1);
          return { topics: updatedTopics, expandedTopic: nextExpanded };
        });
      }
    });
  };

  addSubtopic = (topicIndex) => {
    const { topics } = this.state;
    const next = [...topics];
    const subtopics = [...(next[topicIndex].subtopics || [])];
    const newId = Math.max(0, ...subtopics.map((s) => s.id)) + 1;
    subtopics.push({
      id: newId,
      name: '',
      allocated_from_date: '',
      allocated_to_date: '',
      objectives: '',
      activities: '',
      resource: '',
      assessment: '',
      allocatedToUser: this.getDefaultAllocatedStaffId(),
      completion_date: '',
    });
    next[topicIndex] = { ...next[topicIndex], subtopics };
    this.setState({ topics: next });
  };

  removeSubtopic = (topicIndex, subtopicIndex) => {
    const { topics } = this.state;
    const next = [...topics];
    const subtopics = (next[topicIndex].subtopics || []).filter((_, i) => i !== subtopicIndex);
    if (subtopics.length < 1) return;
    next[topicIndex] = { ...next[topicIndex], subtopics };
    this.setState({ topics: next });
  };

  handleRemoveSubtopicClick = (event, topicIndex, subIndex) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const topic = this.state.topics?.[topicIndex];
    if (!topic) return;
    Swal.fire({
      title: 'Shall I delete this subtopic?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d32f2f',
      reverseButtons: true,
    }).then((result) => {
      const isConfirmed =
        result?.isConfirmed === true ||
        result?.value === true ||
        (result && result.dismiss === undefined && result.value !== false);
      if (isConfirmed) {
        this.setState((prevState) => {
          const topics = [...(prevState.topics || [])];
          if (topicIndex < 0 || topicIndex >= topics.length) return null;
          const currentTopic = topics[topicIndex];
          const subtopics = [...(currentTopic?.subtopics || [])];
          if (subIndex < 0 || subIndex >= subtopics.length) return null;
          subtopics.splice(subIndex, 1);
          topics[topicIndex] = { ...currentTopic, subtopics };
          return { topics };
        });
      }
    });
  };

  handleAccordionChange = (index) => (e, isExpanded) => {
    this.setState({ expandedTopic: isExpanded ? index : false });
  };

  handleStatusChange = (topicIndex, subIndex, checked) => {
    const { topics, academicYear, subject, standardSection } = this.state;
    const nextTopics = [...topics];
    const subtopic = nextTopics[topicIndex].subtopics[subIndex];
    const completionDate = checked ? new Date().toISOString().split('T')[0] : null;

    if (!subtopic.detailId) {
      Swal.fire({ icon: 'warning', title: 'Cannot update status for unsaved subtopic.' });
      return;
    }

    const oldCompletionDate = subtopic.completion_date;
    subtopic.completion_date = completionDate;
    this.setState({ topics: nextTopics });

    const payload = {
      academic_year: academicYear,
      subject: subject,
      standard_section: standardSection,
      subtopic_detail_id: subtopic.detailId,
      completion_date: completionDate,
    };

    const url = POST_URL.updatelessonplanningstatus?.api || 'classes/updatelessonplanningstatus/';
    postRequest(url, payload, { ...this.props, return_error: true })
      .then((response) => {
        if (!(response && response.status === 200)) {
          subtopic.completion_date = oldCompletionDate;
          this.setState({ topics: nextTopics });
          const msg = response?.data?.detail || response?.data?.Reason || 'Failed to update status.';
          Swal.fire({ icon: 'error', title: msg });
        }
      })
      .catch((err) => {
        subtopic.completion_date = oldCompletionDate;
        this.setState({ topics: nextTopics });
        const msg = err?.data?.detail || err?.data?.Reason || err?.response?.data?.detail || err?.response?.data?.Reason || 'Failed to update status.';
        Swal.fire({ icon: 'error', title: msg });
      });
  };

  buildPayload = () => {
    const { academicYear, subject, standardSection, selectedTemplateId, topics, allocationId } = this.state;
    const staffList = this.state.staffList || [];
    const topics_data = (topics || []).map((topic, seq) => {
      const topic_name = (topic.name || '').trim();
      const subtopics = (topic.subtopics || []).map((sub, s_seq) => {
        const staffId =
          sub.allocatedToUser != null && sub.allocatedToUser !== ''
            ? Number(sub.allocatedToUser)
            : staffList.length === 1
            ? Number(staffList[0].id)
            : null;
        return {
          id: sub.id,
          name: (sub.name || '').trim(),
          sequence: s_seq,
          allocated_from_date: (sub.allocated_from_date || '').trim() || null,
          allocated_to_date: (sub.allocated_to_date || '').trim() || null,
          subtopic_details: [
            {
              id: sub.detailId,
              name: (sub.name || '').trim(),
              allocated_from_date: (sub.allocated_from_date || '').trim() || null,
              allocated_to_date: (sub.allocated_to_date || '').trim() || null,
              objectives: (sub.objectives || '').trim(),
              activities: (sub.activities || '').trim(),
              resource: (sub.resource || '').trim(),
              assessment: (sub.assessment || '').trim(),
              ...(staffId ? { allocated_to_user: staffId } : {}),
            },
          ],
        };
      });
      return {
        id: topic.id,
        name: topic_name,
        topic_name: topic_name,
        sequence: seq,
        subtopics,
      };
    });
    const payload = {
      academic_year: academicYear || null,
      subject: subject || null,
      standard_section: standardSection || null,
      topics_data,
    };
    if (selectedTemplateId) payload.lesson_plan_template = selectedTemplateId;
    if (allocationId) payload.id = allocationId;
    return payload;
  };

  handleSubmit = () => {
    const { academicYear, subject, standardSection, topics, allocationId, staffList = [] } = this.state;
    if (!academicYear || !subject || !standardSection) {
      Swal.fire({ icon: 'warning', title: 'Please select Academic Year, Subject and Standard Section.' });
      return;
    }
    if (!topics || topics.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Please add at least one topic.' });
      return;
    }
    if (!staffList || staffList.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No staff available. Cannot allocate lesson plan.' });
      return;
    }
    const payload = this.buildPayload();
    const url = POST_URL.lessonplantemplateacademicyear?.api || 'classes/lessonplantemplateacademicyear/';
    this.setState({ saveLoading: true });
    postRequest(url, payload, { ...this.props, return_error: true })
      .then((response) => {
        this.setState({ saveLoading: false });
        if (response && response.status === 200 && response.data) {
          const data = response.data?.data || response.data;
          Swal.fire({
            icon: 'success',
            title: response.data?.Reason || data?.Reason || 'Lesson plan allocation saved successfully.',
          });
        } else {
          Swal.fire({ icon: 'error', title: 'Failed to save lesson plan allocation.' });
        }
      })
      .catch((err) => {
        this.setState({ saveLoading: false });
        const msg = err?.response?.data?.detail || err?.response?.data?.Reason || err?.message || 'Failed to save lesson plan allocation.';
        Swal.fire({ icon: 'error', title: msg });
      });
  };

  render() {
    const {
      academicYear,
      subject,
      standardSection,
      standardSectionData,
      yearList,
      subjectList,
      staffList,
      standardSectionList,
      templateDropdownOptions,
      selectedTemplateId,
      useTemplate,
      loading,
      templateListLoading,
      topics,
      templateName,
      expandedTopic,
      saveLoading,
    } = this.state;
    const isViewMode = this.isViewMode();
    const findOptionById = (list, id) =>
      (Array.isArray(list) ? list : []).find(
        (x) =>
          String(x?.id) === String(id) ||
          String(x?.value) === String(id) ||
          String(x?.standard_section) === String(id)
      );

    const getOptionLabel = (list, id) => {
      const found = findOptionById(list, id);
      if (!found) return '—';
      return found.name || found.label || '—';
    };
    const academicYearLabel = getOptionLabel(yearList, academicYear);
    const subjectLabel = getOptionLabel(subjectList, subject);
    const selectedStandardSection = findOptionById(standardSectionList, standardSection);
    const effectiveStandardSection = standardSectionData || selectedStandardSection || {};
    const standardLabel =
      effectiveStandardSection?.standardName ||
      effectiveStandardSection?.standard_name ||
      effectiveStandardSection?.standard ||
      (effectiveStandardSection?.name || '').split('-')[0]?.trim() ||
      '—';
    const sectionLabel =
      effectiveStandardSection?.sectionName ||
      effectiveStandardSection?.section_name ||
      effectiveStandardSection?.section__name ||
      effectiveStandardSection?.section ||
      (effectiveStandardSection?.name || '').split('-').slice(1).join('-').trim() ||
      '—';

    const staffLabelById = (id) => {
      if (id == null || id === '') return '—';
      const found = (staffList || []).find((s) => String(s.id) === String(id));
      return found?.name || String(id);
    };

    const displayAllocatedStaff = (subtopic) => {
      if (!subtopic) return '—';
      if (subtopic.allocatedToUserName) return subtopic.allocatedToUserName;
      return staffLabelById(subtopic.allocatedToUser);
    };

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Box>
        <Paper className={classNames('paper-background')} elevation={0} style={{ borderRadius: 12, overflow: 'hidden' }}>
          <Box px={2} pt={2} pb={1}>
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 12 }}>
                  <Box display="flex" alignItems="center" justifyContent="center" style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' }}>
                    <AssignmentOutlinedIcon style={{ fontSize: 28, color: '#2e7d32' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" style={{ fontWeight: 600, color: '#1b5e20' }}>
                      {isViewMode ? 'Lesson Plan Allocation Details' : 'Lesson Plan Allocation'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {isViewMode
                        ? 'Read-only allocation details'
                        : 'Set academic year, subject, standard and section details'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box display="flex" justifyContent="flex-end" flexWrap="wrap" style={{ gap: 8 }}>
                  <Button variant="outlined" color="primary" startIcon={<ArrowBackOutlinedIcon />} className="editbutton-view" onClick={() => this.props.history.push(Actions?.lesson_plan_allocation?.view?.url)} style={{ textTransform: 'none', borderRadius: 8 }}>Back to List</Button>
                  {!isViewMode && (
                    <Button variant="contained" color="primary" startIcon={<LibraryBooksOutlinedIcon />} className="editbutton-view" onClick={() => this.props.history.push(Actions?.lesson_plan_template?.view?.url)} style={{ textTransform: 'none', borderRadius: 8 }}>Lesson Plan Templates</Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>

          {!isViewMode && <Box px={2} py={2} mt={1} style={{ backgroundColor: '#f8f9fa', borderRadius: 12, border: '1px solid #e9ecef' }}>
            <Typography variant="subtitle2" style={{ fontWeight: 600, color: '#495057', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TuneOutlinedIcon style={{ fontSize: 20 }} /> Selection
            </Typography>
            <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <Dropdown label="Academic Year" name="academicYear" value={academicYear} onChange={this.handleChange} data={yearList} fullWidth disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Dropdown label="Subject" name="subject" value={subject} onChange={this.handleChange} data={subjectList} fullWidth disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Dropdown label="Standard Section" name="standardSection" value={standardSection} onChange={this.handleChange} data={standardSectionList} fullWidth disabled={isViewMode} />
            </Grid>
          </Grid>
          </Box>}

          {!isViewMode ? (
            <Box px={2} py={2} mt={1} style={{ backgroundColor: '#f8f9fa', borderRadius: 12, border: '1px solid #e9ecef' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={6}>
                  <Button
                    variant={useTemplate ? 'contained' : 'outlined'}
                    color="primary"
                    startIcon={<TouchAppOutlinedIcon />}
                    onClick={this.handleIsFromTemplate}
                    disabled={templateListLoading}
                    style={{ textTransform: 'none', borderRadius: 8, width: '100%' }}
                  >
                    {templateListLoading ? 'Loading...' : 'Use Template'}
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                  <Button
                    variant={!useTemplate ? 'contained' : 'outlined'}
                    color="secondary"
                    startIcon={<AddIcon />}
                    onClick={this.handleCreateManually}
                    style={{ textTransform: 'none', borderRadius: 8, width: '100%' }}
                  >
                    Create Manually
                  </Button>
                </Grid>

                {useTemplate && templateDropdownOptions.length > 0 && (
                  <Grid item xs={12} sm={6} md={6}>
                    <Dropdown
                      label="Select Template"
                      name="selectedTemplateId"
                      value={selectedTemplateId}
                      onChange={this.handleTemplateSelect}
                      data={templateDropdownOptions}
                      fullWidth
                    />
                  </Grid>
                )}

                {useTemplate &&
                  subject &&
                  standardSection &&
                  !templateListLoading &&
                  templateDropdownOptions.length === 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary">
                        No lesson planning templates found. You can create the allocation manually.
                      </Typography>
                    </Grid>
                  )}
              </Grid>
            </Box>
          ) : (
            <Box px={2} py={2} mt={1} style={{ backgroundColor: '#f8f9fa', borderRadius: 12, border: '1px solid #e9ecef' }}>
              <Typography variant="subtitle2" style={{ fontWeight: 600, color: '#495057', marginBottom: 16 }}>
                Allocation Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="textSecondary">Academic Year</Typography>
                  <Typography variant="body1" style={{ fontWeight: 600 }}>{academicYearLabel || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="textSecondary">Subject</Typography>
                  <Typography variant="body1" style={{ fontWeight: 600 }}>{subjectLabel || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="textSecondary">Standard</Typography>
                  <Typography variant="body1" style={{ fontWeight: 600 }}>{standardLabel || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="textSecondary">Section</Typography>
                  <Typography variant="body1" style={{ fontWeight: 600 }}>{sectionLabel || '—'}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {topics && topics.length > 0 && (
            <React.Fragment>
              <Grid container className={classNames('m-bt-15px')} style={{ padding: '0 16px 16px' }}>
                <Grid item xs={12}>
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="textSecondary">{templateName ? `Template: ${templateName}` : 'Lesson plan'}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" style={{ gap: 12 }}>
                    <Typography variant="subtitle1" style={{ fontWeight: 600, color: '#374151' }}>Topics ({topics.length})</Typography>
                    {!isViewMode && <Button
                      startIcon={<AddIcon />}
                      onClick={this.addTopic}
                      color="primary"
                      variant="contained"
                      size="small"
                      style={{ textTransform: 'none', borderRadius: 8 }}
                    >
                      Add Topic
                    </Button>}
                  </Box>
                  {isViewMode ? (
                    topics.map((topic, topicIndex) => (
                      <Paper
                        key={topic.id || topicIndex}
                        variant="outlined"
                        style={{
                          padding: 16,
                          marginBottom: 12,
                          backgroundColor: '#ffffff',
                          borderRadius: 12,
                          border: '1px solid #e9ecef',
                        }}
                      >
                        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={12}>
                          <Box>
                            <Typography variant="subtitle1" style={{ fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <AssignmentOutlinedIcon style={{ fontSize: 18, color: '#2e7d32' }} />
                              {topic.name || `Topic ${topicIndex + 1}`}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>
                              Subtopics: {(topic.subtopics || []).length}
                            </Typography>
                          </Box>
                        </Box>

                        <Box mt={2} display="flex" flexDirection="column" gap={16}>
                          {(topic.subtopics || []).map((subtopic, subIndex) => (
                            <Box
                              key={subtopic.id || subIndex}
                              style={{
                                padding: '16px',
                                border: '1px solid #edf2f7',
                                borderRadius: '12px',
                                backgroundColor: '#fcfcfd',
                                position: 'relative'
                              }}
                            >
                              <Box display="flex" alignItems="center" gap={8} mb={1}>
                                <Checkbox
                                  checked={Boolean(subtopic.completion_date)}
                                  onChange={(e) => this.handleStatusChange(topicIndex, subIndex, e.target.checked)}
                                  color="primary"
                                  style={{ padding: 0 }}
                                />
                                <Typography variant="subtitle2" style={{ fontWeight: 700, color: '#1a202c', fontSize: '1rem' }}>
                                  {subtopic.name || 'Untitled Subtopic'}
                                </Typography>
                                <Box ml="auto">
                                  <Typography variant="caption" style={{ 
                                    backgroundColor: subtopic.completion_date ? '#dcfce7' : '#fef3c7',
                                    color: subtopic.completion_date ? '#166534' : '#92400e',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase'
                                  }}>
                                    {subtopic.completion_date ? 'Completed' : 'In Progress'}
                                  </Typography>
                                </Box>
                              </Box>

                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                  <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600, textTransform: 'uppercase' }}>Allocated To</Typography>
                                  <Typography variant="body2" style={{ color: '#4a5568', fontWeight: 500 }}>{displayAllocatedStaff(subtopic)}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                  <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600, textTransform: 'uppercase' }}>Timeline</Typography>
                                  <Typography variant="body2" style={{ color: '#4a5568', fontWeight: 500 }}>
                                    {subtopic.allocated_from_date || '—'} to {subtopic.allocated_to_date || '—'}
                                  </Typography>
                                </Grid>
                                
                                <Grid item xs={12}>
                                  <Box display="flex" flexDirection="column" gap={8} mt={1}>
                                    {subtopic.objectives && (
                                      <Box>
                                        <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600, textTransform: 'uppercase' }}>Objectives</Typography>
                                        <Typography variant="body2" style={{ color: '#4a5568', whiteSpace: 'pre-wrap' }}>{subtopic.objectives}</Typography>
                                      </Box>
                                    )}
                                    {subtopic.activities && (
                                      <Box>
                                        <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600, textTransform: 'uppercase' }}>Activities</Typography>
                                        <Typography variant="body2" style={{ color: '#4a5568', whiteSpace: 'pre-wrap' }}>{subtopic.activities}</Typography>
                                      </Box>
                                    )}
                                    <Box display="flex" flexWrap="wrap" gap={16} mt={1}>
                                      {subtopic.resource && (
                                        <Box flex={1} minWidth={200}>
                                          <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600, textTransform: 'uppercase' }}>Resources</Typography>
                                          <Typography variant="body2" style={{ color: '#4a5568' }}>{subtopic.resource}</Typography>
                                        </Box>
                                      )}
                                      {subtopic.assessment && (
                                        <Box flex={1} minWidth={200}>
                                          <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600, textTransform: 'uppercase' }}>Assessment</Typography>
                                          <Typography variant="body2" style={{ color: '#4a5568' }}>{subtopic.assessment}</Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Box>
                                </Grid>
                              </Grid>
                            </Box>
                          ))}
                        </Box>
                      </Paper>
                    ))
                  ) : (
                    topics.map((topic, topicIndex) => (
                      <Accordion
                        key={topic.id || topicIndex}
                        expanded={expandedTopic === topicIndex}
                        onChange={this.handleAccordionChange(topicIndex)}
                        elevation={0}
                        style={{ marginBottom: 12, border: '1px solid #e0e0e0', borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} style={{ minHeight: 52, backgroundColor: expandedTopic === topicIndex ? '#f5f7fa' : '#fafafa' }}>
                          <Typography variant="body1" style={{ fontWeight: 600, color: '#374151' }}>
                            {topic.name || `Topic ${topicIndex + 1}`}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails style={{ flexDirection: 'column', padding: '0 16px 16px' }}>
                          <Box display="flex" justifyContent="flex-end" mb={1}>
                            {!isViewMode && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<DeleteOutlineIcon fontSize="small" />}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                                onClick={(e) => this.handleRemoveTopicClick(e, topicIndex)}
                                style={{ color: '#d32f2f', borderColor: '#d32f2f', textTransform: 'none' }}
                              >
                                Delete Topic
                              </Button>
                            )}
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Topic Name"
                                placeholder="Enter topic name"
                                value={topic.name || ''}
                                onChange={(e) => this.handleTopicChange(topicIndex, 'name', e.target.value)}
                                variant="outlined"
                                size="small"
                                inputProps={{ maxLength: 255 }}
                                disabled={isViewMode}
                              />
                            </Grid>
                          </Grid>
                          <Box mt={2} pt={2} style={{ borderTop: '1px solid #eee' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                              <Typography variant="body2" color="textSecondary">
                                Subtopics
                              </Typography>
                              {!isViewMode && <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => this.addSubtopic(topicIndex)}
                                color="primary"
                                style={{ textTransform: 'none' }}
                              >
                                Add Subtopic
                              </Button>}
                            </Box>
                            {(topic.subtopics || []).map((subtopic, subIndex) => (
                              <Paper
                                key={subtopic.id || subIndex}
                                variant="outlined"
                                style={{ padding: 12, marginBottom: 12, backgroundColor: '#fafafa' }}
                              >
                                <Grid container spacing={2}>
                                  <Grid item xs={12} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}>
                                    {!isViewMode && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<DeleteOutlineIcon fontSize="small" />}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                        }}
                                        onClick={(e) => this.handleRemoveSubtopicClick(e, topicIndex, subIndex)}
                                        style={{ color: '#d32f2f', borderColor: '#d32f2f', textTransform: 'none' }}
                                      >
                                        Delete Subtopic
                                      </Button>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label="Subtopic Name"
                                      placeholder="Subtopic name"
                                      value={subtopic.name || ''}
                                      onChange={(e) => this.handleSubtopicChange(topicIndex, subIndex, 'name', e.target.value)}
                                      variant="outlined"
                                      inputProps={{ maxLength: 255 }}
                                      disabled={isViewMode}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Dropdown
                                      label="Allocated To User"
                                      name="allocatedToUser"
                                      data={staffList}
                                      value={this.resolveStaffDropdownValue(subtopic, staffList)}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        this.handleSubtopicChange(
                                          topicIndex,
                                          subIndex,
                                          'allocatedToUser',
                                          v === 0 || v === '0' ? '' : String(v)
                                        );
                                      }}
                                      fullWidth
                                      disabled={isViewMode || staffList.length === 1}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label="Allocated From Date"
                                      name="allocated_from_date"
                                      type="date"
                                      value={subtopic.allocated_from_date || ''}
                                      onChange={(e) => this.handleSubtopicChange(topicIndex, subIndex, 'allocated_from_date', e.target.value)}
                                      variant="outlined"
                                      InputLabelProps={{ shrink: true }}
                                      disabled={isViewMode}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label="Allocated To Date"
                                      name="allocated_to_date"
                                      type="date"
                                      value={subtopic.allocated_to_date || ''}
                                      onChange={(e) => this.handleSubtopicChange(topicIndex, subIndex, 'allocated_to_date', e.target.value)}
                                      variant="outlined"
                                      InputLabelProps={{ shrink: true }}
                                      disabled={isViewMode}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label="Objectives"
                                      value={subtopic.objectives || ''}
                                      onChange={(e) => this.handleSubtopicChange(topicIndex, subIndex, 'objectives', e.target.value)}
                                      variant="outlined"
                                      multiline
                                      rows={2}
                                      placeholder="Learning objectives..."
                                      disabled={isViewMode}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label="Activities"
                                      value={subtopic.activities || ''}
                                      onChange={(e) => this.handleSubtopicChange(topicIndex, subIndex, 'activities', e.target.value)}
                                      variant="outlined"
                                      multiline
                                      rows={2}
                                      placeholder="Planned activities..."
                                      disabled={isViewMode}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label="Resource"
                                      value={subtopic.resource || ''}
                                      onChange={(e) => this.handleSubtopicChange(topicIndex, subIndex, 'resource', e.target.value)}
                                      variant="outlined"
                                      multiline
                                      rows={2}
                                      placeholder="Materials / resources..."
                                      disabled={isViewMode}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label="Assessment"
                                      value={subtopic.assessment || ''}
                                      onChange={(e) => this.handleSubtopicChange(topicIndex, subIndex, 'assessment', e.target.value)}
                                      variant="outlined"
                                      multiline
                                      rows={2}
                                      placeholder="Assessment method..."
                                      disabled={isViewMode}
                                    />
                                  </Grid>
                                </Grid>
                              </Paper>
                            ))}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))
                  )}
                </Grid>
              </Grid>
              {!isViewMode && <Box mt={3} pt={2} px={2} display="flex" justifyContent="flex-end" style={{ borderTop: '1px solid #eee' }}>
                <Button
                  className="submit"
                  variant="contained"
                  color="primary"
                  startIcon={saveLoading ? null : <SaveOutlinedIcon />}
                  onClick={this.handleSubmit}
                  disabled={saveLoading}
                  style={{ borderRadius: 8, textTransform: 'none', paddingLeft: 20, paddingRight: 20 }}
                >
                  {saveLoading ? 'Submitting...' : 'Submit'}
                </Button>
              </Box>}
            </React.Fragment>
          )}
        </Paper>
      </Box>
    );
  }
}

export default withRouter(LessonPlanAllocation);
