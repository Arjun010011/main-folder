import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import Skeleton from '@material-ui/lab/Skeleton';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

import MultipleAddTextFields from 'Components/MultipleAddTextFields';
import loadingBar from 'images/loading.gif'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { Dropdown } from 'Components/DropDown';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}
const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const stateDetails_global = [
    {
        label: 'City Name', regex: nameAndNumberRegex, autoFocus: true, name: 'name', md: 6, className: 'width-form-95',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 40
    },
]
class ManageCities extends Component {
    constructor() {
        super()
        this.state = {
            countryList: [],
            stateList: [],
            districtList: [],
            cityList: [],
            loading: true,
            open: false,
            alertData: '',
            selectedCountry: '',
            selectedState: '',
            selectedDistrict: '',
            stateLoading: false,
            districtLoading: false,
            error: {},
            open: false,
        }
    }


    componentDidMount = () => {
        if (this.props.location.state) {
            let countryName = this.props.location.state.countryName
            let stateName = this.props.location.state.stateName
            let districtName = this.props.location.state.districtName
            let selectedCountry = this.props.location.state.selectedCountry
            let selectedState = this.props.location.state.selectedState
            let selectedDistrict = this.props.location.state.selectedDistrict
            this.setState({
                countryName,
                selectedCountry,
                stateName,
                selectedState,
                districtName,
                selectedDistrict,
                loading: false
            })
        }
        else {
            this.props.history.push(Actions.manage_cities.view.url)
        }
    }


    updateCityListValue = (cityValue) => {
        let { cityList } = this.state
        cityList = cityValue
        this.setState({
            cityList
        })
    }

    validate = () => {
        let cityTest = true;
        let { cityList, selectedCountry, error, selectedState, selectedDistrict } = this.state
        cityTest = this.refs.city.validateFields();
        if (cityTest) {
            let post_data = {
                'country': selectedCountry,
                'state': selectedState,
                'district': selectedDistrict,
                'cities': cityList
            }
            this.setState({ submitDisable: true })
            let url = POST_URL.city.api;
            postRequest(url, post_data, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push({
                            pathname: Actions.manage_cities.view.url,
                            state: { selectedCountry: selectedCountry, selectedState: selectedState, selectedDistrict: selectedDistrict }
                        })
                    }
                    this.setState({ submitDisable: false })
                });
        }
        this.setState({
            error
        })
    }


    handleClose = () => {
        this.setState({
            open: false
        })
    }


    handleViewButton = () => {
        let { selectedCountry, selectedState, selectedDistrict } = this.state;
        this.props.history.push({
            pathname: Actions.manage_cities.view.url,
            state: { selectedCountry: selectedCountry, selectedState: selectedState, selectedDistrict: selectedDistrict }
        })
    }


    render() {
        const { loading, countryName, stateName, districtName, open, districtLoading,
            districtList, selectedDistrict
        } = this.state
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
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Add City
                                </Box>
                                <Box className='sub-heading'>
                                    {`The City schedule of the ${alias_names['school']} is defined here over a period time.The academic year
                                    over 12 months of time.`}
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('manage_cities', 'view') && <Button
                                        variant="contained"
                                        onClick={this.handleViewButton}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.manage_cities.view.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>

                        <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                            <Box className="year-std-box mr-40">
                                <Box className="academic-std-head "> Country</Box>
                                <Box className=" aca-std-white-background">{countryName}</Box>
                            </Box>
                            <Box className="year-std-box mr-40">
                                <Box className="academic-std-head "> State</Box>
                                <Box className=" aca-std-white-background">{stateName}</Box>
                            </Box>
                            <Box className="year-std-box mr-40">
                                <Box className="academic-std-head "> District</Box>
                                <Box className=" aca-std-white-background">{districtName}</Box>
                            </Box>
                        </Box>

                        <Grid container className={classNames('header-align')}>
                            <Grid item md={6}>
                                <MultipleAddTextFields
                                    fieldDefaultValue={[]}
                                    fieldDetails={stateDetails_global}
                                    updateParent={this.updateCityListValue}
                                    isEmptyNotAllowed={true}
                                    ref={'city'}
                                    idFormat={'cities_add_2022_08_11_2_pm_'}
                                />
                                <Box className='end-flex-prop  margin-top-30'>
                                    <Box>
                                        <Button variant="contained" color="primary"
                                            className='submit'
                                            disabled={this.state.submitDisable}
                                            onClick={() => this.validate()}>
                                            Submit &nbsp;{' '}
                                        </Button>
                                    </Box>
                                </Box>

                            </Grid>
                        </Grid>

                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                            <Alert onClose={this.handleClose} severity="error">
                                Please Enter City Details
                            </Alert>
                        </Snackbar>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(ManageCities)




