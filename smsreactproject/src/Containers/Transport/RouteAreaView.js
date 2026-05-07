import React, { Component } from 'react';
import { } from '@material-ui/core';
import { Link, withRouter } from 'react-router-dom';
import {
    Paper, Box, Button, Grid, CircularProgress
} from "@material-ui/core";
import classNames from "classnames";
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Dropdown } from 'Components/DropDown';

import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls';
import LoadingGif from 'Components/LoadingGif';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getFormatMessage } from 'Includes/functions';
import Swal from 'sweetalert2'
import StudentListActions from 'Includes/StudentListActions'
import messages from './messages';
import commonMessages from 'Constants/messages';
import './styles.scss';
import { FormattedMessage } from 'react-intl';
import { getKeyValueMap, getUrlParam,updatePermissions } from 'Includes/functions';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const options = {
    selectableRows: 'none',
    filterType: "dropdown",
    responsive: false,
    filter: false,
    download: false,
    print: false,
    viewColumns: false,
    rowsPerPageOptions: [5, 10, 15],
    rowsPerPage: 10,
    onDownload: (buildHead, buildBody, columns, data) => {
        const bodyData = data.map((student) => {
            student.data[2] = student.data[2]
                .map((elem) => elem.subject_name)
                .join(",");
            return student;
        });
        return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
    },
    downloadOptions: {
        filename: "assigned_subjects.csv",
        filterOptions: {
            useDisplayedColumnsOnly: true,
            useDisplayedRowsOnly: true,
        },
    },
};

class RouteAreaView extends Component {
    constructor(props) {
        super(props);
        this.permission = updatePermissions('transport_place_name', ['update','delete']);
        this.state = {
            areaNames: [],
            newareaNames: [], 
            textFiledError: "",
            loading: true,
            areaNameMap: {},
            tableLoading: false,
            isEditForm: true,
            enabledActions: [],
            googleMapLocator: false,
            fieldError: {},
            addressInformations: {},
            lat_lng: null,
            addressList: [],
            error: {},
            isBlankData: true,
            blankData: 'Select address',
            updatedAddress: {}
        }
        this.columns = [
            {
                name: "id",
                label: "id",
                options: {
                    filter: true,
                    sort: true,
                    display: false,
                }
            },
            {
                name: "name",
                label: <FormattedMessage {...messages.areaName} />,
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "landmark",
                label: <FormattedMessage {...messages.landmark} />,
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "km",
                label: <FormattedMessage {...messages.km} />,
                options: {
                    filter: true,
                    sort: true,
                    customBodyRender: (value) => {
                        return <Box> {value ? value : '-'} </Box>
                    }
                }
            },
            {
                name: "address",
                label: 'Address',
                options: {
                    filter: true,
                    sort: true,
                    customBodyRender: (value) => {
                        return <Box> {value ? value : '-'} </Box>
                    }
                }
            },
            {
                name: "Actions",
                label: <FormattedMessage {...commonMessages.actions} />,
                options: {
                    display: this.updatePermissions('display'),
                    filter: false,
                    sort: false,
                    download: false,
                    customBodyRender: (value, tableMeta) => {
                        return (<div>
                            <StudentListActions
                                id={tableMeta.rowData[0]}
                                index={tableMeta.rowIndex}
                                deleteStudent={this.deleteArea}
                                editURL={Actions.transport_place_name.update.url}
                                enabledActions={this.permission}
                            />
                        </div>
                        );
                    }
                }
            }
        ];
        this.getareaData = this.getareaData.bind(this);
        this.googleMapRef = React.createRef();

    }

    async componentDidMount() {
        this.getSchoolAddressList();
    }

