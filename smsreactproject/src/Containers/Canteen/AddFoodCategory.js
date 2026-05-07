import React, { Component } from 'react';
import { Paper, Box, Grid, Button, Snackbar } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import MuiAlert from '@material-ui/lab/Alert';
import Swal from 'sweetalert2';

import MultipleAddTextFields from 'Components/MultipleAddTextFields';
import loadingBar from 'images/loading.gif';
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import { nameWithQuoteRegex, nameAndNumberAndHyphenRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const fieldDefs = [
    { label: 'Category Name', regex: nameWithQuoteRegex, autoFocus: true, name: 'name', md: 8, className: 'width-form-95', required: true, id: 'food_cat_name', default: '', rows: null, type: 'text', maxLength: 250, gridClassName: 'margin-vertical-20' },
    { label: 'Category Code', regex: nameAndNumberAndHyphenRegex, autoFocus: false, name: 'code', md: 4, className: 'width-form-95', required: true, id: 'food_cat_code', default: '', rows: null, type: 'text', maxLength: 30, gridClassName: 'margin-vertical-20' },
];

class AddFoodCategory extends Component {
    state = { rows: [], loading: false, open: false, submitDisable: false };

    updateValue = (rows) => this.setState({ rows });
    handleClose = () => this.setState({ open: false });

    validate = () => {
        const ok = this.refs.formRef.validateFields();
        if (!ok) return;
        const payload = (this.state.rows || []).map(({ name, code }) => ({ name, code }));
        this.setState({ submitDisable: true });
        postRequest(POST_URL.food_category.api, payload, this.props).then(response => {
            if (response && response.status === 200) {
                Swal.fire({ position: 'top-end', type: 'success', title: response.data?.Reason || 'Category created!', showConfirmButton: false, timer: 1500 });
                this.props.history.goBack();
            }
            this.setState({ submitDisable: false });
        });
    };

    render() {
        const { loading, open, submitDisable } = this.state;
        if (loading) return <Box display="flex"><img src={loadingBar} className="loading" alt="loading" /></Box>;

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className="heading">Add Food Category</Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                {isUserHasPermission('food_category', 'view') && (
                                    <Button variant="contained" onClick={() => this.props.history.goBack()} className="editbutton-view">
                                        <VisibilityOutlinedIcon className="visibility-icon" /> View Categories
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
                                idFormat="food_category_add_"
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

export default withRouter(AddFoodCategory);
