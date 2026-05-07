import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Divider,
} from '@material-ui/core';
import CloudUploadOutlinedIcon from '@material-ui/icons/CloudUploadOutlined';
import SaveOutlinedIcon from '@material-ui/icons/SaveOutlined';
import LibraryBooksOutlinedIcon from '@material-ui/icons/LibraryBooksOutlined';
import StarsOutlinedIcon from '@material-ui/icons/StarsOutlined';
import EventNoteOutlinedIcon from '@material-ui/icons/EventNoteOutlined';
import AssignmentOutlinedIcon from '@material-ui/icons/AssignmentOutlined';
import HistoryOutlinedIcon from '@material-ui/icons/HistoryOutlined';
import { withRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { getAcademicYear } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import './AILessonPlanUpload.scss';

class AILessonPlanUpload extends Component {
  state = {
    loading: true,
    previewLoading: false,
    importLoading: false,
    sourceMode: 'manual',
    academicYear: '',
    subject: '',
    standardSection: '',
    file: null,
    startDate: '',
    endDate: '',
    replaceExisting: false,
    yearList: [],
    subjectList: [],
    standardSectionList: [],
    ncertHierarchy: [],
    ncertBooks: [],
    ncertClass: '',
    ncertSubject: '',
    ncertBookCode: '',
    ncertBookTitle: '',
    ncertBookPdfUrl: '',
    ncertBooksLoading: false,
    previewSourceMode: 'manual',
    preview: null,
  };

  componentDidMount() {
    window.Promise.all([
      getRequest(GET_URL.getacademicyear.api, { is_active: true }, this.props),
      getRequest(GET_URL.subject.api, { is_active: true }, this.props),
    ])
      .then(([yearRes, subjectRes]) => {
        const yearList = yearRes?.status === 200 ? yearRes.data?.data || [] : [];
        const subjectList = subjectRes?.status === 200 ? subjectRes.data?.data || [] : [];
        const savedYear = getAcademicYear();
        const academicYear =
          savedYear && yearList.some((y) => String(y.id) === String(savedYear))
            ? String(savedYear)
            : yearList[0]?.id
            ? String(yearList[0].id)
            : '';
        this.setState({ yearList, subjectList, academicYear }, () => {
          if (academicYear) this.fetchStandardSections();
          this.fetchNcertHierarchy();
        });
      })
      .catch(() => this.setState({ loading: false }));
  }

  fetchStandardSections = () => {
    const { academicYear } = this.state;
    if (!academicYear) return;
    getRequest(GET_URL.getstandardandsection.api, { academic_year: academicYear, is_active: true }, this.props)
      .then((response) => {
        const flattened = [];
        const standardsData = response?.status === 200 ? response.data?.data || [] : [];
        standardsData.forEach((standard) => {
          (standard.sections || []).forEach((section) => {
            flattened.push({
              id: section.standard_section || section.id,
              name: `${standard.standard_name || standard.name || ''} - ${section.section_name || section.name || ''}`,
            });
          });
        });
        this.setState({ standardSectionList: flattened });
      });
  };

  fetchNcertHierarchy = () => {
    getRequest(GET_URL.ncerthierarchy.api, {}, this.props)
      .then((response) => {
        const ncertHierarchy = response?.status === 200 ? response.data?.data || [] : [];
        if (ncertHierarchy.length > 0) {
          const firstClass = ncertHierarchy[0]?.class ? String(ncertHierarchy[0].class) : '';
          const firstSubject = ncertHierarchy[0]?.subjects?.[0] || '';
          this.setState(
            {
              ncertHierarchy,
              ncertClass: firstClass,
              ncertSubject: firstSubject,
              loading: false,
            },
            () => {
              if (firstClass && firstSubject) this.fetchNcertBooks(firstClass, firstSubject);
            }
          );
        } else {
          this.setState({ ncertHierarchy: [], loading: false });
        }
      })
      .catch(() => this.setState({ loading: false }));
  };

  fetchNcertBooks = (ncertClass, ncertSubject) => {
    if (!ncertClass || !ncertSubject) {
      this.setState({ ncertBooks: [], ncertBookCode: '', ncertBookTitle: '', ncertBookPdfUrl: '' });
      return;
    }
    this.setState({ ncertBooksLoading: true });
    getRequest(GET_URL.ncertbooks.api, { class_num: ncertClass, subject: ncertSubject }, this.props)
      .then((response) => {
        const ncertBooks = response?.status === 200 ? response.data?.data || [] : [];
        const selectedBook = ncertBooks[0] || {};
        this.setState({
          ncertBooks,
          ncertBookCode: selectedBook.code || '',
          ncertBookTitle: selectedBook.title || '',
          ncertBookPdfUrl: selectedBook.pdf_url || '',
          ncertBooksLoading: false,
        });
      })
      .catch(() => {
        this.setState({ ncertBooks: [], ncertBookCode: '', ncertBookTitle: '', ncertBookPdfUrl: '', ncertBooksLoading: false });
      });
  };

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, preview: null }, () => {
      if (name === 'academicYear') this.fetchStandardSections();
    });
  };

  handleSourceModeChange = (sourceMode) => {
    this.setState({ sourceMode, preview: null });
  };

  handleNcertFieldChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, preview: null }, () => {
      if (name === 'ncertClass') {
        const selectedHierarchy = this.state.ncertHierarchy.find((item) => String(item.class) === String(value));
        const nextSubject = selectedHierarchy?.subjects?.[0] || '';
        this.setState({ ncertSubject: nextSubject }, () => this.fetchNcertBooks(value, nextSubject));
      } else if (name === 'ncertSubject') {
        this.fetchNcertBooks(this.state.ncertClass, value);
      } else if (name === 'ncertBookCode') {
        const selectedBook = this.state.ncertBooks.find((book) => String(book.code) === String(value));
        this.setState({
          ncertBookTitle: selectedBook?.title || '',
          ncertBookPdfUrl: selectedBook?.pdf_url || '',
        });
      }
    });
  };

  handleBookSelect = (book) => {
    this.setState({
      ncertBookCode: book.code,
      ncertBookTitle: book.title,
      ncertBookPdfUrl: book.pdf_url,
      preview: null,
    });
  };

  buildPreviewForm = (options = {}) => {
    const { academicYear, subject, standardSection, file, startDate, endDate } = this.state;
    const form = new FormData();
    form.append('academic_year', academicYear);
    form.append('subject', subject);
    form.append('standard_section', standardSection);
    form.append('file', file);

    if (startDate) form.append('start_date', startDate);
    if (endDate) form.append('end_date', endDate);
    if (options.useFuzzyMatch) form.append('use_fuzzy_match', 'true');
    if (options.forceRegenerate) form.append('force_regenerate', 'true');
    return form;
  };

  handlePreview = (options = {}) => {
    const { academicYear, subject, standardSection, file } = this.state;
    if (!academicYear || !subject || !standardSection || !file) {
      Swal.fire({ icon: 'warning', title: 'Select year, subject, section, and a PDF book.' });
      return;
    }
    const form = this.buildPreviewForm(options);

    this.setState({ previewLoading: true, preview: null, previewSourceMode: 'manual' });
    postRequest(POST_URL.ailessonplanpreview.api, form, { ...this.props, return_error: true })
      .then((response) => {
        this.setState({ previewLoading: false });
        if (response?.status === 200) {
          this.setState({ preview: response.data });
        } else {
          const msg = response?.data?.detail || response?.data?.file || response?.data?.GEMINI_API_KEY || response?.data;
          Swal.fire({ icon: 'error', title: 'Preview failed', text: typeof msg === 'string' ? msg : JSON.stringify(msg) });
        }
      })
      .catch((error) => {
        this.setState({ previewLoading: false });
        Swal.fire({ icon: 'error', title: 'Preview failed', text: error?.message || 'Unable to generate lesson plan.' });
      });
  };

  handleNcertPreview = (options = {}) => {
    const { academicYear, subject, standardSection, ncertBookCode, ncertBookTitle, ncertBookPdfUrl, startDate, endDate } = this.state;
    if (!academicYear || !subject || !standardSection || !ncertBookCode) {
      Swal.fire({ icon: 'warning', title: 'Select year, subject, section, and an NCERT book.' });
      return;
    }

    this.setState({ previewLoading: true, preview: null, previewSourceMode: 'ncert' });
    postRequest(
      POST_URL.ailessonplanncertpreview.api,
      {
        academic_year: academicYear,
        subject,
        standard_section: standardSection,
        book_code: ncertBookCode,
        book_title: ncertBookTitle,
        pdf_url: ncertBookPdfUrl,
        use_fuzzy_match: Boolean(options.useFuzzyMatch),
        force_regenerate: Boolean(options.forceRegenerate),
        start_date: startDate || null,
        end_date: endDate || null,
      },
      { ...this.props, return_error: true }
    )
      .then((response) => {
        this.setState({ previewLoading: false });
        if (response?.status === 200) {
          this.setState({ preview: response.data });
        } else {
          const msg = response?.data?.detail || response?.data?.book_code || response?.data;
          Swal.fire({ icon: 'error', title: 'NCERT preview failed', text: typeof msg === 'string' ? msg : JSON.stringify(msg) });
        }
      })
      .catch((error) => {
        this.setState({ previewLoading: false });
        Swal.fire({ icon: 'error', title: 'NCERT preview failed', text: error?.message || 'Unable to generate lesson plan from NCERT.' });
      });
  };

  handleRetryPreview = (options = {}) => {
    if (this.state.previewSourceMode === 'ncert') {
      this.handleNcertPreview(options);
      return;
    }
    this.handlePreview(options);
  };

  handleImport = () => {
    const { preview, academicYear, subject, standardSection, replaceExisting, startDate, endDate } = this.state;
    if (!preview?.cache_key) return;
    this.setState({ importLoading: true });
    postRequest(
      POST_URL.ailessonplanimport.api,
      {
        cache_key: preview.cache_key,
        academic_year: academicYear,
        subject,
        standard_section: standardSection,
        replace_existing: replaceExisting,
        start_date: startDate || null,
        end_date: endDate || null,
      },
      { ...this.props, return_error: true }
    )
      .then((response) => {
        this.setState({ importLoading: false });
        if (response?.status === 200) {
          Swal.fire({ icon: 'success', title: response.data?.Reason || 'AI lesson plan imported.' });
          this.props.history.push(Actions.lesson_plan_allocation.view.url);
        } else {
          const msg = response?.data?.replace_existing || response?.data?.detail || response?.data;
          Swal.fire({ icon: 'error', title: 'Import failed', text: typeof msg === 'string' ? msg : JSON.stringify(msg) });
        }
      })
      .catch((error) => {
        this.setState({ importLoading: false });
        Swal.fire({ icon: 'error', title: 'Import failed', text: error?.message || 'Unable to import lesson plan.' });
      });
  };

  renderPreview() {
    const { preview, replaceExisting, importLoading, previewLoading } = this.state;
    if (!preview) return null;
    return (
      <Box className="preview-section">
        <Paper className="preview-card" elevation={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h6" style={{ fontWeight: 700 }}>
                <StarsOutlinedIcon style={{ verticalAlign: 'middle', marginRight: 8, color: '#3b82f6' }} />
                AI Generated Preview
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {preview.book_title || preview.source_filename} • {preview.total_periods || 0} Periods • {preview.total_hours || 0} Hours
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              className="generate-btn"
              startIcon={importLoading ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
              disabled={importLoading || preview.is_fuzzy_match || (preview.existing_plan_requires_replace && !replaceExisting)}
              onClick={this.handleImport}
            >
              Confirm & Import Plan
            </Button>
          </Box>

          {preview.is_fuzzy_match && (
            <Box className="fuzzy-match-notice">
              <Typography className="fuzzy-title">
                <HistoryOutlinedIcon /> Similar Plan Found in Library
              </Typography>
              <Typography variant="body2" style={{ marginBottom: 16 }}>
                We found a high-quality match for "<strong>{preview.fuzzy_match?.book_title || preview.book_title}</strong>". 
                You can reuse this verified plan or generate a fresh one.
              </Typography>
              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  style={{ background: '#9a3412', color: 'white', textTransform: 'none' }}
                  disabled={previewLoading}
                  onClick={() => this.handleRetryPreview({ useFuzzyMatch: true })}
                >
                  Use Library Plan
                </Button>
                <Button
                  variant="outlined"
                  style={{ borderColor: '#9a3412', color: '#9a3412', textTransform: 'none' }}
                  disabled={previewLoading}
                  onClick={() => this.handleRetryPreview({ forceRegenerate: true })}
                >
                  Generate Fresh Plan
                </Button>
              </Box>
            </Box>
          )}

          {preview.existing_plan_requires_replace && (
            <Box mb={2} p={2} style={{ background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
              <FormControlLabel
                control={<Checkbox checked={replaceExisting} onChange={(e) => this.setState({ replaceExisting: e.target.checked })} color="secondary" />}
                label={<Typography variant="body2" style={{ color: '#991b1b', fontWeight: 600 }}>Overwrite existing lesson plan for this selection</Typography>}
              />
            </Box>
          )}

          <Divider style={{ margin: '24px 0' }} />

          <Box className="topic-list">
            {(preview.topics || []).map((topic, index) => (
              <Box key={`${topic.name}-${index}`} className="topic-item">
                <Typography className="topic-name">
                  <AssignmentOutlinedIcon style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 8, color: '#3b82f6' }} />
                  {index + 1}. {topic.name}
                </Typography>
                <Typography className="subtopics">
                  {topic.subtopics && topic.subtopics.length > 0 
                    ? topic.subtopics.map((s) => s.name).join(' • ')
                    : 'No subtopics specified'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    );
  }

  render() {
    const {
      loading,
      previewLoading,
      academicYear,
      subject,
      standardSection,
      yearList,
      subjectList,
      standardSectionList,
      file,
      startDate,
      endDate,
      sourceMode,
      ncertHierarchy,
      ncertBooks,
      ncertClass,
      ncertSubject,
      ncertBookCode,
      ncertBookTitle,
      ncertBooksLoading,
    } = this.state;
    if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="100vh"><CircularProgress /></Box>;
    
    return (
      <Box className="ai-upload-container">
        <Box className="header-section">
          <Box className="header-text">
            <Typography variant="h5">AI-Powered Lesson Planning</Typography>
            <Typography variant="body1">Upload your curriculum PDF and let AI organize your teaching schedule instantly.</Typography>
          </Box>
          <StarsOutlinedIcon className="header-icon" />
        </Box>

        <Paper className="main-card">
          <Box className="form-section">
            <Box className="source-switcher">
              <Button
                variant={sourceMode === 'manual' ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => this.handleSourceModeChange('manual')}
              >
                Manual Upload
              </Button>
              <Button
                variant={sourceMode === 'ncert' ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => this.handleSourceModeChange('ncert')}
              >
                Official NCERT Library
              </Button>
            </Box>

            <Typography className="section-title">
              <LibraryBooksOutlinedIcon /> Course & Batch Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Academic Year" name="academicYear" value={academicYear} onChange={this.handleChange} variant="outlined">
                  {yearList.map((y) => <MenuItem key={y.id} value={String(y.id)}>{y.name || y.alias}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Subject" name="subject" value={subject} onChange={this.handleChange} variant="outlined">
                  {subjectList.map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Standard & Section" name="standardSection" value={standardSection} onChange={this.handleChange} variant="outlined">
                  {standardSectionList.map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>

            <Typography className="section-title" style={{ marginTop: 32 }}>
              <EventNoteOutlinedIcon /> Timeline Constraints (Optional)
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Session Start Date"
                  type="date"
                  name="startDate"
                  value={startDate}
                  onChange={this.handleChange}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Session End Date"
                  type="date"
                  name="endDate"
                  value={endDate}
                  onChange={this.handleChange}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            {sourceMode === 'manual' ? (
              <Grid container spacing={3} alignItems="flex-end">
                <Grid item xs={12} md={8}>
                  <input
                    accept="application/pdf"
                    id="ai-lesson-book-upload"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const nextFile = e.target.files?.[0] || null;
                      this.setState({ file: nextFile, preview: null });
                    }}
                  />
                  <label htmlFor="ai-lesson-book-upload" style={{ width: '100%' }}>
                    <Box className="upload-area">
                      <CloudUploadOutlinedIcon className="upload-icon" />
                      <Typography variant="h6" style={{ fontWeight: 600 }}>
                        {file ? 'Selected: ' + file.name : 'Drop your Textbook PDF here'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {file ? 'Click to change file' : 'or click to browse from computer'}
                      </Typography>
                      {file && <Typography className="file-name">{file.name}</Typography>}
                    </Box>
                  </label>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    className="generate-btn"
                    disabled={previewLoading || !file}
                    onClick={() => this.handlePreview()}
                    startIcon={previewLoading ? <CircularProgress size={20} color="inherit" /> : <StarsOutlinedIcon />}
                    style={{ height: 56, marginBottom: 8 }}
                  >
                    {previewLoading ? 'Analyzing...' : 'Generate Plan Preview'}
                  </Button>
                </Grid>
              </Grid>
            ) : (
              <Box className="ncert-browser-section">
                <Typography className="section-title" style={{ marginTop: 32 }}>
                  <LibraryBooksOutlinedIcon /> NCERT Browser
                </Typography>
                <Grid container spacing={3} style={{ marginBottom: 24 }}>
                  <Grid item xs={12} md={6}>
                    <TextField select fullWidth label="NCERT Class" name="ncertClass" value={ncertClass} onChange={this.handleNcertFieldChange} variant="outlined">
                      {ncertHierarchy.map((item) => (
                        <MenuItem key={item.class} value={String(item.class)}>
                          Class {item.class}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField select fullWidth label="NCERT Subject" name="ncertSubject" value={ncertSubject} onChange={this.handleNcertFieldChange} variant="outlined">
                      {(ncertHierarchy.find((item) => String(item.class) === String(ncertClass))?.subjects || []).map((item) => (
                        <MenuItem key={item} value={item}>
                          {item}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>

                <Box className="ncert-showcase-container">
                  {ncertBooksLoading ? (
                    <Box display="flex" flexDirection="column" alignItems="center" p={6} bgcolor="#f8fafc" borderRadius={12}>
                      <CircularProgress size={32} style={{ marginBottom: 16 }} />
                      <Typography variant="body2" color="textSecondary">Fetching official library...</Typography>
                    </Box>
                  ) : ncertBooks.length > 0 ? (
                    <Grid container spacing={2} className="book-grid">
                      {ncertBooks.map((book) => (
                        <Grid item xs={6} sm={4} md={3} key={book.code}>
                          <Box 
                            className={`book-card ${ncertBookCode === book.code ? 'selected' : ''}`}
                            onClick={() => this.handleBookSelect(book)}
                          >
                            <Box className="cover-wrapper">
                              <img src={book.cover_url} alt={book.title} onError={(e) => { e.target.src = 'https://via.placeholder.com/150x200?text=NCERT'; }} />
                              {ncertBookCode === book.code && (
                                <Box className="selection-overlay">
                                  <StarsOutlinedIcon />
                                </Box>
                              )}
                            </Box>
                            <Typography className="book-title">{book.title}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Box p={6} textAlign="center" bgcolor="#f8fafc" borderRadius={12} border="1px dashed #e2e8f0">
                      <Typography color="textSecondary">No books found for this selection in the NCERT library.</Typography>
                    </Box>
                  )}
                </Box>

                {ncertBookCode && (
                  <Box className="ncert-selection-summary">
                    <Box>
                      <Typography variant="subtitle2" style={{ fontWeight: 700, color: '#1e293b' }}>
                        Selected: {ncertBookTitle}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Book code: {ncertBookCode} • Ready for AI processing
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      className="generate-btn"
                      style={{ marginTop: 0 }}
                      disabled={previewLoading}
                      onClick={this.handleNcertPreview}
                      startIcon={previewLoading ? <CircularProgress size={20} color="inherit" /> : <StarsOutlinedIcon />}
                    >
                      {previewLoading ? 'Analyzing...' : 'Generate Plan Preview'}
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Paper>

        {this.renderPreview()}
      </Box>
    );
  }
}

AILessonPlanUpload.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};

export default withRouter(AILessonPlanUpload);
