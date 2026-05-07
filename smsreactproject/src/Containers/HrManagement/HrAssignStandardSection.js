import React, { Component } from 'react';
import {
    Paper,
    Box,
    Grid,
    Button,
} from '@material-ui/core';
import Swal from 'sweetalert2';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import MultipleSelectDropdown from 'Components/MultipleSelectDropdown';
import loadingBar from 'images/loading.gif';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { getPaginationProps, getAcademicYear } from 'Includes/functions';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages';
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class HrAssignStandardSection extends Component {
    constructor() {
        super();
        this.state = {
            loading: true,
            open: false,
            alertData: '',
            error: {},
            sectionStrengthValue: [],
            sectionList: [],
            staffList: { data_list: [], count: 0 },
            staffIndex: [],
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            selectedAcademicYear: '',
            columns: [
                { name: 'name', label: 'Staff Name', options: { filter: true, sort: true } },
                { name: 'group_names', label: 'Group Name', options: { filter: true, sort: true } },
            ],
            submitDisable: false,
        };
    }

    componentDidMount() {
        this._isMounted = true;
        const academicYearFromProps = this.props.location?.state?.academicYear;
        let academicYear = academicYearFromProps || (typeof getAcademicYear === 'function' ? getAcademicYear() : null);
        if (!academicYear) {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const id = user?.other_details?.academic_year?.id;
                if (id != null) academicYear = String(id);
            } catch (_) {}
        }
        if (academicYear) {
            this.setState({ selectedAcademicYear: academicYear }, () => this.fetchDataAfterAcademicYear());
        } else {
            getRequest(GET_URL.getacademicyear.api, { is_active: true }, this.props).then((response) => {
                if (!this._isMounted || !response || response.status !== 200) {
                    if (this._isMounted) this.fetchDataAfterAcademicYear();
                    return;
                }
                const list = response.data.data || response.data || [];
                const arr = Array.isArray(list) ? list : [];
                const firstYearId = arr.length > 0 ? (arr[0].id != null ? arr[0].id : null) : null;
                this.setState(
                    { selectedAcademicYear: firstYearId != null ? String(firstYearId) : '' },
                    () => this.fetchDataAfterAcademicYear()
                );
            }).catch(() => {
                if (this._isMounted) this.fetchDataAfterAcademicYear();
            });
        }
    }

    fetchDataAfterAcademicYear = () => {
        if (!this._isMounted) return;
        const isUpdateUrl = this.props.location && this.props.location.pathname === Actions.assign_standard_section.update.url;
        const editId = isUpdateUrl && this.props.location.state && this.props.location.state.detail ? this.props.location.state.detail : null;
        this.getStandardAndSectionList().then(() => {
            if (!this._isMounted) return;
            if (isUpdateUrl) {
                if (editId) this.updateteachersection(editId);
                else this.props.history.push(Actions.assign_standard_section.view.url);
            } else {
                this.getStaffListForTable();
            }
        }).catch(() => {
            if (this._isMounted) {
                if (isUpdateUrl && editId) this.updateteachersection(editId);
                else if (!isUpdateUrl) this.getStaffListForTable();
                this.setState({ loading: false });
            }
        });
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    updateteachersection = (id) => {
        const url = GET_URL.staffstandardsectionmapping.api + id + '/';
        const params = {};
        const academic_year = this.getAcademicYearForApi();
        if (academic_year) params.academic_year = academic_year;
        getRequest(url, params, { ...this.props, dontSendAcademicYear: true }).then((response) => {
            if (response && response.status === 200) {
                const hostelDetails = response.data.data || {};
                this.setState(
                    {
                        hostel_details: hostelDetails,
                        sectionStrengthValue: Array.isArray(hostelDetails) ? hostelDetails : [hostelDetails],
                    },
                    () => this.updateAllDetails()
                );
            }
        });
    };

    updateAllDetails = () => {
        let { sectionStrengthValue, sectionList } = this.state;
        if (sectionStrengthValue && !Array.isArray(sectionStrengthValue)) {
            sectionStrengthValue = [sectionStrengthValue];
        }
        const mapped = (sectionStrengthValue || []).map((item) => {
            const id = item.standard_section != null ? item.standard_section : item.section;
            const found = (sectionList || []).find((s) => String(s.id) === String(id));
            return found ? { id: found.id, name: found.name } : { id, name: '' };
        });
        this.setState({ sectionStrengthValue: mapped, loading: false, isEdit: true });
    };

    handleClose = () => {
        this.setState({ open: false });
    };

    updatedSectionStrength = (sectionValue) => {
        this.setState({ sectionStrengthValue: sectionValue || [], sectionError: '' });
    };

    getAcademicYearForApi = () => {
        const fromPreviousPage = this.props.location?.state?.academicYear;
        if (fromPreviousPage !== undefined && fromPreviousPage !== null && fromPreviousPage !== '') {
            return String(fromPreviousPage);
        }
        return this.state.selectedAcademicYear
            || (typeof getAcademicYear === 'function' ? getAcademicYear() : null)
            || (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); const id = u?.other_details?.academic_year?.id; return id != null ? String(id) : null; } catch { return null; } })();
    };

    getStandardAndSectionList = () => {
        const params = { is_active: true };
        const academicYear = this.getAcademicYearForApi();
        if (academicYear) params.academic_year = academicYear;
        return getRequest(GET_URL.getstandardandsection.api, params, { ...this.props, dontSendAcademicYear: true })
            .then((response) => {
                if (!this._isMounted) return;
                const raw = (response && response.data && response.data.data) || (response && response.data) || [];
                const data = Array.isArray(raw) ? raw : [];
                const sectionList = [];
                data.forEach((std) => {
                    const sections = std.sections || std.section_list || [];
                    (Array.isArray(sections) ? sections : []).forEach((sec) => {
                        const id = sec.standard_section != null ? sec.standard_section : sec.id;
                        const stdName = std.name || std.standard_name || '';
                        const secName = sec.name || sec.section_name || '';
                        if (id != null) {
                            sectionList.push({ id, name: `${stdName} - ${secName}`.trim() || String(id) });
                        }
                    });
                });
                this.setState({ sectionList }, () => {
                    if (this._isMounted) this.setDefaultValue();
                });
            })
            .catch(() => {
                if (this._isMounted) this.setState({ sectionList: [], loading: false });
            });
    };

    setDefaultValue = () => {
        if (!this._isMounted) return;
        this.setState({ loading: false });
    };

    validate = () => {
        const { sectionStrengthValue, staffIndex, staffList, error } = this.state;

        if (!Array.isArray(staffIndex) || staffIndex.length === 0) {
            this.setState({
                open: true,
                alertData: 'Select at least one staff',
                error: { ...error, staffNotSelected: 'Select at least one staff' },
            });
            return;
        }

        const hasSections = Array.isArray(sectionStrengthValue) && sectionStrengthValue.length > 0;
        if (!hasSections) {
            this.setState({
                open: true,
                alertData: 'Please select at least one standard-section',
                sectionError: 'Please select at least one standard-section',
                error: { ...error, section: 'Please select at least one standard-section' },
            });
            return;
        }

        const updatedSectionStrengthValue = (sectionStrengthValue || []).map((item) => ({
            standard_section: item.id != null ? item.id : (item.section || item.standard_section),
        }));

        if (staffIndex.length > 0) {
            const post_data = [];
            const dataList = staffList && staffList.data_list ? staffList.data_list : [];
            const selectedAcademicYear = this.getAcademicYearForApi();
            if (Array.isArray(dataList) && Array.isArray(updatedSectionStrengthValue)) {
                staffIndex.forEach((data) => {
                    const staffItem = dataList[data.dataIndex];
                    if (staffItem && staffItem.id) {
                        updatedSectionStrengthValue.forEach((sectionData) => {
                            if (sectionData && (sectionData.standard_section || sectionData.section)) {
                                const item = {
                                    staff: staffItem.id,
                                    standard_section: sectionData.standard_section || sectionData.section,
                                    from_date: sectionData.from_date,
                                    to_date: sectionData.to_date,
                                };
                                if (selectedAcademicYear) item.academic_year = selectedAcademicYear;
                                post_data.push(item);
                            }
                        });
                    }
                });
            }

            if (post_data.length === 0) {
                this.setState({
                    open: true,
                    alertData: 'Please add at least one standard-section',
                    error,
                });
                return;
            }

            this.setState({ submitDisable: true });
            postRequest(POST_URL.staffstandardsectionmapping.api, post_data, this.props)
                .then((response) => {
                    if (this._isMounted && response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500,
                        });
                        this.props.history.push(Actions.assign_standard_section.view.url);
                    }
                })
                .catch((err) => {
                    if (this._isMounted) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Submission Failed',
                            text: (err && err.message) || 'Something went wrong.',
                        });
                    }
                })
                .finally(() => {
                    if (this._isMounted) this.setState({ submitDisable: false });
                });
        }
    };

    getStaffListForTable = (tableStateOrPagination) => {
        let { pagination } = this.state;
        // tableState from AllMUIDataTable has page, rowsPerPage, sortOrder; use it when provided
        const source = tableStateOrPagination && (typeof tableStateOrPagination === 'object')
            ? tableStateOrPagination
            : pagination;
        this.currentPagination = { ...pagination, ...source };
        const pagination_params = getPaginationProps(this.currentPagination);
        const params = {
            ...pagination_params,
            is_active: true,
            mapped_type: 'only_not_mapped',
        };
        let academic_year = this.state.selectedAcademicYear || (typeof getAcademicYear === 'function' ? getAcademicYear() : null);
        if (!academic_year) {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const id = user?.other_details?.academic_year?.id;
                if (id != null) academic_year = String(id);
            } catch (_) {}
        }
        if (academic_year) params.academic_year = academic_year;
        getRequest(GET_URL.staffstandardsectionmapping.api, params, { ...this.props, dontSendAcademicYear: true }).then((response) => {
            if (this._isMounted && response && response.status === 200) {
                const resData = response.data.data || response.data;
                const data_list = resData.data_list != null ? resData.data_list : (Array.isArray(resData) ? resData : []);
                const count = resData.count != null ? resData.count : 0;
                this.setState({
                    staffList: { data_list, count },
                    pagination: this.currentPagination || pagination,
                });
            }
        });
    };

    handleRowSelectionChange = (tableState) => {
        let { error } = this.state;
        delete error.staffNotSelected;
        this.setState({
            staffIndex: (tableState && tableState.selectedRows && tableState.selectedRows.data) ? tableState.selectedRows.data : [],
            error,
            open: false,
        });
    };

    render() {
        const {
            loading,
            staffList,
            staffIndex,
            sectionList,
            sectionStrengthValue,
            pagination,
            columns,
            submitDisable,
        } = this.state;

        const options = {
            selectableRows: 'multiple',
            customToolbarSelect: () => null,
        };

        if (loading) {
            return (
                <Box display="flex">
                    <img src={loadingBar} className="loading" alt="loading" />
                </Box>
            );
        }

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className="heading">{Actions.assign_standard_section.create.label}</Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                <Button
                                    variant="contained"
                                    component={Link}
                                    to={Actions.assign_standard_section.view.url}
                                    className="editbutton-view"
                                >
                                    <VisibilityOutlinedIcon className="visibility-icon" />
                                    {Actions.assign_standard_section.view.label}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container spacing={3}>
                        <Grid item md={8} xs={12}>
                            <AllMUIDataTable
                                title=""
                                data={staffList && staffList.data_list ? staffList.data_list : []}
                                columns={columns}
                                options={options}
                                onTableChange={this.getStaffListForTable}
                                rowSelectionChange={this.handleRowSelectionChange}
                                serverSide={true}
                                pagination={pagination}
                                count={staffList && staffList.count ? staffList.count : 0}
                            />
                        </Grid>
                        <Grid item md={4} xs={12}>
                            <Paper
                                className="paper-plain-background p-20px"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    maxHeight: 'calc(100vh - 180px)',
                                }}
                            >
                                <Box className={classNames('header-align')} mt={1} flexShrink={0}>
                                    <MultipleSelectDropdown
                                        id="standard_section_multiselect"
                                        label="Standard–Section"
                                        data_list={sectionList || []}
                                        selected_list={sectionStrengthValue || []}
                                        onChange={this.updatedSectionStrength}
                                        error={Boolean(this.state.sectionError)}
                                        helperText={this.state.sectionError}
                                        required
                                        optionValue="name"
                                        customId="id"
                                        enableSelectAll
                                    />
                                </Box>
                                <Box flexShrink={0}>
                                    <Box className="staff-list-assigned-shift">
                                        Selected users for assign standard section
                                    </Box>
                                </Box>
                                <Box
                                    style={{
                                        overflowY: 'auto',
                                        minHeight: 0,
                                        maxHeight: '180px',
                                        flex: '1 1 auto',
                                    }}
                                >
                                    {Array.isArray(staffIndex) &&
                                        staffIndex.map((data, index) => {
                                            const staffItem =
                                                staffList &&
                                                staffList.data_list &&
                                                staffList.data_list[data.dataIndex];
                                            return (
                                                <Box key={index}>
                                                    <Box className="text-blue pv-5">
                                                        {`${index + 1}. ${staffItem ? (staffItem.name || staffItem.full_name || '-') : '-'}`}
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                </Box>
                                <Box
                                    className="assign-shift-submit-position"
                                    flexShrink={0}
                                    style={{
                                        marginTop: 'auto',
                                        paddingTop: 32,
                                        paddingBottom: 8,
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                    }}
                                >
                                    <Button
                                        variant="contained"
                                        className="submit"
                                        disabled={submitDisable}
                                        onClick={this.validate}
                                    >
                                        <FormattedMessage {...commonMessages.submit} />
                                    </Button>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                    <Snackbar
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        open={this.state.open}
                        autoHideDuration={2000}
                        onClose={this.handleClose}
                    >
                        <Alert onClose={this.handleClose} severity="error">
                            {this.state.alertData}
                        </Alert>
                    </Snackbar>
                </Paper>
            </Box>
        );
    }
}

export default withRouter(HrAssignStandardSection);
