import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import Skeleton from '@material-ui/lab/Skeleton';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import { withRouter } from 'react-router-dom';

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getKeyValueMap } from 'Includes/functions';
import { options } from 'Constants';
import { Dropdown } from 'Components/DropDown';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const fieldDetails = [
    {
        label: 'City Name', regex: nameRegex, name: 'name', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 40
    },
]

class CityView extends Component {
    constructor() {
        super()
        this.state = {
            countryList: [],
            selectedCountry: '',
            stateList: [],
            selectedState: '',
            districtList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            stateLoading: false,
            error: {},
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },
                {
                    name: "Serial Number",
                    label: "Sl NO",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                tableMeta.rowIndex + 1
                            )
                        }
                    }
                },
                {
                    name: "name",
                    label: "City Name",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div className='mui-table-custom-value-left-align text-transform-none'>
                                {value}
                            </div>)

                        }
                    }
                },
                {
                    name: 'Actions',
                    label: 'Actions',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[2])}
                                    label='Please Update City Details'
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.city.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.city.api}
                                    deleteType={this.deleteType}
                                    baseClassName='action-basic-detail-width'
                                    enabledActions={this.state.enabledActions}
                                />
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }


    fieldValues(name) {
        let fieldValues = [];
        fieldValues.push(name);
        return fieldValues
    }

    updatePostFormat = (newData) => {
        let { selectedCountry, selectedDistrict, selectedState } = this.state
        let payload = {
            name: newData.name,
            country: selectedCountry,
            state: selectedState,
            district: selectedDistrict
        }
        return payload
    }


    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('manage_cities', 'update')
        const hasDeletePermission = isUserHasPermission('manage_cities', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('manage_cities');
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
            permissions.push('manage_cities');
        }
        if (enabledActions.length === 0) {
            test = false;
        }
        if (name === 'display') {
            return test
        }
        else {
            this.setState({
                enabledActions: enabledActions,
                permissions,
                columns: this.state.columns
            })
        }
    }

    componentDidMount = () => {
        this.getcountryList()
        this.updatePermissions('actions');
        this.setState({
            options: options
        })
    }


    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let city = this.state.cityList
        city.map((data, index) => {
            if (data.id === id) {
                city[index].name = newData.name
            }
        })
        this.setState({
            cityList: [...city],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }


    getcountryList = () => {
        const url = GET_URL.country.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    countryList: response.data.data,
                })
                if (this.props.location.state) {
                    let selectedCountry = this.props.location.state.selectedCountry
                    this.setState({
                        selectedCountry: selectedCountry,
                    })
                    this.getStateList(selectedCountry);
                }
                else {
                    this.setState({
                        loading: false
                    })
                }
            }
        })
    }

    deleteType = (id) => {
        this.setState({ tableUpdating: true })
        let city = this.state.cityList
        city.map((data, index) => {
            if (data.id === id) {
                city.splice(index, 1)
            }
        })
        this.setState({
            cityList: city,
            tableUpdating: false
        })
    }

    onChange = async (e) => {
        let { value, name } = e.target;
        let { error } = this.state;
        if (value !== 0 && value !== [name]) {
            delete error[name]
            this.setState({
                [name]: value,
                error
            }, () => {
                if (name === 'selectedCountry') {
                    this.getStateList(value);
                }
                else if (name === 'selectedState') {
                    this.getDistrictList(value);
                }
                else if (name === 'selectedDistrict') {
                    this.setState({
                        tableUpdating: true
                    })
                    this.getCityList(value);
                }
            })
        }
    }

    getStateList = (id) => {
        this.setState({ stateLoading: true })
        const g_url = GET_URL.getstatesforcountry.api
        const params = '?is_active=true'
        const url = g_url + id + '/' + params
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    stateList: response.data.data,
                    stateLoading: false
                })
                if (this.props.location.state) {
                    let selectedState = this.props.location.state.selectedState
                    this.setState({
                        selectedState: selectedState,
                    })
                    this.getDistrictList(selectedState);
                }
            }
        })
    }

    getDistrictList = (id) => {
        this.setState({ districtLoading: true })
        const g_url = GET_URL.getdistrictsforstate.api
        const params = '?is_active=true'
        const url = g_url + id + '/' + params
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    districtList: response.data.data,
                    districtLoading: false
                })
                if (this.props.location.state) {
                    let selectedDistrict = this.props.location.state.selectedDistrict
                    this.setState({
                        selectedDistrict: selectedDistrict,
                    })
                    this.getCityList(selectedDistrict);
                }
            }
        })
    }

    getCityList = (id) => {
        const g_url = GET_URL.getcitiesfordistrict.api
        const params = '?is_active=true'
        const url = g_url + id + '/' + params
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    cityList: response.data.data,
                    tableUpdating: false,
                    loading: false
                })
            }
        })
    }


    handleAddButton = () => {
        let { selectedCountry, error, alertData, countryList, selectedState, stateList, selectedDistrict, districtList } = this.state;
        if (selectedCountry && selectedCountry !== 0 && selectedState && selectedState !== 0 && selectedDistrict && selectedDistrict !== 0) {
            let countryNames = getKeyValueMap(countryList, 'id', 'name')
            let countryName = countryNames[selectedCountry]

            let stateNames = getKeyValueMap(stateList, 'id', 'name')
            let stateName = stateNames[selectedState]

            let districtNames = getKeyValueMap(districtList, 'id', 'name')
            let districtName = districtNames[selectedDistrict]

            this.props.history.push({
                pathname: Actions.manage_cities.create.url,
                state: {
                    countryName: countryName, selectedCountry: selectedCountry,
                    stateName: stateName, selectedState: selectedState,
                    districtName: districtName, selectedDistrict: selectedDistrict,
                }
            })
        }
        else {
            alertData = 'Please clear error'
        }
        if (!selectedCountry || selectedCountry === 0) {
            error.selectedCountry = 'Please select country'
        }
        if (!selectedState || selectedState === 0) {
            error.selectedState = 'Please select state'
        }
        if (!selectedDistrict || selectedDistrict === 0) {
            error.selectedDistrict = 'Please select district'
        }
        this.setState({
            open: true,
            alertData,
            error
        })
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    render() {
        const { loading, countryList, selectedCountry, stateList, selectedState, districtList, selectedDistrict,
            columns, options, error, stateLoading, districtLoading, cityList, open, alertData, tableUpdating
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
                                    City Information
                                </Box>
                                <Box className='sub-heading'>
                                    {`The City schedule of the ${alias_names['school']} is defined here over a period time.The academic year
                                    over 12 months of time.`}
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('manage_cities', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.manage_cities.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid item md={3} xs={12}>
                                <Dropdown
                                    data={countryList}
                                    name='selectedCountry'
                                    style='width-100'
                                    value={selectedCountry}
                                    error={error.selectedCountry}
                                    onChange={this.onChange}
                                    label='Select Country'
                                />
                            </Grid>
                            <Grid item md={3} xs={12}>
                                {!stateLoading &&
                                    <Dropdown
                                        data={stateList}
                                        name='selectedState'
                                        style='width-100'
                                        value={selectedState}
                                        disabled={!selectedCountry}
                                        onChange={this.onChange}
                                        label='Select State'
                                        error={error.selectedState}
                                        helperText={selectedCountry ? '' : 'Please Select Country'}

                                    />
                                }
                                {stateLoading &&
                                    <Skeleton variant="rect" className='drop-down-skeleton margin-top-10 '></Skeleton>
                                }
                            </Grid>
                            <Grid item md={3} xs={12}>
                                {!districtLoading &&
                                    <Dropdown
                                        data={districtList}
                                        name='selectedDistrict'
                                        style='width-100'
                                        disabled={!selectedState}
                                        value={selectedDistrict}
                                        onChange={this.onChange}
                                        label='Select District'
                                        error={error.selectedDistrict}
                                        helperText={selectedState ? '' : 'Please Select State'}

                                    />
                                }
                                {districtLoading &&
                                    <Skeleton variant="rect" className='drop-down-skeleton margin-top-10 '></Skeleton>
                                }
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={6}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={cityList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={cityList}
                                        columns={columns}
                                        options={options}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                            <Alert onClose={this.handleClose} severity="error">
                                {alertData}
                            </Alert>
                        </Snackbar>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(CityView)




