import React, { Component } from 'react';
import {
  Paper,
  Box,
  Button,
  Grid,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  withStyles,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import LibraryBooksOutlinedIcon from '@material-ui/icons/LibraryBooksOutlined';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import EventIcon from '@material-ui/icons/Event';
import SchoolIcon from '@material-ui/icons/School';
import SubjectIcon from '@material-ui/icons/Subject';
import BookIcon from '@material-ui/icons/Book';
import AssignmentIcon from '@material-ui/icons/Assignment';
import ExtensionIcon from '@material-ui/icons/Extension';
import AssessmentIcon from '@material-ui/icons/Assessment';
import HistoryOutlinedIcon from '@material-ui/icons/HistoryOutlined';
import RestoreOutlinedIcon from '@material-ui/icons/RestoreOutlined';
import { withRouter, Link } from 'react-router-dom';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { dateFormat } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import Swal from 'sweetalert2';
import loadingBar from 'images/loading.gif';

const Styles = (theme) => ({
  summaryCard: {
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%)',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 24,
    border: '1px solid #E4E7EB',
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    minWidth: 100,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 600,
    color: '#111827',
  },
  topicCard: {
    borderRadius: 12,
    border: '1px solid #E4E7EB',
    overflow: 'hidden',
    marginBottom: 16,
    background: '#fff',
  },
  topicHeader: {
    background: '#f9fafb',
    padding: '14px 20px',
    borderBottom: '1px solid #E4E7EB',
  },
  subtopicCard: {
    background: '#fafafa',
    borderRadius: 10,
    padding: '18px 20px',
    marginBottom: 16,
    border: '1px solid #e5e7eb',
  },
  subtopicHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px dashed #d1d5db',
  },
  subtopicTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#374151',
  },
  dateChip: {
    fontSize: 11,
    background: '#e0e7ff',
    color: '#3730a3',
  },
  sectionBox: {
    background: '#fff',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 12,
    border: '1px solid #f3f4f6',
  },
  sectionLabel: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 1.6,
    color: '#374151',
    whiteSpace: 'pre-wrap',
  },
  modal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPaper: {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(3),
    width: '80%',
    maxWidth: 800,
    maxHeight: '90vh',
    overflowY: 'auto',
    borderRadius: 12,
  },
});

