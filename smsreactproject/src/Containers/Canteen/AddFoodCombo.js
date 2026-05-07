import React, { Component } from 'react';
import {
    Paper, Box, Grid, Button, Snackbar, TextField, Select, MenuItem,
    FormControl, InputLabel, IconButton, Typography, Chip, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip,
} from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import DeleteIcon from '@material-ui/icons/Delete';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import MuiAlert from '@material-ui/lab/Alert';
import Swal from 'sweetalert2';

import loadingBar from 'images/loading.gif';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { isUserHasPermission } from 'Includes/functions';
import canteenStyles from './canteenStyles';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class AddFoodCombo extends Component {
    state = {
        loading: false,
        submitDisable: false,
        open: false,

        // combo fields
        name: '',
        code: '',
        price: '',

        // item picker
        foodItems: [],
        selectedItems: [],         // [{ food_item: id, food_item_name: '', quantity: 1 }]
        pickFoodItem: '',
        pickQuantity: 1,
    };

    componentDidMount() {
        this.loadFoodItems();
    }

    loadFoodItems = () => {
        getRequest(`${GET_URL.food_item.api}?is_active=true&limit=200&pageno=1`, {}, this.props).then(res => {
            this.setState({ foodItems: res?.data?.results || res?.data?.data?.data_list || res?.data?.data || [] });
        });
    };

    handleAddItem = () => {
        const { pickFoodItem, pickQuantity, foodItems, selectedItems } = this.state;
        if (!pickFoodItem) return;
        if (selectedItems.find(i => i.food_item === pickFoodItem)) {
            Swal.fire('Already added', 'This item is already in the combo', 'info');
            return;
        }
        const item = foodItems.find(f => f.id === pickFoodItem);
        this.setState({
            selectedItems: [...selectedItems, {
                food_item: pickFoodItem,
                food_item_name: item?.name || '',
                quantity: parseInt(pickQuantity) || 1,
            }],
            pickFoodItem: '',
            pickQuantity: 1,
        });
    };

    handleRemoveItem = (foodItemId) => {
        this.setState({ selectedItems: this.state.selectedItems.filter(i => i.food_item !== foodItemId) });
    };

    validate = () => {
        const { name, code, price, selectedItems } = this.state;
        if (!name.trim()) { Swal.fire('Error', 'Combo name is required', 'error'); return; }
        if (!code.trim()) { Swal.fire('Error', 'Code is required', 'error'); return; }
        if (!price || isNaN(price)) { Swal.fire('Error', 'Valid price is required', 'error'); return; }

        this.setState({ submitDisable: true });

        // Step 1: Create the combo
        const comboPayload = [{ name: name.trim(), code: code.trim(), price: parseFloat(price) }];
        postRequest(POST_URL.food_combo.api, comboPayload, this.props).then(response => {
            if (response && response.status === 200) {
                const comboData = response.data?.data;
                const comboId = Array.isArray(comboData) ? comboData[0]?.id : comboData?.id;

                // Step 2: Add items to combo
                if (comboId && selectedItems.length > 0) {
                    const itemPayloads = selectedItems.map(si => ({
                        combo: comboId,
                        food_item: si.food_item,
                        quantity: si.quantity,
                    }));

                    const promises = itemPayloads.map(p =>
                        postRequest(POST_URL.food_combo_item.api, p, this.props)
                    );

                    Promise.all(promises).then(() => {
                        Swal.fire({ position: 'top-end', icon: 'success', title: `Combo created with ${selectedItems.length} items!`, showConfirmButton: false, timer: 1500 });
                        this.props.history.goBack();
                    });
                } else {
                    Swal.fire({ position: 'top-end', icon: 'success', title: response.data?.Reason || 'Combo created!', showConfirmButton: false, timer: 1500 });
                    this.props.history.goBack();
                }
            }
            this.setState({ submitDisable: false });
        });
    };

    render() {
        const { loading, open, submitDisable, name, code, price, foodItems, selectedItems, pickFoodItem, pickQuantity } = this.state;
        const s = canteenStyles;

        if (loading) return <Box display="flex"><img src={loadingBar} className="loading" alt="loading" /></Box>;

        return (
            <Box>
                <Paper style={{ ...s.card, padding: 24 }}>
                    <Grid container>
                        <Grid item md={6} xs={12}>
                            <Typography style={{ fontSize: 20, fontWeight: 600, color: '#333' }}>Add Food Combo</Typography>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box display="flex" justifyContent="flex-end">
                                {isUserHasPermission('food_combo', 'view') && (
                                    <Button variant="contained" onClick={() => this.props.history.goBack()}
                                        style={{ textTransform: 'none', background: '#1C52C8', color: '#fff' }}
                                        startIcon={<VisibilityOutlinedIcon />}>View Combos</Button>
                                )}
                            </Box>
                        </Grid>
                    </Grid>

                    {/* ─── Combo Details ─── */}
                    <Box mt={3}>
                        <Typography style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 12 }}>Combo Details</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={5}>
                                <TextField variant="outlined" fullWidth size="small" label="Combo Name" required
                                    value={name} onChange={e => this.setState({ name: e.target.value })} />
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <TextField variant="outlined" fullWidth size="small" label="Code" required
                                    value={code} onChange={e => this.setState({ code: e.target.value })} />
                            </Grid>
                            <Grid item xs={6} md={4}>
                                <TextField variant="outlined" fullWidth size="small" label="Price (Rs)" required type="number"
                                    value={price} onChange={e => this.setState({ price: e.target.value })} />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* ─── Item Picker ─── */}
                    <Box mt={4}>
                        <Typography style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 12 }}>
                            Add Items to Combo
                            {selectedItems.length > 0 && (
                                <Chip label={`${selectedItems.length} items`} size="small"
                                    style={{ marginLeft: 10, background: '#EBF1FF', color: '#1C52C8', fontWeight: 600 }} />
                            )}
                        </Typography>

                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={6}>
                                <FormControl variant="outlined" fullWidth size="small">
                                    <InputLabel>Select Food Item</InputLabel>
                                    <Select value={pickFoodItem} onChange={e => this.setState({ pickFoodItem: e.target.value })} label="Select Food Item">
                                        {foodItems.map(fi => (
                                            <MenuItem key={fi.id} value={fi.id}>{fi.name} - Rs {fi.cost}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={4} md={2}>
                                <TextField variant="outlined" fullWidth size="small" label="Qty" type="number"
                                    value={pickQuantity} onChange={e => this.setState({ pickQuantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                    inputProps={{ min: 1 }} />
                            </Grid>
                            <Grid item xs={4} md={2}>
                                <Button variant="outlined" onClick={this.handleAddItem}
                                    style={{ textTransform: 'none', borderColor: '#1C52C8', color: '#1C52C8', height: 40 }}
                                    startIcon={<AddCircleIcon />}>Add</Button>
                            </Grid>
                        </Grid>

                        {/* Selected Items Table */}
                        {selectedItems.length > 0 && (
                            <TableContainer style={{ marginTop: 16 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow style={{ background: '#f7f9fe' }}>
                                            <TableCell style={{ fontWeight: 600 }}>#</TableCell>
                                            <TableCell style={{ fontWeight: 600 }}>Item</TableCell>
                                            <TableCell style={{ fontWeight: 600 }}>Quantity</TableCell>
                                            <TableCell style={{ fontWeight: 600 }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selectedItems.map((si, idx) => (
                                            <TableRow key={si.food_item}>
                                                <TableCell>{idx + 1}</TableCell>
                                                <TableCell>{si.food_item_name}</TableCell>
                                                <TableCell>{si.quantity}</TableCell>
                                                <TableCell>
                                                    <Tooltip title="Remove">
                                                        <IconButton size="small" onClick={() => this.handleRemoveItem(si.food_item)}>
                                                            <DeleteIcon style={{ color: '#d32f2f', fontSize: 18 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>

                    {/* ─── Submit ─── */}
                    <Box mt={4} display="flex" justifyContent="flex-end">
                        <Button variant="contained" disabled={submitDisable} onClick={this.validate}
                            style={{ background: '#1C52C8', color: '#fff', textTransform: 'none', fontWeight: 600 }}>
                            Create Combo
                        </Button>
                    </Box>

                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={() => this.setState({ open: false })}>
                        <Alert onClose={() => this.setState({ open: false })} severity="error">Please clear all errors</Alert>
                    </Snackbar>
                </Paper>
            </Box>
        );
    }
}

export default withRouter(AddFoodCombo);
