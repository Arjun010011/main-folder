import React, { Component } from 'react'
import { Paper, Box, Grid, Button } from '@material-ui/core';
import Swal from 'sweetalert2'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';


import MultipleAddTextFields from 'Components/MultipleAddTextFields';
import loadingBar from 'images/loading.gif'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { numberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { getAcademicYear, isUserHasPermission, getKeyValueMap } from 'Includes/functions';
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
        label: <FormattedMessage {...commonMessages.maxStrength} values={{ value: '' }} />, regex: numberRegex, autoFocus: false, name: 'strength', md: 6, className: 'width-form-95',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text', allowDuplicates: true, maxLength: 3, minValue: 1
    },
]
class DynamicAcademic extends Component {
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
            sectionStrengthValue: [],
            selectedStandard: ''
        }
    }


    componentDidMount = () => {
        if (getAcademicYear) {
            this.getAcademicYearList();

        }
    }


    updatedSectionStrength = (sectionValue) => {
        let { sectionStrengthValue } = this.state
        sectionStrengthValue = sectionValue
        this.setState({
            sectionStrengthValue
        })
    }

    validate = () => {
        let sectionTest = true;
        let { sectionStrengthValue, selectedYear, prevStandardExist,
            selectedStandard, error, selectedPrevStandard } = this.state
        sectionTest = this.refs.section.validateFields();
        if (sectionTest && selectedStandard) {
            let post_data = {
                'academic_year': selectedYear,
                'standard': selectedStandard,
                'section': sectionStrengthValue,
            }
            this.setState({ submitDisable: true })
            let url = POST_URL.strength.api;
            postRequest(url, post_data, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push(Actions.standard_strength.view.url)
                    }
                    this.setState({ submitDisable: false })
                });
        }
        if (!selectedStandard) {
            error['standard'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        this.setState({
            error
        })
    }


    onChange = async (e) => {
        let { value, name } = e.target;
        let { error } = this.state
        if (value !== 0) {
            if (name === 'selectedStandard') {
                delete error['prevStandard']
                delete error['standard']
            }
            this.setState({
                [name]: value,
                error,
            })
        }
    }

    getAcademicYearList = () => {
        const url = GET_URL.getacademicyear.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let names = getKeyValueMap(response.data.data, 'id', 'name');
                let year = getAcademicYear();
                let yearName = names[year]
                this.getSectionList();
                this.getStandardList(year);
                this.setState({
                    yearName
                })
            }
        })
    }

    getStandardList = (year) => {
        const url = GET_URL.standard.api
        const params = { is_active: true, academic_year: year }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    standardList: response.data.data,
                    selectedYear: year,
                    loading: false
                })
            }
        })
    }

    getSectionList = () => {
        const url = GET_URL.section.api
        const param = { is_active: true }
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.map((data) => {
                    data.name = data.name.charAt(0).toUpperCase() + data.name.slice(1)
                })
                this.setState({
                    sectionList: response.data.data,
                }, () => {
                    this.setDefaultValue();
                })
            }
        })
    }

    setDefaultValue = () => {
        let { sectionList } = this.state
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


    handleClose = () => {
        this.setState({
            open: false
        })
    }


    render() {
        const { loading, prevStandardList, selectedPrevStandard,
            error, open, sectionDetails, standardList, selectedStandard, prevStandardExist, yearName, submitDisable } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={7} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    <FormattedMessage {...messages.classStrengthLabel} />
                                </Box>
                            </Grid>
                            <Grid item md={5} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('standard_strength', 'view') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.standard_strength.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' />  {Actions.standard_strength.view.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                            <Box className="year-std-box mr-40">
                                <Box className="academic-std-head"> <FormattedMessage {...commonMessages.academicYear} /></Box>
                                <Box className=" exam-mark-add-heading-bg">{yearName}</Box>
                            </Box>
                        </Box>
                        <Grid container spacing={2}>
                            <Grid item xl={3} md={3} xs={12}>
                                <Dropdown
                                    data={standardList}
                                    name='selectedStandard'
                                    style='width-100'
                                    value={selectedStandard}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...commonMessages.standard} />}
                                    error={error.standard}
                                    hideSelect={true}
                                />
                            </Grid>
                        </Grid>
                        {sectionDetails &&
                            <Grid container className={classNames('header-align')}>
                                <Grid item xl={6} lg={8} md={10}>
                                    <MultipleAddTextFields
                                        fieldDefaultValue={[]}
                                        fieldDetails={sectionDetails}
                                        updateParent={this.updatedSectionStrength}
                                        isEmptyNotAllowed={true}
                                        ref={'section'}
                                        idFormat={'standard_2022_08_11_2_pm_'}
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
                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
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
export default withRouter(DynamicAcademic)