    getSchoolAddressList = () => {
        const { selectedAddress } = getUrlParam()
        let { loading, isBlankData} = this.state;
        const url = GET_URL.instituteaddress.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let selected = ''
                response.data.data.map((data) => {
                    if (data.map_address_data && data.map_address_data) {
                        data['name'] = data.map_address_data.address_one_map
                    }
                })
                if (selectedAddress && selectedAddress!=='undefined') {
                    selected = selectedAddress
                }
                else if (response.data.data.length === 1) {
                    selected = response.data.data[0]?.id
                }
                else if (response.data.data.length > 1) {
                    loading = false
                    isBlankData=true
                }
                this.setState({
                    addressList: response.data.data,
                    loading,
                    selectedAddress: selected,
                    isBlankData
                }, () => {
                    if (selected) {
                        this.getareaData()
                    }
                })
            }
        })
    }


    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('transport_place_name', 'update')
        const hasDeletePermission = isUserHasPermission('transport_place_name', 'delete')
        let enabledActions = [];
        if (hasEditPermission) {
            enabledActions.push('edit')
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
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
                columns: this.state.columns
            })
        }
    }

    getareaData = () => {
        const { selectedAddress } = this.state;
        let params = { is_active: 1, institute_address: selectedAddress, area_type: 1 };
        getRequest(GET_URL.area.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const areaData = response.data.data;
                for (let type = 0; type < areaData.length; type++) {
                    areaData[type]['address']=this.getFormattedAddress(areaData[type])
                }
                this.setState({
                    areaNames: areaData,
                    loading: false,
                    tableUpdating: false,
                    isBlankData: false
                });
            }
        })
    }

    getFormattedAddress=(map_address)=>{
        let return_result=''
        return_result=map_address.address_two + "  " +
                 map_address.city + ',' + " " + map_address.district + ',' + " " +  map_address.state +',' + " " +
                 map_address.country +',' + " " +map_address.pincode
        return return_result
    }

    deleteArea = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { areaNames } = this.state
        const del_url = DEL_URL.area.api
        const data = { data: [id] }
        const url = del_url + id + '/';
        deleteRequest(url, data, this.props).then(response => {
            if (response && response.status === 200) {
                areaNames.splice(index, 1)
                this.setState({
                    areaNames: [...areaNames]
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        })
        this.setState({ tableUpdating: false })
    }

    handleAddArea = () => {
        const { selectedAddress } = this.state;
        let formInformation = {
            selectedAddress: selectedAddress,
        }
        let searchParam = "?" + new URLSearchParams(formInformation).toString()
        this.props.history.push({
            pathname: Actions.transport_place_name.create.url,
            search: searchParam,
        });
    }


    onChange = (e) => {
        let { name, value } = e.target;
        let { addressList } = this.state;
        let address_data = getKeyValueMap(addressList, 'id', 'map_address_data')
        address_data = address_data[value]
        let lat_lng = { lat: parseFloat(address_data.latitude_map), lng: parseFloat(address_data.longitude_map) }
        this.setState({ [name]: value, lat_lng }, () => {
            this.getareaData()
        })
    }


    render() {
        const { areaNames, loading, selectedAddress, addressList, error, isBlankData, blankData,
            tableUpdating } = this.state;
        const options = {
            selectableRows: 'none',
            filterType: "dropdown",
            responsive: false,
            filter: false,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 15],
            rowsPerPage: 10,
            onDownload: (buildHead, buildBody, columns, data) => {
                const bodyData = data.map((data_value) => {
                    return data_value;
                })
                const bodyColumn = columns.map((column_name) => {
                    column_name.label = getFormatMessage(column_name.label)
                    return column_name;
                })
                return "\uFEFF" + buildHead(bodyColumn) + buildBody(bodyData);
            },
            downloadOptions: {
                filename: "routearea.csv",
                filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                },
            },
        };
        if (loading)
            return <LoadingGif />
        return (
            <>
                <Paper>
                    <Box className="paper-background">
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Areas
                                </Box>
                                <Box className='sub-heading'>
                                    list of bus stops
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('transport_place_name', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddArea}
                                        className='editbutton-view'
                                    >
                                        <AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.transport_place_name.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        {addressList.length > 1 &&
                            <Box className='header-align'>
                                <Dropdown
                                    data={addressList}
                                    name='selectedAddress'
                                    value={selectedAddress}
                                    onChange={this.onChange}
                                    label={`${alias_names['school']} Address`}
                                    hideSelect={true}
                                    error={error.year}
                                />
                            </Box>
                        }
                        {
                            isBlankData ?
                                <Paper className="margin-top-20">
                                    <BlankPagewithIcon data={blankData} />
                                </Paper>
                                :
                                <Box className="margin-top-20" >
                                    <Grid item md={12} xs={12} sm={12}>
                                        <AllMUIDataTable
                                            key={areaNames}
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            data={areaNames}
                                            columns={this.columns}
                                            options={options}

                                        />
                                    </Grid>
                                </Box>
                        }
                    </Box>
                </Paper>
            </>
        )
    }
}

export default withRouter(RouteAreaView)