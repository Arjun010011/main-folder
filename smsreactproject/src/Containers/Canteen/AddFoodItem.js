import React, { Component } from 'react';
import { Paper, Box, Grid, Button, Snackbar } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import MuiAlert from '@material-ui/lab/Alert';
import Swal from 'sweetalert2';

import MultipleAddTextFields from 'Components/MultipleAddTextFields';
import loadingBar from 'images/loading.gif';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { nameWithQuoteRegex, nameAndNumberAndHyphenRegex, numberRegex } from 'Constants/regularExpression';
import { isUserHasPermission } from 'Includes/functions';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class AddFoodItem extends Component {
    state = { rows: [], loading: true, open: false, submitDisable: false, categories: [], fieldDefs: [] };

    componentDidMount() {
        getRequest(GET_URL.food_category.api, { is_active: true, limit: 15 }, this.props).then(res => {
            const cats = res?.data?.data?.data_list || res?.data?.data || [];
            const catList = Array.isArray(cats) ? cats : [];
            this.setState({
                categories: catList, loading: false,
                fieldDefs: [
                    { label: 'Item Name', regex: nameWithQuoteRegex, autoFocus: true, name: 'name', md: 4, className: 'width-form-95', required: true, id: 'food_item_name', default: '', rows: null, type: 'text', maxLength: 250, gridClassName: 'margin-vertical-20' },
                    { label: 'Code', regex: nameAndNumberAndHyphenRegex, name: 'code', md: 2, className: 'width-form-95', required: true, id: 'food_item_code', default: '', rows: null, type: 'text', maxLength: 30, gridClassName: 'margin-vertical-20' },
                    { label: 'Category', name: 'category', md: 3, className: 'width-form-95', required: true, id: 'food_item_cat', default: '', type: 'dropdown', gridClassName: 'margin-vertical-20', dropdownList: catList.map(c => ({ id: c.id, name: c.name })) },
                    { label: 'Food Type', name: 'food_type', md: 3, className: 'width-form-95', required: true, id: 'food_item_type', default: 0, type: 'dropdown', gridClassName: 'margin-vertical-20', dropdownList: [{ id: 0, name: 'Veg' }, { id: 1, name: 'Non-Veg' }, { id: 2, name: 'Egg' }] },
                    { label: 'Cost (₹)', regex: numberRegex, name: 'cost', md: 3, className: 'width-form-95', required: true, id: 'food_item_cost', default: '', rows: null, type: 'text', maxLength: 10, gridClassName: 'margin-vertical-20' },
                    { label: 'Allergy Info', name: 'allergy_info', md: 4, className: 'width-form-95', required: false, id: 'food_item_allergy', default: '', rows: null, type: 'text', maxLength: 500, gridClassName: 'margin-vertical-20' },
                ],
            });
        });
    }

    updateValue = (rows) => this.setState({ rows });
    handleClose = () => this.setState({ open: false });

    validate = () => {
        const ok = this.refs.formRef.validateFields();
        if (!ok) return;
        const payload = (this.state.rows || []).map(({ name, code, category, food_type, cost, allergy_info }) => ({
            name, code, category, food_type: parseInt(food_type || 0), cost: parseFloat(cost), allergy_info: allergy_info || '',
        }));
        this.setState({ submitDisable: true });
        postRequest(POST_URL.food_item.api, payload, this.props).then(response => {
            if (response && response.status === 200) {
                Swal.fire({ position: 'top-end', type: 'success', title: response.data?.Reason || 'Food item created!', showConfirmButton: false, timer: 1500 });
                this.props.history.goBack();
            }
            this.setState({ submitDisable: false });
        });
    };

    render() {
        const { loading, open, submitDisable, fieldDefs } = this.state;
        if (loading) return <Box display="flex"><img src={loadingBar} className="loading" alt="loading" /></Box>;

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className="heading">Add Food Item</Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                {isUserHasPermission('food_item', 'view') && (
                                    <Button variant="contained" onClick={() => this.props.history.goBack()} className="editbutton-view">
                                        <VisibilityOutlinedIcon className="visibility-icon" /> View Items
                                    </Button>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container className={classNames('header-align')}>
                        <Grid item md={10} xs={12}>
                            <MultipleAddTextFields
                                fieldDefaultValue={[]}
                                fieldDetails={fieldDefs}
                                updateParent={this.updateValue}
                                isEmptyNotAllowed={true}
                                ref="formRef"
                                NotAlignCenter={true}
                                idFormat="food_item_add_"
                            />
                            <Box className="submt-button-float-bottom" mt={3}>
                                <Button variant="contained" color="primary" className="submit" disabled={submitDisable} onClick={this.validate}>
                                    Submit
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">Please clear all errors</Alert>
                    </Snackbar>
                </Paper>
            </Box>
        );
    }
}

export default withRouter(AddFoodItem);
