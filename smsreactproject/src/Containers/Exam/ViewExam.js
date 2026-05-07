import React, { Component } from 'react';
import { Button, Box, Grid, Paper, CircularProgress, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Checkbox, List, ListItem, ListItemIcon, ListItemText, Divider } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import { withRouter } from 'react-router-dom';
import DeleteForeverOutlinedIcon from '@material-ui/icons/DeleteForeverOutlined';
import EditOutlinedIcon from '@material-ui/icons/EditOutlined';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';
import ExpandMoreOutlinedIcon from '@material-ui/icons/ExpandMoreOutlined';
import ExpandLessOutlinedIcon from '@material-ui/icons/ExpandLessOutlined';

import loadingBar from 'images/loading.gif'
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, dateFormat, Alert, getAcademicYear, SetAcademicYear, getKeyValueMap } from 'Includes/functions';
import { getRequest, deleteRequest, putRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, PUT_URL, POST_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';

class ViewExam extends Component {
    constructor(props) {
        super(props)

        this.state = {
            yearList: [],
            examTermList: [],
            selectedYear: '',
            selectedTerm: 'All',
            error: { year: '' },
            open: false,
            alertData: '',
            blank: true,
            loadingExam: false,
            isExpand: false,
            isExpanded: false,
            hoveredExamId: null,
            loading: true,
            blankHeading: 'Change the Academic year and expect the result',

            bulkCopyDialogOpen: false,
            bulkCopyLoading: false,
            bulkCopyFromYear: '',
            bulkCopyFromTerm: 'All',
            bulkCopyToYear: '',
            bulkCopySourceExamList: [],
            bulkCopySelectedExamIds: {},
            bulkCopyTargetExamKeys: {},
            bulkCopyTargetLoading: false,
        }
    }

    getAcademicYearById = (yearId) => {
        const { yearList } = this.state;
        const yid = String(yearId ?? '');
        return (yearList || []).find((y) => String(y.id) === yid) || null;
    }

    getNextAcademicYearId = (fromYearId) => {
        const { yearList } = this.state;
        const list = Array.isArray(yearList) ? [...yearList] : [];
        if (!list.length) return '';

        const normalized = list
            .map((y) => {
                const startTs = y?.start_date ? new Date(`${y.start_date}T00:00:00`).getTime() : NaN;
                return {
                    id: y?.id,
                    startTs: Number.isFinite(startTs) ? startTs : Number.MAX_SAFE_INTEGER,
                };
            })
            .filter((y) => y.id != null)
            .sort((a, b) => a.startTs - b.startTs);

        const currentIdx = normalized.findIndex((y) => String(y.id) === String(fromYearId));
        if (currentIdx === -1) return '';

        const next = normalized[currentIdx + 1];
        return next ? String(next.id) : '';
    }

    shiftDateToTargetAcademicYear = (dateStr, targetYearObj) => {
        if (!dateStr || !targetYearObj?.start_date) return '';
        const parts = String(dateStr).split('-'); // YYYY-MM-DD
        if (parts.length < 3) return '';
        const mm = parts[1];
        const dd = parts[2];
        const targetYear = String(targetYearObj.start_date).split('-')[0];
        return `${targetYear}-${mm}-${dd}`;
    }

    isDateWithinAcademicYear = (dateStr, yearObj) => {
        if (!dateStr || !yearObj?.start_date || !yearObj?.end_date) return true;
        const d = new Date(`${dateStr}T00:00:00`);
        const s = new Date(`${yearObj.start_date}T00:00:00`);
        const e = new Date(`${yearObj.end_date}T23:59:59`);
        if (Number.isNaN(d.getTime()) || Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return true;
        return d >= s && d <= e;
    }

    getBulkCopyExamKey = (examData) => {
        if (!examData) return '';
        const examType = String(examData.exam_type ?? examData.exam_type_id ?? '');
        const term = String(examData.term ?? examData.term_id ?? '');
        const isSection = Boolean(examData.is_standard_section) ? 1 : 0;

        // Prefer backend-provided `standard_section_ids` to keep the key unique per exam.
        const secIdsRaw = examData.standard_section_ids ?? '';
        if (secIdsRaw) {
            const secIds = String(secIdsRaw)
                .split(',')
                .map((s) => Number(s))
                .filter((n) => Number.isFinite(n) && n > 0)
                .sort((a, b) => a - b);
            return `${examType}-${term}-${isSection}-${secIds.join(',')}`;
        }

        return `${examType}-${term}-${isSection}`;
    }

    loadBulkCopyTargetExamKeys = (toYear, toTerm = 'All') => {
        if (!toYear) {
            this.setState({ bulkCopyTargetExamKeys: {}, bulkCopyTargetLoading: false });
            return;
        }

        const params = toTerm && toTerm !== 'All'
            ? { academic_year: toYear, is_active: true, term: toTerm }
            : { academic_year: toYear, is_active: true };

        this.setState({ bulkCopyTargetLoading: true, bulkCopyTargetExamKeys: {} });
        getRequest(GET_URL.exam.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const exams = Array.isArray(response.data.data) ? response.data.data : [];
                const keys = {};
                exams.forEach((ex) => {
                    const key = this.getBulkCopyExamKey(ex);
                    if (key) keys[key] = true;
                });
                this.setState({ bulkCopyTargetExamKeys: keys, bulkCopyTargetLoading: false });
            } else {
                this.setState({ bulkCopyTargetExamKeys: {}, bulkCopyTargetLoading: false });
            }
        }).catch(() => {
            this.setState({ bulkCopyTargetExamKeys: {}, bulkCopyTargetLoading: false });
        });
    }

    getVisibleBulkCopySourceExams = () => {
        const { bulkCopySourceExamList, bulkCopyTargetExamKeys } = this.state;
        const keys = bulkCopyTargetExamKeys || {};
        return (bulkCopySourceExamList || []).filter((ex) => {
            const key = this.getBulkCopyExamKey(ex);
            return !keys?.[key];
        });
    }

    extractStandardIdsForCopy = (examData) => {
        if (!examData) return { isSection: false, ids: [] };
        const isSection = Boolean(examData.is_standard_section);
        const list = Array.isArray(examData.standard_names) ? examData.standard_names : [];
        if (!isSection) {
            const ids = list
                .map((s) => s?.id ?? s?.standard ?? s?.standard_id)
                .map((v) => Number(v))
                .filter((n) => Number.isFinite(n) && n > 0);
            return { isSection: false, ids };
        }

        const ids = [];
        list.forEach((std) => {
            const secs = Array.isArray(std?.section_list) ? std.section_list : [];
            secs.forEach((sec) => {
                const v = sec?.id ?? sec?.section ?? sec?.section_id;
                const n = Number(v);
                if (Number.isFinite(n) && n > 0) ids.push(n);
            });
        });
        return { isSection: true, ids };
    }

    openBulkCopyDialog = () => {
        this.setState(
            {
                bulkCopyDialogOpen: true,
                bulkCopyLoading: false,
                bulkCopyFromYear: '',
                bulkCopyFromTerm: 'All',
                bulkCopyToYear: '',
                bulkCopySourceExamList: [],
                bulkCopySelectedExamIds: {},
                bulkCopyTargetExamKeys: {},
                bulkCopyTargetLoading: false,
            }
        );
    }

    closeBulkCopyDialog = () => {
        this.setState({
            bulkCopyDialogOpen: false,
            bulkCopyLoading: false,
            bulkCopyFromYear: '',
            bulkCopyFromTerm: 'All',
            bulkCopyToYear: '',
            bulkCopySourceExamList: [],
            bulkCopySelectedExamIds: {},
            bulkCopyTargetExamKeys: {},
            bulkCopyTargetLoading: false,
        });
    }

    loadBulkCopySourceExams = (fromYear, fromTerm = 'All') => {
        if (!fromYear) {
            this.setState({ bulkCopySourceExamList: [], bulkCopySelectedExamIds: {} });
            return;
        }
        const params = fromTerm && fromTerm !== 'All'
            ? { academic_year: fromYear, is_active: true, term: fromTerm }
            : { academic_year: fromYear, is_active: true };
        getRequest(GET_URL.exam.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                this.setState({
                    bulkCopySourceExamList: response.data.data || [],
                    bulkCopySelectedExamIds: {},
                });
            } else {
                this.setState({ bulkCopySourceExamList: [], bulkCopySelectedExamIds: {} });
            }
        });
    }

    toggleBulkCopyExam = (examId) => {
        const idStr = String(examId);
        this.setState((prev) => ({
            bulkCopySelectedExamIds: {
                ...(prev.bulkCopySelectedExamIds || {}),
                [idStr]: !Boolean(prev.bulkCopySelectedExamIds?.[idStr]),
            },
        }));
    }

    setBulkCopySelectAll = (checked) => {
        const { bulkCopySourceExamList } = this.state;
        if (!Array.isArray(bulkCopySourceExamList) || !bulkCopySourceExamList.length) {
            this.setState({ bulkCopySelectedExamIds: {} });
            return;
        }
        const { bulkCopyTargetExamKeys } = this.state;
        const next = {};
        bulkCopySourceExamList.forEach((ex) => {
            const key = this.getBulkCopyExamKey(ex);
            if (bulkCopyTargetExamKeys?.[key]) return; // hide already-created exams in To year
            if (ex && ex.id != null) next[String(ex.id)] = Boolean(checked);
        });
        this.setState({ bulkCopySelectedExamIds: next });
    }

    getBulkCopyErrorText = (res) => {
        const data = res?.data;
        if (!data) return 'Unable to copy exams.';

        const toMessageLines = (value) => {
            if (value == null) return [];
            if (Array.isArray(value)) {
                return value
                    .map((item) => {
                        if (typeof item === 'string') return item;
                        if (item && typeof item === 'object') return JSON.stringify(item);
                        return String(item);
                    })
                    .filter(Boolean);
            }
            if (typeof value === 'object') {
                const lines = [];
                Object.keys(value).forEach((key) => {
                    const item = value[key];
                    if (Array.isArray(item)) {
                        item.forEach((msg) => lines.push(typeof msg === 'string' ? msg : String(msg)));
                    } else if (item != null) {
                        lines.push(typeof item === 'string' ? item : String(item));
                    }
                });
                return lines;
            }
            return [String(value)];
        };

        const explicitLines = [
            ...toMessageLines(data.detail),
            ...toMessageLines(data.message),
            ...toMessageLines(data.Reason),
            ...toMessageLines(data.non_field_errors),
            ...toMessageLines(data.errors),
            ...toMessageLines(data),
        ].filter(Boolean);

        if (!explicitLines.length) return 'Unable to copy exams.';
        return explicitLines.slice(0, 20).join('\n');
    }

    submitBulkCopyExams = async () => {
        const {
            bulkCopyFromYear,
            bulkCopyToYear,
            bulkCopySourceExamList,
            bulkCopySelectedExamIds,
        } = this.state;

        if (!bulkCopyFromYear || !bulkCopyToYear) {
            Swal.fire('Select academic years', 'Please choose both From and To academic years.', 'info');
            return;
        }
        if (String(bulkCopyFromYear) === String(bulkCopyToYear)) {
            Swal.fire('Invalid selection', 'From and To academic year cannot be the same.', 'info');
            return;
        }

        const targetYearObj = this.getAcademicYearById(bulkCopyToYear);
        if (!targetYearObj) {
            Swal.fire('Invalid academic year', 'Please choose a valid To academic year.', 'error');
            return;
        }

        const selectedIds = Object.keys(bulkCopySelectedExamIds || {}).filter((k) => bulkCopySelectedExamIds[k]);
        if (!selectedIds.length) {
            Swal.fire('Select exams', 'Please select at least one exam to copy.', 'info');
            return;
        }

        const byId = {};
        (bulkCopySourceExamList || []).forEach((ex) => {
            if (ex && ex.id != null) byId[String(ex.id)] = ex;
        });

        const selectedExams = selectedIds.map((id) => byId[id]).filter(Boolean);
        if (!selectedExams.length) {
            Swal.fire('Select exams', 'Please select at least one exam to copy.', 'info');
            return;
        }

        this.setState({ bulkCopyLoading: true });
        const failedLocal = [];
        const { bulkCopyTargetExamKeys } = this.state;
        const selectedExamsFiltered = selectedExams.filter((ex) => {
            const key = this.getBulkCopyExamKey(ex);
            return !bulkCopyTargetExamKeys?.[key];
        });

        if (!selectedExamsFiltered.length) {
            this.setState({ bulkCopyLoading: false });
            Swal.fire('Nothing to copy', 'All selected exams already exist in the To academic year.', 'info');
            return;
        }

        const bulkPayloads = [];
        for (const ex of selectedExamsFiltered) {
            const fromDate = this.shiftDateToTargetAcademicYear(ex.from_date, targetYearObj);
            const toDate = this.shiftDateToTargetAcademicYear(ex.to_date, targetYearObj);
            if (!fromDate || !toDate) {
                failedLocal.push(`${ex.exam_type_name || 'Exam'} (invalid dates)`);
                continue;
            }
            if (!this.isDateWithinAcademicYear(fromDate, targetYearObj) || !this.isDateWithinAcademicYear(toDate, targetYearObj)) {
                failedLocal.push(`${ex.exam_type_name || 'Exam'} (dates out of range)`);
                continue;
            }

            const sourceSectionIds = String(ex?.standard_section_ids || '')
                .split(',')
                .map((v) => Number(v))
                .filter((n) => Number.isFinite(n) && n > 0);

            const { isSection, ids } = this.extractStandardIdsForCopy(ex);
            const resolvedIds = sourceSectionIds.length ? sourceSectionIds : ids;

            if (!resolvedIds.length) {
                failedLocal.push(`${ex.exam_type_name || 'Exam'} (no standards)`);
                continue;
            }

            const payload = {
                description: ex.description || '',
                from_date: fromDate,
                to_date: toDate,
                exam_type: ex.exam_type,
                term: ex.term,
                academic_year: bulkCopyToYear,
                is_standard_section: isSection ? 1 : 0,
            };
            if (sourceSectionIds.length || isSection) payload.standard_section_ids = resolvedIds.join();
            else payload.standard_ids = resolvedIds.join();

            bulkPayloads.push(payload);
        }

        if (failedLocal.length) {
            this.setState({ bulkCopyLoading: false });
            Swal.fire(
                'Cannot copy',
                `Fix these before copying:\n${failedLocal.slice(0, 6).join('\n')}`,
                'error'
            );
            return;
        }

        // Single API call (bulk) — backend runs in a transaction and will rollback all if any fail.
        const res = await postRequest(
            POST_URL.exam.api,
            { bulk_exams: bulkPayloads },
            { ...this.props, return_error: true }
        );

        this.setState({ bulkCopyLoading: false });
        if (res && res.status === 200) {
            Swal.fire('Success', `Copied ${bulkPayloads.length} exam(s) successfully.`, 'success');
            this.closeBulkCopyDialog();
            this.getExamList();
            return;
        }

        Swal.fire('Failed', this.getBulkCopyErrorText(res), 'error');
    }

    async componentDidMount() {
        this.getYearList();
        this.getTermList();
        if (getAcademicYear()) {
            let year = getAcademicYear()
            if (year != 0) {
                this.setState({
                    selectedYear: year
                }, () => {
                    this.getExamList()
                })
            }
        }
        else {
            this.setState({
                pageLoading: false,
                loading: false,
            })
        }
    }

    getYearList = () => {
        const url = GET_URL.getacademicyear.api
        const param = { is_active: true }
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                let fromYear, ToYear
                response.data.data.map((data) => {
                    fromYear = data.start_date.split('-');
                    ToYear = data.end_date.split('-');
                    // data.name = fromYear[0] + '-' + ToYear[0]
                })
                this.setState({
                    yearList: response.data.data,
                })
            }
        })
    }

    getTermList = () => {
        const url = GET_URL.examterms.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let temp = { id: 'All', name: 'All' }
                response.data.data.unshift(temp)
                this.setState({
                    examTermList: response.data.data,
                })
            }
        })
    }


    handleAddExamButton = () => {
        let { selectedYear, error, alertData, yearList } = this.state;
        if (selectedYear && selectedYear !== 0) {
            let fromDate
            let toDate
            let yearName
            yearList.map((data) => {
                if (data.id == selectedYear) {
                    fromDate = data.start_date
                    toDate = data.end_date
                    yearName = data.name
                }
            })

            let currentSelectedList = {
                selectedYear: selectedYear,
                yearName: yearName,
                fromDate: fromDate,
                toDate: toDate,
            }
            let searchParam = "?" + new URLSearchParams(currentSelectedList).toString()
            this.props.history.push({
                pathname: Actions.exams.create.url,
                search: searchParam,
            });
        }
        else {
            alertData = 'Select Academic Year'
            error.country = alertData
            this.setState({
                open: true,
                alertData,
                error
            })
        }

    }

    onChange = (e) => {
        let { name, value } = e.target;
        if (value !== 0) {
            this.setState({
                [name]: value,
                error: {},
                loadingExam: true
            }, () => {
                this.getExamList();
                if (name === 'selectedYear') {
                    SetAcademicYear(value)
                }
            })
        }
    }

    getExamList = () => {
        let { blankHeading, blank, selectedYear, selectedTerm } = this.state;
        let params
        if (selectedTerm !== 'All') {
            params = { academic_year: selectedYear, is_active: true, term: selectedTerm }
        }
        else {
            params = { academic_year: selectedYear, is_active: true }
        }
        const url = GET_URL.exam.api
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                if (response.data.data.length === 0) {
                    blank = true
                    blankHeading = `No exams found for academic year`
                }
                else {
                    blank = false
                }
                this.setState({
                    examList: response.data.data,
                    loading: false,
                    blankHeading,
                    loadingExam: false,
                    blank
                })
            }
        })

    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    handleClickMore = (index) => {
        this.setState({
            isExpanded: index
        })
    }

    handleClickLess = () => {
        this.setState({
            isExpanded: ''
        })
    }

    handleEdit = (id) => {
        let { selectedYear, error, alertData, yearList } = this.state;
        if (selectedYear && selectedYear !== 0) {
            let fromDate, toDate, yearName
            yearList.map((data) => {
                if (data.id == selectedYear) {
                    fromDate = data.start_date
                    toDate = data.end_date
                    yearName = data.name
                }
            })
            let currentSelectedList = {
                selectedYear: selectedYear,
                yearName: yearName,
                fromDate: fromDate,
                toDate: toDate,
                id: id
            }
            let searchParam = "?" + new URLSearchParams(currentSelectedList).toString()
            this.props.history.push({
                pathname: Actions.exams.update.url,
                search: searchParam,
            });
        }
        else {
            alertData = 'Select Academic Year'
            error.country = alertData
            this.setState({
                open: true,
                alertData,
                error
            })
        }
    }

    handleDelete = (id, index) => {
        let { examList } = this.state
        const del_url = DEL_URL.exam.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                examList.splice(index, 1)
                this.setState({
                    examList,
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500,
                })
            }
        })
    }

    render() {
        let { yearList, examTermList, selectedTerm, selectedYear, open, alertData, error, blank, loadingExam, examList, isExpanded, loading, blankHeading } = this.state;
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Paper elevation={0} style={{ padding: 0, background: 'linear-gradient(180deg, #f1f5f9 0%, #ffffff 65%)' }}>
                    <Box style={{ padding: 16 }}>
                    <Box
                        style={{
                            maxWidth: 1200,
                            margin: '0 auto',
                        }}
                    >
                        <Grid container alignItems="center" spacing={2} style={{ marginBottom: 10 }}>
                            <Grid item md={6} xs={12} className="header-align">
                                <Box component="h1" className="heading" style={{ margin: 0 }}>
                                Exam
                            </Box>
                        </Grid>
                            <Grid item md={6} xs={12}>
                                <Box
                                    className="header-align end-flex-prop exam-view-header-actions"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        alignItems: 'center',
                                        gap: 10,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {isUserHasPermission('exams', 'create') && (
                                        <Button
                                            variant="outlined"
                                            onClick={this.openBulkCopyDialog}
                                            className="editbutton-view"
                                            style={{ textTransform: "none", height: 40, padding: '0 14px' }}
                                        >
                                            Copy exams
                                        </Button>
                                    )}
                                    {isUserHasPermission('exams', 'create') && (
                                        <Button
                                    variant="contained"
                                    onClick={this.handleAddExamButton}
                                            className="editbutton-view"
                                            style={{ height: 40, padding: '0 14px' }}
                                        >
                                            <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                                            {Actions.exams.create.label}
                                        </Button>
                                    )}
                            </Box>
                        </Grid>
                    </Grid>

                    <Paper
                        elevation={0}
                        style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            padding: 12,
                            background: '#ffffff',
                            marginBottom: 14,
                            boxShadow: '0 10px 22px rgba(2, 6, 23, 0.06)',
                        }}
                    >
                        <Grid container spacing={2} alignItems="flex-end">
                            <Grid item md={4} xs={12}>
                            <Dropdown
                                data={yearList}
                                name='selectedYear'
                                style='width-100'
                                value={selectedYear}
                                onChange={this.onChange}
                                label='Academic Year'
                                error={error.country}
                                hideSelect
                            />
                        </Grid>
                            <Grid item md={4} xs={12}>
                            <Dropdown
                                data={examTermList}
                                name='selectedTerm'
                                value={selectedTerm}
                                onChange={this.onChange}
                                style='width-100'
                                label='Term'
                                error={error.country}
                                hideSelect={true}
                            />
                        </Grid>
                    </Grid>
                    </Paper>

                    {(blank && !loadingExam) &&
                        <Box className='header-align'>
                            <BlankPagewithIcon data={blankHeading} />
                        </Box>
                    }
                    {loadingExam &&
                        <Box display='flex'>
                            <CircularProgress className='loading' />
                        </Box>
                    }
                    {
                        (!blank && !loadingExam) &&
                        <Grid container spacing={2}>
                            {examList.map((examData, eIndex) => (
                                <Grid item lg={4} md={6} xs={12} key={examData.id || eIndex}>
                                    <Paper
                                        elevation={0}
                                        onMouseEnter={() => this.setState({ hoveredExamId: examData.id })}
                                        onMouseLeave={() => this.setState({ hoveredExamId: null })}
                                        style={{
                                            borderRadius: 14,
                                            border: '1px solid #e2e8f0',
                                            padding: 14,
                                            boxShadow:
                                                this.state.hoveredExamId === examData.id
                                                    ? '0 18px 42px rgba(2, 6, 23, 0.14)'
                                                    : '0 12px 26px rgba(2, 6, 23, 0.08)',
                                            transform:
                                                this.state.hoveredExamId === examData.id
                                                    ? 'translateY(-2px)'
                                                    : 'translateY(0px)',
                                            transition: 'transform 160ms ease, box-shadow 160ms ease',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Box
                                            style={{
                                                height: 4,
                                                margin: '-14px -14px 12px -14px',
                                                background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.95) 0%, rgba(37, 99, 235, 0.35) 100%)',
                                            }}
                                        />
                                        <Box display="flex" alignItems="flex-start" justifyContent="space-between" style={{ gap: 12 }}>
                                            <Box style={{ minWidth: 0 }}>
                                                <Typography variant="subtitle1" style={{ fontWeight: 900, color: '#0f172a' }} noWrap>
                                            {examData.exam_type_name}
                                                </Typography>
                                                <Typography variant="caption" style={{ color: '#64748b', fontWeight: 700 }}>
                                                    {examData.term_name ? `Term: ${examData.term_name}` : '—'}
                                                </Typography>
                                        </Box>

                                            <Box display="flex" alignItems="center" style={{ gap: 6, flexShrink: 0 }}>
                                                {isUserHasPermission('exams', 'update') && (
                                                    <Tooltip title="Edit">
                                                        <Box
                                                        onClick={() => this.handleEdit(examData.id)}
                                                            style={{
                                                                width: 34,
                                                                height: 34,
                                                                borderRadius: 10,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                background: '#eff6ff',
                                                                border: '1px solid #bfdbfe',
                                                            }}
                                                        >
                                                            <EditOutlinedIcon style={{ fontSize: 18, color: '#1d4ed8' }} />
                                                </Box>
                                                    </Tooltip>
                                                )}
                                                {isUserHasPermission('exams', 'delete') && (
                                                    <Tooltip title="Delete">
                                                        <Box
                                                        onClick={() => this.handleDelete(examData.id, eIndex)}
                                                            style={{
                                                                width: 34,
                                                                height: 34,
                                                                borderRadius: 10,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                background: '#fff1f2',
                                                                border: '1px solid #fecdd3',
                                                            }}
                                                        >
                                                            <DeleteForeverOutlinedIcon style={{ fontSize: 18, color: '#be123c' }} />
                                                </Box>
                                                    </Tooltip>
                                                )}
                                        </Box>
                                        </Box>

                                        <Box
                                            mt={1.25}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: 12,
                                                background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                                                border: '1px solid #e2e8f0',
                                            }}
                                        >
                                            <Typography variant="body2" style={{ fontWeight: 800, color: '#0f172a' }}>
                                                {dateFormat(examData.from_date, 'DD-MM-YYYY')}
                                            </Typography>
                                            <Typography variant="body2" style={{ color: '#94a3b8', fontWeight: 900 }}>
                                                →
                                            </Typography>
                                            <Typography variant="body2" style={{ fontWeight: 800, color: '#0f172a' }}>
                                                {dateFormat(examData.to_date, 'DD-MM-YYYY')}
                                            </Typography>
                                        </Box>

                                        {!examData.is_standard_section && (
                                            <Box mt={1.25} display="flex" flexWrap="wrap" style={{ gap: 8 }}>
                                                {(examData.standard_names || []).map((standardData, sIndex) => (
                                                    <Box
                                                        key={`${examData.id}-std-${sIndex}`}
                                                        className={(isExpanded !== eIndex && sIndex > 2) ? 'display-none' : ''}
                                                        style={{
                                                            padding: '6px 10px',
                                                            borderRadius: 999,
                                                            background: '#eff6ff',
                                                            border: '1px solid #bfdbfe',
                                                            color: '#1e3a8a',
                                                            fontWeight: 700,
                                                            fontSize: 12,
                                                        }}
                                                    >
                                                            {standardData.name}
                                                        </Box>
                                                ))}
                                            </Box>
                                        )}

                                        {examData.is_standard_section && (
                                            <Box mt={1.25} display="flex" flexDirection="column" style={{ gap: 8 }}>
                                                {(examData.standard_names || []).map((standardData, sIndex) => (
                                                    <Box
                                                        key={`${examData.id}-sec-${sIndex}`}
                                                        className={(isExpanded !== eIndex && sIndex > 2) ? 'display-none' : ''}
                                                        style={{
                                                            padding: '8px 10px',
                                                            borderRadius: 12,
                                                            background: '#ffffff',
                                                            border: '1px solid #e2e8f0',
                                                        }}
                                                    >
                                                        <Typography variant="body2" style={{ fontWeight: 800, color: '#0f172a' }}>
                                                            {standardData.standard_name}
                                                        </Typography>
                                                        <Typography variant="caption" style={{ color: '#64748b', fontWeight: 700 }}>
                                                            {Array.prototype.map.call(standardData.section_list || [], function (item) { return ` ${item.section_name} `; }).join(",")}
                                                        </Typography>
                                                            </Box>
                                                ))}
                                            </Box>
                                        )}

                                        {isExpanded !== eIndex && (examData.standard_names || []).length > 3 && (
                                            <Box mt={1} display="flex" justifyContent="flex-end">
                                                <Tooltip title='Show more' enterDelay={400} enterNextDelay={400} placement='top-start' classes={{ tooltip: 'tooltip-show-data' }}>
                                                    <Box
                                                        onClick={() => this.handleClickMore(eIndex)}
                                                        style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 800, display: 'inline-flex', alignItems: 'center' }}
                                                    >
                                                        <ExpandMoreOutlinedIcon fontSize="small" />
                                                        <span style={{ fontSize: 12, marginLeft: 4 }}>Show all</span>
                                                </Box>
                                            </Tooltip>
                                            </Box>
                                        )}
                                        {isExpanded === eIndex && (examData.standard_names || []).length > 3 && (
                                            <Box mt={1} display="flex" justifyContent="flex-end">
                                                <Tooltip title='Show less' enterDelay={400} enterNextDelay={400} placement='top-start' classes={{ tooltip: 'tooltip-show-data' }}>
                                                    <Box
                                                        onClick={() => this.handleClickLess()}
                                                        style={{ cursor: 'pointer', color: '#475569', fontWeight: 800, display: 'inline-flex', alignItems: 'center' }}
                                                    >
                                                        <ExpandLessOutlinedIcon fontSize="small" />
                                                        <span style={{ fontSize: 12, marginLeft: 4 }}>Show less</span>
                                                </Box>
                                            </Tooltip>
                                            </Box>
                                        )}
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    }

                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>

                    <Dialog
                        open={Boolean(this.state.bulkCopyDialogOpen)}
                        onClose={() => (this.state.bulkCopyLoading ? null : this.closeBulkCopyDialog())}
                        maxWidth='md'
                        fullWidth
                    >
                        <DialogTitle disableTypography>
                            <Box display='flex' alignItems='center' justifyContent='space-between'>
                                <Typography variant='h6' style={{ fontWeight: 700 }}>
                                    Copy multiple exams
                                </Typography>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Box mb={2}>
                                <Typography variant='body2' color='textSecondary'>
                                    Select From and To academic year, then choose exams to copy. Dates will be copied with the same month/day and shifted to the To academic year start-year.
                                </Typography>
                            </Box>

                            <Grid container spacing={2}>
                                <Grid item md={4} xs={12}>
                                    <Dropdown
                                        data={this.state.yearList}
                                        name='bulkCopyFromYear'
                                        style='width-100'
                                        value={this.state.bulkCopyFromYear}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            const autoToYear = this.getNextAcademicYearId(v);
                                            this.setState({
                                                bulkCopyFromYear: v,
                                                // Auto-select To year as immediate next academic year.
                                                bulkCopyToYear: autoToYear || '',
                                            }, () => {
                                                this.loadBulkCopySourceExams(v, this.state.bulkCopyFromTerm);
                                                if (autoToYear) {
                                                    this.loadBulkCopyTargetExamKeys(
                                                        autoToYear,
                                                        this.state.bulkCopyFromTerm
                                                    );
                                                } else {
                                                    this.setState({ bulkCopyTargetExamKeys: {}, bulkCopyTargetLoading: false });
                                                }
                                            });
                                        }}
                                        label='From Academic Year'
                                        hideSelect
                                    />
                                </Grid>
                                <Grid item md={4} xs={12}>
                                    <Dropdown
                                        data={this.state.examTermList}
                                        name='bulkCopyFromTerm'
                                        style='width-100'
                                        value={this.state.bulkCopyFromTerm}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            this.setState({ bulkCopyFromTerm: v }, () => {
                                                this.loadBulkCopySourceExams(this.state.bulkCopyFromYear, v);
                                                if (this.state.bulkCopyToYear) {
                                                    this.loadBulkCopyTargetExamKeys(
                                                        this.state.bulkCopyToYear,
                                                        v
                                                    );
                                                }
                                            });
                                        }}
                                        label='From Term'
                                        hideSelect
                                    />
                                </Grid>
                                <Grid item md={4} xs={12}>
                                    <Dropdown
                                        data={this.state.yearList}
                                        name='bulkCopyToYear'
                                        style='width-100'
                                        value={this.state.bulkCopyToYear}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            this.setState({ bulkCopyToYear: v }, () => {
                                                this.loadBulkCopyTargetExamKeys(
                                                    v,
                                                    this.state.bulkCopyFromTerm
                                                );
                                            });
                                        }}
                                        label='To Academic Year'
                                        hideSelect
                                    />
                                </Grid>
                            </Grid>

                            <Box mt={2} style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                <Box px={2} py={1} display='flex' alignItems='center' justifyContent='space-between' style={{ background: '#f8fafc' }}>
                                    <Box display='flex' alignItems='center'>
                                        <Checkbox
                                            color='primary'
                                            checked={
                                                this.getVisibleBulkCopySourceExams().length > 0 &&
                                                this.getVisibleBulkCopySourceExams().every(
                                                    (ex) => this.state.bulkCopySelectedExamIds?.[String(ex.id)]
                                                )
                                            }
                                            indeterminate={
                                                this.getVisibleBulkCopySourceExams().some(
                                                    (ex) => this.state.bulkCopySelectedExamIds?.[String(ex.id)]
                                                ) &&
                                                !this.getVisibleBulkCopySourceExams().every(
                                                    (ex) => this.state.bulkCopySelectedExamIds?.[String(ex.id)]
                                                )
                                            }
                                            onChange={(e) => this.setBulkCopySelectAll(e.target.checked)}
                                            disabled={this.state.bulkCopyLoading || !this.getVisibleBulkCopySourceExams().length}
                                        />
                                        <Typography variant='subtitle2' style={{ fontWeight: 700 }}>
                                            Select all
                                        </Typography>
                                    </Box>
                                    <Typography variant='caption' style={{ color: '#64748b', fontWeight: 600 }}>
                                        {this.getVisibleBulkCopySourceExams().length} exam(s)
                                    </Typography>
                                </Box>
                                <Divider />
                                {!this.state.bulkCopyFromYear ? (
                                    <Box p={2}>
                                        <Typography variant='body2' color='textSecondary'>
                                            Select a From academic year to load exams.
                                        </Typography>
                                    </Box>
                                ) : !this.getVisibleBulkCopySourceExams().length ? (
                                    <Box p={2}>
                                        <Typography variant='body2' color='textSecondary'>
                                            No exams found in the selected From year/term.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List dense>
                                        {this.getVisibleBulkCopySourceExams().map((ex) => (
                                            <ListItem
                                                key={ex.id}
                                                button
                                                onClick={() => this.toggleBulkCopyExam(ex.id)}
                                                disabled={this.state.bulkCopyLoading}
                                            >
                                                <ListItemIcon>
                                                    <Checkbox
                                                        edge='start'
                                                        color='primary'
                                                        checked={Boolean(this.state.bulkCopySelectedExamIds?.[String(ex.id)])}
                                                        tabIndex={-1}
                                                        disableRipple
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={() => this.toggleBulkCopyExam(ex.id)}
                                                    />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={ex.exam_type_name || '—'}
                                                    secondary={`${ex.term_name || ''}${ex.from_date ? ` · ${dateFormat(ex.from_date, 'DD-MM-YYYY')}` : ''}${ex.to_date ? ` → ${dateFormat(ex.to_date, 'DD-MM-YYYY')}` : ''}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.closeBulkCopyDialog} disabled={this.state.bulkCopyLoading}>
                                Cancel
                            </Button>
                            <Button
                                color='primary'
                                variant='contained'
                                onClick={this.submitBulkCopyExams}
                                disabled={this.state.bulkCopyLoading}
                            >
                                {this.state.bulkCopyLoading ? 'Copying…' : 'Copy selected exams'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                    </Box>
                    </Box>
                </Paper>
            )
        }
    }
}
export default withRouter(ViewExam)

