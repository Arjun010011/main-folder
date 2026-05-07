import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

export default class EditModal extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            fieldValues: {...props.fieldDetails},
            fieldErrors: {}
        }
    }

    onchange = (field, e) => {
        const { value } = e.target;
        let fieldValues = { ...this.state.fieldValues };
        let fieldErrors = { ...this.state.fieldErrors };
        if(value === ""){
            fieldErrors[field] = 'field Cant be Empty';
            fieldValues[field]['value'] = "";
            this.setState({ fieldErrors, fieldValues });
            return;
        }
        else if(fieldValues[field] && fieldValues[field].expression){
            if(fieldValues[field].expression.test(value)){
                fieldErrors[field] = "";
                fieldValues[field]['value'] = value;
            }
            else {
                fieldErrors[field] =  fieldValues[field].errorText
                this.setState({ fieldErrors })
            }
        }
        else {
            fieldErrors[field] = ""
            fieldValues[field]['value'] = value;
        }
        this.setState({ fieldValues, fieldErrors });
    }

    handleClose = () => {
        this.props.closeModal();
    };
    update = () => {
        this.props.update(this.state.fieldValues)
    }
    render(){
        const { fieldValues, fieldErrors } = this.state;
        return (
            <div>
                <Dialog open={true} 
                // onClose={this.handleClose}
                 aria-labelledby="form-dialog-title">
                    <DialogTitle id="form-dialog-title"></DialogTitle>
                    <DialogContent>
                        <DialogContentText> Please enter unique Name </DialogContentText>
                        {fieldValues && Object.keys(fieldValues).map((data, index) => {
                            return <div key={index}>
                                <TextField
                                    margin="dense"
                                    id={data}
                                    label={`update ${fieldValues[data].name}`}
                                    type="name"
                                    value={fieldValues[data].value ? fieldValues[data].value : ""}
                                    onChange={this.onchange.bind(this, data)}
                                    helperText={fieldErrors[data] === "" || fieldErrors[data] === undefined ? "" : fieldErrors[data]}
                                    error={fieldErrors[data] === "" || fieldErrors[data] === undefined ? false : true}
                                    fullWidth
                                />
                            </div>
                        })}
                        
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.update} color="primary"> Update </Button>
                        <Button onClick={this.handleClose} color="primary"> Close </Button>
                    </DialogActions>
                </Dialog>
            </div>
        )
    }
}