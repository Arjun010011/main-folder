import React, { Component } from 'react';
import {
  Paper,
  Box,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import MenuBookOutlinedIcon from '@material-ui/icons/MenuBookOutlined';
import SaveOutlinedIcon from '@material-ui/icons/SaveOutlined';
import SubjectIcon from '@material-ui/icons/Subject';
import SchoolOutlinedIcon from '@material-ui/icons/SchoolOutlined';
import ListAltOutlinedIcon from '@material-ui/icons/ListAltOutlined';
import { withRouter } from 'react-router-dom';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import classNames from 'classnames';
import { Dropdown } from 'Components/DropDown';
import Swal from 'sweetalert2';
import { Actions } from 'Constants/permissions';

class LessonPlanning extends Component {
  constructor(props) {
    super(props);
    this.state = {
      subject: '',
      standard: '',
      templateName: '',
      subjectList: [],
      standardList: [],
      yearList: [],
      academicYear: '',
      topics: [
        {
          id: null,
          tempId: 'temp_topic_1',
          name: '',
          subtopics: [
            {
              id: null,
              tempSubId: 'temp_sub_1',
              name: '',
              detailId: null,
              objectives: '',
              activities: '',
              resource: '',
              assessment: '',
            },
          ],
        },
      ],
      loading: false,
      saveLoading: false,
      templateId: '',
      expandedTopic: 0,
    };
  }

  componentDidMount() {
    this.fetchInitialData();
    const templateId = this.props.location?.state?.detail;
    if (templateId) {
      this.fetchTemplateById(templateId);
    }
  }

  componentDidUpdate(prevProps) {
    const prevId = prevProps.location?.state?.detail;
    const nextId = this.props.location?.state?.detail;
    if (nextId && nextId !== prevId) {
      this.fetchTemplateById(nextId);
    }
  }

  isViewMode = () => {
    const state = this.props.location?.state || {};
    const search = this.props.location?.search || '';
    const queryParams = new URLSearchParams(search);
    return (
      state.readOnly === true ||
      state.mode === 'view' ||
      queryParams.get('mode') === 'view'
    );
  };

  fetchTemplateById = (templateId) => {
    const url = (GET_URL.lessonplantemplate?.api || 'classes/lessonplantemplate/') + templateId + '/';
    getRequest(url, {}, this.props)
      .then((response) => {
        if (response && response.status === 200 && response.data) {
          const data = response.data?.data ?? response.data;
          const plan_name = data.plan_name ?? data.template_name ?? data.name ?? '';
          const subject = data.subject?.id ?? data.subject_id ?? data.subject ?? '';
          const standardVal =
            data.standard?.id ?? data.standard_id ?? data.standard ?? '';
          const rawTopics = data.topics ?? data.topic_list ?? [];
          const topics = rawTopics.map((t, idx) => {
            const rawSubtopics = t.subtopics ?? t.subtopic_list ?? [];
            const subtopics = rawSubtopics.map((s, sIdx) => {
              const details = s.subtopic_details ?? s.details ?? [];
              const first = details[0] || {};
              return {
                id: s.id ?? null,
                tempSubId: `temp_sub_${t.id ?? idx}_${s.id ?? sIdx}`,
                name: s.name ?? '',
                objectives: first.objectives ?? '',
                activities: first.activities ?? '',
                resource: first.resource ?? '',
                assessment: first.assessment ?? '',
                detailId: first.id ?? null,
                sequence: s.sequence ?? first.sequence ?? sIdx,
              };
            });
            if (subtopics.length === 0) {
              subtopics.push({
                id: null,
                tempSubId: `temp_sub_${t.id ?? idx}_0`,
                name: '',
                objectives: '',
                activities: '',
                resource: '',
                assessment: '',
                detailId: null,
                sequence: 0,
              });
            }
            return {
              id: t.id ?? null,
              tempId: `temp_topic_${t.id ?? idx}`,
              name: t.name ?? t.topic_name ?? '',
              subtopics,
              sequence: t.sequence ?? t.topic_sequence ?? idx,
            };
          });
          if (topics.length === 0) {
            topics.push({
              id: null,
              tempId: 'temp_topic_1',
              name: '',
              sequence: 0,
              subtopics: [
                {
                  id: null,
                  tempSubId: 'temp_sub_1',
                  name: '',
                  objectives: '',
                  activities: '',
                  resource: '',
                  assessment: '',
                  detailId: null,
                  sequence: 0,
                },
              ],
            });
          }
          this.setState({
            templateId: String(data.id ?? templateId),
            templateName: plan_name,
            subject: String(subject),
            standard: String(standardVal),
            topics,
            expandedTopic: 0,
          });
        }
      })
      .catch(() => {});
  };

  fetchInitialData = () => {
    this.setState({ loading: true });
    Promise.all([
      getRequest(GET_URL.getacademicyear?.api || 'institutes/getacademicyear/', { is_active: true }, this.props),
      getRequest(GET_URL.getstandard?.api || 'classes/getstandard/', { is_active: true }, this.props),
    ])
      .then(([yearRes, stdRes]) => {
        const yearList = yearRes?.status === 200 ? yearRes.data?.data || [] : [];
        const academicYear = yearList.length ? String(yearList[0].id) : '';
        let standardList = [];
        if (stdRes?.status === 200) {
          const raw = stdRes.data?.data || stdRes.data || [];
          standardList = (Array.isArray(raw) ? raw : []).map((s) => ({
            id: s.id,
            name: s.standard_name || s.name || '',
          }));
        }
        this.setState(
          {
            yearList,
            loading: false,
            academicYear,
            standardList,
          },
          () => {
            if (this.state.academicYear) this.fetchSubjectsForYear(this.state.academicYear);
          }
        );
      })
      .catch(() => this.setState({ loading: false }));
  };

  fetchSubjectsForYear = (yearId) => {
    if (!yearId) {
      this.setState({ subjectList: [] });
      return;
    }
    const params = { academic_year: yearId };
    getRequest(GET_URL.subject?.api || 'classes/subject/', params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const subjectList = response.data?.data || response.data || [];
          this.setState({ subjectList: Array.isArray(subjectList) ? subjectList : [] });
        }
      })
      .catch(() => {});
  };

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value }, () => {
      if (name === 'academicYear') {
        this.setState({ subject: '' });
        this.fetchSubjectsForYear(value);
      }
    });
  };

  addTopic = () => {
    const { topics } = this.state;
    this.setState({
      topics: [
        ...topics,
        {
          id: null,
          tempId: `temp_topic_${Date.now()}_${Math.random()}`,
          name: '',
          sequence: topics.length,
          subtopics: [
            {
              id: null,
              tempSubId: `temp_sub_${Date.now()}_${Math.random()}`,
              name: '',
              detailId: null,
              objectives: '',
              activities: '',
              resource: '',
              assessment: '',
              sequence: 0,
            },
          ],
        },
      ],
      expandedTopic: topics.length,
    });
  };

  removeTopic = (index) => {
    const { topics } = this.state;
    if (topics.length <= 1) return;
    this.setState({
      topics: topics.filter((_, i) => i !== index),
      expandedTopic: index === 0 ? 0 : index - 1,
    });
  };

  addSubtopic = (topicIndex) => {
    const { topics } = this.state;
    const topic = topics[topicIndex];
    const subtopics = topic.subtopics || [];
    const newTopics = [...topics];
    newTopics[topicIndex] = {
      ...topic,
      subtopics: [
        ...subtopics,
        {
          id: null,
          tempSubId: `temp_sub_${Date.now()}_${Math.random()}`,
          name: '',
          objectives: '',
          activities: '',
          resource: '',
          assessment: '',
          detailId: null,
          sequence: subtopics.length,
        },
      ],
    };
    this.setState({ topics: newTopics });
  };

  removeSubtopic = (topicIndex, subIndex) => {
    const { topics } = this.state;
    const topic = topics[topicIndex];
    const subtopics = topic.subtopics || [];
    if (subtopics.length <= 1) return;
    const newTopics = [...topics];
    newTopics[topicIndex] = {
      ...topic,
      subtopics: subtopics.filter((_, i) => i !== subIndex),
    };
    this.setState({ topics: newTopics });
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

  handleTopicChange = (topicIndex, field, value) => {
    const { topics } = this.state;
    const newTopics = [...topics];
    newTopics[topicIndex] = { ...newTopics[topicIndex], [field]: value };
    this.setState({ topics: newTopics });
  };

  handleSubtopicChange = (topicIndex, subIndex, field, value) => {
    const { topics } = this.state;
    const newTopics = [...topics];
    const subtopics = [...(newTopics[topicIndex].subtopics || [])];
    subtopics[subIndex] = { ...subtopics[subIndex], [field]: value };
    newTopics[topicIndex] = { ...newTopics[topicIndex], subtopics };
    this.setState({ topics: newTopics });
  };

  handleAccordionChange = (index) => () => {
    if (this.isViewMode()) return;
    this.setState({ expandedTopic: this.state.expandedTopic === index ? -1 : index });
  };

  handleSave = () => {
    const { subject, standard, templateName, topics, templateId } = this.state;
    if (!templateName || !templateName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Please enter template name.' });
      return;
    }
    if (!subject) {
      Swal.fire({ icon: 'warning', title: 'Please select subject.' });
      return;
    }
    const payload = {
      plan_name: templateName.trim(),
      subject: Number(subject),
      standard: standard ? Number(standard) : null,
      topics_data: (topics || []).map((t, topicIndex) => ({
        ...(t.id ? { id: Number(t.id) } : {}),
        name: t.name || '',
        sequence: t.sequence ?? topicIndex,
        subtopics: (t.subtopics || []).map((s, subIndex) => ({
          ...(s.id ? { id: Number(s.id) } : {}),
          name: s.name || '',
          sequence: s.sequence ?? subIndex,
          subtopic_details: [
            {
              ...(s.detailId ? { id: Number(s.detailId) } : {}),
              name: s.name || '',
              objectives: s.objectives || '',
              activities: s.activities || '',
              resource: s.resource || '',
              assessment: s.assessment || '',
            },
          ],
        })),
      })),
    };
    if (templateId) payload.id = Number(templateId);
    this.setState({ saveLoading: true });
    const url = POST_URL.lessonplantemplate?.api || 'classes/lessonplantemplate/';
    postRequest(url, payload, this.props)
      .then((res) => {
        this.setState({ saveLoading: false });
        if (res && res.status === 200) {
          Swal.fire({ position: 'top-end', type: 'success', title: 'Saved successfully', showConfirmButton: false, timer: 1500 });
          this.props.history.push(Actions.lesson_plan_template?.view?.url);
        }
      })
      .catch(() => this.setState({ saveLoading: false }));
  };

  render() {
    const {
      subject,
      standard,
      templateName,
      subjectList,
      standardList,
      topics,
      expandedTopic,
      saveLoading,
      loading,
    } = this.state;
    const isViewMode = this.isViewMode();
    const getOptionLabel = (list, id) => {
      const found = (Array.isArray(list) ? list : []).find(
        (x) => String(x?.id) === String(id)
      );
      if (!found) return id ? String(id) : '—';
      return (
        found.name ||
        found.standard_name ||
        found.subject_name ||
        found.title ||
        found.label ||
        String(id)
      );
    };
    const subjectLabel = getOptionLabel(subjectList, subject);
    const standardLabel = getOptionLabel(standardList, standard);

    if (loading) {
      return (
        <Paper className={classNames('paper-background')}>
          <Box py={3} display="flex" justifyContent="center" alignItems="center">
            <Typography>Loading...</Typography>
          </Box>
        </Paper>
      );
    }

    return (
      <Paper
        className={classNames('paper-background')}
        elevation={0}
        style={{ borderRadius: 12, overflow: isViewMode ? 'visible' : 'hidden' }}
      >
        <Box px={2} pt={2} pb={1}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 12 }}>
                <Box display="flex" alignItems="center" justifyContent="center" style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)' }}>
                  <MenuBookOutlinedIcon style={{ fontSize: 28, color: '#3949ab' }} />
                </Box>
                <Box>
                    <Typography variant="h6" style={{ fontWeight: 600, color: '#303f9f' }}>
                      {isViewMode ? 'Lesson Plan Template Details' : 'Lesson Planning'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {isViewMode
                        ? 'Read-only template view with complete topic and subtopic details'
                        : 'Create or edit lesson plan template with topics and subtopics'}
                    </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" justifyContent="flex-end" flexWrap="wrap" style={{ gap: 8 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<VisibilityOutlinedIcon />}
                  className="editbutton-view"
                  onClick={() => this.props.history.push(Actions.lesson_plan_template?.view?.url)}
                  style={{ textTransform: 'none', borderRadius: 8 }}
                >
                    Back to Templates
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Box px={2} py={2} mt={1} style={{ backgroundColor: '#f8f9fa', borderRadius: 12, border: '1px solid #e9ecef', margin: '0 8px 16px' }}>
          <Typography variant="subtitle2" style={{ fontWeight: 600, color: '#495057', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SubjectIcon style={{ fontSize: 20 }} /> Template Details
          </Typography>
          {isViewMode ? (
            <Grid container spacing={2} alignItems="stretch">
              <Grid item xs={12} sm={6} md={4}>
                <Box
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e9ecef',
                    borderRadius: 10,
                    padding: 14,
                    height: '100%',
                  }}
                >
                  <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>
                    Subject
                  </Typography>
                  <Box display="flex" alignItems="center" gap={8} mt={1}>
                    <SubjectIcon style={{ fontSize: 18, color: '#6c63ff' }} />
                    <Typography variant="body1" style={{ fontWeight: 600, color: '#1f2937' }}>
                      {subjectLabel || '—'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e9ecef',
                    borderRadius: 10,
                    padding: 14,
                    height: '100%',
                  }}
                >
                  <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>
                    Standard
                  </Typography>
                  <Box display="flex" alignItems="center" gap={8} mt={1}>
                    <SchoolOutlinedIcon style={{ fontSize: 18, color: '#0ea5e9' }} />
                    <Typography variant="body1" style={{ fontWeight: 600, color: '#1f2937' }}>
                      {standardLabel || '—'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e9ecef',
                    borderRadius: 10,
                    padding: 14,
                    height: '100%',
                  }}
                >
                  <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>
                    Template Name
                  </Typography>
                  <Box display="flex" alignItems="center" gap={8} mt={1}>
                    <MenuBookOutlinedIcon style={{ fontSize: 18, color: '#3949ab' }} />
                    <Typography variant="body1" style={{ fontWeight: 600, color: '#1f2937' }}>
                      {templateName || '—'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <Dropdown
                  label="Subject"
                  name="subject"
                  value={subject}
                  onChange={(e) => this.handleChange(e)}
                  data={subjectList}
                  fullWidth
                  disabled={isViewMode}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Dropdown
                  label="Standard"
                  name="standard"
                  value={standard}
                  onChange={(e) => this.handleChange(e)}
                  data={standardList}
                  fullWidth
                  disabled={isViewMode}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Template Name"
                  name="templateName"
                  value={templateName}
                  onChange={(e) => this.setState({ templateName: e.target.value })}
                  variant="outlined"
                  size="small"
                  disabled={isViewMode}
                />
              </Grid>
            </Grid>
          )}
        </Box>

        <Box px={2} pb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" style={{ gap: 12 }}>
            <Typography variant="subtitle1" style={{ fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ListAltOutlinedIcon style={{ fontSize: 22 }} /> Topics ({topics.length})
            </Typography>
            {!isViewMode && (
              <Button
                startIcon={<AddIcon />}
                onClick={this.addTopic}
                color="primary"
                variant="contained"
                size="small"
                style={{ textTransform: 'none', borderRadius: 8 }}
              >
                Add Topic
              </Button>
            )}
          </Box>

          <Box
            style={{
              maxHeight: isViewMode ? 'calc(100vh - 330px)' : 'unset',
              overflowY: isViewMode ? 'auto' : 'visible',
              minHeight: 0,
              paddingRight: isViewMode ? 6 : 0,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {isViewMode ? (
              topics.map((topic, topicIndex) => (
                <Paper
                  key={topic.tempId || topic.id || topicIndex}
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
                        <SchoolOutlinedIcon style={{ fontSize: 18, color: '#0ea5e9' }} />
                        {topic.name || `Topic ${topicIndex + 1}`}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>
                        Subtopics: {(topic.subtopics || []).length}
                      </Typography>
                    </Box>
                  </Box>

                  <Box mt={2}>
                    <Table size="small" style={{ tableLayout: 'fixed' }}>
                      <TableHead>
                        <TableRow style={{ backgroundColor: '#f5f7fa' }}>
                          <TableCell style={{ fontWeight: 700, color: '#374151' }}>Subtopic</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#374151' }}>Objectives</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#374151' }}>Activities</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#374151' }}>Resource</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#374151' }}>Assessment</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(topic.subtopics || []).map((subtopic, subIndex) => (
                          <TableRow key={subtopic.tempSubId || subtopic.id || subIndex}>
                            <TableCell style={{ wordBreak: 'break-word' }}>
                              <Typography variant="body2" style={{ fontWeight: 600, color: '#111827' }}>
                                {subtopic.name || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                              <Typography variant="body2" style={{ color: '#374151' }}>
                                {subtopic.objectives || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                              <Typography variant="body2" style={{ color: '#374151' }}>
                                {subtopic.activities || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                              <Typography variant="body2" style={{ color: '#374151' }}>
                                {subtopic.resource || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                              <Typography variant="body2" style={{ color: '#374151' }}>
                                {subtopic.assessment || '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              ))
            ) : (
              topics.map((topic, topicIndex) => (
                <Accordion
                  key={topic.tempId || topic.id || topicIndex}
                  expanded={expandedTopic === topicIndex}
                  onChange={this.handleAccordionChange(topicIndex)}
                  elevation={0}
                  style={{
                    marginBottom: 12,
                    border: '1px solid #e4e7eb',
                    borderRadius: 10,
                    overflow: 'hidden',
                    backgroundColor: '#fff',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    style={{
                      minHeight: 52,
                      backgroundColor: expandedTopic === topicIndex ? '#f5f7fa' : '#fafafa',
                    }}
                  >
                    <Typography variant="body1" style={{ fontWeight: 600, color: '#374151' }}>
                      {topic.name || `Topic ${topicIndex + 1}`}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails style={{ flexDirection: 'column', padding: '0 16px 16px' }}>
                    <Box display="flex" justifyContent="flex-end" mb={1}>
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
                        />
                      </Grid>
                    </Grid>

                    <Box mt={2} pt={2} style={{ borderTop: '1px solid #e4e7eb' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                        <Typography variant="body2" color="textSecondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <SchoolOutlinedIcon style={{ fontSize: 18 }} /> Subtopics
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => this.addSubtopic(topicIndex)}
                          color="primary"
                          style={{ textTransform: 'none', borderRadius: 8 }}
                        >
                          Add Subtopic
                        </Button>
                      </Box>

                      {(topic.subtopics || []).map((subtopic, subIndex) => (
                        <Paper
                          key={subtopic.tempSubId || subtopic.id || subIndex}
                          variant="outlined"
                          style={{ padding: 16, marginBottom: 12, backgroundColor: '#fafbfc', borderRadius: 10, border: '1px solid #e9ecef' }}
                        >
                          <Grid container spacing={2}>
                            <Grid item xs={12} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <TextField
                                size="small"
                                label="Subtopic Name"
                                placeholder="Subtopic name"
                                value={subtopic.name || ''}
                                onChange={(e) => this.handleSubtopicChange(topicIndex, subIndex, 'name', e.target.value)}
                                variant="outlined"
                                inputProps={{ maxLength: 255 }}
                                style={{ flex: 1, minWidth: 0 }}
                              />
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
                                Delete
                              </Button>
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
          </Box>

        {!isViewMode && (
          <Box mt={3} pt={2} px={2} display="flex" justifyContent="flex-end" style={{ borderTop: '1px solid #e9ecef' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={saveLoading ? null : <SaveOutlinedIcon />}
              onClick={this.handleSave}
              disabled={saveLoading}
              style={{ borderRadius: 8, textTransform: 'none', paddingLeft: 20, paddingRight: 20 }}
            >
              {saveLoading ? 'Submitting...' : 'Submit'}
            </Button>
          </Box>
        )}
        </Box>
      </Paper>
    );
  }
}

export default withRouter(LessonPlanning);
