import React, { Component } from 'react';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Box, FormHelperText, Tooltip, FormControl, InputLabel, MenuItem, Select } from '@material-ui/core';
import { isUserHasPermission } from 'Includes/functions';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import Swal from 'sweetalert2'
import { Dropdown } from 'Components/DropDown';
import { FormattedMessage } from 'react-intl';
import messages from './../messages';
import commonMessages from 'Constants/messages'

export default class AddNewStoreItem extends Component {
    constructor(props) {
        super(props)

        this.state = {
            open: false,
            errors: {},
            itemDetails: {},
            sectionsList: [],
            sectionValue: '',
            submitDisable: false,
            sectionListFound: false
        }
    }


    handleClickOpen = () => {
        this.setState({
            open: true
        })
    };

    handleClose = () => {
        this.setState({
            open: false,
            errors: {},
            sectionValue: '',
            strength: ''
        })
    };
    update = async () => {
        let errors = this.state.errors
        let { itemDetails } = this.state
        if (!itemDetails['name']) {
            errors['name'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        if (!itemDetails['code']) {
            errors['code'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        this.setState({
            errors
        })
        if ((Object.keys(errors).length === 0)) {
            this.setState({ submitDisable: true })
            let section = {}
            let itemList = []
            section['name'] = itemDetails['name']
            section['code'] = itemDetails['code']
            itemList.push(section)
            let post_data = {
                'item': itemList,
            }
            const url = POST_URL.item.api
            postRequest(url, post_data, this.props).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.updatedNewItem()
                    this.setState({
                        open: false,
                        itemDetails: {},
                    })
                }
                this.setState({ submitDisable: false })
            })

        }
    }

    onchange = (e) => {
        let { itemDetails, errors } = this.state;
        let { name, value } = e.target;
        itemDetails[name] = value
        delete errors[name]
        this.setState({
            errors,
            itemDetails
        })
    }

    render() {
        let { open, submitDisable, errors, itemDetails } = this.state
        return (
            <div>
                <div className='mt-5 mb-10 text-align-right'>
                    <Button className='custom-button ' onClick={this.handleClickOpen}>
                        <AddCircleOutlineOutlinedIcon /> Add New Item
                    </Button>
                </div>

                <Dialog open={open}
                    className='action-basic-detail-width'
                    onClose={this.handleClose} aria-labelledby="form-dialog-title">
                    <DialogTitle id="form-dialog-title"></DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            New Item
                        </DialogContentText>
                        <TextField
                            autoComplete='off'
                            name="name"
                            label='Name'
                            required={true}
                            value={itemDetails.name}
                            inputProps={{ maxLength: 50 }}
                            margin='normal'
                            variant='outlined'
                            onChange={this.onchange}
                            helperText={errors['name'] && errors['name']}
                            error={errors['name'] && errors['name']}
                            style={{ width: 300 }}
                        />
                        <TextField
                            autoComplete='off'
                            name="code"
                            label='Code'
                            required={true}
                            value={itemDetails.code}
                            inputProps={{ maxLength: 50 }}
                            margin='normal'
                            variant='outlined'
                            onChange={this.onchange}
                            helperText={errors['code'] && errors['code']}
                            error={errors['code'] && errors['code']}
                            style={{ width: 300 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleClose} color="secondary">
                            <FormattedMessage {...commonMessages.close} />
                        </Button>
                        <Button
                            onClick={e => this.update(e)}
                            disabled={submitDisable}
                            color="primary">
                            <FormattedMessage {...commonMessages.submit} />
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        );
    }
}