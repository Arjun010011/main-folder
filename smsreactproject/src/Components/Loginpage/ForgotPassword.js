import React, { Component } from 'react';
import { Grid, Box, Button, TextField, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    InputAdornment, IconButton } from '@material-ui/core';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import Swal from 'sweetalert2';
import {  withRouter } from 'react-router-dom';

import { logout } from 'Includes/functions';
import { putRequest } from 'Includes/api/apicall';
import { PUT_URL  } from 'Includes/urls';
import './styles.scss';
import { passwordRegex } from 'Constants/regularExpression'

class ForgotPassword extends Component {

    constructor(props) {
        super(props)
        this.state = {
            open: false,
            anchorEl: null,
            updateDisable: false,
            showData: '',
            fieldValue: { showPassword: false,old_password:'',new_password:'' },
            errorContent: { old_password:'',new_password:'',passworderror:''}
        }
    }

    handleClose = () => {
        this.setState({
            updateDisable: false,
            open: false
        },(()=>{
            this.props.closeForgotPassword(false)
        }));

    };
    handleKeyFunction = (e) => {
        if(e.keyCode === 13){//13 for enter key
            this.update();
        }
    }

    validation = () => {
        let test=true
        let {fieldValue} = this.state
        let errorContent={ old_password:'',new_password:'',passworderror:''}
        if(fieldValue.old_password === ''){
            errorContent['old_password'] ='Old password cannot be empty!' 
            test = false
        }
        if(fieldValue.new_password === ''){
            errorContent['new_password'] = 'New password cannot be empty!' 
            test = false
        }
        else if(fieldValue.new_password !== '' || fieldValue.old_password !==''){
            if( fieldValue.old_password === fieldValue.new_password){
                errorContent['passworderror']= 'Old password and New password cannot be same!'
                test = false
            }
            else if (!passwordRegex.value.test(fieldValue.new_password) ) {
                errorContent['new_password']= passwordRegex.errorText;
                test=false
            }
            else{
                test=true
            }
        }
        this.setState({errorContent})
        return test
    }
    

    handleClickShowPassword = () => {
        let fieldValue = { ...this.state.fieldValue };
        fieldValue.showPassword = !Boolean(fieldValue.showPassword)
        this.setState({ fieldValue });
    };

    handleMouseDownPassword = event => {
        event.preventDefault();
    };
    update = async () => {
        const put_url = PUT_URL.changepassword.api;
        const payload = { ...this.state.fieldValue };     
        let test = this.validation();
        if(test){
            this.setState({ updateDisable: true })
            let props = { ...this.props };
            props.return_error = true;
            putRequest(put_url, payload, props).then(response => {
                if (response && response.status === 200) {
                    this.props.closeForgotPassword(false)
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        
                    }).then(async (result) => {
                        localStorage.clear();
                        window.location = '/login';
                    })
                }
                else if(response && response.status === 400){
                    if(response.data && Array.isArray(response.data) && response.data.length > 0){
                        let errorContent = {passworderror:''}
                        errorContent['passworderror'] = response.data[0]
                    this.setState({           
                        errorContent
                    })
                }
                }
                this.setState({ updateDisable: false });
            })
        }
    }

    handleSearchChange = (e) => {
        const value = e.target.value;
        const name = e.target.name;
        let fieldValue = {...this.state.fieldValue};
        fieldValue[name] = value;
            this.setState({
                fieldValue,
                errorContent: { old_password:'',new_password:'',passworderror:''}
            })
        
    }

    render() {
        const {  updateDisable, fieldValue, errorContent } = this.state
        const {
             handleClose, handleSearchChange, update, handleKeyFunction, handleClickShowPassword, handleMouseDownPassword
        } = this;
        let status = true;
        if (!this.state.open || this.props.closeMenu === false) {
            status = false
        }
        return (
            <Box>
               <Dialog open={true}
                    onClose={handleClose} aria-labelledby='form-dialog-title'>
                    <DialogTitle id='form-dialog-title'></DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Please Enter Old and New Password Details
                        </DialogContentText>
                        <Grid container className='flex-justify-center'>
                            <Grid item md={12} xs={10} sm={10}>
                                 <TextField
                                    label={'Old Password'}
                                    name={'old_password'}
                                    value={fieldValue['old_password']}
                                    className={'width-90'}
                                    autoFocus={true}
                                    variant='outlined'
                                    helperText={errorContent.old_password === '' ? '' : errorContent.old_password}
                                    error={errorContent.old_password === '' ? false : true}
                                    onChange={(e) => handleSearchChange(e)}
                                />
                            </Grid>
                            <Grid item md={12} xs={10} sm={10}>
                            <TextField
                                    label={'New Password'}
                                    name={'new_password'}
                                    value={fieldValue['new_password']}
                                    className={'width-90'}
                                    autoFocus={false}
                                    variant='outlined'
                                    helperText={errorContent.new_password === '' ? '' : errorContent.new_password}
                                    error={errorContent.new_password === '' ? false : true}
                                    type={Boolean(fieldValue.showPassword) ? 'text' : 'password'}
                                    onChange={(e) => handleSearchChange(e)}
                                    onKeyDown={e => handleKeyFunction(e, 'minute')}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    edge="end"
                                                    aria-label="toggle password visibility"
                                                    onClick={handleClickShowPassword}
                                                    onMouseDown={handleMouseDownPassword}
                                                    style={{ "padding": "2px",  }}
                                                >
                                                    {!Boolean(fieldValue.showPassword) ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                        </Grid>
                        <Box className='error-content flex-justify-center margin-top-10'>   
                            {errorContent.passworderror}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose} color='secondary'>
                            Close
                </Button>
                        <Button disabled={updateDisable} onClick={update} color='primary'>
                            Update
                </Button>

                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}
export default withRouter(ForgotPassword);