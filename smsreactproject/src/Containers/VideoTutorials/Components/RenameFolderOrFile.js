import React, { Component } from 'react'
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Grid,
} from '@material-ui/core';
import Swal from 'sweetalert2'

import { putRequest } from 'Includes/api/apicall';
import { PUT_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'


const folderDetails_global = [
    {
        label: 'Name', regex: null, autoFocus: true, name: 'name', md: 12, className: 'width-form-95',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 100
    },
]


export default class RenameFolderOrFile extends Component {

    constructor(props) {
        super(props)

        this.state = {
            open: false,
            folderDetails: [],
            fieldValue: { fileId: '' },
            fieldError: {},
            errorContent: ''
        }
    }


    setDefaultValues = (fieldDetails, existingName) => {
        let fieldDetail = fieldDetails;
        let { fieldValue, fieldError, folderDetails, } = this.state;
        fieldDetail.map((fields) => {
            fieldValue[fields.name] = existingName;
            fieldError[fields.name] = '';
        })
        folderDetails = fieldDetail
        this.setState({ ...fieldValue, ...fieldError, folderDetails });
    }

    handleOpen = (status, id, name) => {
        let { label, submitDisable, errorContent, existingName } = this.state;
        existingName = name
        if (status === 'folder') {
            label = 'Please Update Folder Name';
        }
        else {
            label = 'Please Update File Name';
        }
        this.setDefaultValues(folderDetails_global, existingName);
        this.setState({
            label: label,
            open: true,
            status,
            selectedFolderOrFile: id,
            submitDisable,
            errorContent
        })
    }

    handleClose = () => {
        this.setState({
            open: false,
            existingName: ''
        })
    }

    validate = () => {
        let { fieldValue, fieldError, folderDetails } = this.state;
        let test = true
        folderDetails.forEach((field) => {
            let value = fieldValue[field.name];
            let name = field.name;
            if (field.required && (value === '' || value === null || value === 0)) {
                fieldError[name] = `${field.label} is Mandatory`
                test = false
            }
            else if (field.regex && !field.regex.value.test(value) && value !== '') {
                fieldError[name] = field.regex.errorText;
                test = false
            }
        })
        this.setState({
            fieldError
        })
        return test;
    }

    submit = () => {
        const { status, fieldValue, selectedFolderOrFile } = this.state;
        let test = this.validate();
        if (test) {
            this.setState({ submitDisable: true })
            let payload = {
                name: fieldValue['name']
            }
            const { folderId } = this.props;
            let url
            if (status === 'folder') {
                url = PUT_URL.createfolder.api + selectedFolderOrFile + '/'
            }
            else {
                url = PUT_URL.createfile.api + selectedFolderOrFile + '/'
            }
            putRequest(url, payload, this.props).then(response => {
                if (response && response.status === 200) {
                    this.setState({ submitDisable: false })
                    this.handleClose();
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    }).then(
                        this.props.getFolderDetails(folderId)
                    )
                }
                this.setState({ submitDisable: false })
            })
        }
    }

    handleChange = (e) => {
        let { name, value } = e.target;
        let { fieldValue, fieldError } = this.state;
        fieldValue[name] = value;
        fieldError[name] = '';
        this.setState({
            fieldValue,
            fieldError
        })
    }

    render() {
        const { open, fieldValue, fieldError, submitDisable, folderDetails, label, errorContent } = this.state
        return (
            <Box className='end-flex-prop'>
                <Dialog open={open}
                    className='action-basic-detail-width'
                    onClose={this.handleClose} aria-labelledby='form-dialog-title'>
                    <DialogTitle id='form-dialog-title'></DialogTitle>
                    <DialogContent>
                        <DialogContentText className='flex-justify-center-flex-prop '>
                            {label}
                        </DialogContentText>
                        {folderDetails.map((field, index) => <Grid item md={field.md} key={index} xs={12} sm={12} className='margin-top-20'>
                            {(field.type === 'text') && <TextField
                                id={field.id}
                                label={field.label}
                                name={field.name}
                                value={fieldValue[field.name]}
                                className={field.className}
                                autoFocus={field.autoFocus}
                                rows={field.rows}
                                variant="outlined"
                                inputProps={{ maxLength: field.maxLength }}
                                helperText={fieldError[field.name] === '' ? '' : fieldError[field.name]}
                                error={fieldError[field.name] === '' ? false : true}
                                onChange={(e) => this.handleChange(e)}
                            />}

                        </Grid>
                        )}
                        {errorContent &&
                            <Box className='new-file-attache-text'>{errorContent}</Box>
                        }
                    </DialogContent>
                    <DialogActions>
                        <Button disabled={submitDisable} onClick={() => this.handleClose()} color='secondary'>
                            Cancel
                        </Button>
                        <Button texttransform='none' disabled={submitDisable} onClick={() => this.submit()} color='primary'>
                            update
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        )
    }
}
