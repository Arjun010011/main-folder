


/* eslint-disable react/display-name */
import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
    Button, Box, Dialog, DialogTitle, FormControl, TextareaAutosize, DialogActions,
    DialogContentText, DialogContent, FormHelperText,
} from '@material-ui/core';
import Slide from '@material-ui/core/Slide';
import { minDate } from 'Constants';
import { MuiPickersUtilsProvider, KeyboardDatePicker, KeyboardDateTimePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import {validateDate} from 'Includes/functions';

const { forwardRef, useRef, useImperativeHandle } = React;

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
    appBar: {
        position: 'relative',
        backgroundColor: '#4680FF'
    },
    title: {
        marginLeft: theme.spacing(2),
        flex: 1,
    },
}));

const FeeTransactionModify = forwardRef((props, ref) => {

    const [transactionDate, setTransactionDate] = React.useState(null);
    const [errors, setErrors] = React.useState({});
    const [disableButton, setDisableButton] = React.useState(false);

    const handleSearchChange = (e) => {
        delete errors.transactionDate
        setDisableButton(()=> false)
        setTransactionDate(() => e)
        setErrors(() => errors)
    }

    useEffect(() => {
        setDisableButton(()=> false)
        setTransactionDate(() => props.transactionDate)
    }, [props.transError])


    const onBlurValidation = () => {
        const error = validateDate(transactionDate, null, new Date())
        if (error !== '') {
            let errors={transactionDate:error}
            setErrors(()=> errors)
            return false
        }
        return true
    }

    const handleSubmit=()=>{
        if(onBlurValidation()){
            setDisableButton(()=>true)
            props.updateTransaction(transactionDate)
        }
    }

    return (
        <div>
            <Dialog className='action-basic-detail-width' open={true} 
            // onClose={props.handleReasonClose}
             aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title"></DialogTitle>
                <DialogContent>
                    <DialogContentText className='align-items-center'>
                        Update Transaction Date
                    </DialogContentText>
                    <div className='mt-30'>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDatePicker
                                autoOk
                                variant='inline'
                                inputVariant='outlined'
                                label={'Transaction Date'}
                                name={'transaction_date'}
                                required={true}
                                minDate={minDate}
                                maxDate={new Date()}
                                onBlur={(e) => onBlurValidation(e)}
                                format='dd-MM-yyyy'
                                value={transactionDate}
                                defaultValue={transactionDate}
                                onChange={(e) => handleSearchChange(e)}
                                KeyboardButtonProps={{
                                    'aria-label': 'change date',
                                }}
                                helperText={errors['transactionDate'] && errors['transactionDate']}
                                error={errors['transactionDate'] && errors['transactionDate']}
                            />
                        </MuiPickersUtilsProvider>
                    </div>
                    <div className='text-red mt-10'>
                        {props.transError}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button color="secondary text-bold" disabled={disableButton} style={{ textTransform: 'capitalize' }} onClick={handleSubmit}>
                        Update
                    </Button>
                    <Button color='secondary' style={{ textTransform: "uppercase" }} onClick={props.handleTransactionClose}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
});

export default FeeTransactionModify
