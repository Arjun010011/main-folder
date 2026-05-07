import React, { Component, Fragment } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';

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

class RoomAllocationList extends Component {
    constructor() {
        super()
        this.state = {
            buildingList: [],
            floorList: [],
            roomList: [],
            loading: true,
            error: {},
            floorLoading: false,
            selectedBuilding: '',
            selectedFloor: '',
            pageLoading: false,
            pagination: { ...DEFAULT_PAGINATION_PROPS },
            isBlankPage: true,
            blankData: 'Select building, floor and expect a result',
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "name",
                    label: "Name",
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
                    label: "Total Strength",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "occupied",
                    label: "Occupied",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "available",
                    label: "Available",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: this.updateCreatePermissions(),
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {this.updateCreatePermissions() &&
                                    <Button
                                        className='add-modify-button'
                                        onClick={e => this.gotoAddStudentOrStaff(tableMeta.rowData[0], tableMeta.rowData[1])}
                                    > View detail
                                    </Button>}
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }


    gotoAddStudentOrStaff = (id, name) => {
        let { selectedBuilding, selectedFloor, buildingList, floorList } = this.state;
        let buildingName = getKeyValueMap(buildingList, 'id', 'name')
        let floorName = getKeyValueMap(floorList, 'id', 'name')
        buildingName = buildingName[selectedBuilding]
        floorName = floorName[selectedFloor]
        let yearInformation = {
            selectedBuilding: selectedBuilding,
            selectedFloor: selectedFloor,
            buildingName: buildingName,
            floorName: floorName,
            selectedRoom: id,
            roomName: name
        }
        let searchParam = "?" + new URLSearchParams(yearInformation).toString()
        this.props.history.push({
            pathname: Actions.room_allocation.view.url,
            search: searchParam,
        });
    }

    updateCreatePermissions = () => {
        if (isUserHasPermission('room_allocation', 'view')) {
            return true
        }
        else {
            return false
        }
    }

    componentDidMount = () => {
        let { selectedBuilding, selectedFloor } = getUrlParam();
        this.setState({
            selectedBuilding,
            selectedFloor,
        })
        this.getBuildingList(selectedBuilding)
    }

    getBuildingList = (selectedBuilding) => {
        const url = GET_URL.buildingdata.api
        const params = { is_active: true, building_type: 'Hostel' }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    buildingList: response.data.data,
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
            else {
                this.setState({
                    floorList: [],
                    roomList: [],
                    isBlankPage: true,
                    blankData: 'Select building, floor and expect a result',
                    selectedBuilding: '',
                    loading: false
                })
            }
        })
    }

    getRoomList = (paginationProps) => {
        let { pagination, selectedFloor, selectedBuilding } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, is_active: true, pagination: true, building: selectedBuilding }
        if (selectedFloor !== 'all') {
            let temp = {}
            temp['floor'] = selectedFloor
            params = { ...params, ...temp }
        }

        const url = GET_URL.roomallocation.api
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    roomList: response.data.data.data_list,
                    isBlankPage: false,
                    pageLoading: false,
                    tableUpdating: false,
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
                    this.setState({
                        floorLoading: true,
                        isBlankPage: true,
                        selectedFloor: null,
                        floorList: [],
                        blankData: 'Please select floor and expect  result'
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
                else if (name === 'selected_filter_floor') {
                    this.setState({
                        tableUpdating: true,
                    }, () => {
                        this.getRoomList()
                    })
                }

            })
        }
    }

    geFilterOptions = () => {
        let { selected_filter_floor, floorList, standardList } = this.state;
        return <Fragment>
            <Box className='margin-top-20'>

                <Dropdown
                    data={floorList}
                    name={selected_filter_floor}
                    value={selected_filter_floor}
                    onChange={(e) => this.onChange(e)}
                    label='Select standard'
                />
            </Box>
        </Fragment>;
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

    render() {
        const { loading, selectedBuilding, columns, tableUpdating, selectedFloor, floorLoading, buildingList, isBlankPage, error, floorList,
            roomList, pageLoading, blankData, pagination } = this.state
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
            onDownload: (buildHead, buildBody, columns, data) => {
                const bodyData = data.map((data_value, i) => {
                    return data_value;
                })
                return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
            },
            downloadOptions: {
                filename: "Room_Allocation_list.csv",
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
                            <Grid item md={7} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Room Allocation List
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
                                        helperText={selectedBuilding ? '' : 'Please Select Building'}
                                    />
                                }
                                {floorLoading &&
                                    <Skeleton variant="rect" className='drop-down-skeleton margin-top-10 '></Skeleton>
                                }
                            </Grid>
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
                                            key={roomList}
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            data={roomList}
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
                </Box>
            )
        }
    }
}
export default withRouter(RoomAllocationList)




