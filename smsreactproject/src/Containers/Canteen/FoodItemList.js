import React, { Component } from 'react';
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import Swal from 'sweetalert2';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import ActionColumn from 'Components/ActionColumn';
import loadingBar from 'images/loading.gif';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { isUserHasPermission, getPaginationProps, updatePermissions } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';

const VEG_LABELS = { 0: 'Veg', 1: 'Non-Veg', 2: 'Egg' };

class FoodItemList extends Component {
    constructor() {
        super();
        this.permission = updatePermissions('food_item', ['update', 'delete']);
        this.state = {
            dataList: {}, loading: true, tableUpdating: false,
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            columns: [
                { name: 'id', label: 'ID', options: { filter: false, sort: false, display: false, viewColumns: false } },
                { name: 'name', label: 'Item Name', options: { filter: false, sort: true } },
                { name: 'code', label: 'Code', options: { filter: false, sort: true } },
                { name: 'category', label: 'Category', options: { filter: true, sort: true, customBodyRender: (v) => v && typeof v === 'object' ? v.name : v || '-' } },
                { name: 'food_type', label: 'Type', options: { filter: true, sort: true, customBodyRender: (v) => VEG_LABELS[v] || '-' } },
                { name: 'cost', label: 'Cost (₹)', options: { filter: false, sort: true, customBodyRender: (v) => `₹${parseFloat(v || 0).toFixed(2)}` } },
                { name: 'is_available', label: 'Available', options: { filter: true, sort: true, customBodyRender: (v) => v ? 'Yes' : 'No' } },
                {
                    name: 'Actions', label: 'Action',
                    options: {
                        display: this.permission.length > 0,
                        filter: false, sort: false, viewColumns: false,
                        customBodyRender: (value, tableMeta) => (
                            <ActionColumn
                                id={tableMeta.rowData[0]}
                                index={tableMeta.rowIndex}
                                data={this.state.dataList.data_list || []}
                                updateData={this.updateRow}
                                deleteData={this.deleteRow}
                                enabledActions={this.permission}
                                editFields={[
                                    { label: 'Item Name', name: 'name', type: 'text' },
                                    { label: 'Code', name: 'code', type: 'text' },
                                    { label: 'Cost', name: 'cost', type: 'number' },
                                ]}
                                editUrl={PUT_URL.food_item.api}
                                deleteUrl={DEL_URL.food_item.api}
                                parentProps={this.props}
                            />
                        ),
                    },
                },
            ],
        };
    }

    componentDidMount() { this.loadData(); }

    loadData = (paginationProps) => {
        let { pagination } = this.state;
        this.currentPagination = paginationProps || pagination;
        let params = { ...getPaginationProps(this.currentPagination), is_active: true };
        getRequest(GET_URL.food_item.api, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({ dataList: response.data.data, loading: false, tableUpdating: false, pagination: this.currentPagination });
            } else this.setState({ loading: false, tableUpdating: false });
        });
    };

    updateRow = (id, index, updatedData) => {
        let { dataList, columns } = this.state;
        if (dataList.data_list) dataList.data_list[index] = { ...dataList.data_list[index], ...updatedData };
        this.setState({ dataList: { ...dataList }, columns: [...columns] });
    };

    deleteRow = (id, index) => {
        this.setState({ tableUpdating: true });
        let { dataList, columns } = this.state;
        deleteRequest(`${DEL_URL.food_item.api}${id}/`, {}, this.props).then(response => {
            if (response && response.status === 200) {
                if (dataList.data_list) dataList.data_list.splice(index, 1);
                this.setState({ dataList: { ...dataList }, columns: [...columns] });
                Swal.fire({ position: 'top-end', type: 'success', title: response.data.Reason || 'Deleted!', showConfirmButton: false, timer: 1500 });
            }
        });
        this.setState({ tableUpdating: false });
    };

    render() {
        const { loading, columns, dataList, tableUpdating, pagination } = this.state;
        if (loading) return <Box display="flex"><img src={loadingBar} className="loading" alt="loading" /></Box>;
        const options = { selectableRows: 'none', filterType: 'dropdown', responsive: 'standard', filter: false, download: false, print: false, viewColumns: false, rowsPerPageOptions: [5, 10, 15, 50, 100] };

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className="heading">Food Items</Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                {isUserHasPermission('food_item', 'create') && (
                                    <Button variant="contained" onClick={() => this.props.history.push('/canteen/food-item/add')} className="editbutton-view">
                                        <AddCircleOutlineOutlinedIcon className="visibility-icon" /> Add Food Item
                                    </Button>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container className={classNames('header-align')}>
                        <Grid item md={12} xs={12}>
                            <Paper>
                                <AllMUIDataTable
                                    title={tableUpdating ? <CircularProgress className="white-text" /> : ''}
                                    key={dataList.data_list}
                                    data={dataList.data_list || []}
                                    columns={columns}
                                    options={options}
                                    onTableChange={this.loadData}
                                    serverSide={true}
                                    pagination={pagination}
                                    count={dataList.count || 0}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        );
    }
}

export default withRouter(FoodItemList);
