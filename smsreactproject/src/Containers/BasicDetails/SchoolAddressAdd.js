import React, { Component } from 'react'
import classNames from "classnames";
import { withRouter } from 'react-router-dom';
import { Grid, Paper, Box, Button } from '@material-ui/core';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, updatePermissions } from 'Includes/functions';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import LoadingGif from 'Components/LoadingGif';
import SchoolTimingSelectStandard from './Components/SchoolTimingSelectStandard';

import { getRequest, putRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL } from 'Includes/urls'

import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';
import AutoCompleteAddress from 'Components/AutoCompleteAddress';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class SchoolAddressAdd extends Component {
    constructor(props) {
        super(props)
        this.state = {
            fieldErrors: {},
            datalist: {},
            fieldDetails: null,
            addressDetails: null,
            addressValue: {},
            school: { preview: '', logo: null, address: {} },
            enableUploadIcons: true,
            loading: true,
            standardList: null,
            details: { is_section: false },
            post_standard_list: [],
            isBlankPage: false
        }
    }

    componentDidMount() {
        if (this.props.location.pathname === Actions.school_address.update.url) {
            if (this.props.location.state && this.props.location.state.detail) {
                let id = this.props.location.state.detail
                this.getAddressDetails(id);
            }
            else {
                this.props.history.push(Actions.school_address.view.url);
            }
        }
        else {
            this.getStandardList()
        }
    }

    getStandardList = () => {
        const { address_details, isEditForm } = this.state;
        let standard_sections = []
        if (isEditForm) {
            standard_sections = address_details.standard
        }
        const st_param = { is_active: true, only_standards: true }
        getRequest(GET_URL.getstandard.api, st_param, this.props).then(response => {
            if (response && response.status === 200) {
                if (response.data.data.length === 0) {
                    this.showBlankPage()
                }
                else {
                    let is_selected_all = true
                    response.data.data.map((data) => {
                        data.checked = false
                        if (standard_sections.includes(data.id)) {
                            data.checked = true
                        }
                        else {
                            is_selected_all = false
                        }
                    })
                    let temp = { id: 0, name: 'All', checked: is_selected_all, expanded: false, sections: [] }
                    response.data.data.unshift(temp)
                    this.setState({
                        standardList: response.data.data,
                        postStandardList: response.data.data,
                        loading: false
                    })
                }
            }
        })
    }


    showBlankPage = () => {
        this.setState({ isBlankPage: true, loading: false })
    }

    getAddressDetails = (id) => {
        const url = GET_URL.instituteaddress.api + id + '/'
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    address_details: response.data.data,
                    isEditForm: true,
                }, () => {
                    this.updateAddress(response.data.data);
                    this.getStandardList()
                })
            }
        })
    }

    updateAddress = (addressData) => {
        let { school } = this.state;
        let address = {}
        if (addressData) {
            address['address_one_map'] = addressData['map_address_data']?.['address_one_map']
            address['address_two_map'] = addressData['map_address_data']?.['address_two_map']
            address['city_map'] = addressData['map_address_data']?.['city_map']
            address['district_map'] = addressData['map_address_data']?.['district_map']
            address['state_map'] = addressData['map_address_data']?.['state_map']
            address['country_map'] = addressData['map_address_data']?.['country_map']
            address['pincode_map'] = addressData['map_address_data']?.['pincode_map']
            address['latitude_and_langitude_map'] = addressData['map_address_data']?.['latitude_map'] && { lat: addressData['map_address_data']['latitude_map'], lng: addressData['map_address_data']['longitude_map'] }
        }
        school['address'] = address
        this.setState({
            school,
            loading: false,
            isEditForm: true,
        })
    }

    updateParentAddress = (address) => {
        let { school } = this.state
        school['address'] = address
        this.setState({
            school
        })
    }

    validateAndSubmit = () => {
        let { school, fieldErrors, postStandardList } = this.state;
        let addressTest = true
        fieldErrors = {}
        let alertData = ''
        if (!school['address']['address_one_map']) {
            fieldErrors['address_one_map'] = 'This field is mandatory';
            addressTest = false
        }
        let post_standard_list = []
        postStandardList.map((data) => {
            if (data['checked'] && data['id'] !== 0) {
                post_standard_list.push(data['id'])
            }
        })
        if (post_standard_list.length === 0) {
            alertData = fieldErrors['address_one_map'] ? 'Clear all error(s)' : 'Select standard'
            addressTest = false
        }
        if (addressTest) {
            this.setState({
                post_standard_list
            }, () => {
                this.submit();
            })
        }
        else {
            this.setState({
                open: true,
                alertData: alertData
            })
            this.refs.AddressFields.updateErrors(fieldErrors)
        }
    }

    submit = () => {
        const { isEditForm, address_details, post_standard_list, school } = this.state;
        school['address']['latitude_map'] = school['address']['latitude_and_langitude_map']['lat']
        school['address']['longitude_map'] = school['address']['latitude_and_langitude_map']['lng']
        let post_data = {
            'addresses': [
                { map_address_data: school['address'], standard: post_standard_list }
            ]
        }
        this.setState({ submitDisable: true })
        let url = POST_URL.instituteaddress.api;
        if (isEditForm) {
            post_data['addresses'][0]['map_address_data']['id'] = address_details['map_address_data']['id']
            post_data['addresses'][0]['id'] = address_details['id']
        }
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
                    this.props.history.push(Actions.school_address.view.url)
                }
                this.setState({ submitDisable: false })
            });
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    updateStandardList = (standardList) => {
        this.setState({ postStandardList: [...standardList] })
    }

    render() {
        const { open, alertData, school, isEditForm, loading, submitDisable, standardList, details, isBlankPage } = this.state;
        return (
            <>
                {loading ?
                    <Box>
                        <LoadingGif />
                    </Box>
                    :
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                {Actions.school_address.create.label}
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('school_address', 'view') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.school_address.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.school_address.view.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        {isBlankPage ?
                            <div className='mt-20'>
                                <BlankPagewithIcon data="There are no standards" />
                            </div>
                            :
                            <Grid container spacing={3} className='margin-top-20'>
                                <Grid item md={8} xs={12} sm={12}>
                                    <Paper className='padding-20'>
                                        {!loading &&
                                            <AutoCompleteAddress
                                                addressDetails={school['address']}
                                                updateParentAddress={this.updateParentAddress}
                                                isEditForm={isEditForm}
                                                ref={'AddressFields'}
                                                address_type={['school']}
                                                address_placeHolder={`Search ${alias_names['school']} Name`}
                                                showSearchOption={true}
                                            />
                                        }
                                    </Paper>
                                </Grid>
                                {standardList &&
                                    <Grid item lg={4} md={12} xs={12}>
                                        <SchoolTimingSelectStandard
                                            shift_details={details}
                                            standardList={standardList}
                                            updateStandardList={this.updateStandardList}
                                            is_section={false}
                                        />
                                    </Grid>
                                }
                            </Grid>
                        }
                        <Box className="submt-button-float-bottom">
                            <Button variant='contained'
                                color='primary' className='submit'
                                disabled={submitDisable}
                                onClick={this.validateAndSubmit}>
                                <FormattedMessage {...commonMessages.submit} />
                            </Button>
                        </Box>
                    </Paper>
                }

                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                    <Alert onClose={this.handleClose} severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>
            </>
        )
    }
}

export default withRouter(SchoolAddressAdd);