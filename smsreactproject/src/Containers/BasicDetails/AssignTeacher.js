import React, { Component } from 'react'
import { Paper, Box, Grid, Button } from '@material-ui/core';
import Swal from 'sweetalert2'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from '@date-io/date-fns';

import MultipleAddTextFields from 'Components/MultipleAddTextFields';
import loadingBar from 'images/loading.gif'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { numberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { getAcademicYear, isUserHasPermission, getKeyValueMap, SetStandard, SetAcademicYear, checkLocalStandard, getPaginationProps, checkLocalAcademicYear, } from 'Includes/functions';
import { Dropdown } from 'Components/DropDown';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages'


function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const sectionDetails_global = [
    {
        label: <FormattedMessage {...commonMessages.sectionName} />, regex: null, autoFocus: false, name: 'section', md: 6, className: 'width-form-95',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'drop_down', hideSelect: true
    },
    {
        label: <FormattedMessage {...commonMessages.staffName} />, regex: null, autoFocus: false, name: 'staff', md: 6, className: 'width-form-95',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'drop_down', allowDuplicates: true, list: [],
    },
    {
        label: <FormattedMessage {...commonMessages.start_date} />, regex: null, autoFocus: false, name: 'from_date', md: 6, className: 'width-form-95',
        required: true, id: 'from-date-picker', default: '', rows: null, type: 'date',
    },
    {
        label: <FormattedMessage {...commonMessages.end_date} />, regex: null, autoFocus: false, name: 'to_date', md: 6, className: 'width-form-95',
        required: true, id: 'to-date-picker', default: '', rows: null, type: 'date',
    }
];

class AssignTeacher extends Component {
    constructor() {
        super()
        this.state = {
            yearList: [],
            prevStandardList: [],
            districtList: [],
            loading: true,
            open: false,
            alertData: '',
            selectedYear: '',
            selectedPrevStandard: '',
            prevStandardLoading: false,
            error: {},
            open: false,
            sectionDetails: null,
            prevStandardExist: null,
            sectionStrengthValue: {},
            selectedStandard: '',
            fromDate: null,
            toDate: null,
            yearName: '',
            sectionList: [],
            section: "",
        }
        this.sectionRef = React.createRef();
    }

    componentDidMount() {
        if (this.props.location.pathname === Actions.standard_assign_teacher.update.url) {
            if (this.props.location.state && this.props.location.state.detail) {
                let id = this.props.location.state.detail
                this.updateteachersection(id);
            }
            else {
                this.props.history.push(Actions.standard_assign_teacher.view.url);
            }
        }
        else {
            this.getAcademicYearList();
            this.getStaffList();
        }
    }
    updateteachersection = (id) => {
        const url = GET_URL.staffstandardsectionmapping.api + id + '/'
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                const hostelDetails = response.data.data || {};
                this.setState(
                    {
                        hostel_details: hostelDetails,
                        sectionStrengthValue: { ...hostelDetails }, 
                    },
                    () => {
                        this.updateAllDetails(id); // Ensure it's called after state update
                    }
                );
            }
        });
    };

    updateAllDetails = (id) => {
        let { hostel_details, sectionStrengthValue } = this.state;
        sectionStrengthValue['id'] = sectionStrengthValue.id
        sectionStrengthValue['section'] = sectionStrengthValue.standard_section
        sectionStrengthValue['staff'] = sectionStrengthValue.staff
        sectionStrengthValue['from_date'] = sectionStrengthValue.from_date
        sectionStrengthValue['to_date'] = sectionStrengthValue.to_date
        this.setState({
            sectionStrengthValue,
            loading: false,
            isEdit: true
        })
    }

    updatedSectionStrength = (sectionValue,) => {
        let { sectionStrengthValue } = this.state
        sectionStrengthValue = sectionValue
        this.setState({
            sectionStrengthValue
        })
    }


    validate = () => {
        let sectionTest = true;
        let {
            sectionStrengthValue,
            error,
            selectedStandard,
        } = this.state;
    
        sectionTest = this.sectionRef.current.validateFields();
        // Ensure `sectionStrengthValue` has the correct structure
        const updatedSectionStrengthValue = sectionStrengthValue.map(item => ({
            ...item,
            standard_section: item.section || null, // Ensure `standard_section` key exists
        }));
        if (sectionTest && selectedStandard) {
        const postData = {
            standard: selectedStandard, // Add the selected standard to the payload
        };
    
        const url = POST_URL.staffstandardsectionmapping.api;
    
        // Disable the submit button
        this.setState({ submitDisable: true });
    
        // Submit the request
        postRequest(url, updatedSectionStrengthValue, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
                    this.props.history.push(Actions.standard_assign_teacher.view.url);
                }
            })
            .catch((error) => {
                console.error('Error while submitting data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Submission Failed',
                    text: error.message || 'Something went wrong.',
                });
            })
            .finally(() => {
                this.setState({ submitDisable: false });
            });
        }
          if (!selectedStandard) {
            error['standard'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
        }
        this.setState({ error });
    
    };
    onChange = (e) => {
        const { name, value } = e.target;

        // Destructure error state or initialize an empty object
        let { error } = this.state;

        // If value is not zero, update the state and call the appropriate method
        if (value !== 0) {
            this.setState(
                { [name]: value, studentList: [], error: {} }, // Clear the error on valid change
                () => {
                    // Handle standard selection
                    if (name === "selectedStandard") {
                        this.handleStandardChange(value);
                    }
                    // Handle year change
                    else if (name === "year") {
                        this.handleYearChange(value);
                    }
                    // Handle section change
                    else if (name === "section") {
                        this.getStaffList();
                    }
                }
            );
        }
    };


    handleStandardChange = (value) => {
        SetStandard(value);
        this.setState({
            standardError: "",
            sectionList: [],
            sectionDetails: "",
        }, () => {
            this.getSectionList();
            this.getStaffList();
        });
    };

    handleYearChange = (value) => {
        SetAcademicYear(value);
        if (value) {
            this.setState({
                yearError: "",
                selectStandard: "",
            });
            this.getStandardsList(value);
        }
    };
    getAcademicYearList = () => {
        getRequest(GET_URL.getacademicyear.api, {}, this.props).then((response) => {
            if (response && response.status === 200) {
                const yearList = response.data.data;
                const year = checkLocalAcademicYear(yearList);
                this.setState({ yearList, year, loading: false }, () => {
                    if (year) {
                        this.getStandardsList();
                    }
                });
            }
        });
    };
    handleYearChange = (event) => {
        const selectedYear = event.target.value;

        this.setState(
            {
                year: selectedYear, // Update the selected year
                selectedStandard: '', // Reset selected standard
                sectionStrengthValue: {}, // Clear section strength values
                sectionList: [], // Clear section list
                staffList: [], // Clear staff list
                sectionDetails: null, // Reset section details
            },
            () => {
                // Fetch data based on the new academic year
                if (selectedYear) {
                    this.getStandardsList(selectedYear); // Fetch standards
                }

                // Clear the default values in MultipleAddTextFields
                if (this.sectionRef.current) {
                    this.sectionRef.current.setDefaultValues([]);
                }
            }
        );
    };
    getStandardsList = (year) => {
        const { adjustmentEnabled } = this.state;
        const params = { academic_year: year };

        getRequest(GET_URL.getstandard.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const standardList = response.data.data;

                this.setState(
                    {
                        standardList,
                        standard: "",
                        loadingStd: false,
                        sectionList: [],
                    },
                    () => {
                        this.setState({
                            standardError: (
                                <FormattedMessage {...commonMessages.selectStandard} />
                            ),
                        });
                    }
                );
            }
        });
    };
    getSectionList = () => {
        const { year, selectedStandard } = this.state;
        const url = GET_URL.getsection.api;
        const params = {
            academic_year: year,
            is_active: true,
            standard: selectedStandard,
        };
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let sectionList = [];
                response.data.data.map(data => {
                    sectionList.push({
                        id: data['standard_section'],
                        name: data['name']
                    })
                })
                this.setState({
                    loadingsec: false,
                    //   section: "all",
                    sectionList,
                }, () => {
                    this.setDefaultValue();
                });
            }
        });
    };
    getStaffList = () => {
        const url = GET_URL.staff.api;
        const params = { is_active: true };
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let staffList = [];
                response.data.data.map(data => {
                    staffList.push({
                        id: data['id'],
                        name: data['full_name']
                    })
                })
                this.setState({ staffList },
                    this.updateTeacherDropdown); // Update dropdown
            }
        });
    };

    setDefaultValue = () => {
        let { sectionList, sectionDetails } = this.state
        let fieldDetails = [...sectionDetails_global]
        fieldDetails.map((field) => {
            if (field.name === 'section') {
                field['list'] = sectionList
            }
        })
        this.setState({
            sectionDetails: fieldDetails,
            loading: false
        })
    }

    updateTeacherDropdown = () => {
        const { staffList } = this.state;
        const updatedSectionDetails = sectionDetails_global.map((field) => {
            if (field.name === 'staff') {
                return { ...field, list: staffList }; // Update the teacher dropdown list
            }
            return field;
        });
        this.setState({ sectionDetails: updatedSectionDetails });
    };

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    handleDateChange = (date, name) => {
        this.setState({ [name]: date });
    }


    render() {
        const { loading, error, sectionDetails, standardList, standard, selectedStandard, yearName, submitDisable, fromDate, toDate, yearList, year, } = this.state;
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        } else {
            return (
                <Box>
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={7} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                Create Standard AssignTeacher
                                </Box>
                            </Grid>
                            <Grid item md={5} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('standard_assign_teacher', 'view') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.standard_assign_teacher.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' />  {Actions.standard_assign_teacher.view.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Box className='display-flex'>
                            <Dropdown
                                data={yearList}
                                name="year"
                                value={year}
                                onChange={this.handleYearChange}
                                label={
                                    <FormattedMessage {...commonMessages.academicYear} />
                                }
                                hideSelect={true}
                                error={error.year}
                            />
                            <Box className='margin-left-10'>
                                <Dropdown
                                    data={standardList}
                                    name='selectedStandard'
                                    // style='width-100'
                                    value={selectedStandard}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...commonMessages.standard} />}
                                    error={error.standard}
                                    hideSelect={true}
                                />
                            </Box>
                        </Box>

                        {sectionDetails &&
                            <Grid container className={classNames('header-align')}>
                                <Grid item xl={6} lg={8} md={10}>
                                    <MultipleAddTextFields
                                        fieldDefaultValue={[]}
                                        fieldDetails={sectionDetails}
                                        updateParent={this.updatedSectionStrength}
                                        isEmptyNotAllowed={true}
                                        ref={this.sectionRef}
                                        idFormat={'standard_2022_08_11_2_pm_'}
                                        errors={error}
                                    />

                                    <Box className="submt-button-float-bottom" mt={3}>
                                        <Button variant='contained'
                                            color='primary' className='submit'
                                            disabled={submitDisable}
                                            onClick={this.validate}>
                                            <FormattedMessage {...commonMessages.submit} />
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        }

                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={this.state.open} autoHideDuration={2000} onClose={this.handleClose}>
                            <Alert onClose={this.handleClose} severity="error">
                                <FormattedMessage {...commonMessages.clearAllErrors} />
                            </Alert>
                        </Snackbar>
                    </Paper>
                </Box>
            )
        }
    }
}

export default withRouter(AssignTeacher)