class LessonPlanAllocationDetail extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      historyLoading: false,
      allocationId: null,
      academicYearName: '',
      subjectName: '',
      standardSectionName: '',
      templateName: '',
      topics: [],
      expandedTopic: 0,
      showHistory: false,
      history: [],
    };
  }

  componentDidMount() {
    const allocationId = this.props.location?.state?.detail;
    if (!allocationId) {
      Swal.fire({ icon: 'warning', title: 'Invalid allocation.' });
      this.props.history.push(Actions?.lesson_plan_allocation?.view?.url);
      return;
    }
    this.setState({ allocationId }, () => this.fetchAllocation());
  }

  fetchAllocation = () => {
    const { allocationId } = this.state;
    if (!allocationId) return;
    const url = (GET_URL.lessonplantemplateacademicyear?.api || 'classes/lessonplantemplateacademicyear/') + allocationId + '/';
    getRequest(url, {}, this.props)
      .then((response) => {
        if (response && response.status === 200 && response.data) {
          const data = response.data?.data ?? response.data;
          const academicYear = data.academic_year;
          const subject = data.subject;
          const standardSection = data.standard_section;
          const template = data.lesson_plan_template;

          const academicYearName = typeof academicYear === 'object'
            ? (academicYear?.name ?? academicYear?.year ?? '')
            : String(academicYear || '');

          const subjectName = typeof subject === 'object'
            ? (subject?.name ?? subject?.subject_name ?? '')
            : String(subject || '');

          let standardSectionName = '';
          if (standardSection && typeof standardSection === 'object') {
            standardSectionName = standardSection.standard_section_display
              ?? (standardSection.standard_name && standardSection.section__name
                ? `${standardSection.standard_name} - ${standardSection.section__name}`
                : standardSection.name ?? '');
          } else {
            standardSectionName = data.standard_section_display ?? String(standardSection || '');
          }

          const templateName = template?.plan_name ?? template?.template_name ?? template?.name ?? data.plan_name ?? data.template_name ?? '';

          const rawTopics = data.topics ?? data.topics_data ?? [];
          const topics = rawTopics.map((t, idx) => {
            const rawSubtopics = t.subtopics ?? t.subtopic_list ?? [];
            const subtopics = rawSubtopics.map((s, sIdx) => {
              const details = s.subtopic_details ?? s.details ?? s.subtopic_detail ?? [];
              const first = Array.isArray(details) ? details[0] : details;
              return {
                id: s.id ?? sIdx + 1,
                name: s.name ?? '',
                allocated_from_date: s.allocated_from_date ?? first?.allocated_from_date ?? '',
                allocated_to_date: s.allocated_to_date ?? first?.allocated_to_date ?? '',
                objectives: first?.objectives ?? '',
                activities: first?.activities ?? '',
                resource: first?.resource ?? '',
                assessment: first?.assessment ?? '',
              };
            });
            return {
              id: t.id ?? idx + 1,
              name: t.name ?? t.topic_name ?? '',
              subtopics: subtopics.length ? subtopics : [],
            };
          });

          this.setState({
            academicYearName,
            subjectName,
            standardSectionName,
            templateName,
            topics: topics.length ? topics : [],
            expandedTopic: 0,
          });
        }
        this.setState({ loading: false });
      })
      .catch(() => this.setState({ loading: false }));
  };

  fetchHistory = () => {
    const { allocationId } = this.state;
    this.setState({ historyLoading: true, showHistory: true });
    getRequest('classes/lessonplanversion/', { lesson_plan: allocationId }, this.props)
      .then((response) => {
        const history = response?.status === 200 ? response.data?.data || [] : [];
        this.setState({ history, historyLoading: false });
      })
      .catch(() => this.setState({ historyLoading: false }));
  };

  handleRestore = (versionId) => {
    Swal.fire({
      title: 'Restore this version?',
      text: 'This will replace the current lesson plan with this historical snapshot.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Restore',
    }).then((result) => {
      if (result.isConfirmed) {
        postRequest(`classes/lessonplanversion/${versionId}/restore/`, {}, this.props)
          .then((response) => {
            if (response?.status === 200) {
              Swal.fire('Restored!', 'The lesson plan has been restored.', 'success');
              this.setState({ showHistory: false, loading: true }, () => this.fetchAllocation());
            } else {
              Swal.fire('Error', 'Restore failed.', 'error');
            }
          });
      }
    });
  };

  handleAccordionChange = (index) => (e, isExpanded) => {
    this.setState({ expandedTopic: isExpanded ? index : false });
  };

  renderSection = (classes, icon, label, content) => (
    <Box className={classes.sectionBox}>
      <Box className={classes.sectionLabel}>{icon}{label}</Box>
      <Box className={classes.sectionContent}>
        {content && content.trim() ? content : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>}
      </Box>
    </Box>
  );

  renderHistoryModal() {
    const { classes } = this.props;
    const { showHistory, history, historyLoading } = this.state;
    return (
      <Modal open={showHistory} onClose={() => this.setState({ showHistory: false })} className={classes.modal}>
        <Box className={classes.modalPaper}>
          <Typography variant="h6" style={{ marginBottom: 20, fontWeight: 700 }}>
            <HistoryOutlinedIcon style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Version History
          </Typography>
          {historyLoading ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={0} variant="outlined">
              <Table>
                <TableHead style={{ background: '#f9fafb' }}>
                  <TableRow>
                    <TableCell>Ver</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Changed By</TableCell>
                    <TableCell>Summary</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell><strong>v{v.version_number}</strong></TableCell>
                      <TableCell>{dateFormat(v.created_at, 'DD MMM YYYY HH:mm')}</TableCell>
                      <TableCell>{v.created_by_name}</TableCell>
                      <TableCell>{v.change_summary || '-'}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          color="secondary"
                          startIcon={<RestoreOutlinedIcon />}
                          onClick={() => this.handleRestore(v.id)}
                          style={{ textTransform: 'none' }}
                        >
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No history found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button variant="outlined" onClick={() => this.setState({ showHistory: false })}>Close</Button>
          </Box>
        </Box>
      </Modal>
    );
  }

  render() {
    const {
      loading,
      academicYearName,
      subjectName,
      standardSectionName,
      templateName,
      topics,
      expandedTopic,
    } = this.state;
    const { classes } = this.props;

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    }

    return (
      <Paper className="paper-background" elevation={0} style={{ borderRadius: 12, overflow: 'hidden' }}>
        {this.renderHistoryModal()}
        <Box px={2} pt={2} pb={1}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={8}>
              <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 12 }}>
                <Box display="flex" alignItems="center" justifyContent="center" style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' }}>
                  <LibraryBooksOutlinedIcon style={{ fontSize: 28, color: '#2e7d32' }} />
                </Box>
                <Box>
                  <Typography variant="h6" style={{ fontWeight: 600, color: '#1b5e20' }}>View Lesson Plan Allocation</Typography>
                  <Typography variant="body2" color="textSecondary">Topic-wise lesson plan with dates and details</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" justifyContent="flex-end" flexWrap="wrap" style={{ gap: 8 }}>
                <Button
                  variant="outlined"
                  onClick={this.fetchHistory}
                  startIcon={<HistoryOutlinedIcon />}
                  style={{ textTransform: 'none', borderRadius: 8 }}
                >
                  Version History
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  to={Actions?.lesson_plan_allocation?.view?.url}
                  className="editbutton-view"
                  startIcon={<VisibilityOutlinedIcon />}
                  style={{ textTransform: 'none', borderRadius: 8 }}
                >
                  Back to List
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
...

        {/* Summary Card - Key info at a glance */}
        <Box className={classes.summaryCard} style={{ marginLeft: 16, marginRight: 16 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box className={classes.summaryItem}>
                <EventIcon style={{ fontSize: 20, color: '#6b7280' }} />
                <Box>
                  <Box className={classes.summaryLabel}>Academic Year</Box>
                  <Box className={classes.summaryValue}>{academicYearName || '—'}</Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box className={classes.summaryItem}>
                <SubjectIcon style={{ fontSize: 20, color: '#6b7280' }} />
                <Box>
                  <Box className={classes.summaryLabel}>Subject</Box>
                  <Box className={classes.summaryValue}>{subjectName || '—'}</Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box className={classes.summaryItem}>
                <SchoolIcon style={{ fontSize: 20, color: '#6b7280' }} />
                <Box>
                  <Box className={classes.summaryLabel}>Standard Section</Box>
                  <Box className={classes.summaryValue}>{standardSectionName || '—'}</Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box className={classes.summaryItem}>
                <BookIcon style={{ fontSize: 20, color: '#6b7280' }} />
                <Box>
                  <Box className={classes.summaryLabel}>Template</Box>
                  <Box className={classes.summaryValue}>{templateName || '—'}</Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Topics - Accordion with enhanced cards */}
        {topics && topics.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: 16, color: '#374151' }}>
              Topics & Lesson Plan ({topics.length})
            </Typography>
            {topics.map((topic, topicIndex) => (
              <Box key={topic.id || topicIndex} className={classes.topicCard}>
                <Accordion
                  expanded={expandedTopic === topicIndex}
                  onChange={this.handleAccordionChange(topicIndex)}
                  elevation={0}
                  style={{ background: 'transparent' }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    style={{ background: '#f9fafb', borderBottom: '1px solid #E4E7EB' }}
                  >
                    <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 8 }}>
                      <Chip
                        label={topicIndex + 1}
                        size="small"
                        style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 600 }}
                      />
                      <Typography variant="body1" style={{ fontWeight: 600, color: '#111827' }}>
                        {topic.name || `Topic ${topicIndex + 1}`}
                      </Typography>
                      {(topic.subtopics || []).length > 0 && (
                        <Chip
                          label={`${topic.subtopics.length} subtopic(s)`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails style={{ flexDirection: 'column', padding: '20px 24px' }}>
                    {(topic.subtopics || []).length === 0 && (
                      <Typography variant="body2" color="textSecondary">No subtopics</Typography>
                    )}
                    {(topic.subtopics || []).map((subtopic, subIndex) => (
                      <Box key={subtopic.id || subIndex} className={classes.subtopicCard}>
                        <Box className={classes.subtopicHeader}>
                          <Box className={classes.subtopicTitle}>
                            {subtopic.name || `Subtopic ${subIndex + 1}`}
                          </Box>
                          {(subtopic.allocated_from_date || subtopic.allocated_to_date) && (
                            <Box display="flex" gap={1} flexWrap="wrap">
                              {subtopic.allocated_from_date && (
                                <Chip
                                  icon={<EventIcon style={{ fontSize: 14 }} />}
                                  label={`From: ${dateFormat(subtopic.allocated_from_date, 'DD-MM-YYYY')}`}
                                  size="small"
                                  className={classes.dateChip}
                                />
                              )}
                              {subtopic.allocated_to_date && (
                                <Chip
                                  icon={<EventIcon style={{ fontSize: 14 }} />}
                                  label={`To: ${dateFormat(subtopic.allocated_to_date, 'DD-MM-YYYY')}`}
                                  size="small"
                                  className={classes.dateChip}
                                />
                              )}
                            </Box>
                          )}
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            {this.renderSection(classes, <AssignmentIcon style={{ fontSize: 14 }} />, 'Objectives', subtopic.objectives)}
                          </Grid>
                          <Grid item xs={12} md={6}>
                            {this.renderSection(classes, <ExtensionIcon style={{ fontSize: 14 }} />, 'Activities', subtopic.activities)}
                          </Grid>
                          <Grid item xs={12} md={6}>
                            {this.renderSection(classes, <BookIcon style={{ fontSize: 14 }} />, 'Resource', subtopic.resource)}
                          </Grid>
                          <Grid item xs={12} md={6}>
                            {this.renderSection(classes, <AssessmentIcon style={{ fontSize: 14 }} />, 'Assessment', subtopic.assessment)}
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>
              </Box>
            ))}
          </Box>
        )}

        {(!topics || topics.length === 0) && (
          <Paper className="header-align expense-individual-paper-background" style={{ padding: 32 }}>
            <Typography variant="body1" color="textSecondary" align="center">
              No topics found.
            </Typography>
          </Paper>
        )}
      </Paper>
    );
  }
}

export default withRouter(withStyles(Styles)(LessonPlanAllocationDetail));
