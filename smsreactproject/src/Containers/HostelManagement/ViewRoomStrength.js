import React, { Component, Fragment } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import MultiSelect from "react-multi-select-component";

import Skeleton from '@material-ui/lab/Skeleton';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { Dropdown } from 'Components/DropDown';
import StudentListActions from 'Includes/StudentListActions'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getKeyValueMap, getUrlParam, getPaginationProps } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS } from 'Constants';
import { values } from 'react-intl/locale-data/hi';
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";

class ViewRoomStrength extends Component {
    constructor() {
        super()
        this.state = {
            buildingList: [],
            floorList: [],
            roomList: {},
            assetList: [],
            selectedAssetDropdown: [],
            loading: true,
            error: {},
            floorLoading: false,
            selectedBuilding: '',
            selectedFloor: '',
            pageLoading: false,
            pagination: { ...DEFAULT_PAGINATION_PROPS },
            isBlankPage: true,
            blankData: 'Please select building, floor and expect a result',
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        download: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "name",
                    label: "Room Name",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "floor_name",
                    label: "Floor Name",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "strength",
                    label: "Strength",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "roomassetmapping_room",
                    label: "Asset(count)",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<Box className='hr-subject-view-subject-name-position asset-name-width'>
                                {value &&
                                    value.map((data, index) => {
                                        return (
                                            <Box key={index} className='hr-subject-view-subject-name'>
                                                {`${data.asset_name} (${data.number_of_assets})`}
                                            </Box>
                                        )
                                    })
                                }
                            </Box>
                            )
                        }
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <StudentListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteExpense}
                                    editURL={Actions.room_strength.update.url}
                                    viewURL={Actions.room_strength_individual.view.url}
                                    viewExtraParams={{ selectedBuilding: this.state.selectedBuilding, selectedFloor: this.state.selectedFloor }}
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



    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('room_strength_individual', 'view')
        const hasEditPermission = isUserHasPermission('room_strength', 'update')
        const hasDeletePermission = isUserHasPermission('room_strength', 'delete')
        let enabledActions = [];
        if (hasViewPermission) {
            enabledActions.push('view')
        }
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

    componentDidMount = () => {
        let { selectedBuilding, selectedFloor } = getUrlParam();
        this.setState({
            selectedBuilding,
            selectedFloor,
        })
        this.getBuildingList(selectedBuilding, selectedFloor)
        this.updatePermissions('actions');
        this.getAssetList()

    }

    getAssetList = () => {
        const url = GET_URL.asset.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    assetList:response.data.data,
                })
            }
        })
    }

    getBuildingList = (selectedBuilding, selectedFloorTemp) => {
        let { selectedFloor } = this.state;
        const url = GET_URL.buildingdata.api
        const params = { is_active: true, building_type: 'Hostel' }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                if (selectedFloorTemp) {
                    selectedFloor = selectedFloorTemp
                }
                this.setState({
                    buildingList: response.data.data,
                    selectedFloor
                }, () => {
                    if (selectedBuilding) {
                        this.getFloorList(selectedBuilding, 'loading')
                    }
                    else {
                        this.setState({
                            loading: false
                        })
                    }
                })
            }
        })
    }



    getFloorList = (building, name) => {
        let { loading } = this.state;
        const url = GET_URL.buildingdata.api + building + '/'
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let temp = { id: 'all', name: 'All' }
                response.data.data.floor_building.unshift(temp)
                if (name === 'loading') {
                    loading = false
                }
                this.setState({
                    floorList: response.data.data.floor_building,
                    floorLoading: false,
                    loading,
                    selectedFloor: 'all'
                })
                this.getRoomList()
            }
        })
    }

    getRoomList = (paginationProps) => {
        let { pagination, selectedFloor, selectedAssetDropdown, selectedBuilding } = this.state;
        let asset_values = selectedAssetDropdown.map((item) => item.id);
        asset_values = asset_values.join(",")
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, is_active: true, asset_list: asset_values, floor__building: selectedBuilding }
        if (selectedFloor !== 'all') {
            let temp = {}
            temp['floor'] = selectedFloor
            params = { ...params, ...temp }
        }
        const url = GET_URL.room.api
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    roomList: response.data.data,
                    isBlankPage: false,
                    pageLoading: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        })
    }

    onChange = (e) => {
        let { name, value } = e.target;
        let { error } = this.state;
        if (value !== 0) {
            delete error[name]
            this.setState({ [name]: value, error }, () => {
                if (name === 'selectedBuilding') {
                    delete error.selectedFloor
                    this.setState({
                        floorLoading: true,
                        isBlankPage: true,
                        selectedFloor: null,
                        floorList: [],
                        blankData: 'Select floor and expect  result'
                    }, () => {
                        this.getFloorList(value)
                    })
                }
                else if (name === 'selectedFloor') {
                    this.setState({
                        pageLoading: true,
                        isBlankPage: true,
                    }, () => {
                        this.getRoomList()
                    })
                }

            })
        }
    }

    geFilterOptions = () => {
        let { assetList, selectedAssetDropdown } = this.state;
        return <Fragment>
            <Box className='margin-top-20'>

            </Box>
        </Fragment>;
    }

    onSelectAsset = (e) => {
        this.setState({
            selectedAssetDropdown: e
        }, () => {
            this.getRoomList()
        })
    }

    onFilterChangeHandler = (type) => {
        if (type === 'reset') {
            this.setState({
                tableUpdating: true,
                current_standard: null,
                dateRangeValue: {},
                dateRangeValueDefault: {}
            }, () => {
                this.getRoomList();
            })
        }
    }

    handleAssignButton = () => {
        let { selectedBuilding, selectedFloor, error, buildingList, floorList } = this.state;
        let validate = true
        if (!selectedBuilding) {
            error.selectedBuilding = 'Select Building'
            validate = false
        }
        if (!selectedFloor || selectedFloor === 'all') {
            error.selectedFloor = 'Select Floor'
            if (selectedFloor === 'all') {
                error.selectedFloor = '(All is not valid) select floor '
            }
            validate = false
        }
        if (validate) {
            let buildingName = getKeyValueMap(buildingList, 'id', 'name')
            let floorName = getKeyValueMap(floorList, 'id', 'name')
            buildingName = buildingName[selectedBuilding]
            floorName = floorName[selectedFloor]
            let yearInformation = {
                selectedBuilding: selectedBuilding,
                selectedFloor: selectedFloor,
                buildingName: buildingName,
                floorName: floorName,
            }
            let searchParam = "?" + new URLSearchParams(yearInformation).toString()
            this.props.history.push({
                pathname: Actions.room_strength.create.url,
                search: searchParam,
            });
        }
        this.setState({
            error
        })
    }


    deleteExpense = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { roomList, columns } = this.state
        const del_url = DEL_URL.room.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                roomList.data_list.splice(index, 1)
                this.setState({
                    roomList,
                    columns: [...columns]
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

    render() {
        const { loading, selectedBuilding, columns, tableUpdating, selectedFloor, floorLoading, buildingList, isBlankPage, error, floorList,
            roomList, pageLoading, blankData, pagination, assetList, selectedAssetDropdown } = this.state
        const { isComponent } = this.props;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            customFilterDialogFooter: () => {
                return this.geFilterOptions();
            },
            onFilterChange: (onFilterChange, filterList, type) => {
                this.onFilterChangeHandler(type, onFilterChange);
            },
            onDownload: (buildHead, buildBody, columns, data) => {
                const bodyData = data.map((room) => {
                    room.data[3] = room.data[3].map((elem) => elem.asset_name + `(${elem.number_of_assets}) `).join(",");
                    return room;
                });
                return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
            },
            downloadOptions: {
                filename: "assigned_room.csv",
                filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                },
            },
        };
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
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    {Actions.room_strength.view.label}
                                </Box>
                            </Grid>

                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('room_strength', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAssignButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.room_strength.create.label}</Button>
                                    }
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid item md={3} xs={12}>
                                <Dropdown
                                    data={buildingList}
                                    name='selectedBuilding'
                                    style='width-100'
                                    value={selectedBuilding}
                                    onChange={this.onChange}
                                    label='Select Building'
                                    hideSelect={true}
                                    error={error.selectedBuilding}
                                />
                            </Grid>
                            <Grid item md={3} xs={12}>
                                {!floorLoading &&
                                    <Dropdown
                                        data={floorList}
                                        name='selectedFloor'
                                        disabled={!selectedBuilding}
                                        style='width-100'
                                        value={selectedFloor}
                                        onChange={this.onChange}
                                        label='Select Floor'
                                        error={error.selectedFloor}
                                        hideSelect={true}
                                        helperText={selectedBuilding ? '' : 'Select Building'}
                                    />
                                }
                                {floorLoading &&
                                    <Skeleton variant="rect" className='drop-down-skeleton margin-top-10 '></Skeleton>
                                }
                            </Grid>
                            {selectedFloor &&
                                <Grid item md={3} xs={12} style={{ marginTop: "15px" }}>
                                    <MultipleSelectDropdown
                                        data_list={assetList}
                                        selected_list={selectedAssetDropdown}
                                        error={false}
                                        label={'Select Asset'}
                                        onChange={(e) => this.onSelectAsset(e)}
                                    />
                                </Grid>
                            }
                        </Grid>
                        {(isBlankPage && !pageLoading) &&
                            <Box className='header-align'>
                                <BlankPagewithIcon data={blankData} />
                            </Box>
                        }
                        {pageLoading &&
                            <Box display='flex'>
                                <CircularProgress className='loading' />
                            </Box>
                        }
                        {!isBlankPage && !pageLoading &&
                            <Grid container className='header-align'>
                                <Grid item md={12}>
                                    <Paper>
                                        <AllMUIDataTable
                                            key={roomList.data_list}
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            data={roomList.data_list}
                                            columns={columns}
                                            options={options}
                                            onTableChange={this.getRoomList}
                                            serverSide={true}
                                            pagination={pagination}
                                            count={roomList.count}
                                        />
                                    </Paper>
                                </Grid>
                            </Grid>
                        }

                    </Paper>
                </Box >
            )
        }
    }
}
export default withRouter(ViewRoomStrength)




